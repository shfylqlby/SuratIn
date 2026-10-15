"use client";

import { useActionState } from "react";
import { resetPasswordAction } from "@/app/actions/auth";
import type { ActionState } from "@/lib/action-state";
import { Field, Input, describedBy } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { PasswordInput } from "@/components/ui/password-input";
import { SubmitButton } from "@/components/ui/submit-button";

export function ResetForm() {
  const [state, action] = useActionState<ActionState, FormData>(resetPasswordAction, {});
  const fe = state.fieldErrors ?? {};
  const v = state.values ?? {};
  return (
    <form action={action} className="space-y-5" noValidate>
      {state.error ? <Notice tone="galat">{state.error}</Notice> : null}
      <Field id="email" label="Email akun" required error={fe.email}>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          defaultValue={v.email}
          aria-invalid={!!fe.email}
          aria-describedby={describedBy("email", null, fe.email)}
        />
      </Field>
      <Field id="nik" label="NIK" hint="16 digit, sama dengan yang dipakai saat mendaftar." required error={fe.nik}>
        <Input
          id="nik"
          name="nik"
          inputMode="numeric"
          autoComplete="off"
          maxLength={16}
          required
          defaultValue={v.nik}
          className="angka"
          aria-invalid={!!fe.nik}
          aria-describedby={describedBy("nik", true, fe.nik)}
        />
      </Field>
      <Field id="password" label="Kata sandi baru" hint="Minimal 8 karakter, memuat huruf dan angka." required error={fe.password}>
        <PasswordInput
          id="password"
          name="password"
          autoComplete="new-password"
          required
          aria-invalid={!!fe.password}
          aria-describedby={describedBy("password", true, fe.password)}
        />
      </Field>
      <Field id="konfirmasi" label="Ulangi kata sandi baru" required error={fe.konfirmasi}>
        <PasswordInput
          id="konfirmasi"
          name="konfirmasi"
          autoComplete="new-password"
          required
          aria-invalid={!!fe.konfirmasi}
          aria-describedby={describedBy("konfirmasi", null, fe.konfirmasi)}
        />
      </Field>
      <SubmitButton size="lg" className="w-full" pendingText="Memeriksa…">
        Atur ulang kata sandi
      </SubmitButton>
    </form>
  );
}
