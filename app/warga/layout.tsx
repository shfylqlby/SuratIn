import { requireRole } from "@/lib/auth/guard";
import { AppShell } from "@/components/domain/app-shell";

export default async function WargaLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireRole("warga");
  return (
    <AppShell profile={profile}>
      {children}
    </AppShell>
  );
}
