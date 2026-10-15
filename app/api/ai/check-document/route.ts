import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { roleOrNull } from "@/lib/auth/guard";
import { aiConfig } from "@/lib/ai/client";
import { checkDocumentImage, isWrongDocument, wrongDocumentMessage } from "@/lib/ai/check-document";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AiStatus } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 30;

// Berkas draf (sebelum permohonan dikirim) atau berkas yang sudah tercatat.
const bodySchema = z.union([
  z.object({ storagePath: z.string().regex(/^[0-9a-f-]{36}\/(ktp|kk)-[a-z0-9]{8,32}\.(jpg|png)$/) }),
  z.object({ documentId: z.uuid() }),
]);

function sniffImage(bytes: Uint8Array) {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
  return null;
}

function reply(status: AiStatus, message: string | null, enabled = true, wrongDocument = false) {
  return NextResponse.json({ enabled, status, message, wrongDocument }, { headers: { "Cache-Control": "no-store" } });
}

/**
 * POST /api/ai/check-document  { storagePath } | { documentId }
 * Kualitas foto hanya peringatan (K8). Foto yang yakin dikenali sebagai dokumen lain ditolak (wrongDocument):
 * berkas draf dihapus dari Storage dan pengiriman juga diblokir di server (lib/ai/document-gate.ts). Gambar TIDAK dikirim lewat fungsi ini (batas 4,5 MB Vercel):
 * server mengunduhnya sendiri dari Storage setelah memastikan berkas milik pengguna.
 */
export async function POST(request: NextRequest) {
  const session = await roleOrNull("warga");
  if (!session) return NextResponse.json({ pesan: "Silakan masuk terlebih dahulu" }, { status: 401 });

  const cfg = aiConfig();
  if (!cfg) return reply("belum_diperiksa", null, false);

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ pesan: "Permintaan tidak valid" }, { status: 400 });

  // Kepemilikan dicek dengan klien pengguna (RLS Storage & tabel), bukan service role.
  let storagePath: string;
  let documentId: string | null = null;
  if ("documentId" in parsed.data) {
    const { data: doc } = await session.supabase
      .from("request_documents")
      .select("id, kind, storage_path, mime, letter_requests!inner(applicant_id)")
      .eq("id", parsed.data.documentId)
      .maybeSingle();
    const owner = (doc?.letter_requests as unknown as { applicant_id: string } | null)?.applicant_id;
    if (!doc || owner !== session.profile.id || !["ktp", "kk"].includes(doc.kind) || doc.mime === "application/pdf") {
      return NextResponse.json({ pesan: "Berkas tidak ditemukan" }, { status: 404 });
    }
    storagePath = doc.storage_path;
    documentId = doc.id;
  } else {
    storagePath = parsed.data.storagePath;
  }

  const { data: blob } = await session.supabase.storage.from("requests").download(storagePath);
  if (!blob) return NextResponse.json({ pesan: "Berkas tidak ditemukan" }, { status: 404 });
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const mime = sniffImage(bytes);
  if (!mime) return reply("belum_diperiksa", null);

  const admin = createAdminClient();
  const since = new Date(Date.now() - 3_600_000).toISOString();
  const { count } = await admin
    .from("ai_check_log")
    .select("id", { count: "exact", head: true })
    .eq("user_id", session.profile.id)
    .gte("created_at", since);
  if ((count ?? 0) >= cfg.maxPerHour) return reply("belum_diperiksa", "Pemeriksaan otomatis sedang dibatasi. Anda tetap bisa melanjutkan.");
  await admin.from("ai_check_log").insert({ user_id: session.profile.id });

  const expected = storagePath.split("/")[1].startsWith("kk-") ? "kk" : "ktp";
  const { status, result } = await checkDocumentImage(bytes, mime, expected);
  const checkedAt = new Date().toISOString();

  if (documentId) {
    await admin.from("request_documents").update({ ai_status: status, ai_result: result, ai_checked_at: checkedAt }).eq("id", documentId);
  } else {
    await admin
      .from("ai_document_checks")
      .upsert({ storage_path: storagePath, user_id: session.profile.id, ai_status: status, ai_result: result, checked_at: checkedAt });
  }
  if (isWrongDocument(result)) {
    // Hanya berkas draf yang dihapus; berkas yang sudah tercatat di permohonan tetap disimpan sebagai riwayat.
    if (!documentId) await admin.storage.from("requests").remove([storagePath]);
    return reply(status, wrongDocumentMessage(expected), true, true);
  }
  return reply(status, result.message ?? null);
}
