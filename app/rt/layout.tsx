import { requireRole } from "@/lib/auth/guard";
import { AppShell } from "@/components/domain/app-shell";

export default async function RtLayout({ children }: { children: React.ReactNode }) {
  const { profile, supabase } = await requireRole("rt_rw");
  const { data: unit } = profile.rt_unit_id
    ? await supabase.from("rt_units").select("regions_kelurahan(nama)").eq("id", profile.rt_unit_id).single()
    : { data: null };
  const kel = (unit?.regions_kelurahan as unknown as { nama: string } | null)?.nama;
  return (
    <AppShell wide profile={profile} wilayah={kel ? `Kel. ${kel}` : undefined}>
      {children}
    </AppShell>
  );
}
