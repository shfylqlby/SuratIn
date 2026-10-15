"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/guard";
import { type ActionState, zodFieldErrors } from "@/lib/action-state";
import { changePasswordSchema, profileSchema } from "@/lib/validation";
import { isLockedDemoAccount } from "@/lib/config";
import { rateLimit } from "@/lib/rate-limit";

export async function updateProfileAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase, profile } = await requireRole("warga");
  const raw = Object.fromEntries(
    ["nama", "tempat_lahir", "tanggal_lahir", "pekerjaan", "alamat"].map((k) => [k, String(formData.get(k) ?? "")]),
  );
  const parsed = profileSchema.safeParse(raw);
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error), values: raw };

  const { error } = await supabase
    .from("profiles")
    .update({
      nama: parsed.data.nama,
      tempat_lahir: parsed.data.tempat_lahir || null,
      tanggal_lahir: parsed.data.tanggal_lahir || null,
      pekerjaan: parsed.data.pekerjaan || null,
      alamat: parsed.data.alamat || null,
    })
    .eq("id", profile.id);
  if (error) return { error: "Profil gagal disimpan. Coba lagi.", values: raw };

  revalidatePath("/warga", "layout");
  return { ok: true, message: "Profil tersimpan.", values: raw };
}

export async function changePasswordAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase, profile } = await requireRole("warga");
  const parsed = changePasswordSchema.safeParse({
    lama: String(formData.get("lama") ?? ""),
    password: String(formData.get("password") ?? ""),
    konfirmasi: String(formData.get("konfirmasi") ?? ""),
  });
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };
  if (!profile.email) return { error: "Akun ini belum memiliki email." };
  if (isLockedDemoAccount(profile.email)) {
    return { error: "Kata sandi akun demo tidak dapat diganti agar tetap bisa dipakai juri lain." };
  }

  const limit = await rateLimit("ganti-sandi", 5);
  if (!limit.ok) return { error: `Terlalu banyak percobaan. Coba lagi dalam ${limit.retryAfter} detik.` };

  // Pastikan yang mengganti benar pemilik akun (bukan sekadar sesi yang tertinggal terbuka).
  const { error: authError } = await supabase.auth.signInWithPassword({ email: profile.email, password: parsed.data.lama });
  if (authError) return { fieldErrors: { lama: "Kata sandi lama salah" } };

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: "Kata sandi gagal diganti. Coba lagi." };
  return { ok: true, message: "Kata sandi berhasil diganti. Gunakan kata sandi baru saat masuk berikutnya." };
}
