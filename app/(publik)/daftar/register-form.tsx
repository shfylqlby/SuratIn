"use client";

import { useActionState, useState, type ReactNode } from "react";
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

function Bagian({ no, judul, keterangan, children }: { no: number; judul: string; keterangan: string; children: ReactNode }) {
  return (
    <fieldset className="border-t border-garis-halus px-5 py-6 first:border-t-0 sm:px-6">
      <legend className="sr-only">{judul}</legend>
      <div className="mb-5 flex items-start gap-3" aria-hidden>
        <span className="angka flex size-7 shrink-0 items-center justify-center rounded-full bg-tinta-900 text-sm font-bold text-white">{no}</span>
        <div>
          <p className="font-bold text-tinta-900">{judul}</p>
          <p className="text-sm text-redup">{keterangan}</p>
        </div>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
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
    // React 19 me-reset form setelah action; batalkan agar pilihan kelurahan/RT dan isian tidak hilang saat ada galat.
    <form action={action} onReset={(e) => e.preventDefault()} className="space-y-5" noValidate>
      {state.error ? <Notice tone="galat">{state.error}</Notice> : null}

      <div className="rounded-[var(--radius-kartu)] border border-garis bg-lembar shadow-sm">
        <Bagian no={1} judul="Tempat tinggal" keterangan="Sesuai KTP. Surat Anda diperiksa Ketua RT/RW ini lebih dulu.">
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
          <Field id="rt_unit_id" label="RT/RW" required error={fe.rt_unit_id}>
            <Select
              id="rt_unit_id"
              name="rt_unit_id"
              required
              value={rtId}
              onChange={(e) => {
                // Boleh pilih RT lebih dulu: kelurahan ikut terisi dari RT yang dipilih.
                setRtId(e.target.value);
                setKelId(rtUnits.find((u) => u.id === e.target.value)?.kelurahan_id ?? kelId);
              }}
              aria-invalid={!!fe.rt_unit_id}
              aria-describedby={describedBy("rt_unit_id", null, fe.rt_unit_id)}
            >
              <option value="" disabled>
                Pilih RT/RW
              </option>
              {kelId
                ? rtChoices.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.label}
                    </option>
                  ))
                : kelurahan.map((k) => (
                    <optgroup key={k.id} label={k.nama}>
                      {rtUnits
                        .filter((u) => u.kelurahan_id === k.id)
                        .map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.label}
                          </option>
                        ))}
                    </optgroup>
                  ))}
            </Select>
          </Field>
        </Bagian>

        <Bagian no={2} judul="Data diri" keterangan="Samakan dengan KTP agar permohonan tidak ditolak.">
          <Field id="nik" label="NIK" required hint="16 digit angka." error={fe.nik}>
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
          <Field id="nama" label="Nama lengkap" required hint="Tanpa singkatan." error={fe.nama}>
            <Input id="nama" name="nama" autoComplete="name" required defaultValue={v.nama} aria-invalid={!!fe.nama} aria-describedby={describedBy("nama", true, fe.nama)} />
          </Field>
        </Bagian>

        <Bagian no={3} judul="Akun" keterangan="Kabar status surat dikirim ke email ini.">
          <Field id="email" label="Email" required hint="Dipakai untuk masuk." error={fe.email}>
            <Input
              id="email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              required
              placeholder="nama@email.com"
              defaultValue={v.email}
              aria-invalid={!!fe.email}
              aria-describedby={describedBy("email", true, fe.email)}
            />
          </Field>
          <Field id="password" label="Kata sandi" required hint="Min. 8 karakter, huruf dan angka." error={fe.password}>
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
        </Bagian>

        <div className="rounded-b-[var(--radius-kartu)] border-t border-garis-halus bg-kertas px-5 py-5 sm:px-6">
          <SubmitButton variant="utama" size="lg" className="w-full" pendingText="Membuat akun…">
            Buat akun
          </SubmitButton>
          <p className="mt-4 text-center text-redup">
            Sudah punya akun?{" "}
            <Link href="/masuk" className="font-semibold text-tinta-800 underline underline-offset-4">
              Masuk
            </Link>
          </p>
        </div>
      </div>
    </form>
  );
}
