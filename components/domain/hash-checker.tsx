"use client";

import { useRef, useState } from "react";
import { BadgeCheck, FileUp, LoaderCircle, OctagonX } from "lucide-react";
import { cn } from "@/lib/cn";

type Result = { state: "idle" } | { state: "busy" } | { state: "done"; match: boolean; hash: string; name: string } | { state: "error"; message: string };

/** Menghitung SHA-256 PDF di browser (Web Crypto) — berkas tidak dikirim ke server. */
export function HashChecker({ expected }: { expected: string }) {
  const [result, setResult] = useState<Result>({ state: "idle" });
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function check(file: File | undefined) {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setResult({ state: "error", message: "Berkas lebih dari 10 MB. Pilih PDF surat yang Anda terima." });
      return;
    }
    setResult({ state: "busy" });
    try {
      const buf = await file.arrayBuffer();
      const digest = await crypto.subtle.digest("SHA-256", buf);
      const hash = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
      setResult({ state: "done", match: hash === expected, hash, name: file.name });
    } catch {
      setResult({ state: "error", message: "Berkas tidak bisa dibaca. Coba pilih ulang." });
    }
  }

  return (
    <div className="space-y-4">
      <label
        htmlFor="cek-pdf"
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          void check(e.dataTransfer.files[0]);
        }}
        className={cn(
          "flex min-h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-[var(--radius-kartu)] border-2 border-dashed px-4 py-6 text-center transition-colors",
          drag ? "border-tinta-700 bg-tinta-50" : "border-garis bg-kertas/60 hover:border-tinta-600/60",
        )}
      >
        {result.state === "busy" ? (
          <LoaderCircle aria-hidden className="size-7 text-tinta-700 motion-safe:animate-spin" />
        ) : (
          <FileUp aria-hidden className="size-7 text-tinta-700" />
        )}
        <span className="font-semibold text-teks">Pilih atau seret PDF surat ke sini</span>
        <span className="text-sm text-redup">Berkas diperiksa di perangkat Anda dan tidak diunggah ke server.</span>
        <input
          ref={inputRef}
          id="cek-pdf"
          type="file"
          accept="application/pdf"
          className="sr-only"
          onChange={(e) => void check(e.target.files?.[0])}
        />
      </label>

      <div aria-live="polite">
        {result.state === "done" && result.match ? (
          <div className="flex gap-3 rounded-[var(--radius-kartu)] border border-terbit/35 bg-terbit-50 p-4 motion-safe:animate-muncul">
            <BadgeCheck aria-hidden className="size-6 shrink-0 text-terbit" />
            <div>
              <p className="font-semibold text-terbit">Berkas identik dengan arsip resmi</p>
              <p className="text-[0.95rem] text-teks">
                Sidik SHA-256 dari <span className="font-medium break-all">{result.name}</span> sama persis dengan yang dicatat saat surat terbit.
              </p>
            </div>
          </div>
        ) : null}
        {result.state === "done" && !result.match ? (
          <div className="flex gap-3 rounded-[var(--radius-kartu)] border border-tolak/35 bg-tolak-50 p-4 motion-safe:animate-muncul">
            <OctagonX aria-hidden className="size-6 shrink-0 text-tolak" />
            <div className="min-w-0">
              <p className="font-semibold text-tolak">TIDAK VALID: berkas ini berbeda dari arsip resmi</p>
              <p className="text-[0.95rem] text-teks">
                Isi PDF ini tidak sama dengan surat yang diterbitkan. Kemungkinan berkas sudah diedit, dicetak ulang dari
                aplikasi lain, atau ini PDF surat yang berbeda. Minta pemohon mengunduh ulang surat aslinya.
              </p>
              <dl className="mt-3 grid gap-1 text-xs text-redup">
                <div>
                  <dt className="inline font-semibold">Sidik berkas ini: </dt>
                  <dd className="inline break-all angka">{result.hash}</dd>
                </div>
                <div>
                  <dt className="inline font-semibold">Sidik arsip resmi: </dt>
                  <dd className="inline break-all angka">{expected}</dd>
                </div>
              </dl>
            </div>
          </div>
        ) : null}
        {result.state === "error" ? <p className="font-medium text-tolak">{result.message}</p> : null}
      </div>
    </div>
  );
}
