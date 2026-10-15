import { SidebarFrame } from "@/components/domain/sidebar";
import { SiteHeader } from "@/components/domain/site-header";
import { SiteFooter } from "@/components/domain/site-footer";
import { getSession } from "@/lib/auth/guard";
import { roleLabel } from "@/lib/format";
import { navSections } from "@/lib/nav";
import { sidebarCollapsed } from "@/lib/sidebar-pref";

/** Halaman publik: header atas untuk pengunjung, sidebar untuk pengguna yang sudah masuk. */
export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await getSession();
  const body = (
    <>
      <main id="isi" className="flex-1">
        {children}
      </main>
      <SiteFooter />
    </>
  );

  if (!profile) {
    return (
      <>
        <SiteHeader />
        {body}
      </>
    );
  }

  return (
    <SidebarFrame
      sections={navSections(profile.role)}
      user={{ nama: profile.nama, keterangan: profile.jabatan ?? roleLabel[profile.role] }}
      initialCollapsed={await sidebarCollapsed()}
    >
      {body}
    </SidebarFrame>
  );
}
