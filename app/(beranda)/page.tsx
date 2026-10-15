import Link from "next/link";
import { BadgeCheck, FileSearch, History, PenLine, QrCode, Stamp, Upload } from "lucide-react";
import { ButtonLink, buttonClass } from "@/components/ui/button";
import { LetterSheet } from "@/components/domain/letter-sheet";
import { getSession } from "@/lib/auth/guard";

export default async function BerandaPage() {
  const { supabase, profile } = await getSession();
  const { data: types } = await supabase
    .from("letter_types")
    .select("kode, nama, deskripsi, output_kind, required_documents")
    .eq("is_active", true)
    .order("urutan");

  return (
    <>
      {/* Hero */}
      <section className="overflow-hidden border-b border-garis">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 sm:px-6 md:py-16 lg:grid-cols-[1.05fr_1fr] lg:gap-14">
          <div className="max-w-xl">
            <h1 className="text-[2.35rem] leading-[1.05] font-extrabold text-tinta-900 sm:text-5xl lg:text-[3.6rem]">
              Urus surat tanpa antre di kelurahan
            </h1>
            <p className="mt-5 text-lg text-redup">
              Surat diperiksa RT/RW lalu kelurahan, diterbitkan dengan tanda tangan dan stempel digital, dan bisa
              diverifikasi siapa saja. Lima jenis surat, cukup dari ponsel.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/warga/ajukan" variant="utama" size="lg">
                <PenLine aria-hidden /> Ajukan surat
              </ButtonLink>
              <ButtonLink href="/verifikasi" variant="garis" size="lg">
                <QrCode aria-hidden /> Cek keaslian surat
              </ButtonLink>
            </div>
            {profile ? null : (
              <p className="mt-4 text-sm text-redup">
                Sudah punya akun? <Link href="/masuk" className="font-semibold text-tinta-800 underline underline-offset-4">Masuk</Link> untuk melacak permohonan.
              </p>
            )}
          </div>
          <div className="relative py-4">
            <div aria-hidden className="absolute inset-x-6 top-0 bottom-8 rotate-[3deg] rounded-[3px] border border-garis bg-[#faf9f5]" />
            <LetterSheet className="relative -rotate-[1.2deg]" />
          </div>
        </div>
      </section>

      {/* Tiga langkah */}
      <section aria-labelledby="langkah" className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 id="langkah" className="max-w-lg text-3xl font-bold text-tinta-900 sm:text-4xl">
          Tiga langkah, semuanya dari rumah
        </h2>
        <ol className="mt-10 grid gap-8 md:grid-cols-3 md:gap-6">
          <Step
            n={1}
            title="Isi formulir dan unggah berkas"
            body="Data diri terisi otomatis dari akun Anda. Foto KTP dan Kartu Keluarga cukup diambil dengan kamera ponsel."
            icon={<Upload aria-hidden className="size-5" />}
            stage={1}
          />
          <Step
            n={2}
            title="Diperiksa RT/RW, lalu kelurahan"
            body="Ketua RT/RW membuat surat pengantar, lalu kelurahan memeriksa ulang. Jika ada yang kurang, alasannya ditulis dan Anda cukup memperbaiki bagian itu."
            icon={<FileSearch aria-hidden className="size-5" />}
            stage={2}
          />
          <Step
            n={3}
            title="Unduh surat PDF yang sudah sah"
            body="Surat terbit lengkap dengan nomor, tanda tangan elektronik, stempel, dan kode QR untuk dicek siapa saja."
            icon={<Stamp aria-hidden className="size-5" />}
            stage={3}
          />
        </ol>
      </section>

      {/* Verifikasi */}
      <section aria-labelledby="verifikasi" className="bg-tinta-900 text-white">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_1.1fr] lg:items-center">
          <div>
            <h2 id="verifikasi" className="text-3xl font-bold sm:text-4xl">
              Bank, sekolah, dan rumah sakit bisa memastikan surat Anda asli
            </h2>
            <p className="mt-4 max-w-md text-tinta-100/85">
              Tanpa menelepon kantor kelurahan. Cukup pindai QR di pojok surat atau ketik nomor suratnya.
            </p>
            <form action="/verifikasi" method="get" className="mt-8 flex max-w-md flex-col gap-2 sm:flex-row" role="search">
              <label htmlFor="cek-nomor" className="sr-only">
                Nomor surat atau kode verifikasi
              </label>
              <input
                id="cek-nomor"
                name="q"
                placeholder="Contoh: 460/001/KEL-SDM/X/2026"
                className="min-h-12 flex-1 rounded-[var(--radius-tombol)] border border-white/25 bg-white/10 px-3.5 text-base text-white placeholder:text-white/55 focus:border-map-400 focus:outline-none"
              />
              <button className={buttonClass("utama", "md", "min-h-12")}>Cek surat</button>
            </form>
          </div>
          <ul className="grid gap-px overflow-hidden rounded-[var(--radius-kartu)] border border-white/15 bg-white/15 sm:grid-cols-2">
            <Proof icon={<QrCode aria-hidden />} title="Nomor surat dan kode QR">
              Setiap surat punya nomor resmi dan kode acak yang tidak bisa ditebak dari nomor surat lain.
            </Proof>
            <Proof icon={<Stamp aria-hidden />} title="Stempel hanya setelah disetujui">
              Stempel dan tanda tangan muncul di PDF hanya setelah pejabat terakhir dalam alurnya menyetujui.
            </Proof>
            <Proof icon={<History aria-hidden />} title="Riwayat persetujuan terbuka">
              Halaman verifikasi menampilkan siapa yang memeriksa dan menandatangani, lengkap dengan jamnya.
            </Proof>
            <Proof icon={<BadgeCheck aria-hidden />} title="Sidik dokumen SHA-256">
              Unggah PDF di halaman verifikasi. Jika ada satu huruf saja yang diubah, hasilnya langsung TIDAK VALID.
            </Proof>
          </ul>
        </div>
      </section>

      {/* Jenis surat */}
      <section aria-labelledby="jenis" className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 id="jenis" className="text-3xl font-bold text-tinta-900 sm:text-4xl">
          Surat yang bisa diajukan
        </h2>
        <div className="mt-8 divide-y divide-garis border-y border-garis">
          {(types ?? []).map((t) => (
            <div key={t.kode} className="grid gap-2 py-5 md:grid-cols-[1.2fr_1.6fr_auto] md:items-center md:gap-8">
              <h3 className="text-xl font-semibold text-tinta-900">{t.nama}</h3>
              <div className="text-redup">
                <p>{t.deskripsi}</p>
                <p className="mt-1 text-sm">
                  Berkas: {(t.required_documents as { label: string; optional?: boolean }[]).filter((d) => !d.optional).map((d) => d.label).join(", ")}.{" "}
                  {t.output_kind === "surat_pengantar" ? "Hasilnya surat pengantar kelurahan ke kepolisian." : "Ditandatangani lurah."}
                </p>
              </div>
              <Link
                href={`/warga/ajukan/${t.kode}`}
                className="inline-flex min-h-11 items-center font-semibold text-tinta-800 underline decoration-map-500 decoration-2 underline-offset-4 hover:decoration-tinta-800"
              >
                Ajukan surat ini
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section aria-labelledby="faq" className="border-t border-garis bg-lembar">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_2fr]">
          <h2 id="faq" className="text-3xl font-bold text-tinta-900 sm:text-4xl">
            Pertanyaan yang sering muncul
          </h2>
          <div className="divide-y divide-garis border-y border-garis">
            {faq.map(([q, a]) => (
              <details key={q} className="group py-1">
                <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-3 text-lg font-semibold text-teks marker:hidden">
                  {q}
                  <span aria-hidden className="text-2xl leading-none text-tinta-700 transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="max-w-2xl pb-5 text-redup">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

const faq: Array<[string, string]> = [
  [
    "Berapa lama surat selesai?",
    "Ketua RT/RW memeriksa paling lama 2 hari, lalu kelurahan paling lama 3 hari. Camat memantau agar tidak ada permohonan yang menggantung. Status terbaru selalu terlihat di halaman permohonan Anda.",
  ],
  [
    "Apakah surat dari sini sah dipakai?",
    "Ini masih prototipe untuk lomba. Tanda tangan elektronik di sini adalah simulasi dan belum tersertifikasi BSrE/BSSN. Alur, nomor surat, dan cara verifikasinya dirancang agar siap disambungkan ke tanda tangan tersertifikasi.",
  ],
  [
    "Bagaimana jika permohonan saya ditolak?",
    "Penolakan selalu disertai catatan dari petugas, misalnya foto KTP buram. Buka permohonan, tekan Perbaiki sekarang, ganti bagian yang diminta, lalu kirim ulang. Anda tidak perlu mengisi dari awal.",
  ],
  [
    "Siapa yang bisa melihat foto KTP dan KK saya?",
    "Hanya Anda, Ketua RT/RW Anda, dan petugas kelurahan Anda. Camat hanya melihat angka rekap, tanpa nama dan NIK. Berkas disimpan tertutup dan dibuka lewat tautan yang kedaluwarsa dalam 60 detik. Foto KTP/KK dapat diperiksa otomatis oleh layanan AI pihak ketiga untuk memastikan kejelasannya.",
  ],
  [
    "Saya tidak punya pemindai. Bagaimana mengunggah berkas?",
    "Foto saja dengan kamera ponsel di tempat yang terang. Format JPG, PNG, atau PDF dengan ukuran maksimal 3 MB per berkas.",
  ],
];

function Step({
  n,
  title,
  body,
  icon,
  stage,
}: {
  n: number;
  title: string;
  body: string;
  icon: React.ReactNode;
  stage: 1 | 2 | 3;
}) {
  return (
    <li className="flex gap-4 md:flex-col">
      <PaperStage stage={stage} />
      <div>
        <p className="flex items-center gap-2 text-sm font-semibold text-tinta-700">
          <span className="grid size-7 place-items-center rounded-full bg-tinta-800 text-white angka">{n}</span>
          {icon}
        </p>
        <h3 className="mt-2 text-xl font-semibold text-tinta-900">{title}</h3>
        <p className="mt-1.5 text-redup">{body}</p>
      </div>
    </li>
  );
}

/** Kertas yang makin lengkap di tiap langkah: kosong → diperiksa → bercap. */
function PaperStage({ stage }: { stage: 1 | 2 | 3 }) {
  return (
    <svg viewBox="0 0 120 150" aria-hidden className="h-28 w-[5.5rem] shrink-0 md:h-36 md:w-28">
      <path d="M4 4h82l30 30v112H4z" fill="#fff" stroke="#123b45" strokeOpacity=".35" strokeWidth="2" />
      <path d="M86 4v30h30" fill="#f1f0eb" stroke="#123b45" strokeOpacity=".35" strokeWidth="2" />
      <g stroke="#123b45" strokeWidth="3" strokeLinecap="round" strokeOpacity={stage === 1 ? 0.25 : 0.55}>
        <path d="M18 50h56M18 64h80M18 78h70M18 92h80" strokeDasharray={stage === 1 ? "4 6" : undefined} />
      </g>
      {stage >= 2 ? (
        <path d="M20 116l10 10 20-22" fill="none" stroke="#1d6f48" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <rect x="18" y="108" width="40" height="22" rx="3" fill="#fbefd9" stroke="#e9a23b" strokeWidth="2" />
      )}
      {stage === 3 ? (
        <g transform="rotate(-14 86 116)" fill="none" stroke="#1e3a8a" strokeOpacity=".85">
          <circle cx="86" cy="116" r="22" strokeWidth="3" />
          <circle cx="86" cy="116" r="17" strokeWidth="1.2" />
          <path d="M76 116h20" strokeWidth="3" />
        </g>
      ) : null}
    </svg>
  );
}

function Proof({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <li className="bg-tinta-900 p-6">
      <span className="text-map-400 [&_svg]:size-6">{icon}</span>
      <h3 className="mt-3 text-lg font-semibold">{title}</h3>
      <p className="mt-1.5 text-[0.95rem] text-tinta-100/80">{children}</p>
    </li>
  );
}
