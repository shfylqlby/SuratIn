"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { registerAction } from "@/app/actions/auth";
import type { ActionState } from "@/lib/action-state";
import { Field, Input, Select, describedBy } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { PasswordInput } from "@/components/ui/password-input";
import { SubmitButton } from "@/components/ui/submit-button";

interface KelurahanOption {
  id: string;
  nama: string;
  kecamatan: string;
}

interface RtOption {
  id: string;
  kelurahan_id: string;
  label: string;
}

export function RegisterForm({ kelurahan, rtUnits }: { kelurahan: KelurahanOption[]; rtUnits: RtOption[] }) {
  const [state, action] = useActionState<ActionState, FormData>(registerAction, {});
  const fe = state.fieldErrors ?? {};
  const v = state.values ?? {};
  // Urutan isian: Kelurahan → RT/RW → data diri. Pilihan RT bergantung pada kelurahan (server memvalidasi ulang).
  const [kelId, setKelId] = useState(v.kelurahan_id ?? "");
  const [rtId, setRtId] = useState(v.rt_unit_id ?? "");
  const rtChoices = rtUnits.filter((u) => u.kelurahan_id === kelId);

  if (state.ok) {
    return (
      <Notice tone="berhasil" title="Pendaftaran berhasil" action={<Link className="font-semibold underline" href="/masuk">Ke halaman masuk</Link>}>
        {state.message}
      </Notice>
    );
  }

  return (
    <form action={action} className="space-y-5" noValidate>
      {state.error ? <Notice tone="galat">{state.error}</Notice> : null}

      <fieldset className="space-y-5 rounded-[var(--radius-kartu)] border border-garis bg-lembar p-4">
        <legend className="px-1 text-sm font-semibold text-redup">Tempat tinggal sesuai KTP</legend>
        <Field id="kelurahan_id" label="Kelurahan" required error={fe.kelurahan_id}>
          <Select
            id="kelurahan_id"
            name="kelurahan_id"
            required
            value={kelId}
            onChange={(e) => {
              setKelId(e.target.value);
              setRtId("");
            }}
            aria-invalid={!!fe.kelurahan_id}
            aria-describedby={describedBy("kelurahan_id", null, fe.kelurahan_id)}
          >
            <option value="" disabled>
              Pilih kelurahan
            </option>
            {kelurahan.map((k) => (
              <option key={k.id} value={k.id}>
                {k.nama}, Kec. {k.kecamatan}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          id="rt_unit_id"
          label="RT/RW"
          required
          hint={kelId ? "Surat Anda akan diperiksa Ketua RT/RW ini lebih dulu." : "Pilih kelurahan dulu."}
          error={fe.rt_unit_id}
        >
          <Select
            id="rt_unit_id"
            name="rt_unit_id"
            required
            disabled={!kelId}
            value={rtId}
            onChange={(e) => setRtId(e.target.value)}
            aria-invalid={!!fe.rt_unit_id}
            aria-describedby={describedBy("rt_unit_id", true, fe.rt_unit_id)}
          >
            <option value="" disabled>
              {kelId ? "Pilih RT/RW" : "Pilih kelurahan dulu"}
            </option>
            {rtChoices.map((u) => (
              <option key={u.id} value={u.id}>
                {u.label}
              </option>
            ))}
          </Select>
        </Field>
      </fieldset>

      <Field id="nik" label="NIK" required hint="16 digit angka, sama dengan di KTP." error={fe.nik}>
        <Input
          id="nik"
          name="nik"
          inputMode="numeric"
          autoComplete="off"
          maxLength={16}
          pattern="\d{16}"
          required
          defaultValue={v.nik}
          aria-invalid={!!fe.nik}
          aria-describedby={describedBy("nik", true, fe.nik)}
          className="angka tracking-wider"
        />
      </Field>
      <Field id="nama" label="Nama lengkap" required hint="Tulis sesuai KTP." error={fe.nama}>
        <Input id="nama" name="nama" autoComplete="name" required defaultValue={v.nama} aria-invalid={!!fe.nama} aria-describedby={describedBy("nama", true, fe.nama)} />
      </Field>
      <Field id="email" label="Email" required hint="Dipakai untuk masuk dan menerima kabar status surat." error={fe.email}>
        <Input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          defaultValue={v.email}
          aria-invalid={!!fe.email}
          aria-describedby={describedBy("email", true, fe.email)}
        />
      </Field>
      <Field id="password" label="Kata sandi" required hint="Minimal 8 karakter, berisi huruf dan angka." error={fe.password}>
        <PasswordInput
          id="password"
          name="password"
          autoComplete="new-password"
          required
          minLength={8}
          aria-invalid={!!fe.password}
          aria-describedby={describedBy("password", true, fe.password)}
        />
      </Field>
      <SubmitButton variant="utama" size="lg" className="w-full" pendingText="Membuat akun…">
        Buat akun
      </SubmitButton>
    </form>
  );
}
