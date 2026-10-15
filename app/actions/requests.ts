"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guard";
import { type ActionState, dbMessage, zodFieldErrors } from "@/lib/action-state";
import { buildFormZod } from "@/lib/letters/form-schema";
import { appConfig } from "@/lib/config";
import { assertCorrectDocument } from "@/lib/ai/document-gate";
import { REJECTED_STATUSES } from "@/lib/format";
import type { LetterType, RequestStatus } from "@/lib/types";
import type { SupabaseClient } from "@supabase/supabase-js";

const docMetaSchema = z.object({
  kind: z.enum(["ktp", "kk", "pendukung"]),
  storage_path: z.string(),
  file_name: z.string().max(200),
});

const payloadSchema = z.object({
  request_id: z.uuid(),
  form: z.record(z.string(), z.string()),
  docs: z.array(docMetaSchema).max(10),
});

const PATH_RE = /^[0-9a-f-]{36}\/(ktp|kk|pendukung)-[a-z0-9]{8,32}\.(jpg|png|pdf)$/;

function sniffMime(bytes: Uint8Array): string | null {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
  if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) return "application/pdf";
  return null;
}

function sanitizeFileName(name: string) {
  const cleaned = name.normalize("NFKD").replace(/[^\w.\- ]+/g, "").replace(/\s+/g, "-").slice(-80);
  return cleaned || "berkas";
}

/**
 * Berkas diunggah langsung dari browser ke Storage (policy RLS membatasi folder).
 * Di sini server memeriksa isi sebenarnya: tanda tangan byte (magic number), ukuran, dan (bila AI aktif)
 * apakah foto KTP/KK memang dokumen yang diminta.
 */
async function verifyDocs(supabase: SupabaseClient, userId: string, requestId: string, docs: z.infer<typeof docMetaSchema>[]) {
  const verified = [];
  for (const doc of docs) {
    if (!doc.storage_path.startsWith(`${requestId}/`) || !PATH_RE.test(doc.storage_path)) {
      throw new Error("Lokasi berkas tidak valid. Unggah ulang berkas Anda.");
    }
    if (!doc.storage_path.split("/")[1].startsWith(`${doc.kind}-`)) {
      throw new Error("Jenis berkas tidak cocok. Unggah ulang berkas Anda.");
    }
    const { data: blob, error } = await supabase.storage.from("requests").download(doc.storage_path);
    if (error || !blob) throw new Error("Berkas belum terunggah. Unggah ulang berkas Anda.");
    if (blob.size > appConfig.maxUploadBytes) throw new Error(`${doc.file_name}: ukuran melebihi 3 MB.`);
    const head = new Uint8Array(await blob.slice(0, 8).arrayBuffer());
    const mime = sniffMime(head);
    if (!mime) throw new Error(`${doc.file_name}: isi berkas bukan JPG, PNG, atau PDF.`);
    if (doc.kind !== "pendukung") await assertCorrectDocument(userId, doc.storage_path, doc.kind, mime);
    verified.push({
      kind: doc.kind,
      storage_path: doc.storage_path,
      file_name: sanitizeFileName(doc.file_name),
      mime,
      size_bytes: blob.size,
    });
  }
  return verified;
}

function parsePayload(formData: FormData) {
  try {
    return payloadSchema.safeParse({
      request_id: formData.get("request_id"),
      form: JSON.parse(String(formData.get("form") ?? "{}")),
      docs: JSON.parse(String(formData.get("docs") ?? "[]")),
    });
  } catch {
    return null;
  }
}

export async function submitRequestAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase, profile } = await requireRole("warga");
  const typeId = z.uuid().safeParse(formData.get("type_id"));
  const payload = parsePayload(formData);
  if (!typeId.success || !payload?.success) return { error: "Data permohonan tidak lengkap. Muat ulang halaman lalu coba lagi." };

  const { data: type } = await supabase.from("letter_types").select("*").eq("id", typeId.data).maybeSingle<LetterType>();
  if (!type) return { error: "Jenis surat tidak tersedia." };

  const parsed = buildFormZod(type.form_schema, type.kode).safeParse(payload.data.form);
  if (!parsed.success) return { error: "Periksa kembali isian Anda.", fieldErrors: zodFieldErrors(parsed.error) };

  let docs;
  try {
    docs = await verifyDocs(supabase, profile.id, payload.data.request_id, payload.data.docs);
  } catch (e) {
    return { error: (e as Error).message };
  }

  const { error } = await supabase.rpc("submit_request", {
    p_id: payload.data.request_id,
    p_type_id: type.id,
    p_form: parsed.data,
    p_docs: docs,
  });
  if (error) return { error: dbMessage(error, "Permohonan gagal dikirim. Coba lagi.") };

  revalidatePath("/warga");
  redirect(`/warga/permohonan/${payload.data.request_id}?terkirim=1`);
}

export async function resubmitRequestAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase, profile } = await requireRole("warga");
  const payload = parsePayload(formData);
  if (!payload?.success) return { error: "Data perbaikan tidak lengkap. Muat ulang halaman lalu coba lagi." };
  const id = payload.data.request_id;

  const { data: request } = await supabase.from("letter_requests").select("id, type_id, status").eq("id", id).maybeSingle();
  if (!request) return { error: "Permohonan tidak ditemukan." };
  if (!REJECTED_STATUSES.includes(request.status as RequestStatus)) return { error: "Permohonan ini tidak sedang menunggu perbaikan." };

  const { data: type } = await supabase.from("letter_types").select("*").eq("id", request.type_id).single<LetterType>();
  const parsed = buildFormZod(type!.form_schema, type!.kode).safeParse(payload.data.form);
  if (!parsed.success) return { error: "Periksa kembali isian Anda.", fieldErrors: zodFieldErrors(parsed.error) };

  let docs;
  try {
    docs = await verifyDocs(supabase, profile.id, id, payload.data.docs);
  } catch (e) {
    return { error: (e as Error).message };
  }

  const note = String(formData.get("note") ?? "").trim().slice(0, 300) || null;
  const { error } = await supabase.rpc("resubmit_request", { p_id: id, p_form: parsed.data, p_docs: docs, p_note: note });
  if (error) return { error: dbMessage(error, "Perbaikan gagal dikirim. Coba lagi.") };

  revalidatePath(`/warga/permohonan/${id}`);
  revalidatePath("/warga");
  redirect(`/warga/permohonan/${id}?diperbaiki=1`);
}

export async function cancelRequestAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase } = await requireRole("warga");
  const id = z.uuid().safeParse(formData.get("request_id"));
  if (!id.success) return { error: "Permohonan tidak ditemukan." };
  const { error } = await supabase.rpc("cancel_request", { p_id: id.data });
  if (error) return { error: dbMessage(error, "Permohonan gagal dibatalkan.") };
  revalidatePath(`/warga/permohonan/${id.data}`);
  revalidatePath("/warga");
  return { ok: true, message: "Permohonan dibatalkan." };
}
