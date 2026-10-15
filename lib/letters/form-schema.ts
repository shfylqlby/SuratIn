import { z } from "zod";
import type { FormField, FormSchema, Profile } from "@/lib/types";
import { formatTanggal } from "@/lib/format";
import { letterValidators } from "./validators";

/**
 * Membangkitkan skema Zod dari form_schema jenis surat.
 * Dipakai di klien (React Hook Form) dan di server (server action) — satu sumber kebenaran.
 * `kode` jenis surat mengaktifkan validasi khusus dari lib/letters/validators.
 */
export function buildFormZod(schema: FormSchema, kode?: string) {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const field of schema.fields) {
    shape[field.key] = fieldZod(field);
  }
  const base = z.object(shape).strict();
  const extra = kode ? letterValidators[kode] : undefined;
  return extra ? base.superRefine((values, ctx) => extra(values as Record<string, string>, ctx)) : base;
}

function fieldZod(field: FormField): z.ZodTypeAny {
  const label = field.label;
  const required = field.required ?? false;

  if (field.type === "number" || field.type === "currency") {
    let num = z.coerce
      .number({ error: `${label} harus berupa angka` })
      .int({ error: `${label} harus bilangan bulat` });
    if (field.min !== undefined) num = num.min(field.min, { error: `${label} minimal ${field.min}` });
    if (field.max !== undefined) num = num.max(field.max, { error: `${label} maksimal ${field.max}` });
    return z
      .string()
      .trim()
      .transform((v) => v.replace(/[^\d]/g, ""))
      .refine((v) => !required || v.length > 0, { error: `${label} wajib diisi` })
      .refine((v) => v.length === 0 || num.safeParse(v).success, {
        error: rangeMessage(field),
      });
  }

  if (field.type === "select") {
    const options = field.options ?? [];
    return z
      .string({ error: `Pilih ${label.toLowerCase()}` })
      .refine((v) => (required ? options.includes(v) : v === "" || options.includes(v)), {
        error: `Pilih ${label.toLowerCase()}`,
      });
  }

  if (field.type === "date") {
    return pattern(required, label, /^\d{4}-\d{2}-\d{2}$/, `${label} tidak valid`);
  }

  if (field.type === "time") {
    return pattern(required, label, /^([01]\d|2[0-3]):[0-5]\d$/, `${label} tidak valid`);
  }

  if (field.type === "phone") {
    return z
      .string({ error: `${label} wajib diisi` })
      .trim()
      .transform((v) => v.replace(/[\s-]/g, ""))
      .refine((v) => !required || v.length > 0, { error: `${label} wajib diisi` })
      .refine((v) => v.length === 0 || /^\+?\d{9,15}$/.test(v), { error: `${label} harus 9 sampai 15 digit angka` });
  }

  const max = field.type === "textarea" ? 500 : 150;
  let str = z.string({ error: `${label} wajib diisi` }).trim().max(max, { error: `${label} maksimal ${max} karakter` });
  if (required) str = str.min(1, { error: `${label} wajib diisi` });
  if (field.key === "nik") {
    return str.regex(/^\d{16}$/, { error: "NIK harus 16 digit angka" });
  }
  if (field.type === "textarea" && required) {
    return str.min(10, { error: `${label} terlalu singkat, tulis lebih lengkap` });
  }
  return str;
}

function pattern(required: boolean, label: string, re: RegExp, message: string) {
  return z
    .string({ error: `${label} wajib diisi` })
    .trim()
    .refine((v) => !required || v.length > 0, { error: `${label} wajib diisi` })
    .refine((v) => v.length === 0 || re.test(v), { error: message });
}

function rangeMessage(field: FormField) {
  if (field.min !== undefined && field.max !== undefined) {
    return `${field.label} harus antara ${field.min} dan ${field.max}`;
  }
  if (field.min !== undefined) return `${field.label} minimal ${field.min}`;
  return `${field.label} harus berupa angka`;
}

/** Nilai awal formulir dari profil. `wilayah` berisi data turunan yang tidak ada di tabel profil. */
export function profilePrefill(
  schema: FormSchema,
  profile: Profile,
  wilayah: { kecamatan?: string | null } = {},
  existing?: Record<string, string>,
) {
  const values: Record<string, string> = {};
  for (const field of schema.fields) {
    const fromExisting = existing?.[field.key];
    let fromProfile = "";
    if (field.prefill?.startsWith("profile.")) {
      const key = field.prefill.slice("profile.".length);
      if (key === "kecamatan") {
        fromProfile = wilayah.kecamatan ?? "";
      } else if (key === "ttl") {
        if (profile.tempat_lahir && profile.tanggal_lahir) {
          fromProfile = `${profile.tempat_lahir}, ${formatTanggal(profile.tanggal_lahir)}`;
        }
      } else {
        const v = profile[key as keyof Profile];
        fromProfile = typeof v === "string" ? v : "";
      }
    }
    values[field.key] = field.readonly ? fromProfile : (fromExisting ?? fromProfile ?? "");
  }
  return values;
}
