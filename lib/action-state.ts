import type { z } from "zod";

export interface ActionState {
  ok?: boolean;
  message?: string;
  error?: string;
  fieldErrors?: Record<string, string>;
  values?: Record<string, string>;
}

export function zodFieldErrors(error: z.ZodError) {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "_");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

/** Menerjemahkan galat dari Postgres/Supabase menjadi pesan untuk pengguna. */
export function dbMessage(error: { message?: string; code?: string } | null | undefined, fallback: string) {
  if (!error?.message) return fallback;
  // Pesan dari fungsi SQL kita sudah berbahasa Indonesia (RAISE EXCEPTION).
  if (error.code === "22023" || error.code === "42501" || error.code === "P0001") return error.message;
  return fallback;
}
