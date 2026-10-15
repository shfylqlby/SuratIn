import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { maskNik } from "@/lib/format";
import { sha256Hex } from "./issue";
import type { ApprovalAction, UserRole } from "@/lib/types";

export interface VerificationResult {
  letterNo: string;
  code: string;
  issuedAt: string;
  sha256: string;
  /** true jika file PDF di arsip masih menghasilkan hash yang sama dengan yang dicatat saat terbit */
  archiveIntact: boolean;
  jenis: string;
  pemohon: string;
  nikMasked: string;
  kelurahan: string;
  kecamatan: string;
  /** "RT 01/RW 01", atau null untuk surat lama sebelum alur RT/RW. */
  rt: string | null;
  history: Array<{ action: ApprovalAction; nama: string; jabatan: string | null; role: UserRole; at: string }>;
}

// Rantai publik: pengajuan → RT/RW → kelurahan → terbit. sign_camat tetap dikenali agar surat lama tampil utuh.
const PUBLIC_ACTIONS: ApprovalAction[] = ["submit", "resubmit", "approve_rt", "approve_kelurahan", "sign_camat", "issue"];

export function normalizeQuery(raw: string) {
  const q = raw.trim().toUpperCase().slice(0, 64);
  if (/^[A-Z0-9]{4,6}-?[A-Z0-9]{4,6}$/.test(q)) return { kind: "code" as const, value: q.replace("-", "") };
  if (/^[0-9]{3}\/[0-9]{3,}\/[A-Z0-9-]+\/[IVX]+\/[0-9]{4}$/.test(q)) return { kind: "number" as const, value: q };
  return null;
}

/**
 * Lookup surat untuk verifikasi publik. Memakai service_role di server dan
 * hanya mengembalikan kolom yang aman ditampilkan (NIK disamarkan, tanpa catatan internal).
 */
export async function lookupLetter(raw: string): Promise<VerificationResult | null> {
  const query = normalizeQuery(raw);
  if (!query) return null;
  const admin = createAdminClient();

  const { data: letter } = await admin
    .from("letters")
    .select("letter_no, verification_code, issued_at, sha256, pdf_path, request_id")
    .eq(query.kind === "code" ? "verification_code" : "letter_no", query.value)
    .maybeSingle();
  if (!letter) return null;

  const [{ data: request }, { data: approvals }] = await Promise.all([
    admin
      .from("letter_requests")
      .select("form_data, letter_types(nama), regions_kelurahan(nama, regions_kecamatan(nama)), rt_units(rt_no, rw_no)")
      .eq("id", letter.request_id)
      .single(),
    admin
      .from("approvals")
      .select("action, actor_nama, actor_jabatan, actor_role, created_at")
      .eq("request_id", letter.request_id)
      .order("created_at"),
  ]);

  let archiveIntact = false;
  const { data: file } = await admin.storage.from("letters").download(letter.pdf_path);
  if (file) archiveIntact = sha256Hex(new Uint8Array(await file.arrayBuffer())) === letter.sha256;

  const form = (request?.form_data ?? {}) as Record<string, string>;
  const kel = request?.regions_kelurahan as unknown as { nama: string; regions_kecamatan: { nama: string } } | null;
  const type = request?.letter_types as unknown as { nama: string } | null;
  const unit = request?.rt_units as unknown as { rt_no: string; rw_no: string } | null;

  // Setelah surat terbit, riwayat publik dimulai dari pengajuan terakhir.
  const all = (approvals ?? []).filter((a) => PUBLIC_ACTIONS.includes(a.action as ApprovalAction));
  const lastSubmit = all.findLastIndex((a) => a.action === "submit" || a.action === "resubmit");
  const history = all.slice(Math.max(lastSubmit, 0)).map((a) => ({
    action: a.action as ApprovalAction,
    nama: a.actor_role === "warga" ? "Pemohon" : a.actor_nama,
    jabatan: a.actor_role === "warga" ? null : a.actor_jabatan,
    role: a.actor_role as UserRole,
    at: a.created_at,
  }));

  return {
    letterNo: letter.letter_no,
    code: letter.verification_code,
    issuedAt: letter.issued_at,
    sha256: letter.sha256,
    archiveIntact,
    jenis: type?.nama ?? "-",
    pemohon: form.nama ?? "-",
    nikMasked: maskNik(form.nik),
    kelurahan: kel?.nama ?? "-",
    kecamatan: kel?.regions_kecamatan?.nama ?? "-",
    rt: unit ? `RT ${unit.rt_no}/RW ${unit.rw_no}` : null,
    history,
  };
}
