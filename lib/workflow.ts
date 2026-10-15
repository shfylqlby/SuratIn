import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { dbMessage } from "@/lib/action-state";
import { createAdminClient } from "@/lib/supabase/admin";
import { IssueError, issueLetter } from "@/lib/letters/issue";
import { approveByRt } from "@/lib/letters/rt-letter";
import type { Profile, RequestStatus } from "@/lib/types";

export type StaffAction = "setujui" | "tolak";

export type TransitionResult =
  | { ok: true; to: RequestStatus; verificationCode?: string }
  | { ok: false; error: string };

/** Tahap yang boleh diproses tiap peran petugas (PRD revisi 1 §3.3). */
const STAGE: Partial<Record<Profile["role"], { from: RequestStatus; approveTo: RequestStatus; rejectTo: RequestStatus }>> = {
  rt_rw: { from: "menunggu_rt", approveTo: "menunggu_kelurahan", rejectTo: "ditolak_rt" },
  admin_kelurahan: { from: "menunggu_kelurahan", approveTo: "terbit", rejectTo: "ditolak_kelurahan" },
};

/**
 * Satu-satunya jalur perubahan status oleh petugas. UI hanya memanggil fungsi ini.
 *
 * Lapisan pengaman:
 * 1. Peran aktor diambil dari sesi (bukan dari klien).
 * 2. Permohonan dibaca dengan klien pengguna: RLS membatasi ke unit RT / kelurahan aktor.
 * 3. Status asal dan kepemilikan unit/kelurahan dicek di sini, lalu dicek ULANG di fungsi SQL
 *    dengan `update ... where status = :lama` (klik ganda / balapan antar-akun → error jelas).
 */
export async function transitionRequest(input: {
  supabase: SupabaseClient;
  actor: Profile;
  requestId: string;
  action: StaffAction;
  note?: string | null;
}): Promise<TransitionResult> {
  const { supabase, actor, requestId, action } = input;
  const stage = STAGE[actor.role];
  if (!stage) return { ok: false, error: "Peran Anda tidak dapat memproses permohonan." };

  const { data: request } = await supabase
    .from("letter_requests")
    .select("id, status, kelurahan_id, rt_unit_id")
    .eq("id", requestId)
    .maybeSingle();
  if (!request) return { ok: false, error: "Permohonan tidak ditemukan." };

  const ownsIt =
    actor.role === "rt_rw" ? !!actor.rt_unit_id && request.rt_unit_id === actor.rt_unit_id : request.kelurahan_id === actor.kelurahan_id;
  if (!ownsIt) return { ok: false, error: "Permohonan tidak ditemukan." };
  if (request.status !== stage.from) return { ok: false, error: "Permohonan sudah diproses pihak lain." };

  const note = input.note?.trim() || null;

  if (action === "tolak") {
    if (!note || note.length < 10) return { ok: false, error: "Catatan penolakan minimal 10 karakter." };
    const { error } = await supabase.rpc("reject_request", { p_id: requestId, p_note: note });
    if (error) return { ok: false, error: dbMessage(error, "Penolakan gagal disimpan. Coba lagi.") };
    return { ok: true, to: stage.rejectTo };
  }

  try {
    if (actor.role === "rt_rw") {
      await approveByRt(createAdminClient(), requestId, actor.id, note ?? undefined);
      return { ok: true, to: stage.approveTo };
    }
    const letter = await issueLetter(createAdminClient(), requestId, actor.id, note ?? undefined);
    return { ok: true, to: stage.approveTo, verificationCode: letter.verification_code };
  } catch (e) {
    return { ok: false, error: e instanceof IssueError ? e.message : "Proses gagal. Coba lagi." };
  }
}
