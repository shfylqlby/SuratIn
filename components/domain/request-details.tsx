import { FileText, ImageIcon, ExternalLink } from "lucide-react";
import { formatRupiah, formatTanggalIsian } from "@/lib/format";
import type { FormSchema, RequestDocument } from "@/lib/types";

const KIND_LABEL: Record<string, string> = { ktp: "Foto KTP", kk: "Foto Kartu Keluarga", pendukung: "Dokumen pendukung" };

export function FormDataList({ schema, data }: { schema: FormSchema; data: Record<string, string> }) {
  return (
    <dl className="divide-y divide-garis-halus">
      {schema.fields.map((f) => (
        <div key={f.key} className="grid gap-0.5 px-5 py-3 sm:grid-cols-[12rem_1fr] sm:gap-4">
          <dt className="text-sm text-redup">{f.label}</dt>
          <dd className="font-medium break-words text-teks">
            {f.type === "currency" ? formatRupiah(data[f.key] ?? "0") : f.type === "date" && data[f.key] ? formatTanggalIsian(data[f.key]) : f.key === "tanggungan" ? `${data[f.key]} orang` : data[f.key] || "-"}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function DocumentList({ docs }: { docs: RequestDocument[] }) {
  if (!docs.length) return <p className="px-5 py-4 text-redup">Belum ada berkas.</p>;
  return (
    <ul className="divide-y divide-garis-halus">
      {docs.map((d) => (
        <li key={d.id} className="flex items-center gap-3 px-5 py-3">
          {d.mime === "application/pdf" ? (
            <FileText aria-hidden className="size-5 shrink-0 text-tinta-700" />
          ) : (
            <ImageIcon aria-hidden className="size-5 shrink-0 text-tinta-700" />
          )}
          <div className="min-w-0 flex-1">
            <p className="font-medium text-teks">{KIND_LABEL[d.kind]}</p>
            <p className="truncate text-sm text-redup">{d.file_name}</p>
          </div>
          <a
            href={`/api/berkas/${d.id}`}
            target="_blank"
            rel="noopener"
            className="inline-flex min-h-11 items-center gap-1.5 rounded-md px-3 text-sm font-semibold text-tinta-800 hover:bg-tinta-50"
          >
            Lihat <ExternalLink aria-hidden className="size-4" />
            <span className="sr-only">{KIND_LABEL[d.kind]} (tab baru)</span>
          </a>
        </li>
      ))}
    </ul>
  );
}
