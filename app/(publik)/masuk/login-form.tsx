"use client";

import { useActionState } from "react";
import { loginAction } from "@/app/actions/auth";
import type { ActionState } from "@/lib/action-state";
import { Field, Input, describedBy } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { PasswordInput } from "@/components/ui/password-input";
import { SubmitButton } from "@/components/ui/submit-button";

export function LoginForm({ next, presetEmail }: { next?: string; presetEmail?: string }) {
  const [state, action] = useActionState<ActionState, FormData>(loginAction, {});
  const fe = state.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-5" noValidate>
      {state.error ? <Notice tone="galat">{state.error}</Notice> : null}
      <input type="hidden" name="lanjut" value={next ?? ""} />
      <Field id="email" label="Email" required error={fe.email}>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          defaultValue={state.values?.email ?? presetEmail ?? ""}
          key={presetEmail}
          aria-invalid={!!fe.email}
          aria-describedby={describedBy("email", null, fe.email)}
        />
      </Field>
      <Field id="password" label="Kata sandi" required error={fe.password}>
        <PasswordInput
          id="password"
          name="password"
          autoComplete="current-password"
          required
          aria-invalid={!!fe.password}
          aria-describedby={describedBy("password", null, fe.password)}
        />
      </Field>
      <SubmitButton size="lg" className="w-full" pendingText="Memeriksa…">
        Masuk
      </SubmitButton>
    </form>
  );
}
