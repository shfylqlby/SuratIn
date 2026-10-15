import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AiResult, AiStatus } from "@/lib/types";
import { aiConfig } from "./client";
import { checkDocumentImage, isWrongDocument, wrongDocumentMessage } from "./check-document";

function sniffImage(bytes: Uint8Array) {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
  return null;
}

/**
 * Gerbang saat permohonan dikirim: foto KTP/KK yang dikenali AI sebagai dokumen lain ditolak di server,
 * sehingga tidak bisa dilewati dengan memanggil server action langsung.
 *
 * Memakai hasil cek saat unggah (ai_document_checks) bila ada. Bila belum ada (cek di browser dilewati
 * atau belum selesai) atau gagal, gambar diperiksa sekarang. AI mati/gagal → lolos (fail-open), karena AI bukan
 * satu-satunya pemeriksa: RT dan admin kelurahan tetap memeriksa berkas.
 *
 * Pemanggil wajib sudah memastikan storagePath milik pengguna (verifyDocs).
 */
export async function assertCorrectDocument(userId: string, storagePath: string, kind: "ktp" | "kk", mime: string) {
  if (!aiConfig() || mime === "application/pdf") return;
  const admin = createAdminClient();

  const { data: saved } = await admin
    .from("ai_document_checks")
    .select("ai_status, ai_result")
    .eq("storage_path", storagePath)
    .eq("user_id", userId)
    .maybeSingle<{ ai_status: AiStatus; ai_result: AiResult | null }>();

  let result = saved?.ai_result ?? null;
  // Belum pernah diperiksa, atau pemeriksaan saat unggah gagal (gateway lambat): periksa sekarang.
  if (!saved || saved.ai_status === "gagal_diperiksa") {
    const { data: blob } = await admin.storage.from("requests").download(storagePath);
    const bytes = blob ? new Uint8Array(await blob.arrayBuffer()) : null;
    const imageMime = bytes ? sniffImage(bytes) : null;
    if (!bytes || !imageMime) return;
    const checked = await checkDocumentImage(bytes, imageMime, kind);
    await admin.from("ai_document_checks").upsert({
      storage_path: storagePath,
      user_id: userId,
      ai_status: checked.status,
      ai_result: checked.result,
      checked_at: new Date().toISOString(),
    });
    result = checked.status === "gagal_diperiksa" ? null : checked.result;
  }

  if (isWrongDocument(result)) throw new Error(wrongDocumentMessage(kind));
}
