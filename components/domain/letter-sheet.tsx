import { cn } from "@/lib/cn";
import { StampMark } from "./stamp";
import { QrSvg } from "./qr-svg";
import { appConfig } from "@/lib/config";

/** Replika lembar surat untuk beranda: kop, isi, tanda tangan, stempel, dan QR. */
export async function LetterSheet({ className }: { className?: string }) {
  return (
    <figure
      className={cn(
        "relative mx-auto w-full max-w-[440px] rounded-[3px] bg-lembar px-6 pt-6 pb-5 font-surat text-[#1a1b20] shadow-[0_1px_0_#d9d6cc,0_18px_40px_-22px_rgba(15,47,55,0.45)] sm:px-8 sm:pt-8",
        className,
      )}
      aria-label="Contoh surat keterangan tidak mampu yang sudah terbit"
    >
      <div className="flex items-center gap-3">
        <svg viewBox="0 0 52 66" aria-hidden className="h-12 w-10 shrink-0">
          <path d="M1 1h50v33c0 16-14 26-25 31C15 60 1 50 1 34z" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <path d="M15 16h17l5 5v23H15z" fill="none" stroke="currentColor" strokeWidth="1.2" />
          <path d="M19 27h14M19 32h14M19 37h10" stroke="currentColor" strokeWidth="1" />
        </svg>
        <div className="flex-1 text-center leading-tight">
          <p className="text-[0.62rem] font-bold tracking-wide sm:text-[0.7rem]">PEMERINTAH KOTA SAMARINDA</p>
          <p className="text-[0.62rem] font-bold sm:text-[0.7rem]">KECAMATAN MAJU JAYA</p>
          <p className="text-[0.78rem] font-bold sm:text-[0.9rem]">KELURAHAN SIDOMULYO</p>
          <p className="text-[0.55rem] text-[#55585e] sm:text-[0.6rem]">Jl. Melati No. 12, Kelurahan Sidomulyo</p>
        </div>
      </div>
      <div className="garis-kop mt-2.5 mb-4 text-[#1a1b20]" />
      <p className="text-center text-[0.78rem] font-bold underline underline-offset-2 sm:text-[0.85rem]">
        SURAT KETERANGAN TIDAK MAMPU
      </p>
      <p className="angka text-center text-[0.66rem] sm:text-[0.72rem]">Nomor: 460/012/KEL-SDM/X/2026</p>

      <div className="mt-4 space-y-1.5 text-[0.66rem] leading-relaxed sm:text-[0.72rem]">
        <p>Yang bertanda tangan di bawah ini, Lurah Sidomulyo, Kecamatan Maju Jaya, menerangkan bahwa:</p>
        <dl className="grid grid-cols-[6.5rem_1fr] gap-x-2 pl-3">
          <dt>Nama</dt>
          <dd className="font-semibold">: Siti Aminah</dd>
          <dt>NIK</dt>
          <dd className="angka">: 6472********0012</dd>
          <dt>Keperluan</dt>
          <dd>: Pendidikan</dd>
        </dl>
        <div aria-hidden className="space-y-1.5 pt-1">
          <div className="h-[5px] w-full rounded bg-[#e6e4dc]" />
          <div className="h-[5px] w-11/12 rounded bg-[#e6e4dc]" />
          <div className="h-[5px] w-2/3 rounded bg-[#e6e4dc]" />
        </div>
      </div>

      <div className="relative mt-4 flex justify-end">
        <div className="relative w-44 text-[0.66rem] leading-snug sm:text-[0.72rem]">
          <p>Sidomulyo, 14 Oktober 2026</p>
          <p>Lurah Sidomulyo</p>
          <svg viewBox="0 0 160 50" aria-hidden className="my-1 h-12 w-36 text-[#14204d]">
            <path
              d="M4 34 C10 6, 26 6, 22 40 C 30 12, 46 10, 40 38 C 52 16, 64 14, 60 40 C 70 22, 82 22, 92 30 C 104 38, 116 18, 150 22"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          <p className="font-bold underline">Rina Marlina, S.Sos.</p>
          <p className="angka">NIP. 198105222009012003</p>
          <StampMark animate className="absolute top-7 -left-20 size-28 sm:-left-24 sm:size-32" />
        </div>
      </div>

      <div className="mt-5 flex items-end gap-3 border-t border-[#d9d6cc] pt-3">
        <p className="flex-1 font-sans text-[0.6rem] leading-snug text-[#55585e] sm:text-[0.65rem]">
          Ditandatangani secara elektronik. Periksa keaslian di {appConfig.appUrl.replace(/^https?:\/\//, "")}/verifikasi
        </p>
        <QrSvg value={`${appConfig.appUrl}/verifikasi`} label="Kode QR menuju halaman verifikasi" className="block size-14 shrink-0 [&_svg]:size-full" />
      </div>
    </figure>
  );
}
