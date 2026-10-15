"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { BadgeCheck, Send, Undo2, X } from "lucide-react";
import { approveAction, rejectAction } from "@/app/actions/review";
import type { ActionState } from "@/lib/action-state";
import { Button } from "@/components/ui/button";
import { Field, Textarea, describedBy } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { SubmitButton } from "@/components/ui/submit-button";
import { cn } from "@/lib/cn";

type Reviewer = "rt_rw" | "admin_kelurahan";

const QUICK_REASONS: Record<Reviewer, string[]> = {
  rt_rw: [
    "Pemohon tidak tercatat sebagai warga RT ini, mohon konfirmasi alamat.",
    "Alamat pada formulir berbeda dengan alamat di KTP/KK.",
    "Foto KTP buram atau terpotong, mohon foto ulang di tempat terang.",
    "Keperluan surat belum jelas, mohon dilengkapi.",
  ],
  admin_kelurahan: [
    "Foto KTP buram atau terpotong, mohon foto ulang di tempat terang.",
    "Foto Kartu Keluarga tidak terbaca jelas.",
    "Penghasilan yang diisi tidak sesuai dengan berkas pendukung.",
    "Alamat pada formulir berbeda dengan alamat di KTP/KK.",
    "Nama pada formulir tidak sama dengan nama di KTP.",
  ],
};

const COPY: Record<Reviewer, { button: string; title: string; body: string; confirm: string; submit: string; pending: string }> = {
  rt_rw: {
    button: "Setujui & buat surat pengantar",
    title: "Setujui permohonan ini?",
    body: "Sistem membuat Surat Pengantar RT/RW atas nama Anda, lalu permohonan diteruskan ke kelurahan. Persetujuan Anda tercatat di riwayat.",
    confirm: "Saya mengenal pemohon sebagai warga RT ini dan datanya benar.",
    submit: "Setujui & teruskan",
    pending: "Membuat surat pengantar…",
  },
  admin_kelurahan: {
    button: "Setujui & terbitkan",
    title: "Setujui dan terbitkan surat?",
    body: "Sistem mengambil nomor surat, membubuhkan tanda tangan elektronik dan stempel kelurahan, lalu mengunci PDF dengan sidik SHA-256.",
    confirm: "Saya sudah memeriksa berkas, surat pengantar RT/RW, dan pratinjau surat.",
    submit: "Terbitkan surat",
    pending: "Menerbitkan…",
  },
};

export function ReviewActions({ requestId, role, checklist = [] }: { requestId: string; role: Reviewer; checklist?: string[] }) {
  const [checked, setChecked] = useState<boolean[]>(() => checklist.map(() => false));
  const [mode, setMode] = useState<"idle" | "tolak">("idle");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const allChecked = checked.every(Boolean);

  return (
    <div className="space-y-5">
      {checklist.length ? (
        <fieldset className="space-y-2">
          <legend className="mb-2 font-semibold text-teks">Daftar periksa</legend>
          {checklist.map((item, i) => (
            <label key={item} className="flex min-h-11 cursor-pointer items-start gap-3 rounded-md px-1 py-1.5 hover:bg-kertas">
              <input
                type="checkbox"
                checked={checked[i]}
                onChange={(e) => setChecked((prev) => prev.map((v, j) => (j === i ? e.target.checked : v)))}
                className="mt-0.5 size-5 shrink-0 accent-terbit"
              />
              <span className={cn("text-[0.95rem]", checked[i] ? "text-redup line-through decoration-redup/40" : "text-teks")}>{item}</span>
            </label>
          ))}
        </fieldset>
      ) : null}

      {mode === "tolak" ? (
        <RejectForm requestId={requestId} role={role} onCancel={() => setMode("idle")} />
      ) : (
        <div className="flex flex-col gap-2 sm:flex-row lg:flex-col xl:flex-row">
          <Button variant="utama" size="lg" className="flex-1" disabled={!allChecked} onClick={() => dialogRef.current?.showModal()}>
            <BadgeCheck aria-hidden />
            {COPY[role].button}
          </Button>
          <Button variant="bahaya" size="lg" onClick={() => setMode("tolak")}>
            <Undo2 aria-hidden /> Tolak
          </Button>
        </div>
      )}
      {!allChecked && mode === "idle" ? (
        <p className="text-sm text-redup">Centang semua daftar periksa untuk mengaktifkan tombol setuju.</p>
      ) : null}

      <ConfirmDialog dialogRef={dialogRef} requestId={requestId} role={role} />
    </div>
  );
}

function RejectForm({ requestId, role, onCancel }: { requestId: string; role: Reviewer; onCancel: () => void }) {
  const [state, action] = useActionState<ActionState, FormData>(rejectAction, {});
  const [note, setNote] = useState(state.values?.note ?? "");
  const error = state.fieldErrors?.note;
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => ref.current?.focus(), []);

  return (
    <form action={action} className="space-y-4 rounded-[var(--radius-kartu)] border border-tolak/30 bg-tolak-50/50 p-4">
      <input type="hidden" name="request_id" value={requestId} />
      {state.error ? <Notice tone="galat">{state.error}</Notice> : null}
      <div>
        <p className="mb-2 text-sm font-semibold text-teks">Alasan cepat</p>
        <div className="flex flex-wrap gap-2">
          {QUICK_REASONS[role].map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setNote((n) => (n.includes(r) ? n : `${n ? `${n.trim()} ` : ""}${r}`))}
              className="min-h-9 rounded-full border border-garis bg-lembar px-3 text-left text-sm text-teks hover:border-tolak/50"
            >
              {r.split(",")[0]}
            </button>
          ))}
        </div>
      </div>
      <Field id="note" label="Catatan untuk warga" required hint="Warga melihat catatan ini. Tulis apa yang harus diperbaiki." error={error}>
        <Textarea
          ref={ref}
          id="note"
          name="note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={500}
          aria-invalid={!!error}
          aria-describedby={describedBy("note", true, error)}
        />
      </Field>
      <p className="text-right text-xs text-redup angka">{note.trim().length}/500, minimal 10</p>
      <div className="flex flex-wrap gap-2">
        <SubmitButton variant="bahaya" pendingText="Menyimpan…" disabled={note.trim().length < 10}>
          <Send aria-hidden /> Kembalikan ke warga
        </SubmitButton>
        <Button type="button" variant="garis" onClick={onCancel}>
          Batal
        </Button>
      </div>
    </form>
  );
}

function ConfirmDialog({
  dialogRef,
  requestId,
  role,
}: {
  dialogRef: React.RefObject<HTMLDialogElement | null>;
  requestId: string;
  role: Reviewer;
}) {
  const [state, action] = useActionState<ActionState, FormData>(approveAction, {});
  const [confirm, setConfirm] = useState(false);
  const copy = COPY[role];

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="konfirmasi-judul"
      className="m-auto w-[min(92vw,34rem)] rounded-[var(--radius-kartu)] border border-garis bg-lembar p-0 text-teks shadow-xl backdrop:bg-tinta-950/50"
    >
      <form action={action} className="space-y-4 p-6">
        <input type="hidden" name="request_id" value={requestId} />
        <div className="flex items-start justify-between gap-4">
          <h2 id="konfirmasi-judul" className="text-xl font-bold text-tinta-900">
            {copy.title}
          </h2>
          <button type="button" onClick={() => dialogRef.current?.close()} aria-label="Tutup" className="grid size-10 place-items-center rounded-md hover:bg-kertas">
            <X aria-hidden className="size-5" />
          </button>
        </div>
        <p className="text-redup">
          {copy.body}
          {role === "admin_kelurahan" ? <strong className="text-teks"> Surat yang sudah terbit tidak bisa diubah atau ditarik.</strong> : null}
        </p>
        {state.error ? <Notice tone="galat">{state.error}</Notice> : null}
        <label className="flex cursor-pointer items-start gap-3 rounded-md border border-garis p-3">
          <input type="checkbox" name="confirm" value="ya" checked={confirm} onChange={(e) => setConfirm(e.target.checked)} className="mt-0.5 size-5 shrink-0 accent-tinta-800" />
          <span>{copy.confirm}</span>
        </label>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="garis" onClick={() => dialogRef.current?.close()}>
            Batal
          </Button>
          <SubmitButton variant="utama" pendingText={copy.pending} disabled={!confirm}>
            {copy.submit}
          </SubmitButton>
        </div>
      </form>
    </dialog>
  );
}
