import { roleLabel } from "@/lib/format";
import type { UserRole } from "@/lib/types";

/** Cookie yang mengingat apakah sidebar desktop diciutkan. */
export const SIDEBAR_COOKIE = "sidebar";

export type NavIcon =
  | "beranda"
  | "inbox"
  | "ajukan"
  | "profil"
  | "arsip"
  | "tandatangan"
  | "riwayat"
  | "verifikasi"
  | "tentang"
  | "monitoring";

export interface NavItem {
  href: string;
  label: string;
  icon: NavIcon;
  /** Aktif hanya jika path sama persis (selain prefix di `also`). */
  exact?: boolean;
  /** Prefix lain yang ikut menandai menu ini aktif, mis. halaman detail. */
  also?: string[];
}

export interface NavSection {
  title?: string;
  items: NavItem[];
}

const adminItems: NavItem[] = [
  { href: "/admin", label: "Antrean", icon: "inbox", exact: true, also: ["/admin/permohonan"] },
  { href: "/admin/riwayat", label: "Semua permohonan", icon: "arsip" },
];

const roleItems: Record<UserRole, NavItem[]> = {
  warga: [
    { href: "/warga", label: "Permohonan saya", icon: "inbox", exact: true, also: ["/warga/permohonan", "/warga/ajukan"] },
    { href: "/warga/profil", label: "Profil", icon: "profil" },
  ],
  rt_rw: [
    { href: "/rt", label: "Antrean RT/RW", icon: "inbox", exact: true, also: ["/rt/permohonan"] },
    { href: "/rt/riwayat", label: "Semua permohonan", icon: "arsip" },
  ],
  admin_kelurahan: adminItems,
  super_admin: [...adminItems, { href: "/camat", label: "Monitoring", icon: "monitoring" }],
  camat: [{ href: "/camat", label: "Monitoring layanan", icon: "monitoring" }],
};

/** Menu sidebar: beranda, menu kerja sesuai peran, lalu layanan publik. */
export function navSections(role: UserRole): NavSection[] {
  const sections: NavSection[] = [{ items: [{ href: "/", label: "Beranda", icon: "beranda", exact: true }] }];
  sections.push({ title: `Dasbor ${roleLabel[role].charAt(0).toLowerCase()}${roleLabel[role].slice(1)}`, items: roleItems[role] });
  sections.push({
    title: "Layanan umum",
    items: [
      { href: "/verifikasi", label: "Cek keaslian surat", icon: "verifikasi" },
      { href: "/tentang", label: "Tentang", icon: "tentang" },
    ],
  });
  return sections;
}
