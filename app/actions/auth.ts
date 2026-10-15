"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ROLE_HOME, homeForRole } from "@/lib/format";
import { rateLimit } from "@/lib/rate-limit";
import { loginSchema, registerSchema, resetPasswordSchema } from "@/lib/validation";
import { createAdminClient } from "@/lib/supabase/admin";
import { isLockedDemoAccount } from "@/lib/config";
import { type ActionState, zodFieldErrors } from "@/lib/action-state";
import type { UserRole } from "@/lib/types";

export async function loginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const raw = { email: String(formData.get("email") ?? ""), password: String(formData.get("password") ?? "") };
  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error), values: { email: raw.email } };

  const limit = await rateLimit("login", 10);
  if (!limit.ok) {
    return { error: `Terlalu banyak percobaan masuk. Coba lagi dalam ${limit.retryAfter} detik.`, values: { email: raw.email } };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error || !data.user) {
    return { error: "Email atau kata sandi salah. Periksa kembali lalu coba lagi.", values: { email: raw.email } };
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).single();
  const role = (profile?.role ?? "warga") as UserRole;
  const next = String(formData.get("lanjut") ?? "");
  const prefix = ROLE_HOME[role];
  const safeNext = (next === prefix || next.startsWith(`${prefix}/`)) && !next.startsWith("//") ? next : null;
  redirect(safeNext ?? homeForRole(role));
}

export async function registerAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const raw = Object.fromEntries(
    ["nama", "nik", "email", "password", "kelurahan_id", "rt_unit_id"].map((k) => [k, String(formData.get(k) ?? "")]),
  );
  const safeValues = { ...raw, password: "" };
  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error), values: safeValues };

  const limit = await rateLimit("register", 5);
  if (!limit.ok) {
    return { error: `Terlalu banyak pendaftaran dari jaringan ini. Coba lagi dalam ${limit.retryAfter} detik.`, values: safeValues };
  }

  const supabase = await createClient();
  const { data: kel } = await supabase.from("regions_kelurahan").select("id").eq("id", parsed.data.kelurahan_id).maybeSingle();
  if (!kel) return { fieldErrors: { kelurahan_id: "Kelurahan tidak ditemukan" }, values: safeValues };
  // Jangan percaya klien: RT/RW harus milik kelurahan yang dipilih (dicek ulang di trigger handle_new_user).
  const { data: unit } = await supabase
    .from("rt_units")
    .select("id")
    .eq("id", parsed.data.rt_unit_id)
    .eq("kelurahan_id", parsed.data.kelurahan_id)
    .maybeSingle();
  if (!unit) return { fieldErrors: { rt_unit_id: "RT/RW ini bukan bagian dari kelurahan yang dipilih" }, values: safeValues };

  // Akun dibuat di server dengan email langsung terkonfirmasi, tanpa mengirim email konfirmasi. SMTP bawaan
  // Supabase hanya mengizinkan beberapa email per jam, sehingga signUp biasa gagal (429) saat banyak juri mendaftar.
  // Peran tetap dipaksa "warga" oleh trigger handle_new_user; kecocokan RT/kelurahan sudah dicek di atas.
  const { error } = await createAdminClient().auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: { nama: parsed.data.nama, nik: parsed.data.nik, kelurahan_id: parsed.data.kelurahan_id, rt_unit_id: parsed.data.rt_unit_id },
  });

  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("already") || msg.includes("registered")) {
      return { fieldErrors: { email: "Email ini sudah terdaftar. Silakan masuk." }, values: safeValues };
    }
    if (msg.includes("database error")) {
      return { fieldErrors: { nik: "NIK ini sudah terdaftar. Jika ini NIK Anda, hubungi kantor kelurahan." }, values: safeValues };
    }
    if (msg.includes("password")) {
      return { fieldErrors: { password: "Kata sandi terlalu lemah. Gunakan minimal 8 karakter berisi huruf dan angka." }, values: safeValues };
    }
    return { error: "Pendaftaran gagal. Coba beberapa saat lagi.", values: safeValues };
  }

  const { error: loginError } = await supabase.auth.signInWithPassword({ email: parsed.data.email, password: parsed.data.password });
  if (loginError) redirect(`/masuk?email=${encodeURIComponent(parsed.data.email)}`);
  redirect("/warga/profil?baru=1");
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/masuk");
}

/**
 * Lupa kata sandi tanpa email: warga membuktikan kepemilikan akun dengan email + NIK yang terdaftar.
 * Keputusan tim untuk prototipe (NIK bukan rahasia, lihat CHANGELOG-REV1.md). Pengaman: hanya akun warga,
 * pesan gagal seragam (tidak membocorkan email mana yang terdaftar), dan pembatasan 5 percobaan/menit/IP.
 */
export async function resetPasswordAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const raw = {
    email: String(formData.get("email") ?? ""),
    nik: String(formData.get("nik") ?? ""),
    password: String(formData.get("password") ?? ""),
    konfirmasi: String(formData.get("konfirmasi") ?? ""),
  };
  const values = { email: raw.email, nik: raw.nik };
  const parsed = resetPasswordSchema.safeParse(raw);
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error), values };

  const limit = await rateLimit("reset-sandi", 5);
  if (!limit.ok) return { error: `Terlalu banyak percobaan. Coba lagi dalam ${limit.retryAfter} detik.`, values };
  if (isLockedDemoAccount(parsed.data.email)) {
    return { error: "Kata sandi akun demo tidak dapat direset. Gunakan kata sandi yang tertera di halaman masuk.", values };
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("id")
    .eq("email", parsed.data.email)
    .eq("nik", parsed.data.nik)
    .eq("role", "warga")
    .maybeSingle();
  if (!profile) return { error: "Email dan NIK tidak cocok dengan akun warga mana pun.", values };

  const { error } = await admin.auth.admin.updateUserById(profile.id, { password: parsed.data.password });
  if (error) return { error: "Kata sandi gagal diganti. Coba lagi.", values };
  redirect(`/masuk?email=${encodeURIComponent(parsed.data.email)}&reset=1`);
}
