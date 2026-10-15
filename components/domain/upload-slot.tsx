"use client";

import { useId, useRef, useState } from "react";
import { Camera, CircleCheck, FileText, LoaderCircle, RefreshCw, Trash2, TriangleAlert } from "lucide-react";
import { createClient } from "@/lib/supabase/browser";
import { appConfig } from "@/lib/config";
import { cn } from "@/lib/cn";
import { measureSharpness } from "@/lib/image-sharpness";
import type { AiStatus, DocumentKind } from "@/lib/types";

export interface UploadedDoc {
  kind: DocumentKind;
  storage_path: string;
  file_name: string;
  mime: string;
  size: number;
  /** object URL untuk pratinjau lokal (tidak disimpan di draf) */
  preview?: string;
  /** Hasil cek otomatis. Kualitas hanya peringatan (K8); foto salah jenis ditolak dan dikosongkan dari slot. */
  ai?: { status: AiStatus; message: string | null; dismissed?: boolean };
  /** Cek ketajaman di browser (varians Laplacian), instan dan tanpa AI. Hanya peringatan. */
  blur?: { score: number; dismissed?: boolean };
  /** true selama cek AI berjalan; wizard menahan tombol Lanjut. Tidak disimpan di draf. */
  checking?: boolean;
}

const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "application/pdf": "pdf" };
const MAX_SIDE = 1600;
const TARGET_BYTES = 1.5 * 1024 * 1024;

function randomId() {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(bytes, (b) => b.toString(36).padStart(2, "0")).join("").slice(0, 12);
}

/** Foto ponsel sering besar. Perkecil di browser: sisi terpanjang maks 1600 px, JPEG 0,8, target ≤ 1,5 MB. */
async function shrinkImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  const bitmap = await createImageBitmap(file);
  const longest = Math.max(bitmap.width, bitmap.height);
  if (longest <= MAX_SIDE && file.size <= TARGET_BYTES) return file;
  const scale = Math.min(1, MAX_SIDE / longest);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  let last: Blob | null = null;
  for (const quality of [0.8, 0.7, 0.6]) {
    last = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", quality));
    if (last && last.size <= TARGET_BYTES) break;
  }
  return last ? new File([last], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" }) : file;
}

/** Minta cek otomatis. Gagal apa pun → null, alur tetap lanjut. */
async function requestAiCheck(storagePath: string): Promise<(NonNullable<UploadedDoc["ai"]> & { wrongDocument: boolean }) | null> {
  try {
    const res = await fetch("/api/ai/check-document", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storagePath }),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { enabled: boolean; status: AiStatus; message: string | null; wrongDocument?: boolean };
    return json.enabled ? { status: json.status, message: json.message, wrongDocument: !!json.wrongDocument } : null;
  } catch {
    return null;
  }
}

export function formatSize(bytes: number) {
  return bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/** Peringatan kualitas foto (cek lokal atau AI). Tidak pernah memblokir: warga boleh tetap memakai fotonya. */
function PhotoWarning({ title, message, onRetake, onKeep }: { title: string; message: string | null; onRetake: () => void; onKeep: () => void }) {
  return (
    <div role="status" className="rounded-[var(--radius-kartu)] border border-proses/35 bg-proses-50 p-3">
      <p className="flex items-start gap-2 text-sm text-teks">
        <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-proses" />
        <span>
          <span className="font-semibold">{title}</span> {message}
        </span>
      </p>
      <div className="mt-2 flex flex-wrap gap-2 pl-6">
        <button
          type="button"
          onClick={onRetake}
          className="inline-flex min-h-10 items-center gap-1.5 rounded-md bg-tinta-800 px-3 text-sm font-semibold text-white hover:bg-tinta-700"
        >
          <Camera aria-hidden className="size-4" /> Foto ulang
        </button>
        <button
          type="button"
          onClick={onKeep}
          className="inline-flex min-h-10 items-center rounded-md border border-garis bg-lembar px-3 text-sm font-semibold text-tinta-800 hover:bg-tinta-50"
        >
          Tetap gunakan
        </button>
      </div>
    </div>
  );
}

export function UploadSlot({
  requestId,
  kind,
  label,
  required,
  value,
  existingName,
  onChange,
  error,
  aiEnabled = false,
}: {
  requestId: string;
  kind: DocumentKind;
  label: string;
  required: boolean;
  value: UploadedDoc | null;
  existingName?: string;
  onChange: (doc: UploadedDoc | null) => void;
  error?: string;
  /** KTP/KK berformat gambar diperiksa otomatis bila fitur AI aktif. */
  aiEnabled?: boolean;
}) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(false);
  const latestPath = useRef<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const shownError = localError ?? error;
  const checkable = aiEnabled && (kind === "ktp" || kind === "kk");

  async function handle(file: File | undefined) {
    if (!file) return;
    latestPath.current = null; // hasil cek untuk foto sebelumnya tidak berlaku lagi
    setLocalError(null);
    if (!appConfig.allowedMimes.includes(file.type as (typeof appConfig.allowedMimes)[number])) {
      setLocalError("Format harus JPG, PNG, atau PDF.");
      return;
    }
    setBusy(true);
    let uploaded: UploadedDoc | null = null;
    try {
      const [prepared, sharpness] = await Promise.all([shrinkImage(file), measureSharpness(file)]);
      if (prepared.size > appConfig.maxUploadBytes) {
        setLocalError(`Ukuran ${formatSize(prepared.size)}, maksimal 3 MB. Foto ulang dengan resolusi lebih kecil.`);
        return;
      }
      const path = `${requestId}/${kind}-${randomId()}.${EXT[prepared.type]}`;
      const { error: upErr } = await createClient().storage.from("requests").upload(path, prepared, {
        contentType: prepared.type,
        upsert: false,
      });
      if (upErr) {
        setLocalError("Unggah gagal. Periksa koneksi internet lalu coba lagi.");
        return;
      }
      uploaded = {
        kind,
        storage_path: path,
        file_name: prepared.name,
        mime: prepared.type,
        size: prepared.size,
        preview: prepared.type.startsWith("image/") ? URL.createObjectURL(prepared) : undefined,
        blur: sharpness?.blurry ? { score: sharpness.score } : undefined,
      };
      onChange(uploaded);
    } catch {
      setLocalError("Berkas tidak bisa diproses. Coba pilih berkas lain.");
    } finally {
      setBusy(false);
    }

    if (uploaded && checkable && uploaded.mime.startsWith("image/")) {
      const current = uploaded;
      latestPath.current = current.storage_path;
      setChecking(true);
      onChange({ ...current, checking: true });
      let result = await requestAiCheck(current.storage_path);
      // Gateway AI kadang lambat; satu kali coba lagi sebelum menyerah (server tetap memeriksa ulang saat dikirim).
      if (result?.status === "gagal_diperiksa" && latestPath.current === current.storage_path) {
        result = await requestAiCheck(current.storage_path);
      }
      // Warga sudah mengganti foto selagi cek berjalan: abaikan hasil lama.
      if (latestPath.current !== current.storage_path) return;
      setChecking(false);
      if (result?.wrongDocument) {
        // Server sudah menghapus berkas drafnya; kosongkan slot dan minta foto yang benar.
        onChange(null);
        setLocalError(result.message ?? "Foto ini bukan dokumen yang diminta.");
        return;
      }
      onChange(result ? { ...current, ai: { status: result.status, message: result.message } } : current);
    }
  }

  return (
    <div className="space-y-2">
      <p className="font-semibold text-teks" id={`${id}-label`}>
        {label}
        {!required ? <span className="ml-1.5 font-normal text-redup">(opsional)</span> : null}
      </p>
      {value ? (
        <div className="flex items-center gap-3 rounded-[var(--radius-kartu)] border border-terbit/35 bg-lembar p-3">
          {value.preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value.preview} alt={`Pratinjau ${label}`} className="size-16 shrink-0 rounded-md border border-garis object-cover" />
          ) : (
            <span className="grid size-16 shrink-0 place-items-center rounded-md border border-garis bg-kertas text-tinta-700">
              <FileText aria-hidden className="size-7" />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-teks">{value.file_name}</p>
            <p className="text-sm text-terbit">Terunggah, {formatSize(value.size)}</p>
            {checking ? (
              <p className="mt-0.5 flex items-center gap-1.5 text-sm text-redup">
                <LoaderCircle aria-hidden className="size-3.5 motion-safe:animate-spin" /> Memeriksa kejelasan foto…
              </p>
            ) : value.ai?.status === "lolos" ? (
              <p className="mt-0.5 flex items-center gap-1.5 text-sm text-terbit">
                <CircleCheck aria-hidden className="size-3.5" /> Foto tampak jelas
              </p>
            ) : null}
          </div>
          <label
            htmlFor={id}
            className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-md px-3 text-sm font-semibold text-tinta-800 hover:bg-tinta-50"
          >
            <RefreshCw aria-hidden className="size-4" /> Ganti
          </label>
          {!required ? (
            <button
              type="button"
              onClick={() => {
                latestPath.current = null;
                onChange(null);
              }}
              className="inline-flex min-h-11 items-center rounded-md px-2 text-redup hover:bg-tolak-50 hover:text-tolak"
              aria-label={`Hapus ${label}`}
            >
              <Trash2 aria-hidden className="size-4" />
            </button>
          ) : null}
        </div>
      ) : (
        <label
          htmlFor={id}
          className={cn(
            "flex min-h-24 cursor-pointer items-center gap-4 rounded-[var(--radius-kartu)] border-2 border-dashed bg-lembar px-4 py-4 transition-colors hover:border-tinta-600/60 hover:bg-tinta-50/50",
            shownError ? "border-tolak/60" : "border-garis",
          )}
        >
          <span className="grid size-12 shrink-0 place-items-center rounded-full bg-tinta-50 text-tinta-800">
            {busy ? <LoaderCircle aria-hidden className="size-6 motion-safe:animate-spin" /> : <Camera aria-hidden className="size-6" />}
          </span>
          <span>
            <span className="block font-semibold text-tinta-800">{busy ? "Mengunggah…" : "Ambil foto atau pilih berkas"}</span>
            <span className="block text-sm text-redup">
              {existingName ? `Berkas lama: ${existingName}. ` : ""}JPG, PNG, atau PDF, maks. 3 MB
            </span>
          </span>
        </label>
      )}
      {/* Hasil AI yang pasti (lolos/perlu dicek) lebih diutamakan; bila AI gagal/tidak aktif, peringatan lokal tetap tampil. */}
      {value?.blur && !value.blur.dismissed && value.ai?.status !== "lolos" && value.ai?.status !== "perlu_dicek" ? (
        <PhotoWarning
          title="Foto tampak buram."
          message="Teks di foto mungkin sulit dibaca petugas. Pegang ponsel lebih stabil, pastikan cahaya cukup, lalu foto ulang."
          onRetake={() => inputRef.current?.click()}
          onKeep={() => value.blur && onChange({ ...value, blur: { ...value.blur, dismissed: true } })}
        />
      ) : null}
      {value?.ai?.status === "perlu_dicek" && !value.ai.dismissed ? (
        <PhotoWarning
          title="Mohon periksa foto ini."
          message={value.ai.message}
          onRetake={() => inputRef.current?.click()}
          onKeep={() => value.ai && onChange({ ...value, ai: { ...value.ai, dismissed: true } })}
        />
      ) : null}
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept="image/jpeg,image/png,application/pdf"
        className="sr-only"
        aria-labelledby={`${id}-label`}
        disabled={busy}
        onChange={(e) => {
          void handle(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {shownError ? (
        <p role="alert" className="text-sm font-medium text-tolak">
          {shownError}
        </p>
      ) : null}
    </div>
  );
}
