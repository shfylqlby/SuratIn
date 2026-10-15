import { requireRole } from "@/lib/auth/guard";
import { AppShell } from "@/components/domain/app-shell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { profile, supabase } = await requireRole("admin_kelurahan", "super_admin");
  const { data: kel } = profile.kelurahan_id
    ? await supabase.from("regions_kelurahan").select("nama").eq("id", profile.kelurahan_id).single()
    : { data: null };
  return (
    <AppShell
      wide
      profile={profile}
      wilayah={kel ? `Kel. ${kel.nama}` : undefined}
    >
      {children}
    </AppShell>
  );
}
