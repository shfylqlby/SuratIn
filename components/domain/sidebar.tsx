"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Archive,
  ChartColumn,
  FilePlus2,
  History,
  House,
  Inbox,
  Info,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  PenLine,
  ShieldCheck,
  UserRound,
  X,
  type LucideIcon,
} from "lucide-react";
import { logoutAction } from "@/app/actions/auth";
import { cn } from "@/lib/cn";
import { SIDEBAR_COOKIE, type NavIcon, type NavItem, type NavSection } from "@/lib/nav";
import { Logo } from "./logo";

const icons: Record<NavIcon, LucideIcon> = {
  beranda: House,
  inbox: Inbox,
  ajukan: FilePlus2,
  profil: UserRound,
  arsip: Archive,
  tandatangan: PenLine,
  riwayat: History,
  verifikasi: ShieldCheck,
  tentang: Info,
  monitoring: ChartColumn,
};

export interface SidebarUser {
  nama: string;
  keterangan: string;
}

function isActive(item: NavItem, pathname: string) {
  const under = (p: string) => pathname === p || pathname.startsWith(`${p}/`);
  if (item.also?.some(under)) return true;
  return item.exact ? pathname === item.href : under(item.href);
}

/**
 * Kerangka halaman untuk pengguna yang sudah masuk.
 * Desktop: sidebar di kiri, bisa diciutkan jadi deret ikon (pilihan diingat lewat cookie).
 * Ponsel: bilah atas dengan tombol Menu yang menggeser sidebar masuk dari kiri.
 */
export function SidebarFrame({
  sections,
  user,
  initialCollapsed = false,
  children,
}: {
  sections: NavSection[];
  user: SidebarUser;
  initialCollapsed?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const closeRef = useRef<HTMLButtonElement>(null);

  function toggleCollapsed() {
    const next = !collapsed;
    setCollapsed(next);
    document.cookie = `${SIDEBAR_COOKIE}=${next ? "ciut" : "buka"}; path=/; max-age=31536000; samesite=lax`;
  }

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <a href="#isi" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[60] focus:rounded focus:bg-lembar focus:px-3 focus:py-2">
        Lewati ke isi
      </a>

      {/* Desktop */}
      <aside
        aria-label="Navigasi"
        className={cn(
          "fixed inset-y-0 left-0 z-30 hidden border-r border-garis bg-lembar transition-[width] duration-200 ease-out lg:flex",
          collapsed ? "w-18" : "w-68",
        )}
      >
        <SidebarContent sections={sections} user={user} collapsed={collapsed} onToggle={toggleCollapsed} />
      </aside>

      {/* Ponsel: bilah atas */}
      <div className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-garis bg-lembar/95 px-4 backdrop-blur lg:hidden">
        <Logo />
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-expanded={open}
          aria-controls="sidebar-ponsel"
          className="inline-flex min-h-11 items-center gap-2 rounded-md border border-garis px-3 font-semibold text-tinta-800 hover:bg-tinta-50"
        >
          <Menu aria-hidden className="size-5" /> Menu
        </button>
      </div>

      {/* Ponsel: laci geser */}
      <div
        aria-hidden
        onClick={() => setOpen(false)}
        className={cn(
          "fixed inset-0 z-40 bg-tinta-950/45 transition-opacity duration-200 lg:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />
      <aside
        id="sidebar-ponsel"
        aria-label="Navigasi"
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[min(20rem,86vw)] bg-lembar shadow-xl transition-[transform,visibility] duration-250 ease-out lg:hidden",
          open ? "visible translate-x-0" : "invisible -translate-x-full",
        )}
      >
        <button
          ref={closeRef}
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Tutup menu"
          className="absolute top-3 right-3 grid size-10 place-items-center rounded-md text-redup hover:bg-kertas hover:text-teks"
        >
          <X aria-hidden className="size-5" />
        </button>
        <SidebarContent sections={sections} user={user} onNavigate={() => setOpen(false)} />
      </aside>

      <div className={cn("flex min-h-dvh flex-col transition-[padding] duration-200 ease-out", collapsed ? "lg:pl-18" : "lg:pl-68")}>
        {children}
      </div>
    </>
  );
}

function SidebarContent({
  sections,
  user,
  collapsed = false,
  onToggle,
  onNavigate,
}: {
  sections: NavSection[];
  user: SidebarUser;
  collapsed?: boolean;
  onToggle?: () => void;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const ToggleIcon = collapsed ? PanelLeftOpen : PanelLeftClose;
  return (
    <div className="flex h-full w-full flex-col overflow-x-hidden overflow-y-auto">
      <div className={cn("flex h-16 shrink-0 items-center", collapsed ? "justify-center" : "justify-between pr-3 pl-5")}>
        {collapsed ? null : <Logo />}
        {onToggle ? (
          <button
            type="button"
            onClick={onToggle}
            aria-label={collapsed ? "Buka sidebar" : "Ciutkan sidebar"}
            aria-expanded={!collapsed}
            title={collapsed ? "Buka sidebar" : "Ciutkan sidebar"}
            className="grid size-10 place-items-center rounded-md text-redup hover:bg-kertas hover:text-teks"
          >
            <ToggleIcon aria-hidden className="size-5" />
          </button>
        ) : null}
      </div>

      {collapsed ? (
        <div className="mb-1 flex justify-center" title={`${user.nama} · ${user.keterangan}`}>
          <Avatar nama={user.nama} />
          <span className="sr-only">
            {user.nama}, {user.keterangan}
          </span>
        </div>
      ) : (
        <div className="mx-4 mb-1 flex items-center gap-3 rounded-[var(--radius-kartu)] bg-tinta-50 p-3">
          <Avatar nama={user.nama} />
          <div className="min-w-0 leading-tight">
            <p className="text-sm font-semibold break-words text-teks">{user.nama}</p>
            <p className="mt-0.5 text-xs break-words text-redup">{user.keterangan}</p>
          </div>
        </div>
      )}

      <nav aria-label="Menu" className="flex-1 space-y-5 px-3 py-3">
        {sections.map((section, i) => (
          <div key={section.title ?? i}>
            {section.title ? (
              collapsed ? (
                <hr aria-hidden className="mx-2 mb-2 border-garis" />
              ) : (
                <p className="mb-1 px-3 text-sm font-semibold text-redup">{section.title}</p>
              )
            ) : null}
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const active = isActive(item, pathname);
                const Icon = icons[item.icon];
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      title={collapsed ? item.label : undefined}
                      className={cn(
                        "flex min-h-11 items-center gap-3 rounded-md text-[0.95rem] font-medium whitespace-nowrap transition-colors",
                        collapsed ? "justify-center px-0" : "px-3",
                        active ? "bg-tinta-800 text-white" : "text-redup hover:bg-kertas hover:text-teks",
                      )}
                    >
                      <Icon aria-hidden className={cn("size-5 shrink-0", active ? "text-map-400" : "text-tinta-700")} />
                      <span className={collapsed ? "sr-only" : undefined}>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className={cn("shrink-0 border-t border-garis", collapsed ? "p-3" : "p-4")}>
        <form action={logoutAction}>
          <button
            title={collapsed ? "Keluar" : undefined}
            className={cn(
              "flex min-h-11 w-full items-center gap-3 rounded-md text-[0.95rem] font-medium text-redup hover:bg-tolak-50 hover:text-tolak",
              collapsed ? "justify-center" : "px-3",
            )}
          >
            <LogOut aria-hidden className="size-5" />
            <span className={collapsed ? "sr-only" : undefined}>Keluar</span>
          </button>
        </form>
      </div>
    </div>
  );
}

function Avatar({ nama }: { nama: string }) {
  return (
    <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-full bg-tinta-800 font-display font-bold text-white">
      {nama.trim().charAt(0).toUpperCase()}
    </span>
  );
}
