"use client";

import { useActionState, useEffect, useMemo, useRef, useState, startTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ArrowRight, Check, Send } from "lucide-react";
import { buildFormZod } from "@/lib/letters/form-schema";
import { addDays, formatRupiah, formatTanggalIsian, todayLocal } from "@/lib/format";
import type { ActionState } from "@/lib/action-state";
import type { FormField, LetterType } from "@/lib/types";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea, describedBy } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { UploadSlot, formatSize, type UploadedDoc } from "./upload-slot";

type Action = (prev: ActionState, formData: FormData) => Promise<ActionState>;

interface Props {
  mode: "baru" | "perbaiki";
  type: Pick<LetterType, "id" | "kode" | "nama" | "form_schema" | "required_documents">;
  requestId: string;
  initialValues: Record<string, string>;
  existingDocs?: Partial<Record<string, string>>;
  rejectReason?: string | null;
  /** "RT/RW" atau "kelurahan": siapa yang mengembalikan permohonan. */
  rejectedBy?: string | null;
  action: Action;
  aiEnabled?: boolean;
}

const STEPS = ["Data", "Berkas", "Tinjau & kirim"] as const;

export function RequestWizard({ mode, type, requestId, initialValues, existingDocs = {}, rejectReason, rejectedBy, action, aiEnabled = false }: Props) {
  const draftKey = mode === "baru" ? `suratin:draf:${type.kode}` : `suratin:perbaikan:${requestId}`;
  const schema = useMemo(() => buildFormZod(type.form_schema, type.kode), [type.form_schema, type.kode]);
  const fields = type.form_schema.fields;
  const docSlots = useMemo(() => {
    const slots = type.required_documents.map((d) => ({ kind: d.kind, label: d.label, required: !d.optional }));
    if (!slots.some((s) => s.kind === "pendukung")) slots.push({ kind: "pendukung", label: "Dokumen pendukung", required: false });
    return slots;
  }, [type.required_documents]);

  // Draf disimpan di perangkat: data, id permohonan, dan berkas yang sudah terunggah.
  // Komponen ini hanya dirender di klien (lihat request-wizard-client.tsx), jadi localStorage aman dibaca di sini.
  const [draft] = useState(() => readDraft(draftKey));
  const [step, setStep] = useState(0);
  const [activeId] = useState(mode === "baru" && draft?.requestId ? draft.requestId : requestId);
  const [docs, setDocs] = useState<Record<string, UploadedDoc | null>>(draft?.docs ?? {});
  const [docErrors, setDocErrors] = useState<Record<string, string>>({});
  const [agree, setAgree] = useState(false);
  const [note, setNote] = useState("");
  const restored = !!draft;
  const headingRef = useRef<HTMLHeadingElement>(null);

  const form = useForm<Record<string, string>>({
    resolver: zodResolver(schema) as never,
    defaultValues: draft
      ? {
          ...initialValues,
          ...draft.values,
          ...Object.fromEntries(fields.filter((f) => f.readonly).map((f) => [f.key, initialValues[f.key]])),
        }
      : initialValues,
    mode: "onTouched",
  });
  const { register, formState, trigger, getValues, setError, control } = form;

  // Simpan draf otomatis.
  const values = useWatch({ control }) as Record<string, string>;
  useEffect(() => {
    const t = setTimeout(() => {
      const cleanDocs = Object.fromEntries(Object.entries(docs).map(([k, d]) => [k, d ? { ...d, preview: undefined, checking: undefined } : null]));
      localStorage.setItem(draftKey, JSON.stringify({ requestId: activeId, values, docs: cleanDocs }));
    }, 400);
    return () => clearTimeout(t);
  }, [values, docs, activeId, draftKey]);

  const [state, formAction, pending] = useActionState<ActionState, FormData>(async (prev, fd) => {
    const result = await action(prev, fd);
    if (result.fieldErrors) {
      for (const [k, msg] of Object.entries(result.fieldErrors)) setError(k, { message: msg });
      if (Object.keys(result.fieldErrors).some((k) => fields.some((f) => f.key === k))) setStep(0);
    }
    return result;
  }, {});

  useEffect(() => {
    headingRef.current?.focus();
  }, [step]);

  async function next() {
    if (step === 0) {
      const ok = await trigger();
      if (!ok) return;
    }
    if (step === 1) {
      const errs: Record<string, string> = {};
      for (const slot of docSlots) {
        if (slot.required && !docs[slot.kind] && !existingDocs[slot.kind]) errs[slot.kind] = `${slot.label} wajib diunggah`;
        else if (docs[slot.kind]?.checking) errs[slot.kind] = `Tunggu sebentar, ${slot.label} sedang diperiksa.`;
      }
      setDocErrors(errs);
      if (Object.keys(errs).length) return;
    }
    setStep((s) => Math.min(s + 1, 2));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function back() {
    setStep((s) => Math.max(s - 1, 0));
  }

  function submit() {
    const fd = new FormData();
    fd.set("type_id", type.id);
    fd.set("request_id", activeId);
    fd.set("form", JSON.stringify(schema.parse(getValues())));
    const list = Object.values(docs)
      .filter((d): d is UploadedDoc => !!d)
      .map((d) => ({ kind: d.kind, storage_path: d.storage_path, file_name: d.file_name }));
    fd.set("docs", JSON.stringify(list));
    if (note) fd.set("note", note);
    startTransition(() => formAction(fd));
  }

  return (
    <div className="space-y-6">
      <Progress step={step} />

      {mode === "perbaiki" && rejectReason ? (
        <Notice tone="galat" title={rejectedBy ? `Catatan dari ${rejectedBy}` : "Catatan dari petugas"}>
          {rejectReason}
        </Notice>
      ) : null}
      {restored && step === 0 ? (
        <Notice tone="info">Isian sebelumnya dipulihkan dari perangkat ini.</Notice>
      ) : null}
      {state.error ? <Notice tone="galat">{state.error}</Notice> : null}

      <h2 ref={headingRef} tabIndex={-1} className="text-2xl font-bold text-tinta-900 outline-none">
        {step === 0 ? "Lengkapi data" : step === 1 ? "Unggah berkas" : "Periksa sebelum dikirim"}
      </h2>

      {step === 0 ? (
        <div className="space-y-5">
          {fields.map((field) => (
            <DynamicField key={field.key} field={field} register={register} error={formState.errors[field.key]?.message as string | undefined} value={values[field.key]} />
          ))}
        </div>
      ) : null}

      {step === 1 ? (
        <div className="space-y-6">
          <p className="text-redup">Pastikan tulisan di foto terbaca jelas dan tidak terpotong. Foto besar akan diperkecil otomatis.</p>
          {docSlots.map((slot) => (
            <UploadSlot
              key={slot.kind}
              requestId={activeId}
              kind={slot.kind}
              label={slot.label}
              required={slot.required && !existingDocs[slot.kind]}
              value={docs[slot.kind] ?? null}
              existingName={existingDocs[slot.kind]}
              error={docErrors[slot.kind]}
              aiEnabled={aiEnabled}
              onChange={(d) => {
                setDocs((prev) => ({ ...prev, [slot.kind]: d }));
                setDocErrors((prev) => ({ ...prev, [slot.kind]: "" }));
              }}
            />
          ))}
        </div>
      ) : null}

      {step === 2 ? (
        <div className="space-y-6">
          <section className="rounded-[var(--radius-kartu)] border border-garis bg-lembar">
            <div className="flex items-center justify-between border-b border-garis-halus px-5 py-3">
              <h3 className="font-semibold text-teks">Data {type.nama}</h3>
              <button type="button" onClick={() => setStep(0)} className="min-h-11 rounded-md px-2 text-sm font-semibold text-tinta-800 hover:underline">
                Ubah
              </button>
            </div>
            <dl className="divide-y divide-garis-halus">
              {fields.map((f) => (
                <div key={f.key} className="grid gap-0.5 px-5 py-3 sm:grid-cols-[13rem_1fr] sm:gap-4">
                  <dt className="text-sm text-redup">{f.label}</dt>
                  <dd className="font-medium break-words text-teks">{displayValue(f, getValues(f.key))}</dd>
                </div>
              ))}
            </dl>
          </section>
          <section className="rounded-[var(--radius-kartu)] border border-garis bg-lembar">
            <div className="flex items-center justify-between border-b border-garis-halus px-5 py-3">
              <h3 className="font-semibold text-teks">Berkas</h3>
              <button type="button" onClick={() => setStep(1)} className="min-h-11 rounded-md px-2 text-sm font-semibold text-tinta-800 hover:underline">
                Ubah
              </button>
            </div>
            <ul className="divide-y divide-garis-halus">
              {docSlots.map((slot) => {
                const d = docs[slot.kind];
                const old = existingDocs[slot.kind];
                if (!d && !old) return null;
                return (
                  <li key={slot.kind} className="flex items-center gap-3 px-5 py-3">
                    <Check aria-hidden className="size-5 text-terbit" />
                    <span className="font-medium text-teks">{slot.label}</span>
                    <span className="ml-auto truncate text-sm text-redup">
                      {d ? `${d.file_name}, ${formatSize(d.size)}` : `${old} (berkas lama)`}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>

          {mode === "perbaiki" ? (
            <Field id="catatan-perbaikan" label="Pesan untuk petugas" hint="Jelaskan singkat apa yang sudah Anda perbaiki.">
              <Textarea id="catatan-perbaikan" value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} className="min-h-20" />
            </Field>
          ) : null}

          <label className="flex cursor-pointer items-start gap-3 rounded-[var(--radius-kartu)] border border-garis bg-lembar p-4">
            <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-1 size-5 shrink-0 accent-tinta-800" />
            <span className="text-teks">
              Saya menyatakan data dan berkas yang saya kirim benar. Saya memahami bahwa keterangan palsu dapat dikenai sanksi.
            </span>
          </label>
          <p className="text-sm text-redup">
            Setelah dikirim, Ketua RT/RW Anda memeriksa dan membuat surat pengantar, lalu kelurahan memeriksa ulang dan
            menerbitkan surat bertanda tangan lurah.
          </p>
        </div>
      ) : null}

      <div className="sticky bottom-0 -mx-4 flex gap-3 border-t border-garis bg-kertas/95 px-4 py-3 sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:pt-2">
        {step > 0 ? (
          <Button type="button" variant="garis" size="lg" onClick={back} disabled={pending}>
            <ArrowLeft aria-hidden /> Kembali
          </Button>
        ) : null}
        {step < 2 ? (
          <Button type="button" variant="tinta" size="lg" onClick={next} className="flex-1 sm:flex-none">
            Lanjut <ArrowRight aria-hidden />
          </Button>
        ) : (
          <Button type="button" variant="utama" size="lg" onClick={submit} disabled={!agree || pending} className="flex-1 sm:flex-none" aria-busy={pending}>
            <Send aria-hidden /> {pending ? "Mengirim…" : mode === "baru" ? "Kirim permohonan" : "Kirim perbaikan"}
          </Button>
        )}
      </div>
    </div>
  );
}

function readDraft(key: string) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as { requestId: string; values: Record<string, string>; docs: Record<string, UploadedDoc | null> };
  } catch {
    localStorage.removeItem(key);
    return null;
  }
}

function Progress({ step }: { step: number }) {
  return (
    <ol className="grid grid-cols-3 gap-2" aria-label="Langkah pengajuan">
      {STEPS.map((label, i) => (
        <li key={label} aria-current={i === step ? "step" : undefined} className="space-y-2">
          <span className={cn("block h-1.5 rounded-full", i <= step ? "bg-tinta-800" : "bg-garis")} />
          <span className={cn("flex items-start gap-1.5 text-sm", i === step ? "font-semibold text-teks" : "text-redup")}>
            <span
              className={cn(
                "grid size-6 shrink-0 place-items-center rounded-full text-xs font-bold angka",
                i < step ? "bg-terbit text-white" : i === step ? "bg-tinta-800 text-white" : "bg-garis-halus text-redup",
              )}
            >
              {i < step ? <Check aria-hidden className="size-3.5" /> : i + 1}
            </span>
            <span className="leading-tight">{label}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

function displayValue(field: FormField, value: string | undefined) {
  if (!value) return "-";
  if (field.type === "currency") return formatRupiah(value.replace(/[^\d]/g, ""));
  if (field.type === "date") return formatTanggalIsian(value);
  if (field.key === "tanggungan") return `${value} orang`;
  return value;
}

function DynamicField({
  field,
  register,
  error,
  value,
}: {
  field: FormField;
  register: ReturnType<typeof useForm<Record<string, string>>>["register"];
  error?: string;
  value?: string;
}) {
  const id = `f-${field.key}`;
  const common = {
    id,
    "aria-invalid": !!error,
    "aria-describedby": describedBy(id, field.hint || field.readonly, error),
    readOnly: field.readonly,
    ...register(field.key),
  };
  const hint = field.readonly ? "Diambil dari akun Anda." : field.hint;

  return (
    <Field id={id} label={field.label} required={field.required} hint={hint} error={error}>
      {field.type === "textarea" ? (
        <Textarea {...common} placeholder={field.placeholder} />
      ) : field.type === "select" ? (
        <Select {...common}>
          <option value="" disabled>
            Pilih salah satu
          </option>
          {field.options?.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </Select>
      ) : field.type === "date" ? (
        <Input
          {...common}
          type="date"
          min={field.minDaysAhead !== undefined ? addDays(todayLocal(), field.minDaysAhead) : undefined}
          className="angka"
        />
      ) : field.type === "time" ? (
        <Input {...common} type="time" className="angka" />
      ) : field.type === "phone" ? (
        <Input {...common} type="tel" inputMode="tel" autoComplete="tel" placeholder={field.placeholder} className="angka" />
      ) : field.type === "number" || field.type === "currency" ? (
        <>
          <Input {...common} inputMode="numeric" autoComplete="off" placeholder={field.placeholder} className="angka" />
          {field.type === "currency" && value && /\d/.test(value) ? (
            <p className="text-sm text-redup angka">Terbaca: {formatRupiah(value.replace(/[^\d]/g, ""))}</p>
          ) : null}
        </>
      ) : (
        <Input {...common} placeholder={field.placeholder} className={field.key === "nik" ? "angka tracking-wider" : undefined} />
      )}
    </Field>
  );
}
