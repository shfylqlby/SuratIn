import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, FileText, Landmark, House, Send } from "lucide-react";
import { requireRole } from "@/lib/auth/guard";
import { EmptyState } from "@/components/ui/empty";
import type { RequiredDocument } from "@/lib/types";

export const metadata: Metadata = { title: "Ajukan surat" };

export default async function AjukanPage() {
  const { supabase } = await requireRole("warga");
  const { data: types } = await supabase
    .from("letter_types")
    .select("kode, nama, deskripsi, output_kind, required_documents")
    .eq("is_active", true)
    .order("urutan");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-tinta-900">Ajukan surat</h1>
        <p className="mt-1 text-redup">
          Pilih surat yang Anda butuhkan. Semua surat diperiksa Ketua RT/RW Anda lebih dulu, lalu diterbitkan kelurahan.
        </p>
      </div>
      {!types?.length ? (
        <EmptyState title="Belum ada jenis surat yang dibuka">Coba lagi nanti atau hubungi kantor kelurahan.</EmptyState>
      ) : (
        <ul className="space-y-3">
          {types.map((t) => {
            const docs = t.required_documents as RequiredDocument[];
            const wajib = docs.filter((d) => !d.optional).map((d) => d.label.toLowerCase());
            const opsional = docs.filter((d) => d.optional).map((d) => d.label.toLowerCase());
            const pengantar = t.output_kind === "surat_pengantar";
            return (
              <li key={t.kode}>
                <Link
                  href={`/warga/ajukan/${t.kode}`}
                  className="group flex items-start gap-4 rounded-[var(--radius-kartu)] border border-garis bg-lembar p-5 transition-colors hover:border-tinta-700/50"
                >
                  <span className="grid size-12 shrink-0 place-items-center rounded-md bg-tinta-50 text-tinta-800">
                    {pengantar ? <Send aria-hidden className="size-6" /> : <FileText aria-hidden className="size-6" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-lg font-semibold text-teks group-hover:text-tinta-800">{t.nama}</span>
                    <span className="mt-0.5 block text-redup">{t.deskripsi}</span>
                    <span className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-teks">
                      <span className="inline-flex items-center gap-1 rounded-full bg-kertas px-2.5 py-0.5">
                        <House aria-hidden className="size-3.5 text-tinta-700" /> RT/RW
                      </span>
                      <ChevronRight aria-hidden className="size-3.5 text-redup" />
                      <span className="inline-flex items-center gap-1 rounded-full bg-kertas px-2.5 py-0.5">
                        <Landmark aria-hidden className="size-3.5 text-tinta-700" /> Kelurahan
                      </span>
                      <ChevronRight aria-hidden className="size-3.5 text-redup" />
                      <span className="font-medium">{pengantar ? "Surat pengantar ke kepolisian" : "Surat keterangan"}</span>
                    </span>
                    <span className="mt-2 block text-sm text-redup">
                      Siapkan: {wajib.join(" dan ")}
                      {opsional.length ? `. Opsional: ${opsional.join(", ")}` : ""}.
                    </span>
                  </span>
                  <ChevronRight aria-hidden className="mt-3 size-5 shrink-0 text-redup group-hover:text-tinta-800" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
