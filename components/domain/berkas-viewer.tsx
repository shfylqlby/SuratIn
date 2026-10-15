"use client";

import { useState } from "react";
import { ExternalLink, RotateCw, ZoomIn, ZoomOut } from "lucide-react";
import { cn } from "@/lib/cn";
import type { AiStatus } from "@/lib/types";
import { AiBadge } from "./ai-badge";

interface Doc {
  id: string;
  kind: string;
  mime: string;
  file_name: string;
  /** Diisi hanya jika fitur AI aktif. */
  ai?: { status: AiStatus; message?: string | null };
}

const LABEL: Record<string, string> = { ktp: "KTP", kk: "Kartu Keluarga", pendukung: "Pendukung" };

/** Penampil berkas dengan tab, zoom, dan putar. Berkas dimuat lewat signed URL 60 detik. */
export function BerkasViewer({ docs }: { docs: Doc[] }) {
  const [active, setActive] = useState(docs[0]?.id);
  const [zoom, setZoom] = useState(1);
  const [rotate, setRotate] = useState(0);
  const doc = docs.find((d) => d.id === active);

  if (!docs.length) {
    return <p className="p-6 text-redup">Pemohon belum mengunggah berkas.</p>;
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-garis-halus px-3 py-2">
        <div role="tablist" aria-label="Berkas pemohon" className="flex gap-1">
          {docs.map((d) => (
            <button
              key={d.id}
              role="tab"
              aria-selected={d.id === active}
              onClick={() => {
                setActive(d.id);
                setZoom(1);
                setRotate(0);
              }}
              className={cn(
                "min-h-10 rounded-md px-3 text-sm font-semibold",
                d.id === active ? "bg-tinta-800 text-white" : "text-tinta-800 hover:bg-tinta-50",
              )}
            >
              {LABEL[d.kind] ?? d.kind}
            </button>
          ))}
        </div>
        {doc && doc.mime !== "application/pdf" ? (
          <div className="ml-auto flex items-center gap-1">
            <IconButton label="Perkecil" onClick={() => setZoom((z) => Math.max(1, z - 0.5))} disabled={zoom <= 1}>
              <ZoomOut aria-hidden className="size-4" />
            </IconButton>
            <span className="w-12 text-center text-sm text-redup angka">{Math.round(zoom * 100)}%</span>
            <IconButton label="Perbesar" onClick={() => setZoom((z) => Math.min(4, z + 0.5))} disabled={zoom >= 4}>
              <ZoomIn aria-hidden className="size-4" />
            </IconButton>
            <IconButton label="Putar 90 derajat" onClick={() => setRotate((r) => (r + 90) % 360)}>
              <RotateCw aria-hidden className="size-4" />
            </IconButton>
          </div>
        ) : null}
        {doc ? (
          <a
            href={`/api/berkas/${doc.id}`}
            target="_blank"
            rel="noopener"
            className={cn("inline-flex min-h-10 items-center gap-1 rounded-md px-2 text-sm font-medium text-tinta-800 hover:bg-tinta-50", doc.mime === "application/pdf" && "ml-auto")}
          >
            <ExternalLink aria-hidden className="size-4" /> Buka
          </a>
        ) : null}
      </div>
      {doc?.ai ? <AiBadge status={doc.ai.status} message={doc.ai.message} className="m-3 mb-0" /> : null}
      <div role="tabpanel" className="min-h-[420px] flex-1 overflow-auto bg-[#e9e7e0] p-3">
        {doc ? (
          doc.mime === "application/pdf" ? (
            <iframe key={doc.id} src={`/api/berkas/${doc.id}`} title={LABEL[doc.kind]} className="h-[70vh] w-full rounded bg-white" />
          ) : (
            <div className="grid min-h-full place-items-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                key={doc.id}
                src={`/api/berkas/${doc.id}`}
                alt={`${LABEL[doc.kind]}: ${doc.file_name}`}
                style={{ transform: `rotate(${rotate}deg)`, width: `${zoom * 100}%` }}
                className="max-w-none rounded shadow-sm transition-[width,transform] duration-150"
                onClick={() => setZoom((z) => (z >= 2 ? 1 : 2))}
              />
            </div>
          )
        ) : null}
      </div>
    </div>
  );
}

function IconButton({ label, children, ...props }: React.ComponentProps<"button"> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className="grid size-10 place-items-center rounded-md text-tinta-800 hover:bg-tinta-50 disabled:opacity-40"
      {...props}
    >
      {children}
    </button>
  );
}
