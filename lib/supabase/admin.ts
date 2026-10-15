import "server-only";
import { createClient } from "@supabase/supabase-js";
import { env } from "./env";

/**
 * Klien service_role. HANYA untuk kode server: penerbitan surat (TTD, stempel, nomor)
 * dan lookup verifikasi publik yang mengembalikan kolom aman saja.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY belum diatur");
  return createClient(env.url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
