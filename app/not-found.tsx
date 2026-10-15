import { ButtonLink } from "@/components/ui/button";
import { Logo } from "@/components/domain/logo";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-start justify-center gap-5 px-4 py-16">
      <Logo />
      <h1 className="text-4xl font-bold text-tinta-900">Halaman tidak ditemukan</h1>
      <p className="text-lg text-redup">
        Alamat yang Anda buka tidak ada atau Anda tidak punya akses ke halaman ini.
      </p>
      <div className="flex flex-wrap gap-3">
        <ButtonLink href="/" variant="tinta">
          Ke beranda
        </ButtonLink>
        <ButtonLink href="/verifikasi" variant="garis">
          Cek keaslian surat
        </ButtonLink>
      </div>
    </main>
  );
}
