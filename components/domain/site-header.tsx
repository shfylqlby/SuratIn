import Link from "next/link";
import { House, Info, LayoutDashboard, LogIn, LogOut, ShieldCheck } from "lucide-react";
import { logoutAction } from "@/app/actions/auth";
import { getSession } from "@/lib/auth/guard";
import { homeForRole } from "@/lib/format";
import { ButtonLink } from "@/components/ui/button";
import { Logo } from "./logo";

const links = [
  { href: "/", label: "Beranda", icon: House },
  { href: "/verifikasi", label: "Cek keaslian", icon: ShieldCheck },
  { href: "/tentang", label: "Tentang", icon: Info },
];

const linkClass =
  "inline-flex min-h-11 items-center gap-1.5 rounded-md font-medium whitespace-nowrap text-tinta-800 hover:bg-tinta-50 [&_svg]:size-4.5";

/** Header atas untuk halaman publik (pengunjung belum masuk, dan beranda). */
export async function SiteHeader() {
  const { profile } = await getSession();
  return (
    <header className="sticky top-0 z-30 border-b border-garis bg-kertas/95 backdrop-blur">
      <a href="#isi" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-lembar focus:px-3 focus:py-2">
        Lewati ke isi
      </a>
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
        <Logo />
        <nav aria-label="Utama" className="ml-6 hidden items-center gap-1 md:flex">
          {links.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className={`${linkClass} px-3`}>
              <Icon aria-hidden /> {label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          {profile ? (
            <>
              <ButtonLink href={homeForRole(profile.role)} variant="tinta">
                <LayoutDashboard aria-hidden /> Dasbor
              </ButtonLink>
              <form action={logoutAction}>
                <button
                  aria-label="Keluar"
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-md px-2.5 text-sm font-medium text-redup hover:bg-tinta-50 hover:text-teks"
                >
                  <LogOut aria-hidden className="size-4" />
                  <span className="hidden sm:inline">Keluar</span>
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/daftar" className={`${linkClass} hidden px-3 sm:inline-flex`}>
                Daftar
              </Link>
              <ButtonLink href="/masuk" variant="tinta">
                <LogIn aria-hidden /> Masuk
              </ButtonLink>
            </>
          )}
        </div>
      </div>
      {/* Ponsel: menu publik di baris kedua, dibagi rata agar ketiganya selalu terlihat tanpa digeser */}
      <nav aria-label="Utama" className="grid grid-cols-3 gap-1 border-t border-garis-halus px-2 py-1 md:hidden">
        {links.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className={`${linkClass} justify-center px-1.5 text-sm`}>
            <Icon aria-hidden /> {label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
