import Link from "next/link";
import { appConfig } from "@/lib/config";
import { cn } from "@/lib/cn";
import { LogoMark } from "./logo";

/** Tinggi minimal 44 px agar mudah disentuh di ponsel. */
const footerLink = "inline-flex min-h-11 items-center hover:text-white hover:underline";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-tinta-900 bg-tinta-900 text-tinta-100">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
        <div className="space-y-3">
          <p className="flex items-center gap-2 font-display text-lg font-bold text-white">
            <LogoMark className="text-tinta-900" /> {appConfig.name}
          </p>
          <p className="max-w-sm text-sm text-tinta-100/80">
            Prototipe layanan surat kelurahan dan kecamatan. Tanda tangan elektronik di sini masih simulasi, belum
            tersertifikasi BSrE.
          </p>
        </div>
        <div>
          <p className="mb-2 font-semibold text-white">Layanan</p>
          <ul className="text-sm">
            <li><Link className={footerLink} href="/warga/ajukan">Ajukan surat</Link></li>
            <li><Link className={footerLink} href="/warga">Lacak permohonan</Link></li>
            <li><Link className={footerLink} href="/verifikasi">Cek keaslian surat</Link></li>
          </ul>
        </div>
        <div>
          <p className="mb-2 font-semibold text-white">Informasi</p>
          <ul className="text-sm">
            <li><Link className={footerLink} href="/tentang">Tentang &amp; batasan prototipe</Link></li>
            <li><Link className={footerLink} href="/masuk">Masuk petugas</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <Copyright className="mx-auto max-w-6xl px-4 py-4 text-xs text-tinta-100/70 sm:px-6" />
      </div>
    </footer>
  );
}

export function Copyright({ className }: { className?: string }) {
  return (
    <p className={cn("text-center", className)}>
      © {appConfig.tahunHakCipta} {appConfig.name}. All Rights Reserved.
    </p>
  );
}
