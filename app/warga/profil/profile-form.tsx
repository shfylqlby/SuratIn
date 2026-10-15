"use client";

import { useActionState } from "react";
import { updateProfileAction } from "@/app/actions/profile";
import type { ActionState } from "@/lib/action-state";
import { Field, Input, Textarea, describedBy } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { SubmitButton } from "@/components/ui/submit-button";

export function ProfileForm({ initial }: { initial: Record<string, string> }) {
  const [state, action] = useActionState<ActionState, FormData>(updateProfileAction, {});
  const fe = state.fieldErrors ?? {};
  const v = state.values ?? initial;

  return (
    <form action={action} className="space-y-5" noValidate>
      {state.ok ? <Notice tone="berhasil">{state.message}</Notice> : null}
      {state.error ? <Notice tone="galat">{state.error}</Notice> : null}
      <Field id="nama" label="Nama lengkap" required error={fe.nama}>
        <Input id="nama" name="nama" defaultValue={v.nama} autoComplete="name" aria-invalid={!!fe.nama} aria-describedby={describedBy("nama", null, fe.nama)} />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="tempat_lahir" label="Tempat lahir" required error={fe.tempat_lahir}>
          <Input id="tempat_lahir" name="tempat_lahir" defaultValue={v.tempat_lahir} aria-invalid={!!fe.tempat_lahir} />
        </Field>
        <Field id="tanggal_lahir" label="Tanggal lahir" required error={fe.tanggal_lahir}>
          <Input id="tanggal_lahir" name="tanggal_lahir" type="date" defaultValue={v.tanggal_lahir} aria-invalid={!!fe.tanggal_lahir} />
        </Field>
      </div>
      <Field id="pekerjaan" label="Pekerjaan" required error={fe.pekerjaan}>
        <Input id="pekerjaan" name="pekerjaan" defaultValue={v.pekerjaan} aria-invalid={!!fe.pekerjaan} />
      </Field>
      <Field id="alamat" label="Alamat sesuai KTP" required hint="Nama jalan, nomor rumah, RT/RW." error={fe.alamat}>
        <Textarea id="alamat" name="alamat" defaultValue={v.alamat} aria-invalid={!!fe.alamat} aria-describedby={describedBy("alamat", true, fe.alamat)} />
      </Field>
      <SubmitButton size="lg" pendingText="Menyimpan…">
        Simpan profil
      </SubmitButton>
    </form>
  );
}
