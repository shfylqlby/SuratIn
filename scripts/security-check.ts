/**
 * Uji keamanan & aturan bisnis terhadap database (lokal atau cloud) memakai akun demo.
 *   npm run test:security
 * Jalankan setelah `npm run seed:demo`.
 */
import { createHash } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const PASSWORD = "Demo1234!";
const KEL_KAU = "0b1f0000-0000-4000-8000-000000000012";

const service = createClient(URL, SERVICE, { auth: { persistSession: false } });
const anon = createClient(URL, ANON, { auth: { persistSession: false } });

let failed = 0;
function check(name: string, ok: boolean, detail = "") {
  console.log(`${ok ? "LULUS" : "GAGAL"}  ${name}${detail ? `  (${detail})` : ""}`);
  if (!ok) failed++;
}

async function login(email: string) {
  const c = createClient(URL, ANON, { auth: { persistSession: false } });
  const { error } = await c.auth.signInWithPassword({ email, password: PASSWORD });
  if (error) throw new Error(`login ${email}: ${error.message}`);
  return c;
}

async function idsOf(c: SupabaseClient) {
  const { data } = await c.from("letter_requests").select("id, applicant_id, status, kelurahan_id, rt_unit_id");
  return data ?? [];
}

const KEL_SDM = "0b1f0000-0000-4000-8000-000000000011";
const RT_SDM01 = "0b1f0000-0000-4000-8000-000000000101";
const RT_KRA03 = "0b1f0000-0000-4000-8000-000000000103";

async function main() {
  const warga = await login("warga@demo.id");
  const warga2 = await login("warga2@demo.id");
  const petugas = await login("admin.sidomulyo@demo.id");
  const adminKra = await login("admin.karanganyar@demo.id");
  const rt01 = await login("rt01.sidomulyo@demo.id");
  const rt02 = await login("rt02.sidomulyo@demo.id");
  const wargaB = await login("warga.b@demo.id");
  const camat = await login("camat@demo.id");

  const { data: me } = await warga.auth.getUser();
  const { data: me2 } = await warga2.auth.getUser();

  // RLS antar warga
  const mine = await idsOf(warga);
  const theirs = await idsOf(warga2);
  check("Warga hanya melihat permohonannya sendiri", mine.length > 0 && mine.every((r) => r.applicant_id === me.user!.id), `${mine.length} baris`);
  check("Warga kedua tidak melihat permohonan warga pertama", theirs.every((r) => r.applicant_id === me2.user!.id) && !theirs.some((r) => mine.some((m) => m.id === r.id)));
  const { data: otherProfile } = await warga.from("profiles").select("id").eq("id", me2.user!.id);
  check("Warga tidak bisa membaca profil warga lain", (otherProfile ?? []).length === 0);

  // Anon
  const { data: anonReq } = await anon.from("letter_requests").select("id");
  const { data: anonLetters } = await anon.from("letters").select("id");
  const { data: anonAppr } = await anon.from("approvals").select("id");
  check("Anon tidak bisa membaca permohonan, surat, atau riwayat", !anonReq?.length && !anonLetters?.length && !anonAppr?.length);

  // Audit trail append-only
  const sktm = mine.find((r) => r.status === "terbit")!;
  const upd = await warga.from("approvals").update({ note: "diubah" }).eq("request_id", sktm.id).select();
  const del = await warga.from("approvals").delete().eq("request_id", sktm.id).select();
  check("Warga tidak bisa mengubah/menghapus riwayat", !!upd.error || !upd.data?.length, upd.error?.message);
  check("Warga tidak bisa menghapus riwayat", !!del.error || !del.data?.length, del.error?.message);
  const svcUpd = await service.from("approvals").update({ note: "diubah" }).eq("request_id", sktm.id);
  const svcDel = await service.from("approvals").delete().eq("request_id", sktm.id);
  check("Bahkan service_role ditolak trigger saat UPDATE approvals", !!svcUpd.error, svcUpd.error?.message);
  check("Bahkan service_role ditolak trigger saat DELETE approvals", !!svcDel.error, svcDel.error?.message);
  const letterUpd = await service.from("letters").update({ sha256: "0".repeat(64) }).eq("request_id", sktm.id);
  check("Surat terbit tidak bisa diubah (trigger)", !!letterUpd.error, letterUpd.error?.message);

  // Tidak ada penulisan langsung ke tabel
  const directIns = await warga.from("letter_requests").update({ status: "terbit" }).eq("id", mine[0].id).select();
  check("Warga tidak bisa mengubah status langsung", !!directIns.error || !directIns.data?.length, directIns.error?.message);
  const roleUpd = await warga.from("profiles").update({ role: "camat" }).eq("id", me.user!.id).select();
  check("Warga tidak bisa menaikkan perannya sendiri", !!roleUpd.error || !roleUpd.data?.length, roleUpd.error?.message);

  // Fungsi penerbitan tidak bisa dipanggil klien
  const fin = await warga.rpc("finalize_issue", {
    p_request_id: sktm.id, p_actor_id: me.user!.id, p_letter_no: "X", p_code: "X", p_pdf_path: "x", p_sha256: "0".repeat(64), p_note: null,
  });
  const nxt = await camat.rpc("next_letter_number", { p_kelurahan_id: KEL_KAU, p_year: 2099 });
  const beg = await camat.rpc("begin_issue", { p_request_id: sktm.id, p_actor_id: me.user!.id });
  check("finalize_issue tertutup untuk pengguna", !!fin.error, fin.error?.code);
  check("next_letter_number tertutup untuk pengguna", !!nxt.error, nxt.error?.code);
  check("begin_issue tertutup untuk pengguna", !!beg.error, beg.error?.code);

  // Transisi status tidak valid
  const rejWarga = await warga.rpc("reject_request", { p_id: mine[0].id, p_note: "Saya menolak sendiri permohonan ini" });
  check("Warga tidak bisa menolak permohonan", !!rejWarga.error, rejWarga.error?.message);
  const rejTerbit = await petugas.rpc("reject_request", { p_id: sktm.id, p_note: "Coba menolak surat yang sudah terbit" });
  check("Surat terbit tidak bisa ditolak", !!rejTerbit.error, rejTerbit.error?.message);
  const cancelTerbit = await warga.rpc("cancel_request", { p_id: sktm.id });
  check("Surat terbit tidak bisa dibatalkan", !!cancelTerbit.error, cancelTerbit.error?.message);
  const resubNot = await warga.rpc("resubmit_request", { p_id: sktm.id, p_form: {}, p_docs: [], p_note: null });
  check("Hanya permohonan ditolak yang bisa diajukan ulang", !!resubNot.error, resubNot.error?.message);

  // --- Revisi 1: isolasi wilayah (skenario uji 7) ---------------------------------
  const sdmRows = await idsOf(petugas);
  const kraRows = await idsOf(adminKra);
  check("Admin Sidomulyo hanya melihat Sidomulyo", sdmRows.length > 0 && sdmRows.every((r) => r.kelurahan_id === KEL_SDM), `${sdmRows.length} baris`);
  check("Admin Karang Anyar tidak melihat Sidomulyo", kraRows.length > 0 && kraRows.every((r) => r.kelurahan_id !== KEL_SDM), `${kraRows.length} baris`);
  check("Admin tidak melihat permohonan yang masih di tahap RT", [...sdmRows, ...kraRows].every((r) => ["menunggu_kelurahan", "ditolak_kelurahan", "terbit"].includes(r.status)));
  const rt01Rows = await idsOf(rt01);
  const rt02Rows = await idsOf(rt02);
  check("RT 01 hanya melihat permohonan unit RT 01", rt01Rows.length > 0 && rt01Rows.every((r) => r.rt_unit_id === RT_SDM01), `${rt01Rows.length} baris`);
  check("RT 02 tidak melihat permohonan RT 01", rt02Rows.every((r) => r.rt_unit_id !== RT_SDM01));
  const bRows = await idsOf(wargaB);
  check("Warga Karang Anyar tidak melihat permohonan Sidomulyo", bRows.every((r) => r.kelurahan_id !== KEL_SDM && r.rt_unit_id !== RT_SDM01));

  // Camat: tidak ada akses ke tabel mentah (skenario uji 8)
  const [cReq, cDoc, cAppr, cLet, cRtl] = await Promise.all([
    camat.from("letter_requests").select("id"),
    camat.from("request_documents").select("id"),
    camat.from("approvals").select("id"),
    camat.from("letters").select("id"),
    camat.from("rt_letters").select("id"),
  ]);
  check("Camat tidak bisa membaca permohonan, berkas, riwayat, maupun surat", ![cReq, cDoc, cAppr, cLet, cRtl].some((r) => r.data?.length));

  // Transisi tahap RT
  const rtWaiting = rt01Rows.find((r) => r.status === "menunggu_rt");
  if (rtWaiting) {
    const otherRt = await rt02.rpc("reject_request", { p_id: rtWaiting.id, p_note: "RT lain mencoba menolak permohonan" });
    check("RT lain tidak bisa memproses permohonan unit lain", !!otherRt.error, otherRt.error?.message);
    const adminEarly = await petugas.rpc("reject_request", { p_id: rtWaiting.id, p_note: "Admin mencoba menolak sebelum tahap RT" });
    check("Admin tidak bisa memproses permohonan yang masih di tahap RT", !!adminEarly.error, adminEarly.error?.message);
    const shortNote = await rt01.rpc("reject_request", { p_id: rtWaiting.id, p_note: "pendek" });
    check("Catatan penolakan < 10 karakter ditolak", !!shortNote.error, shortNote.error?.message);
  } else {
    console.log("LEWAT  3 uji tahap RT: tidak ada permohonan menunggu_rt di RT 01 (jalankan npm run seed:demo)");
  }
  const rtFns = await Promise.all([
    rt01.rpc("begin_rt_approval", { p_request_id: sktm.id, p_actor_id: me.user!.id }),
    rt01.rpc("finalize_rt_approval", { p_request_id: sktm.id, p_actor_id: me.user!.id, p_letter_no: "X", p_pdf_path: "x", p_sha256: "0".repeat(64), p_note: null }),
    rt01.rpc("next_rt_letter_number", { p_rt_unit: RT_SDM01, p_year: 2099 }),
  ]);
  check("Fungsi persetujuan RT tertutup untuk pengguna", rtFns.every((r) => !!r.error), rtFns.map((r) => r.error?.code).join(","));
  const atKel = sdmRows.find((r) => r.status === "menunggu_kelurahan");
  if (atKel) {
    const { data: rtUser } = await rt01.auth.getUser();
    const twice = await service.rpc("finalize_rt_approval", {
      p_request_id: atKel.id, p_actor_id: rtUser.user!.id, p_letter_no: "999/RT01/RW01/X/2099", p_pdf_path: "rt/x.pdf", p_sha256: "0".repeat(64), p_note: null,
    });
    check("Persetujuan ganda ditolak (guard status asal)", !!twice.error, twice.error?.message);
  }
  const { data: rtl } = await service.from("rt_letters").select("request_id").limit(1).single();
  if (rtl) {
    const leak = await warga2.from("rt_letters").select("id").eq("request_id", rtl.request_id);
    const anonRtl = await anon.from("rt_letters").select("id");
    const ownerOk = (await idsOf(warga2)).some((r) => r.id === rtl.request_id);
    check("Surat pengantar RT tidak terbaca warga lain maupun anon", (ownerOk || !leak.data?.length) && !anonRtl.data?.length);
  }

  // Registrasi: RT dari kelurahan lain & peran selain warga diabaikan server (skenario uji 1)
  const email = `uji.${Date.now()}@demo.id`;
  const { data: created } = await service.auth.admin.createUser({
    email, password: "Uji12345!", email_confirm: true,
    user_metadata: { nama: "Uji Registrasi", nik: null, kelurahan_id: KEL_SDM, rt_unit_id: RT_KRA03, role: "camat" },
  });
  const { data: prof } = await service.from("profiles").select("role, rt_unit_id").eq("id", created.user!.id).single();
  check("Registrasi: RT dari kelurahan lain ditolak", prof?.rt_unit_id === null);
  check("Registrasi publik selalu berperan warga", prof?.role === "warga", prof?.role);
  await service.auth.admin.deleteUser(created.user!.id);
  const svcStatus = await service.from("letter_requests").update({ status: "diajukan" }).eq("id", sktm.id);
  check("Status terbit final (trigger), bahkan untuk service_role", !!svcStatus.error, svcStatus.error?.message);

  // Storage
  const { data: doc } = await warga.from("request_documents").select("storage_path").eq("request_id", sktm.id).limit(1).single();
  const own = await warga.storage.from("requests").createSignedUrl(doc!.storage_path, 60);
  const camatDoc = await camat.storage.from("requests").createSignedUrl(doc!.storage_path, 60);
  check("Camat tidak bisa membuka KTP/KK", !camatDoc.data?.signedUrl);
  const other = await warga2.storage.from("requests").createSignedUrl(doc!.storage_path, 60);
  const pub = await anon.storage.from("requests").createSignedUrl(doc!.storage_path, 60);
  check("Pemilik bisa membuat signed URL berkasnya", !!own.data?.signedUrl);
  check("Warga lain tidak bisa membuka KTP/KK orang lain", !other.data?.signedUrl);
  check("Anon tidak bisa membuka KTP/KK", !pub.data?.signedUrl);
  const rawPublic = await fetch(`${URL}/storage/v1/object/public/requests/${doc!.storage_path}`);
  check("Bucket berkas tidak publik", rawPublic.status >= 400, `HTTP ${rawPublic.status}`);
  const upOther = await warga2.storage.from("requests").upload(`${sktm.id}/ktp-aaaaaaaaaaaa.png`, new Uint8Array([0x89, 0x50, 0x4e, 0x47]), { contentType: "image/png" });
  check("Warga lain tidak bisa mengunggah ke folder permohonan orang lain", !!upOther.error, upOther.error?.message);

  // Penomoran atomik: 20 panggilan paralel → 20 nomor unik
  const nums = await Promise.all(Array.from({ length: 20 }, () => service.rpc("next_letter_number", { p_kelurahan_id: KEL_KAU, p_year: 2099 })));
  const values = nums.map((n) => n.data as number);
  check("Nomor surat atomik: 20 panggilan paralel tanpa duplikat", new Set(values).size === 20 && values.every(Number.isInteger), `${Math.min(...values)}..${Math.max(...values)}`);
  await service.from("letter_counters").delete().eq("kelurahan_id", KEL_KAU).eq("year", 2099);

  // Hash PDF
  const { data: letter } = await warga.from("letters").select("pdf_path, sha256").eq("request_id", sktm.id).single();
  const signed = await warga.storage.from("letters").createSignedUrl(letter!.pdf_path, 60);
  const bytes = new Uint8Array(await (await fetch(signed.data!.signedUrl)).arrayBuffer());
  const hash = createHash("sha256").update(bytes).digest("hex");
  check("PDF yang diunduh warga punya hash sama dengan yang tersimpan", hash === letter!.sha256);
  bytes[Math.floor(bytes.length / 2)] ^= 1;
  check("Mengubah 1 bit PDF membuat hash berbeda", createHash("sha256").update(bytes).digest("hex") !== letter!.sha256);
  const otherLetter = await warga2.storage.from("letters").createSignedUrl(letter!.pdf_path, 60);
  check("Warga lain tidak bisa mengunduh surat orang lain", !otherLetter.data?.signedUrl);

  console.log(failed ? `\n${failed} pemeriksaan GAGAL` : "\nSemua pemeriksaan lulus");
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
