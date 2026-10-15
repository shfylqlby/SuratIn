import type { ReactNode } from "react";
import { roleLabel } from "@/lib/format";
import { navSections } from "@/lib/nav";
import { sidebarCollapsed } from "@/lib/sidebar-pref";
import type { Profile } from "@/lib/types";
import { SidebarFrame } from "./sidebar";
import { Copyright } from "./site-footer";

/** Kerangka halaman dasbor (warga, kelurahan, camat): sidebar + isi + footer ringkas. */
export async function AppShell({
  profile,
  wilayah,
  children,
  wide,
}: {
  profile: Profile;
  wilayah?: string;
  children: ReactNode;
  wide?: boolean;
}) {
  const width = wide ? "max-w-7xl" : "max-w-5xl";
  const jabatan = profile.jabatan ?? roleLabel[profile.role];
  const keterangan =
    wilayah && !profile.jabatan?.includes(wilayah.replace(/^(Kel|Kec)\. /, "")) ? `${jabatan}, ${wilayah}` : jabatan;
  return (
    <SidebarFrame sections={navSections(profile.role)} user={{ nama: profile.nama, keterangan }} initialCollapsed={await sidebarCollapsed()}>
      <main id="isi" className={`mx-auto w-full flex-1 ${width} px-4 py-8 sm:px-6 md:py-10`}>
        {children}
      </main>
      <footer className="border-t border-garis">
        <Copyright className={`mx-auto ${width} px-4 py-4 text-xs text-redup sm:px-6`} />
      </footer>
    </SidebarFrame>
  );
}
