import { SearchX } from "lucide-react";

export function NotFoundResult({ query }: { query: string }) {
  return (
    <section aria-live="polite" className="mt-8 rounded-[var(--radius-kartu)] border-2 border-tolak/40 bg-lembar p-6">
      <div className="flex items-start gap-4">
        <span className="grid size-14 shrink-0 place-items-center rounded-full bg-tolak-50 text-tolak">
          <SearchX aria-hidden className="size-7" />
        </span>
        <div>
          <p className="font-display text-2xl font-bold text-tolak">Surat tidak ditemukan</p>
          <p className="mt-1 text-teks">
            Tidak ada surat terbit dengan nomor atau kode <span className="font-semibold break-all angka">“{query.slice(0, 64)}”</span>.
          </p>
          <ul className="mt-4 list-disc space-y-1 pl-5 text-redup">
            <li>Periksa kembali penulisan, termasuk garis miring dan angka romawi bulan.</li>
            <li>Surat yang belum ditandatangani belum bisa diverifikasi.</li>
            <li>Jika surat dicetak lengkap dengan stempel tetapi tidak ditemukan di sini, jangan terima surat tersebut dan hubungi kantor kelurahan.</li>
          </ul>
        </div>
      </div>
    </section>
  );
}
