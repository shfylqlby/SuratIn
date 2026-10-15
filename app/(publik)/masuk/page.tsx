import type { Metadata } from "next";
import Link from "next/link";
import { appConfig, demoAccounts, demoPassword } from "@/lib/config";
import { Notice } from "@/components/ui/notice";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Masuk" };

export default async function MasukPage({ searchParams }: PageProps<"/masuk">) {
  const sp = await searchParams;
  const next = typeof sp.lanjut === "string" ? sp.lanjut : undefined;
  const preset = typeof sp.email === "string" ? sp.email : undefined;

  return (
    <div className="mx-auto grid max-w-5xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1fr_0.9fr] md:py-16">
      <div className="max-w-md">
        <h1 className="text-3xl font-bold text-tinta-900 sm:text-4xl">Masuk</h1>
        <p className="mt-2 text-redup">Satu halaman masuk untuk warga, Ketua RT/RW, petugas kelurahan, dan camat.</p>
        {sp.reset ? (
          <div className="mt-6">
            <Notice tone="berhasil">Kata sandi sudah diperbarui. Silakan masuk dengan kata sandi baru.</Notice>
          </div>
        ) : null}
        <div className="mt-8">
          <LoginForm next={next} presetEmail={preset} />
        </div>
        <p className="mt-4">
          <Link href="/lupa-sandi" className="inline-flex min-h-11 items-center font-semibold text-tinta-800 underline underline-offset-4">
            Lupa kata sandi?
          </Link>
        </p>
        <p className="mt-2 text-redup">
          Belum punya akun?{" "}
          <Link href="/daftar" className="font-semibold text-tinta-800 underline underline-offset-4">
            Daftar dengan NIK
          </Link>
        </p>
      </div>

      {appConfig.demoMode ? (
        <aside aria-labelledby="akun-demo" className="h-fit rounded-[var(--radius-kartu)] border border-dashed border-tinta-800/35 bg-lembar p-5">
          <h2 id="akun-demo" className="text-lg font-semibold text-tinta-900">
            Akun demo untuk juri
          </h2>
          <p className="mt-1 text-sm text-redup">
            Semua akun memakai kata sandi <code className="rounded bg-kertas px-1.5 py-0.5 font-semibold text-teks">{demoPassword}</code>.
            Pilih akun untuk mengisi email.
          </p>
          <ul className="mt-4 divide-y divide-garis-halus">
            {demoAccounts.map((a) => (
              <li key={a.email}>
                <Link
                  href={`/masuk?email=${encodeURIComponent(a.email)}${next ? `&lanjut=${encodeURIComponent(next)}` : ""}`}
                  className="flex min-h-12 items-center justify-between gap-3 rounded-md px-2 py-2 hover:bg-tinta-50"
                  scroll={false}
                >
                  <span className="font-medium text-teks">{a.label}</span>
                  <span className="text-sm text-redup">{a.email}</span>
                </Link>
              </li>
            ))}
          </ul>
        </aside>
      ) : null}
    </div>
  );
}
