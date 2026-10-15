import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { homeForRole } from "@/lib/format";
import type { Profile, UserRole } from "@/lib/types";

export const getSession = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, profile: null };
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle<Profile>();
  return { supabase, user, profile: profile ?? null };
});

/**
 * Guard peran untuk Server Component, Server Action, dan Route Handler.
 * Tidak login → /masuk. Peran salah → diarahkan ke beranda perannya sendiri.
 */
export async function requireRole(...roles: UserRole[]) {
  const session = await getSession();
  if (!session.user || !session.profile) redirect("/masuk");
  if (!roles.includes(session.profile.role)) redirect(homeForRole(session.profile.role));
  return { supabase: session.supabase, user: session.user, profile: session.profile };
}

/** Versi untuk Route Handler: mengembalikan null alih-alih redirect. */
export async function roleOrNull(...roles: UserRole[]) {
  const session = await getSession();
  if (!session.profile || !roles.includes(session.profile.role)) return null;
  return { supabase: session.supabase, user: session.user!, profile: session.profile };
}

/** Nama kecamatan dari kelurahan akun (untuk isian readonly "Kecamatan"). */
export async function kecamatanOf(profile: Profile) {
  if (!profile.kelurahan_id) return null;
  const { supabase } = await getSession();
  const { data } = await supabase
    .from("regions_kelurahan")
    .select("regions_kecamatan(nama)")
    .eq("id", profile.kelurahan_id)
    .maybeSingle();
  return (data?.regions_kecamatan as unknown as { nama: string } | null)?.nama ?? null;
}
