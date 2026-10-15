import { SiteHeader } from "@/components/domain/site-header";
import { SiteFooter } from "@/components/domain/site-footer";

/** Beranda selalu tampil tanpa sidebar, baik sudah masuk maupun belum. */
export default function BerandaLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main id="isi" className="flex-1">
        {children}
      </main>
      <SiteFooter />
    </>
  );
}
