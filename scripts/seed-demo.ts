/**
 * Seed data demo SuratIn (revisi 1: Warga → RT/RW → Kelurahan → Terbit).
 * Menjalankan alur ASLI lewat fungsi database dan kode penerbitan yang sama dengan aplikasi,
 * sehingga riwayat, nomor surat, surat pengantar RT, dan PDF terbit sama persis seperti pemakaian nyata.
 *
 *   npm run reset:demo && npm run seed:demo
 *
 * Membutuhkan NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY,
 * dan SUPABASE_DB_URL (untuk memundurkan jam riwayat agar dashboard monitoring terisi).
 */
import { deflateSync } from "node:zlib";
import { randomUUID, randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { Client } from "pg";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { issueLetter, loadLetterContext, sha256Hex } from "../lib/letters/issue";
import { approveByRt, renderRtLetterPdf } from "../lib/letters/rt-letter";
import type { Profile } from "../lib/types";
import { addDays, todayLocal } from "../lib/format";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!URL || !ANON || !SERVICE) {
  console.error("Atur NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, dan SUPABASE_SERVICE_ROLE_KEY di .env.local");
  process.exit(1);
}

const PASSWORD = "Demo1234!";
const KEC = "0b1f0000-0000-4000-8000-000000000001";
const KEL = { sdm: "0b1f0000-0000-4000-8000-000000000011", kra: "0b1f0000-0000-4000-8000-000000000012" };
const RT = {
  sdm01: { id: "0b1f0000-0000-4000-8000-000000000101", kel: KEL.sdm, rt: "01", rw: "01" },
  sdm02: { id: "0b1f0000-0000-4000-8000-000000000102", kel: KEL.sdm, rt: "02", rw: "01" },
  kra03: { id: "0b1f0000-0000-4000-8000-000000000103", kel: KEL.kra, rt: "03", rw: "02" },
  kra04: { id: "0b1f0000-0000-4000-8000-000000000104", kel: KEL.kra, rt: "04", rw: "02" },
};
type RtKey = keyof typeof RT;

const admin = createClient(URL, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } });

interface Warga {
  email: string;
  nama: string;
  nik: string;
  tempat_lahir: string;
  tanggal_lahir: string;
  pekerjaan: string;
  jalan: string;
  jk: "Laki-laki" | "Perempuan";
  rt: RtKey;
}

/** Warga fiktif. Nama, NIK, dan alamat tidak merujuk ke orang sungguhan. */
const WARGA = {
  siti: { email: "warga@demo.id", nama: "Siti Aminah", nik: "6472015708850012", tempat_lahir: "Sidomulyo", tanggal_lahir: "1985-08-17", pekerjaan: "Pedagang sayur", jalan: "Jl. Melati Gg. Mawar No. 7", jk: "Perempuan", rt: "sdm01" },
  budi: { email: "warga2@demo.id", nama: "Budi Santoso", nik: "6472011203900007", tempat_lahir: "Sidomulyo", tanggal_lahir: "1990-03-12", pekerjaan: "Buruh harian lepas", jalan: "Jl. Kamboja No. 21", jk: "Laki-laki", rt: "sdm02" },
  yohana: { email: "warga.b@demo.id", nama: "Yohana Pratiwi", nik: "6472016105960002", tempat_lahir: "Karang Anyar", tanggal_lahir: "1996-05-21", pekerjaan: "Karyawan swasta", jalan: "Jl. Kenanga Gg. Damai No. 3", jk: "Perempuan", rt: "kra03" },
  rahmat: { email: "rahmat@demo.id", nama: "Rahmat Hidayat", nik: "6472012506780003", tempat_lahir: "Sidomulyo", tanggal_lahir: "1978-06-25", pekerjaan: "Pengemudi ojek daring", jalan: "Jl. Melati Blok B No. 4", jk: "Laki-laki", rt: "sdm01" },
  aisyah: { email: "aisyah@demo.id", nama: "Nur Aisyah", nik: "6472014411990005", tempat_lahir: "Sidomulyo", tanggal_lahir: "1999-11-04", pekerjaan: "Pencari kerja", jalan: "Jl. Kamboja Gg. Sejahtera No. 9", jk: "Perempuan", rt: "sdm02" },
  fajar: { email: "fajar@demo.id", nama: "Fajar Ramadhan", nik: "6472011012950008", tempat_lahir: "Sidomulyo", tanggal_lahir: "1995-12-10", pekerjaan: "Teknisi listrik", jalan: "Jl. Cendana No. 46", jk: "Laki-laki", rt: "sdm01" },
  agustina: { email: "agustina@demo.id", nama: "Agustina Lerang", nik: "6472016208870009", tempat_lahir: "Karang Anyar", tanggal_lahir: "1987-08-22", pekerjaan: "Guru honorer", jalan: "Jl. Flamboyan No. 15", jk: "Perempuan", rt: "kra03" },
  dedi: { email: "dedi@demo.id", nama: "Dedi Kurniawan", nik: "6472010107820011", tempat_lahir: "Karang Anyar", tanggal_lahir: "1982-07-01", pekerjaan: "Nelayan", jalan: "Jl. Nelayan Gg. 2 No. 3", jk: "Laki-laki", rt: "kra04" },
  wahyuni: { email: "wahyuni@demo.id", nama: "Wahyuni Saputri", nik: "6472015503010004", tempat_lahir: "Karang Anyar", tanggal_lahir: "2001-03-15", pekerjaan: "Wiraswasta", jalan: "Jl. Teratai No. 11", jk: "Perempuan", rt: "kra04" },
  maria: { email: "maria@demo.id", nama: "Maria Ulfa", nik: "6472016804920006", tempat_lahir: "Karang Anyar", tanggal_lahir: "1972-04-28", pekerjaan: "Petani", jalan: "Jl. Kenanga Gg. Melati No. 2", jk: "Perempuan", rt: "kra03" },
} satisfies Record<string, Warga>;

const alamatOf = (w: Warga) => `${w.jalan}, RT ${RT[w.rt].rt}/RW ${RT[w.rt].rw}`;

const RT_STAF: Record<RtKey, { email: string; nama: string }> = {
  sdm01: { email: "rt01.sidomulyo@demo.id", nama: "Slamet Riyadi" },
  sdm02: { email: "rt02.sidomulyo@demo.id", nama: "Hartono" },
  kra03: { email: "rt03.karanganyar@demo.id", nama: "Yusuf Maulana" },
  kra04: { email: "rt04.karanganyar@demo.id", nama: "Bambang Sutrisno" },
};

const ADMIN = {
  sdm: { email: "admin.sidomulyo@demo.id", nama: "Dewi Lestari", kel: KEL.sdm, jabatan: "Petugas Pelayanan Kel. Sidomulyo", nip: "199204102019032008" },
  kra: { email: "admin.karanganyar@demo.id", nama: "Andi Saputra", kel: KEL.kra, jabatan: "Petugas Pelayanan Kel. Karang Anyar", nip: "199007152018011003" },
};

let userList: Array<{ id: string; email?: string }> | null = null;

async function ensureUser(email: string, meta: Record<string, unknown>, profile: Record<string, unknown>) {
  if (!userList) {
    const { data } = await admin.auth.admin.listUsers({ perPage: 500 });
    userList = data?.users ?? [];
  }
  let user = userList.find((u) => u.email === email);
  if (!user) {
    const { data, error } = await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true, user_metadata: meta });
    if (error) throw new Error(`Gagal membuat ${email}: ${error.message}`);
    user = data.user;
    userList.push(user);
  }
  const { error } = await admin.from("profiles").update(profile).eq("id", user.id);
  if (error) throw new Error(`Gagal memperbarui profil ${email}: ${error.message}`);
  return user.id;
}

async function ensureWarga(w: Warga) {
  const unit = RT[w.rt];
  return ensureUser(
    w.email,
    { nama: w.nama, nik: w.nik, kelurahan_id: unit.kel, rt_unit_id: unit.id },
    {
      role: "warga",
      nama: w.nama,
      nik: w.nik,
      tempat_lahir: w.tempat_lahir,
      tanggal_lahir: w.tanggal_lahir,
      pekerjaan: w.pekerjaan,
      alamat: alamatOf(w),
      kelurahan_id: unit.kel,
      kecamatan_id: null,
      rt_unit_id: unit.id,
      jabatan: null,
      nip: null,
    },
  );
}

async function sessionFor(email: string) {
  const client = createClient(URL, ANON, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await client.auth.signInWithPassword({ email, password: PASSWORD });
  if (error) throw new Error(`Gagal masuk sebagai ${email}: ${error.message}`);
  return client;
}

const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

function ttl(w: Warga) {
  const [y, m, d] = w.tanggal_lahir.split("-").map(Number);
  return `${w.tempat_lahir}, ${d} ${BULAN[m - 1]} ${y}`;
}

/** Isian dasar sesuai form_schema tiap jenis surat (kunci harus persis, validate_form menolak kunci asing). */
const FORM = {
  sktm: (w: Warga, x: { penghasilan: string; tanggungan: string; keperluan: string }) => ({
    nama: w.nama, nik: w.nik, ttl: ttl(w), pekerjaan: w.pekerjaan, alamat: alamatOf(w), kecamatan: "Maju Jaya", ...x,
  }),
  domisili: (w: Warga, x: { lama_tinggal: string; keperluan: string }) => ({
    nama: w.nama, nik: w.nik, ttl: ttl(w), jenis_kelamin: w.jk, pekerjaan: w.pekerjaan, alamat: alamatOf(w), kecamatan: "Maju Jaya", ...x,
  }),
  penghasilan_ortu: (w: Warga, x: { penghasilan: string; nama_mahasiswa: string; nim: string; kampus: string; prodi: string; keperluan: string; nama_beasiswa?: string }) => ({
    nama: w.nama, nik: w.nik, pekerjaan: w.pekerjaan, alamat: alamatOf(w), kecamatan: "Maju Jaya", nama_beasiswa: "", ...x,
  }),
  skck: (w: Warga, x: { agama: string; status_perkawinan: string; keperluan: string; instansi_tujuan?: string }) => ({
    nama: w.nama, nik: w.nik, ttl: ttl(w), jenis_kelamin: w.jk, pekerjaan: w.pekerjaan, alamat: alamatOf(w), kecamatan: "Maju Jaya", instansi_tujuan: "", ...x,
  }),
  izin_keramaian: (w: Warga, x: Record<string, string>) => ({
    nama: w.nama, nik: w.nik, alamat: alamatOf(w), kecamatan: "Maju Jaya", penanggung_jawab: w.nama, ...x,
  }),
};

// --- Berkas dummy ---------------------------------------------------------

/** PNG sederhana berbentuk kartu identitas (blok warna, tanpa data asli). */
function dummyCardPng(seed: number) {
  const w = 640;
  const h = 400;
  const raw = Buffer.alloc((w * 3 + 1) * h);
  const put = (x: number, y: number, c: [number, number, number]) => {
    const i = y * (w * 3 + 1) + 1 + x * 3;
    raw[i] = c[0];
    raw[i + 1] = c[1];
    raw[i + 2] = c[2];
  };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let c: [number, number, number] = [214, 232, 240];
      if (y < 56) c = [38, 92, 140];
      if (x > 460 && x < 600 && y > 90 && y < 270) c = [176, 190, 205];
      if (x > 490 && x < 570 && y > 120 && y < 200) c = [130, 145, 160];
      for (let line = 0; line < 8; line++) {
        const ly = 90 + line * 32;
        const len = 200 + ((seed * 37 + line * 53) % 180);
        if (y >= ly && y < ly + 12 && x > 36 && x < 36 + len) c = line % 2 ? [90, 110, 130] : [60, 75, 95];
      }
      if ((x + y + seed) % 97 === 0) c = [c[0] - 20, c[1] - 20, c[2] - 20] as [number, number, number];
      put(x, y, c);
    }
  }
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(td) >>> 0);
    return Buffer.concat([len, td, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function crc32(buf: Buffer) {
  let c = ~0;
  for (const b of buf) {
    c ^= b;
    for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1;
  }
  return ~c;
}

async function dummyKkPdf(nama: string) {
  const doc = await PDFDocument.create();
  const page = doc.addPage([842, 595]);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  page.drawText("KARTU KELUARGA (CONTOH, DATA FIKTIF)", { x: 40, y: 540, size: 18, font: bold });
  page.drawText(`Kepala keluarga: ${nama}`, { x: 40, y: 505, size: 12, font });
  page.drawText("Dokumen dummy untuk demo SuratIn. Bukan dokumen kependudukan asli.", { x: 40, y: 485, size: 10, font, color: rgb(0.6, 0.1, 0.1) });
  for (let r = 0; r < 6; r++) {
    page.drawRectangle({ x: 40, y: 420 - r * 40, width: 760, height: 36, borderColor: rgb(0.6, 0.6, 0.6), borderWidth: 0.6 });
  }
  return Buffer.from(await doc.save());
}

async function uploadDocs(client: SupabaseClient, requestId: string, nama: string, seed: number) {
  const tag = () => randomBytes(6).toString("hex");
  const ktpPath = `${requestId}/ktp-${tag()}.png`;
  const kkPath = `${requestId}/kk-${tag()}.pdf`;
  const ktp = dummyCardPng(seed);
  const kk = await dummyKkPdf(nama);
  for (const [path, body, type] of [
    [ktpPath, ktp, "image/png"],
    [kkPath, kk, "application/pdf"],
  ] as const) {
    const { error } = await client.storage.from("requests").upload(path, body, { contentType: type });
    if (error) throw new Error(`Unggah ${path} gagal: ${error.message}`);
  }
  return [
    { kind: "ktp", storage_path: ktpPath, file_name: "foto-ktp.png", mime: "image/png", size_bytes: ktp.length },
    { kind: "kk", storage_path: kkPath, file_name: "kartu-keluarga.pdf", mime: "application/pdf", size_bytes: kk.length },
  ];
}

const typeIds = new Map<string, string>();
async function typeId(kode: string) {
  if (!typeIds.has(kode)) {
    const { data } = await admin.from("letter_types").select("id").eq("kode", kode).single();
    typeIds.set(kode, data!.id as string);
  }
  return typeIds.get(kode)!;
}

async function submit(client: SupabaseClient, kode: string, form: Record<string, string>, nama: string, seed: number) {
  const id = randomUUID();
  const docs = await uploadDocs(client, id, nama, seed);
  const { error } = await client.rpc("submit_request", { p_id: id, p_type_id: await typeId(kode), p_form: form, p_docs: docs });
  if (error) throw new Error(`submit_request ${kode}: ${error.message}`);
  return id;
}

function must<T>(res: { error: { message: string } | null; data?: T }, label: string) {
  if (res.error) throw new Error(`${label}: ${res.error.message}`);
  return res.data;
}

/**
 * Memundurkan jam riwayat agar dashboard monitoring (rata-rata waktu, SLA) bermakna.
 * `hoursAgo[i]` untuk baris approvals ke-i (urut waktu); null = biarkan.
 * Baris penerbitan (approve_kelurahan + issue) tidak pernah digeser agar tanggal di PDF tetap cocok.
 * Trigger append-only dimatikan SEMENTARA di satu transaksi, khusus untuk data demo.
 */
async function backdate(db: Client, requestId: string, hoursAgo: Array<number | null>, stageHoursAgo?: number) {
  await db.query("begin");
  try {
    await db.query("alter table public.approvals disable trigger user");
    await db.query("alter table public.letter_requests disable trigger user");
    const { rows } = await db.query("select id, action from public.approvals where request_id = $1 order by created_at, id", [requestId]);
    for (let i = 0; i < rows.length; i++) {
      const h = hoursAgo[i];
      if (h === null || h === undefined || rows[i].action === "issue") continue;
      await db.query("update public.approvals set created_at = now() - make_interval(secs => $2 * 3600) where id = $1", [rows[i].id, h]);
    }
    const first = hoursAgo.find((h) => h !== null && h !== undefined);
    if (first !== undefined && first !== null) {
      await db.query("update public.letter_requests set submitted_at = now() - make_interval(secs => $2 * 3600) where id = $1", [requestId, first]);
    }
    if (stageHoursAgo !== undefined) {
      await db.query(
        "update public.letter_requests set stage_entered_at = now() - make_interval(secs => $2 * 3600), updated_at = now() - make_interval(secs => $2 * 3600) where id = $1",
        [requestId, stageHoursAgo],
      );
    }
    await db.query("alter table public.approvals enable trigger user");
    await db.query("alter table public.letter_requests enable trigger user");
    await db.query("commit");
  } catch (e) {
    await db.query("rollback");
    throw e;
  }
}

/**
 * Setelah riwayat dimundurkan, tanggal Surat Pengantar RT/RW (kolom issued_at dan tanggal yang tercetak di PDF)
 * disamakan dengan waktu persetujuan RT terakhir. Tanpa ini timeline berkata "disetujui RT 13 Okt" sementara
 * suratnya bertanggal hari ini. PDF dirender ulang dengan nomor yang sama, lalu sidik SHA-256 diperbarui.
 */
async function syncRtLetterDates(db: Client) {
  const { rows } = await db.query(
    `select rl.id, rl.request_id, rl.letter_no, rl.pdf_path, a.created_at, a.actor_id
       from public.rt_letters rl
       join lateral (
         select created_at, actor_id from public.approvals
          where request_id = rl.request_id and action = 'approve_rt'
          order by created_at desc limit 1
       ) a on true
      where abs(extract(epoch from rl.issued_at - a.created_at)) > 60`,
  );
  for (const row of rows) {
    const ctx = await loadLetterContext(admin, row.request_id);
    const { data: actor } = await admin.from("profiles").select("*").eq("id", row.actor_id).single<Profile>();
    if (!ctx || !actor) continue;
    const issuedAt = new Date(row.created_at);
    const pdf = await renderRtLetterPdf(ctx, actor, row.letter_no, issuedAt);
    const sha256 = sha256Hex(pdf);
    const pdfPath = `rt/${issuedAt.getFullYear()}/${row.request_id}/${sha256.slice(0, 16)}.pdf`;
    const { error } = await admin.storage.from("letters").upload(pdfPath, pdf, { contentType: "application/pdf", upsert: true });
    if (error) throw new Error(`Gagal mengunggah ulang surat pengantar ${row.letter_no}: ${error.message}`);
    await db.query("begin");
    try {
      await db.query("alter table public.rt_letters disable trigger user");
      await db.query("update public.rt_letters set pdf_path = $2, sha256 = $3, issued_at = $4 where id = $1", [row.id, pdfPath, sha256, issuedAt]);
      await db.query("alter table public.rt_letters enable trigger user");
      await db.query("commit");
    } catch (e) {
      await db.query("rollback");
      throw e;
    }
    if (row.pdf_path !== pdfPath) await admin.storage.from("letters").remove([row.pdf_path]);
  }
  return rows.length;
}

async function main() {
  console.log("Menyiapkan akun demo…");
  const ids = {} as Record<keyof typeof WARGA, string>;
  for (const [k, w] of Object.entries(WARGA)) ids[k as keyof typeof WARGA] = await ensureWarga(w);

  const rtIds = {} as Record<RtKey, string>;
  for (const [k, s] of Object.entries(RT_STAF) as Array<[RtKey, { email: string; nama: string }]>) {
    const unit = RT[k];
    rtIds[k] = await ensureUser(s.email, { nama: s.nama }, {
      role: "rt_rw", nama: s.nama, nik: null, kelurahan_id: unit.kel, kecamatan_id: null, rt_unit_id: unit.id,
      jabatan: `Ketua RT ${unit.rt}/RW ${unit.rw}`, nip: null,
    });
  }
  const adminIds = {} as Record<keyof typeof ADMIN, string>;
  for (const [k, a] of Object.entries(ADMIN) as Array<[keyof typeof ADMIN, (typeof ADMIN)["sdm"]]>) {
    adminIds[k] = await ensureUser(a.email, { nama: a.nama }, {
      role: "admin_kelurahan", nama: a.nama, nik: null, kelurahan_id: a.kel, kecamatan_id: null, rt_unit_id: null, jabatan: a.jabatan, nip: a.nip,
    });
  }
  await ensureUser("camat@demo.id", { nama: "Drs. Hendra Wijaya, M.Si." }, {
    role: "camat", nama: "Drs. Hendra Wijaya, M.Si.", nik: null, kelurahan_id: null, kecamatan_id: KEC, rt_unit_id: null,
    jabatan: "Camat Maju Jaya", nip: "197203141998031004",
  });
  // Akun admin lama (sebelum revisi 1) diarahkan ke Sidomulyo agar tidak membingungkan.
  if (userList?.some((u) => u.email === "admin.kelurahan@demo.id")) {
    await ensureUser("admin.kelurahan@demo.id", {}, { role: "admin_kelurahan", kelurahan_id: KEL.sdm, rt_unit_id: null, jabatan: "Petugas Pelayanan Kel. Sidomulyo" });
  }

  const { count } = await admin.from("letter_requests").select("id", { count: "exact", head: true });
  if ((count ?? 0) > 0) {
    console.log(`Sudah ada ${count} permohonan. Jalankan "npm run reset:demo" dulu jika ingin data demo baru.`);
    return;
  }

  const ca = readFileSync(path.join(process.cwd(), "scripts", "certs", "supabase-prod-ca-2021.crt"), "utf8");
  const db = new Client({ connectionString: process.env.SUPABASE_DB_URL, ssl: { ca } });
  await db.connect();

  const w = {} as Record<keyof typeof WARGA, SupabaseClient>;
  for (const [k, x] of Object.entries(WARGA)) w[k as keyof typeof WARGA] = await sessionFor(x.email);
  const rt = {} as Record<RtKey, SupabaseClient>;
  for (const [k, s] of Object.entries(RT_STAF)) rt[k as RtKey] = await sessionFor(s.email);
  const adm = { sdm: await sessionFor(ADMIN.sdm.email), kra: await sessionFor(ADMIN.kra.email) };

  const issued: string[] = [];
  let seed = 1;
  const event = addDays(todayLocal(), 10);

  console.log("1/11 SKTM Siti (Sidomulyo RT 01): ditolak RT, ditolak kelurahan, akhirnya terbit");
  const sitiForm = FORM.sktm(WARGA.siti, { penghasilan: "1500000", tanggungan: "4", keperluan: "Pendidikan" });
  const r1 = await submit(w.siti, "sktm", sitiForm, WARGA.siti.nama, seed++);
  must(await rt.sdm01.rpc("reject_request", { p_id: r1, p_note: "Alamat di formulir belum lengkap, mohon cantumkan nomor rumah." }), "reject rt r1");
  must(await w.siti.rpc("resubmit_request", { p_id: r1, p_form: sitiForm, p_docs: [], p_note: "Alamat sudah saya lengkapi." }), "resubmit r1");
  await approveByRt(admin, r1, rtIds.sdm01, "Benar warga kami.");
  must(await adm.sdm.rpc("reject_request", { p_id: r1, p_note: "Foto KTP buram di bagian NIK, mohon foto ulang di tempat terang." }), "reject kel r1");
  const fix = await uploadDocs(w.siti, r1, WARGA.siti.nama, seed++);
  must(await w.siti.rpc("resubmit_request", { p_id: r1, p_form: sitiForm, p_docs: [fix[0]], p_note: "Foto KTP sudah saya ganti." }), "resubmit2 r1");
  await approveByRt(admin, r1, rtIds.sdm01);
  issued.push(`${(await issueLetter(admin, r1, adminIds.sdm)).letter_no}  SKTM, Siti Aminah`);
  await backdate(db, r1, [70, 60, 58, 40, 30, 20, 12, null, null]);

  console.log("2/11 Domisili Budi (Sidomulyo RT 02): terbit");
  const r2 = await submit(w.budi, "domisili", FORM.domisili(WARGA.budi, { lama_tinggal: "6", keperluan: "Perbankan" }), WARGA.budi.nama, seed++);
  await approveByRt(admin, r2, rtIds.sdm02);
  issued.push(`${(await issueLetter(admin, r2, adminIds.sdm)).letter_no}  Domisili, Budi Santoso`);
  await backdate(db, r2, [30, 26, null, null]);

  console.log("3/11 Penghasilan ortu Rahmat (Sidomulyo RT 01): menunggu kelurahan, LEWAT SLA");
  const r3 = await submit(w.rahmat, "penghasilan_ortu", FORM.penghasilan_ortu(WARGA.rahmat, {
    penghasilan: "2400000", nama_mahasiswa: "Rizki Hidayat", nim: "2201301045", kampus: "Politeknik Negeri Maju Jaya", prodi: "Teknik Informatika", keperluan: "Keringanan UKT",
  }), WARGA.rahmat.nama, seed++);
  await approveByRt(admin, r3, rtIds.sdm01);
  await backdate(db, r3, [110, 100], 100);

  console.log("4/11 SKCK Aisyah (Sidomulyo RT 02): menunggu RT, LEWAT SLA");
  const r4 = await submit(w.aisyah, "skck", FORM.skck(WARGA.aisyah, { agama: "Islam", status_perkawinan: "Belum kawin", keperluan: "Melamar kerja", instansi_tujuan: "PT Maju Bersama" }), WARGA.aisyah.nama, seed++);
  await backdate(db, r4, [60], 60);

  console.log("5/11 Izin keramaian Fajar (Sidomulyo RT 01): baru masuk");
  await submit(w.fajar, "izin_keramaian", FORM.izin_keramaian(WARGA.fajar, {
    jenis_acara: "Pernikahan", nama_acara: "Resepsi pernikahan Fajar dan Lestari", tanggal_acara: event, jam_mulai: "09:00", jam_selesai: "15:00",
    lokasi: "Halaman rumah, Jl. Cendana No. 46", nama_jalan: "Jl. Cendana", penggunaan_jalan: "Sebagian badan jalan", perkiraan_tamu: "300",
    hiburan: "Organ tunggal", no_hp: "081234567801",
  }), WARGA.fajar.nama, seed++);

  console.log("6/11 SKCK Yohana (Karang Anyar RT 03): terbit");
  const r6 = await submit(w.yohana, "skck", FORM.skck(WARGA.yohana, { agama: "Kristen", status_perkawinan: "Belum kawin", keperluan: "CPNS" }), WARGA.yohana.nama, seed++);
  await approveByRt(admin, r6, rtIds.kra03);
  issued.push(`${(await issueLetter(admin, r6, adminIds.kra)).letter_no}  Pengantar SKCK, Yohana Pratiwi`);
  await backdate(db, r6, [50, 45, null, null]);

  console.log("7/11 Domisili Agustina (Karang Anyar RT 03): ditolak RT");
  const r7 = await submit(w.agustina, "domisili", FORM.domisili(WARGA.agustina, { lama_tinggal: "9", keperluan: "Pendidikan" }), WARGA.agustina.nama, seed++);
  must(await rt.kra03.rpc("reject_request", { p_id: r7, p_note: "Lama tinggal tidak sesuai catatan RT, mohon dicek kembali." }), "reject r7");
  await backdate(db, r7, [20, 8], 8);

  console.log("8/11 SKTM Dedi (Karang Anyar RT 04): ditolak kelurahan");
  const r8 = await submit(w.dedi, "sktm", FORM.sktm(WARGA.dedi, { penghasilan: "1200000", tanggungan: "3", keperluan: "Bantuan sosial" }), WARGA.dedi.nama, seed++);
  await approveByRt(admin, r8, rtIds.kra04);
  must(await adm.kra.rpc("reject_request", { p_id: r8, p_note: "Foto Kartu Keluarga terpotong di bagian bawah. Mohon unggah ulang seluruh halaman." }), "reject r8");
  await backdate(db, r8, [40, 34, 10], 10);

  console.log("9/11 Izin keramaian Wahyuni (Karang Anyar RT 04): terbit");
  const r9 = await submit(w.wahyuni, "izin_keramaian", FORM.izin_keramaian(WARGA.wahyuni, {
    jenis_acara: "Syukuran", nama_acara: "Syukuran pembukaan usaha", tanggal_acara: event, jam_mulai: "16:00", jam_selesai: "21:00",
    lokasi: "Depan toko, Jl. Teratai No. 11", nama_jalan: "Jl. Teratai", penggunaan_jalan: "Tidak menggunakan jalan", perkiraan_tamu: "80",
    hiburan: "Sound system", no_hp: "081234567802",
  }), WARGA.wahyuni.nama, seed++);
  await approveByRt(admin, r9, rtIds.kra04);
  issued.push(`${(await issueLetter(admin, r9, adminIds.kra)).letter_no}  Pengantar Izin Keramaian, Wahyuni Saputri`);
  await backdate(db, r9, [28, 20, null, null]);

  console.log("10/11 Penghasilan ortu Maria (Karang Anyar RT 03): menunggu RT, foto KTP perlu dicek (AI)");
  const r10 = await submit(w.maria, "penghasilan_ortu", FORM.penghasilan_ortu(WARGA.maria, {
    penghasilan: "1800000", nama_mahasiswa: "Andi Pratama", nim: "2301101022", kampus: "Universitas Maju Jaya", prodi: "Akuntansi", keperluan: "Beasiswa", nama_beasiswa: "Beasiswa Daerah",
  }), WARGA.maria.nama, seed++);
  await admin
    .from("request_documents")
    .update({
      ai_status: "perlu_dicek",
      ai_result: { document_type: "ktp", matches_expected: true, confidence: 0.55, reasons: ["Foto tampak buram, sebaiknya foto ulang"], message: "Foto tampak buram, sebaiknya foto ulang." },
      ai_checked_at: new Date().toISOString(),
    })
    .eq("request_id", r10)
    .eq("kind", "ktp");
  await backdate(db, r10, [5], 5);

  console.log("11/11 SKTM Budi (Sidomulyo RT 02): dibatalkan pemohon");
  const r11 = await submit(w.budi, "sktm", FORM.sktm(WARGA.budi, { penghasilan: "1700000", tanggungan: "2", keperluan: "Kesehatan" }), WARGA.budi.nama, seed++);
  must(await w.budi.rpc("cancel_request", { p_id: r11 }), "cancel r11");

  console.log(`Tanggal surat pengantar RT disamakan dengan riwayat: ${await syncRtLetterDates(db)} surat`);
  await db.end();

  const { data: first } = await admin.from("letters").select("verification_code").order("issued_at").limit(1).single();
  console.log("\nSelesai. Surat terbit:");
  for (const line of issued) console.log(`  ${line}`);
  console.log(`\nContoh verifikasi: /verifikasi/${first?.verification_code}`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
