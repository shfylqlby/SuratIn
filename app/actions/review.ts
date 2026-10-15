"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guard";
import { type ActionState, zodFieldErrors } from "@/lib/action-state";
import { homeForRole } from "@/lib/format";
import { rejectSchema } from "@/lib/validation";
import { transitionRequest } from "@/lib/workflow";

const idSchema = z.uuid();

/** RT/RW atau admin kelurahan menolak. Catatan wajib, terlihat oleh warga. */
export async function rejectAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase, profile } = await requireRole("rt_rw", "admin_kelurahan");
  const parsed = rejectSchema.safeParse({ request_id: formData.get("request_id"), note: formData.get("note") });
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error), values: { note: String(formData.get("note") ?? "") } };

  const result = await transitionRequest({ supabase, actor: profile, requestId: parsed.data.request_id, action: "tolak", note: parsed.data.note });
  if (!result.ok) return { error: result.error, values: { note: parsed.data.note } };

  const base = homeForRole(profile.role);
  revalidatePath(base);
  redirect(`${base}?selesai=tolak`);
}

/** RT/RW: setujui → surat pengantar RT dibuat. Admin kelurahan: setujui → surat final terbit. */
export async function approveAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase, profile } = await requireRole("rt_rw", "admin_kelurahan");
  const id = idSchema.safeParse(formData.get("request_id"));
  if (!id.success) return { error: "Permohonan tidak ditemukan." };
  if (formData.get("confirm") !== "ya") return { error: "Centang pernyataan sebelum menyetujui." };
  const note = String(formData.get("note") ?? "").trim().slice(0, 300) || null;

  const result = await transitionRequest({ supabase, actor: profile, requestId: id.data, action: "setujui", note });
  if (!result.ok) return { error: result.error };

  const base = homeForRole(profile.role);
  revalidatePath(base);
  if (profile.role === "rt_rw") redirect(`/rt/permohonan/${id.data}?selesai=setuju`);
  redirect(`${base}?selesai=terbit${result.verificationCode ? `&kode=${result.verificationCode}` : ""}`);
}
