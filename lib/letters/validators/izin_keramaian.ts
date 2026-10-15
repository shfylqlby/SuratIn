import type { z } from "zod";
import { addDays, todayLocal } from "@/lib/format";

export const MIN_DAYS_AHEAD = 3;
export const H3_MESSAGE = "Pengajuan izin keramaian minimal 3 hari sebelum acara.";

/**
 * K9: tanggal acara harus >= hari ini (WIB) + 3 hari, dan jam selesai > jam mulai.
 * "Hari ini" selalu dihitung dalam Asia/Jakarta, bukan zona server (Vercel = UTC).
 * Database (validate_form) memeriksa ulang aturan yang sama lewat minDaysAhead/after di form_schema.
 */
export function validateIzinKeramaian(values: Record<string, string>, ctx: z.RefinementCtx, now = new Date()) {
  const tanggal = values.tanggal_acara;
  if (tanggal && /^\d{4}-\d{2}-\d{2}$/.test(tanggal)) {
    const minimal = addDays(todayLocal(now), MIN_DAYS_AHEAD);
    if (tanggal < minimal) {
      ctx.addIssue({ code: "custom", path: ["tanggal_acara"], message: H3_MESSAGE });
    }
  }
  const mulai = values.jam_mulai;
  const selesai = values.jam_selesai;
  if (mulai && selesai && selesai <= mulai) {
    ctx.addIssue({ code: "custom", path: ["jam_selesai"], message: "Jam selesai harus setelah jam mulai." });
  }
}
