import { z } from "zod";

export const nikSchema = z
  .string({ error: "NIK wajib diisi" })
  .trim()
  .regex(/^\d{16}$/, { error: "NIK harus 16 digit angka, sesuai KTP" })
  .refine((v) => !/^0{16}$/.test(v), { error: "NIK tidak valid" });

export const loginSchema = z.object({
  email: z.email({ error: "Masukkan alamat email yang benar" }).trim().toLowerCase(),
  password: z.string().min(1, { error: "Kata sandi wajib diisi" }),
});

export const registerSchema = z.object({
  nama: z
    .string()
    .trim()
    .min(3, { error: "Nama minimal 3 huruf" })
    .max(100, { error: "Nama terlalu panjang" })
    .regex(/^[\p{L} .,'-]+$/u, { error: "Nama hanya boleh berisi huruf, titik, koma, dan tanda petik" }),
  nik: nikSchema,
  email: z.email({ error: "Masukkan alamat email yang benar" }).trim().toLowerCase(),
  password: z
    .string()
    .min(8, { error: "Kata sandi minimal 8 karakter" })
    .max(72, { error: "Kata sandi terlalu panjang" })
    .regex(/[A-Za-z]/, { error: "Kata sandi harus memuat huruf" })
    .regex(/\d/, { error: "Kata sandi harus memuat angka" }),
  kelurahan_id: z.uuid({ error: "Pilih kelurahan tempat Anda terdaftar" }),
  rt_unit_id: z.uuid({ error: "Pilih RT/RW tempat Anda tinggal" }),
});

export const profileSchema = z.object({
  nama: registerSchema.shape.nama,
  tempat_lahir: z.string().trim().max(60, { error: "Tempat lahir terlalu panjang" }),
  tanggal_lahir: z
    .string()
    .trim()
    .refine((v) => v === "" || (/^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v))), {
      error: "Tanggal lahir tidak valid",
    }),
  pekerjaan: z.string().trim().max(80, { error: "Pekerjaan terlalu panjang" }),
  alamat: z.string().trim().max(300, { error: "Alamat terlalu panjang" }),
});

export const rejectSchema = z.object({
  request_id: z.uuid(),
  note: z
    .string()
    .trim()
    .min(10, { error: "Tulis alasan penolakan minimal 10 karakter agar warga tahu yang harus diperbaiki" })
    .max(500, { error: "Catatan maksimal 500 karakter" }),
});

const newPasswordFields = {
  password: registerSchema.shape.password,
  konfirmasi: z.string(),
};
const samePassword = (d: { password: string; konfirmasi: string }) => d.password === d.konfirmasi;
const samePasswordError = { error: "Konfirmasi kata sandi tidak sama", path: ["konfirmasi"] };

export const changePasswordSchema = z
  .object({ lama: z.string().min(1, { error: "Kata sandi lama wajib diisi" }), ...newPasswordFields })
  .refine(samePassword, samePasswordError)
  .refine((d) => d.lama !== d.password, { error: "Kata sandi baru harus berbeda dari yang lama", path: ["password"] });

export const resetPasswordSchema = z
  .object({ email: registerSchema.shape.email, nik: nikSchema, ...newPasswordFields })
  .refine(samePassword, samePasswordError);
