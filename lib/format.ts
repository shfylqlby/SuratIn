import { appConfig } from "./config";
import type { ApprovalAction, RequestStatus, UserRole } from "./types";

const TZ = appConfig.timeZone;

export function maskNik(nik: string | null | undefined) {
  if (!nik) return "-";
  if (nik.length < 8) return "*".repeat(nik.length);
  return `${nik.slice(0, 4)}${"*".repeat(nik.length - 8)}${nik.slice(-4)}`;
}

export function formatTanggal(value: string | Date) {
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: TZ }).format(
    new Date(value),
  );
}

export function formatTanggalJam(value: string | Date) {
  const d = new Date(value);
  const tanggal = new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: TZ,
  }).format(d);
  const jam = new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: TZ }).format(d);
  return `${tanggal}, ${jam.replace(".", ":")} ${appConfig.timeZoneLabel}`;
}

export function formatRupiah(value: string | number) {
  const n = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(n)) return String(value);
  return `Rp${new Intl.NumberFormat("id-ID").format(n)}`;
}

export function toRoman(month: number) {
  return ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"][month - 1];
}

export function daysSince(value: string) {
  return Math.floor((Date.now() - new Date(value).getTime()) / 86_400_000);
}

export function hoursSince(value: string, now = Date.now()) {
  return (now - new Date(value).getTime()) / 3_600_000;
}

/** "2 hari 5 jam" / "7 jam" / "kurang dari 1 jam" */
export function formatDurasi(hours: number) {
  if (!Number.isFinite(hours) || hours < 1) return "kurang dari 1 jam";
  const d = Math.floor(hours / 24);
  const h = Math.floor(hours % 24);
  if (!d) return `${h} jam`;
  return h ? `${d} hari ${h} jam` : `${d} hari`;
}

export function relativeAge(value: string) {
  const days = daysSince(value);
  if (days <= 0) {
    const hours = Math.floor((Date.now() - new Date(value).getTime()) / 3_600_000);
    return hours <= 0 ? "baru saja" : `${hours} jam lalu`;
  }
  return `${days} hari lalu`;
}

/** Tanggal hari ini (YYYY-MM-DD) dalam zona waktu aplikasi (WIB), bukan zona server (Vercel = UTC). */
export function todayLocal(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

/** Tambah n hari ke tanggal YYYY-MM-DD (aritmetika kalender murni, tanpa zona waktu). */
export function addDays(isoDate: string, days: number) {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** Tahun & bulan (1-12) saat ini dalam WIB, untuk nomor surat. */
export function nowParts(now = new Date()) {
  const [year, month] = todayLocal(now).split("-").map(Number);
  return { year, month };
}

/** Tanggal dari isian formulir (YYYY-MM-DD) → "17 Oktober 2026". */
export function formatTanggalIsian(isoDate: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return isoDate;
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(y, m - 1, d)),
  );
}

export const statusLabel: Record<RequestStatus, string> = {
  menunggu_rt: "Diperiksa RT/RW",
  ditolak_rt: "Perlu diperbaiki (RT/RW)",
  menunggu_kelurahan: "Diperiksa kelurahan",
  ditolak_kelurahan: "Perlu diperbaiki (kelurahan)",
  terbit: "Surat terbit",
  dibatalkan: "Dibatalkan",
  diajukan: "Diperiksa kelurahan",
  ditolak: "Perlu diperbaiki",
  menunggu_camat: "Menunggu tanda tangan camat",
};

export const staffStatusLabel: Record<RequestStatus, string> = {
  menunggu_rt: "Menunggu RT/RW",
  ditolak_rt: "Ditolak RT/RW",
  menunggu_kelurahan: "Menunggu kelurahan",
  ditolak_kelurahan: "Ditolak kelurahan",
  terbit: "Terbit",
  dibatalkan: "Dibatalkan",
  diajukan: "Baru masuk (lama)",
  ditolak: "Ditolak (lama)",
  menunggu_camat: "Menunggu camat (lama)",
};

/** Status yang sedang menunggu perbaikan warga. */
export const REJECTED_STATUSES: RequestStatus[] = ["ditolak_rt", "ditolak_kelurahan", "ditolak"];
/** Status yang masih berjalan (belum final, belum ditolak). */
export const IN_PROGRESS_STATUSES: RequestStatus[] = ["menunggu_rt", "menunggu_kelurahan", "diajukan", "menunggu_camat"];

export const actionLabel: Record<ApprovalAction, string> = {
  submit: "Permohonan diajukan",
  resubmit: "Diperbaiki dan diajukan ulang",
  approve_rt: "Disetujui RT/RW, surat pengantar dibuat",
  reject_rt: "Dikembalikan RT/RW untuk diperbaiki",
  approve_kelurahan: "Disetujui kelurahan",
  reject_kelurahan: "Dikembalikan kelurahan untuk diperbaiki",
  reject: "Dikembalikan untuk diperbaiki",
  sign_camat: "Ditandatangani camat",
  cancel: "Dibatalkan pemohon",
  issue: "Surat terbit",
};

export const roleLabel: Record<UserRole, string> = {
  warga: "Pemohon",
  rt_rw: "Ketua RT/RW",
  admin_kelurahan: "Petugas kelurahan",
  camat: "Camat",
  super_admin: "Pengelola sistem",
};

export const ROLE_HOME: Record<UserRole, string> = {
  warga: "/warga",
  rt_rw: "/rt",
  admin_kelurahan: "/admin",
  super_admin: "/admin",
  camat: "/camat",
};

export function homeForRole(role: UserRole) {
  return ROLE_HOME[role] ?? "/warga";
}

export function rtLabel(unit: { rt_no: string; rw_no: string } | null | undefined) {
  return unit ? `RT ${unit.rt_no}/RW ${unit.rw_no}` : "-";
}

export function formatCode(code: string) {
  const half = Math.ceil(code.length / 2);
  return code.length > 6 ? `${code.slice(0, half)}-${code.slice(half)}` : code;
}
