import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, ArrowLeft, Undo2, TriangleAlert } from "lucide-react";
import { appConfig, safeBackPath } from "@/lib/config";
import { rateLimit } from "@/lib/rate-limit";
import { lookupLetter } from "@/lib/letters/verify";
import { actionLabel, formatCode, formatTanggal, formatTanggalJam } from "@/lib/format";
import { HashChecker } from "@/components/domain/hash-checker";
import { StampMark } from "@/components/domain/stamp";
import { Notice } from "@/components/ui/notice";
import { ButtonLink } from "@/components/ui/button";
import { NotFoundResult } from "../not-found-result";

export const metadata: Metadata = { title: "Hasil verifikasi surat", robots: { index: false } };

export default async function HasilVerifikasiPage({ params, searchParams }: PageProps<"/verifikasi/[kode]">) {
  const { kode } = await params;
  const back = safeBackPath((await searchParams).dari);
  const limit = await rateLimit("verifikasi", 30);

  if (!limit.ok) {
    return (
      <Shell back={back}>
        <Notice tone="peringatan" title="Terlalu banyak pemeriksaan dari jaringan Anda">
          Tunggu sekitar satu menit, lalu muat ulang halaman ini.
        </Notice>
      </Shell>
    );
  }

  const result = await lookupLetter(decodeURIComponent(kode));
  if (!result) {
    return (
      <Shell back={back}>
        <NotFoundResult query={decodeURIComponent(kode)} />
      </Shell>
    );
  }

  const valid = result.archiveIntact;

  return (
    <Shell back={back}>
      {/* Lencana hasil: harus terbaca dalam sekali lihat */}
      <section
        aria-labelledby="hasil"
        className={
          valid
            ? "relative overflow-hidden rounded-[var(--radius-kartu)] border-2 border-terbit/50 bg-lembar"
            : "relative overflow-hidden rounded-[var(--radius-kartu)] border-2 border-tolak/50 bg-lembar"
        }
      >
        <div className={valid ? "flex items-center gap-4 bg-terbit px-5 py-5 text-white sm:px-7" : "flex items-center gap-4 bg-tolak px-5 py-5 text-white sm:px-7"}>
          {valid ? <BadgeCheck aria-hidden className="size-12 shrink-0" strokeWidth={1.8} /> : <TriangleAlert aria-hidden className="size-12 shrink-0" />}
          <div>
            <p id="hasil" className="font-display text-4xl leading-none font-extrabold sm:text-5xl">
              {valid ? "ASLI" : "TIDAK VALID"}
            </p>
            <p className="mt-1.5 text-white/90">
              {valid
                ? `Surat ini terdaftar dan diterbitkan resmi melalui ${appConfig.name}.`
                : "Surat terdaftar, tetapi arsip PDF-nya tidak cocok dengan sidik yang dicatat. Jangan diterima sebelum dikonfirmasi ke kantor kelurahan."}
            </p>
          </div>
        </div>

        <div className="relative grid gap-6 px-5 py-6 sm:px-7 md:grid-cols-[1fr_auto]">
          <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
            <Item label="Jenis surat" value={result.jenis} wide />
            <Item label="Nomor surat" value={result.letterNo} mono />
            <Item label="Tanggal terbit" value={formatTanggal(result.issuedAt)} />
            <Item label="Nama pemohon" value={result.pemohon} />
            <Item label="NIK" value={result.nikMasked} mono />
            <Item label="Wilayah" value={`${result.rt ? `${result.rt}, ` : ""}Kel. ${result.kelurahan}, Kec. ${result.kecamatan}`} wide />
            <Item label="Kode verifikasi" value={formatCode(result.code)} mono />
          </dl>
          {valid ? (
            <StampMark
              animate
              ring={`KECAMATAN ${result.kecamatan} • KELURAHAN ${result.kelurahan} •`.toUpperCase()}
              center={["LURAH", new Date(result.issuedAt).getFullYear().toString()]}
              className="pointer-events-none absolute right-4 bottom-4 size-28 md:static md:size-36"
            />
          ) : null}
        </div>
      </section>

      <section aria-labelledby="riwayat" className="mt-10">
        <h2 id="riwayat" className="text-2xl font-bold text-tinta-900">
          Riwayat persetujuan
        </h2>
        <p className="mt-1 text-redup">
          Diperiksa RT/RW, lalu diterbitkan kelurahan. Tercatat otomatis dan tidak dapat diubah oleh siapa pun, termasuk petugas.
        </p>
        <ol className="mt-5 divide-y divide-garis-halus rounded-[var(--radius-kartu)] border border-garis bg-lembar">
          {result.history.map((h, i) => (
            <li key={i} className="grid gap-1 px-5 py-4 sm:grid-cols-[1.2fr_1.4fr_1fr] sm:items-center sm:gap-4">
              <p className="font-semibold text-teks">{actionLabel[h.action]}</p>
              <p className="text-teks">
                {h.nama}
                {h.jabatan ? <span className="text-redup">, {h.jabatan}</span> : null}
              </p>
              <p className="text-sm text-redup angka sm:text-right">
                <time dateTime={h.at}>{formatTanggalJam(h.at)}</time>
              </p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="cek-berkas" className="mt-10">
        <h2 id="cek-berkas" className="text-2xl font-bold text-tinta-900">
          Cocokkan berkas PDF yang Anda terima
        </h2>
        <p className="mt-1 max-w-2xl text-redup">
          Halaman ini membuktikan nomor suratnya asli. Untuk memastikan isi berkasnya tidak diubah, unggah PDF yang
          diberikan pemohon.
        </p>
        <div className="mt-5">
          <HashChecker expected={result.sha256} />
        </div>
      </section>
    </Shell>
  );
}

/** Jika dibuka dari halaman lain di aplikasi (`?dari=`), sediakan tombol kembali ke sana. */
function Shell({ back, children }: { back: string | null; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 md:py-14">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link href="/verifikasi" className="inline-flex min-h-11 items-center gap-1.5 font-medium text-tinta-800 hover:underline">
          <ArrowLeft aria-hidden className="size-4" /> Periksa surat lain
        </Link>
        {back ? (
          <ButtonLink href={back} variant="tinta">
            <Undo2 aria-hidden /> Kembali ke halaman sebelumnya
          </ButtonLink>
        ) : null}
      </div>
      {children}
    </div>
  );
}

function Item({ label, value, mono, wide }: { label: string; value: string; mono?: boolean; wide?: boolean }) {
  return (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <dt className="text-sm text-redup">{label}</dt>
      <dd className={mono ? "text-lg font-semibold break-words text-teks angka" : "text-lg font-semibold text-teks"}>{value}</dd>
    </div>
  );
}
