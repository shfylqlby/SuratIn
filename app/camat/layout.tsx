import { requireRole } from "@/lib/auth/guard";
import { AppShell } from "@/components/domain/app-shell";

export default async function CamatLayout({ children }: { children: React.ReactNode }) {
  const { profile, supabase } = await requireRole("camat", "super_admin");
  const { data: kec } = profile.kecamatan_id
    ? await supabase.from("regions_kecamatan").select("nama").eq("id", profile.kecamatan_id).single()
    : { data: null };
  return (
    <AppShell
      wide
      profile={profile}
      wilayah={kec ? `Kec. ${kec.nama}` : undefined}
    >
      {children}
    </AppShell>
  );
}
