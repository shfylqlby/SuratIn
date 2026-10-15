import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CircleHelp, QrCode } from "lucide-react";
import { VerifySearch } from "@/components/domain/verify-search";
import { NotFoundResult } from "./not-found-result";
import { rateLimit } from "@/lib/rate-limit";
import { lookupLetter } from "@/lib/letters/verify";
import { Notice } from "@/components/ui/notice";

export const metadata: Metadata = { title: "Cek keaslian surat" };

export default async function VerifikasiPage({ searchParams }: PageProps<"/verifikasi">) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";

  let limited = false;
  if (q) {
    const limit = await rateLimit("verifikasi", 30);
    if (!limit.ok) limited = true;
    else {
      const result = await lookupLetter(q);
      if (result) redirect(`/verifikasi/${result.code}`);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 md:py-16">
      <h1 className="text-3xl font-bold text-tinta-900 sm:text-4xl">Cek keaslian surat</h1>
      <p className="mt-3 max-w-xl text-lg text-redup">
        Masukkan nomor surat atau kode verifikasi yang tercetak di bagian bawah surat. Tidak perlu akun.
      </p>
      <div className="mt-8">
        <VerifySearch defaultValue={q} autoFocus={!q} />
      </div>

      {limited ? (
        <Notice tone="peringatan" className="mt-6" title="Terlalu banyak pemeriksaan dari jaringan Anda">
          Tunggu sekitar satu menit, lalu coba lagi.
        </Notice>
      ) : q ? (
        <NotFoundResult query={q} />
      ) : (
        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          <div className="flex gap-3">
            <QrCode aria-hidden className="mt-1 size-6 shrink-0 text-tinta-700" />
            <p className="text-redup">
              <span className="font-semibold text-teks">Punya surat cetak?</span> Pindai kode QR di pojok kanan bawah
              dengan kamera ponsel. Halaman hasil akan terbuka otomatis.
            </p>
          </div>
          <div className="flex gap-3">
            <CircleHelp aria-hidden className="mt-1 size-6 shrink-0 text-tinta-700" />
            <p className="text-redup">
              <span className="font-semibold text-teks">Contoh format.</span> Nomor surat:{" "}
              <span className="angka text-teks">460/001/KEL-SDM/X/2026</span>. Kode verifikasi:{" "}
              <span className="angka text-teks">K7QM2X-9HTR4P</span>.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
