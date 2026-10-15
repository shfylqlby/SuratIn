import type { SupabaseClient } from "@supabase/supabase-js";
import { appConfig } from "@/lib/config";
import { nowParts, toRoman } from "@/lib/format";
import type { Profile, RtLetter } from "@/lib/types";
import { IssueError, loadLetterContext, sha256Hex, type LetterContext } from "./issue";
import { renderLetterPdf } from "./pdf";
import { renderRtLetter } from "./templates";

/** Nomor: {urut 3 digit}/RT{rt}/RW{rw}/{bulan romawi}/{tahun}. */
export function formatRtLetterNo(sequence: number, rt: string, rw: string, date: Date) {
  const { year, month } = nowParts(date);
  return `${String(sequence).padStart(3, "0")}/RT${rt}/RW${rw}/${toRoman(month)}/${year}`;
}

/**
 * Persetujuan RT/RW: membuat PDF Surat Pengantar RT/RW lalu memindahkan permohonan ke kelurahan.
 * Dipanggil dengan klien service_role SETELAH peran rt_rw diverifikasi dari sesi.
 *
 * 1. begin_rt_approval: cek peran/unit/status, ambil nomor urut RT (atomik)
 * 2. Render PDF (TTD ketua RT, tanpa stempel kelurahan, tanpa QR), hitung SHA-256, unggah
 * 3. finalize_rt_approval: guard status asal + rt_letters + approvals + stage_entered_at (satu transaksi)
 *    Jika gagal, file yang terlanjur terunggah dihapus.
 */
export async function approveByRt(admin: SupabaseClient, requestId: string, actorId: string, note?: string) {
  const { data: actor } = await admin.from("profiles").select("*").eq("id", actorId).single<Profile>();
  if (!actor) throw new IssueError("Akun RT/RW tidak ditemukan");

  const ctx = await loadLetterContext(admin, requestId);
  if (!ctx || !ctx.rtUnit) throw new IssueError("Permohonan tidak ditemukan");

  const { data: sequence, error: seqError } = await admin.rpc("begin_rt_approval", {
    p_request_id: requestId,
    p_actor_id: actorId,
  });
  if (seqError || typeof sequence !== "number") {
    throw new IssueError(seqError?.message ?? "Gagal mengambil nomor surat pengantar");
  }

  const issuedAt = new Date();
  const letterNo = formatRtLetterNo(sequence, ctx.rtUnit.rt_no, ctx.rtUnit.rw_no, issuedAt);
  const pdf = await renderRtLetterPdf(ctx, actor, letterNo, issuedAt);
  const sha256 = sha256Hex(pdf);
  const pdfPath = `rt/${nowParts(issuedAt).year}/${requestId}/${sha256.slice(0, 16)}.pdf`;

  const { error: uploadError } = await admin.storage.from("letters").upload(pdfPath, pdf, {
    contentType: "application/pdf",
    upsert: false,
  });
  if (uploadError) throw new IssueError(`Gagal menyimpan surat pengantar: ${uploadError.message}`);

  const { data: rtLetter, error: finalizeError } = await admin.rpc("finalize_rt_approval", {
    p_request_id: requestId,
    p_actor_id: actorId,
    p_letter_no: letterNo,
    p_pdf_path: pdfPath,
    p_sha256: sha256,
    p_note: note ?? null,
  });
  if (finalizeError || !rtLetter) {
    await admin.storage.from("letters").remove([pdfPath]);
    throw new IssueError(finalizeError?.message ?? "Gagal menyetujui permohonan");
  }
  return rtLetter as RtLetter;
}

/** Render PDF Surat Pengantar RT/RW (TTD ketua RT, tanpa stempel kelurahan, tanpa QR). Juga dipakai seed demo. */
export async function renderRtLetterPdf(ctx: LetterContext, actor: Profile, letterNo: string, issuedAt: Date) {
  const { rtUnit, kelurahan, kecamatan, request, type } = ctx;
  if (!rtUnit) throw new IssueError("Unit RT permohonan tidak ditemukan");
  return renderLetterPdf({
    content: renderRtLetter({ form: request.form_data, jenisSurat: type.nama, unit: rtUnit, kelurahan, kecamatan }),
    letterNo,
    issuedAt,
    place: kelurahan.nama,
    kop: {
      pemerintah: `Kelurahan ${kelurahan.nama}, Kecamatan ${kecamatan.nama}`,
      lines: [`Rukun Tetangga ${rtUnit.rt_no} / Rukun Warga ${rtUnit.rw_no}`],
      alamat: `Kelurahan ${kelurahan.nama}, Kecamatan ${kecamatan.nama}`,
    },
    signer: { jabatan: `Ketua RT ${rtUnit.rt_no}/RW ${rtUnit.rw_no}`, nama: actor.nama, nip: "" },
    stamp: null,
    final: {
      note: `Surat pengantar ini dibuat melalui ${appConfig.name} dan menjadi lampiran permohonan ${request.ticket_no} di Kelurahan ${kelurahan.nama}. Sidik SHA-256 berkas dicatat di sistem.`,
    },
  });
}
