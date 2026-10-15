import { createHash, randomInt } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { appConfig } from "@/lib/config";
import { nowParts, toRoman } from "@/lib/format";
import type { Kecamatan, Kelurahan, Letter, LetterRequest, LetterType, Profile, RtLetter, RtUnit } from "@/lib/types";
import { renderLetterPdf, type LetterPdfInput } from "./pdf";
import { renderTemplate } from "./templates";

export interface LetterContext {
  request: LetterRequest;
  type: LetterType;
  kelurahan: Kelurahan;
  kecamatan: Kecamatan;
  rtUnit: RtUnit | null;
  rtLetter: RtLetter | null;
}

export async function loadLetterContext(db: SupabaseClient, requestId: string): Promise<LetterContext | null> {
  const { data: request } = await db.from("letter_requests").select("*").eq("id", requestId).maybeSingle();
  if (!request) return null;
  const [{ data: type }, { data: kelurahan }, { data: rtUnit }, { data: rtLetter }] = await Promise.all([
    db.from("letter_types").select("*").eq("id", request.type_id).single(),
    db.from("regions_kelurahan").select("*").eq("id", request.kelurahan_id).single(),
    request.rt_unit_id
      ? db.from("rt_units").select("*").eq("id", request.rt_unit_id).maybeSingle()
      : Promise.resolve({ data: null }),
    db.from("rt_letters").select("*").eq("request_id", requestId).maybeSingle(),
  ]);
  if (!type || !kelurahan) return null;
  const { data: kecamatan } = await db.from("regions_kecamatan").select("*").eq("id", kelurahan.kecamatan_id).single();
  if (!kecamatan) return null;
  return { request, type, kelurahan, kecamatan, rtUnit: rtUnit ?? null, rtLetter: rtLetter ?? null } as LetterContext;
}

/** {klasifikasi}/{urut}/{kode kelurahan}/{bulan romawi}/{tahun}, bulan & tahun dalam WIB. */
export function formatLetterNo(ctx: LetterContext, sequence: number | null, date: Date) {
  const urut = sequence === null ? "…" : String(sequence).padStart(3, "0");
  const { year, month } = nowParts(date);
  return `${ctx.type.kode_klasifikasi}/${urut}/${ctx.kelurahan.kode}/${toRoman(month)}/${year}`;
}

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** Kode verifikasi acak 12 karakter, tidak berurutan dan tidak bisa ditebak dari nomor surat. */
export function generateVerificationCode(length = 12) {
  let code = "";
  for (let i = 0; i < length; i++) code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return code;
}

export function sha256Hex(bytes: Uint8Array) {
  return createHash("sha256").update(bytes).digest("hex");
}

/** Surat final kelurahan: penandatangan lurah, stempel kelurahan. Camat tidak lagi muncul. */
export function buildPdfInput(ctx: LetterContext, letterNo: string, issuedAt: Date, verificationCode?: string): LetterPdfInput {
  const { type, kelurahan, kecamatan, request, rtUnit, rtLetter } = ctx;
  const content = renderTemplate(type.template_key, {
    form: request.form_data,
    kelurahan,
    kecamatan,
    addressee: type.output_kind === "surat_pengantar" ? type.addressee : null,
    rt: rtUnit && rtLetter ? { unit: rtUnit, letterNo: rtLetter.letter_no } : null,
  });
  const { year } = nowParts(issuedAt);

  return {
    content,
    letterNo,
    issuedAt,
    place: kelurahan.nama,
    kop: {
      pemerintah: appConfig.pemerintah,
      lines: [`Kecamatan ${kecamatan.nama}`, `Kelurahan ${kelurahan.nama}`],
      alamat: kelurahan.alamat_kantor,
    },
    signer: { jabatan: `Lurah ${kelurahan.nama}`, nama: kelurahan.kop_nama_lurah, nip: kelurahan.nip_lurah },
    stamp: { ring: `Kecamatan ${kecamatan.nama} • Kelurahan ${kelurahan.nama}`, center: `LURAH\n${year}` },
    issue: verificationCode ? { verificationCode } : undefined,
  };
}

/** PDF pratinjau: tanpa nomor urut, TTD, stempel, maupun QR. */
export async function renderPreview(ctx: LetterContext) {
  const now = new Date();
  return renderLetterPdf(buildPdfInput(ctx, formatLetterNo(ctx, null, now), now));
}

export class IssueError extends Error {}

/**
 * Menerbitkan surat final kelurahan. Dipanggil dengan klien service_role SETELAH peran aktor
 * diverifikasi dari sesi. Fungsi SQL tetap memeriksa ulang status & kewenangan di dalam transaksi.
 *
 * 1. Ambil nomor urut atomik (begin_issue → next_letter_number)
 * 2. Render PDF final (TTD + stempel + QR)
 * 3. Hitung SHA-256 dari byte akhir, unggah ke Storage
 * 4. finalize_issue: guard status asal, letters + approvals, status → terbit (satu transaksi)
 *    Jika gagal, file yang terlanjur terunggah dihapus. Celah nomor urut diterima.
 */
export async function issueLetter(admin: SupabaseClient, requestId: string, actorId: string, note?: string) {
  const { data: actor } = await admin.from("profiles").select("*").eq("id", actorId).single<Profile>();
  if (!actor) throw new IssueError("Akun penandatangan tidak ditemukan");

  const ctx = await loadLetterContext(admin, requestId);
  if (!ctx) throw new IssueError("Permohonan tidak ditemukan");

  const { data: sequence, error: seqError } = await admin.rpc("begin_issue", {
    p_request_id: requestId,
    p_actor_id: actorId,
  });
  if (seqError || typeof sequence !== "number") {
    throw new IssueError(seqError?.message ?? "Gagal mengambil nomor surat");
  }

  const issuedAt = new Date();
  const letterNo = formatLetterNo(ctx, sequence, issuedAt);
  const code = generateVerificationCode();
  const pdf = await renderLetterPdf(buildPdfInput(ctx, letterNo, issuedAt, code));
  const sha256 = sha256Hex(pdf);
  const pdfPath = `${nowParts(issuedAt).year}/${requestId}/${code}.pdf`;

  const { error: uploadError } = await admin.storage.from("letters").upload(pdfPath, pdf, {
    contentType: "application/pdf",
    upsert: false,
  });
  if (uploadError) throw new IssueError(`Gagal menyimpan PDF: ${uploadError.message}`);

  const { data: letter, error: finalizeError } = await admin.rpc("finalize_issue", {
    p_request_id: requestId,
    p_actor_id: actorId,
    p_letter_no: letterNo,
    p_code: code,
    p_pdf_path: pdfPath,
    p_sha256: sha256,
    p_note: note ?? null,
  });
  if (finalizeError || !letter) {
    await admin.storage.from("letters").remove([pdfPath]);
    throw new IssueError(finalizeError?.message ?? "Gagal menerbitkan surat");
  }
  return letter as Letter;
}
