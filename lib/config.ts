export const appConfig = {
  name: "SuratIn",
  tahunHakCipta: 2026,
  tagline: "Surat kelurahan & kecamatan, diurus dari rumah",
  appUrl: (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, ""),
  demoMode: process.env.NEXT_PUBLIC_DEMO_MODE === "true",
  pemerintah: "Pemerintah Kota Samarinda",
  /** Zona waktu tampilan & perhitungan tanggal (PRD revisi 1 §6.2). */
  timeZone: "Asia/Jakarta",
  timeZoneLabel: "WIB",
  maxUploadBytes: 3 * 1024 * 1024,
  allowedMimes: ["image/jpeg", "image/png", "application/pdf"] as const,
};

/** Batas layanan per tahap, dalam jam kalender (bukan jam kerja). */
export const SLA = { rtHours: 48, kelurahanHours: 72 };

export const demoAccounts = [
  { label: "Warga Sidomulyo, RT 01", email: "warga@demo.id" },
  { label: "Warga Sidomulyo, RT 02", email: "warga2@demo.id" },
  { label: "Warga Karang Anyar, RT 03", email: "warga.b@demo.id" },
  { label: "Ketua RT 01/RW 01 Sidomulyo", email: "rt01.sidomulyo@demo.id" },
  { label: "Ketua RT 02/RW 01 Sidomulyo", email: "rt02.sidomulyo@demo.id" },
  { label: "Ketua RT 03/RW 02 Karang Anyar", email: "rt03.karanganyar@demo.id" },
  { label: "Ketua RT 04/RW 02 Karang Anyar", email: "rt04.karanganyar@demo.id" },
  { label: "Admin Kel. Sidomulyo", email: "admin.sidomulyo@demo.id" },
  { label: "Admin Kel. Karang Anyar", email: "admin.karanganyar@demo.id" },
  { label: "Camat (monitoring)", email: "camat@demo.id" },
] as const;

export const demoPassword = "Demo1234!";

/** Saat mode demo, kata sandi akun @demo.id tidak boleh diganti/direset agar juri berikutnya tetap bisa masuk. */
export function isLockedDemoAccount(email: string | null | undefined) {
  return appConfig.demoMode && !!email && email.toLowerCase().endsWith("@demo.id");
}

/** Tautan internal ke halaman verifikasi, membawa `dari` agar ada tombol kembali ke halaman asal. */
export function verifyHref(code: string, dari?: string) {
  return `/verifikasi/${code}${dari ? `?dari=${encodeURIComponent(dari)}` : ""}`;
}

/** Hanya terima path internal ke dasbor (cegah open redirect lewat `?dari=`). */
export function safeBackPath(value: unknown) {
  if (typeof value !== "string" || /[\u0000-\u001f\u007f\\]/.test(value) || !value.startsWith("/") || value.startsWith("//")) return null;
  try {
    const base = "http://internal.invalid";
    const url = new URL(value, base);
    if (url.origin !== base) return null;
    if (!/^\/(warga|admin|camat)(\/|$)/.test(url.pathname)) return null;
    return url.pathname + url.search;
  } catch {
    return null;
  }
}

export function verifyUrl(code: string) {
  return `${appConfig.appUrl}/verifikasi/${code}`;
}

export function displayHost() {
  return appConfig.appUrl.replace(/^https?:\/\//, "");
}
