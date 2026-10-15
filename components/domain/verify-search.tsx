import { Search } from "lucide-react";
import { buttonClass } from "@/components/ui/button";

export function VerifySearch({ defaultValue, autoFocus }: { defaultValue?: string; autoFocus?: boolean }) {
  return (
    <form action="/verifikasi" method="get" role="search" className="flex flex-col gap-2 sm:flex-row">
      <label htmlFor="q" className="sr-only">
        Nomor surat atau kode verifikasi
      </label>
      <input
        id="q"
        name="q"
        required
        defaultValue={defaultValue}
        autoFocus={autoFocus}
        autoComplete="off"
        spellCheck={false}
        placeholder="Nomor surat atau kode verifikasi"
        className="min-h-13 flex-1 rounded-[var(--radius-tombol)] border border-garis bg-lembar px-4 text-lg text-teks placeholder:text-redup/70 hover:border-tinta-600/50 focus:border-tinta-700 focus:outline-none angka"
      />
      <button className={buttonClass("tinta", "lg")}>
        <Search aria-hidden /> Periksa
      </button>
    </form>
  );
}
