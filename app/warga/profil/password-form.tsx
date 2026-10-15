"use client";

import { useActionState } from "react";
import { changePasswordAction } from "@/app/actions/profile";
import type { ActionState } from "@/lib/action-state";
import { Field, describedBy } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { PasswordInput } from "@/components/ui/password-input";
import { SubmitButton } from "@/components/ui/submit-button";

export function PasswordForm() {
  const [state, action] = useActionState<ActionState, FormData>(changePasswordAction, {});
  const fe = state.fieldErrors ?? {};
  return (
    // key: kosongkan isian setelah berhasil agar kata sandi tidak tertinggal di layar
    <form key={state.ok ? "ok" : "form"} action={action} className="space-y-5" noValidate>
      {state.ok ? <Notice tone="berhasil">{state.message}</Notice> : null}
      {state.error ? <Notice tone="galat">{state.error}</Notice> : null}
      <Field id="lama" label="Kata sandi saat ini" required error={fe.lama}>
        <PasswordInput
          id="lama"
          name="lama"
          autoComplete="current-password"
          required
          aria-invalid={!!fe.lama}
          aria-describedby={describedBy("lama", null, fe.lama)}
        />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
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
      </div>
      <SubmitButton size="lg" variant="garis" pendingText="Menyimpan…">
        Ganti kata sandi
      </SubmitButton>
    </form>
  );
}
