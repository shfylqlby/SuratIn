import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";

type Tone = "proses" | "tolak" | "terbit" | "netral";

const toneBar: Record<Tone, string> = {
  proses: "bg-map-500",
  tolak: "bg-tolak",
  terbit: "bg-terbit",
  netral: "bg-tinta-700/40",
};

export interface StatTile {
  label: string;
  value: number | string;
  tone: Tone;
  /** Tujuan saat kotak diklik: daftar dokumen/tugas dengan status ini. */
  href: string;
  active?: boolean;
}

const cols: Record<number, string> = {
  1: "md:grid-cols-1",
  2: "md:grid-cols-2",
  3: "md:grid-cols-3",
  4: "md:grid-cols-4",
  5: "md:grid-cols-5",
};

/** Ringkasan per status. Setiap kotak adalah tautan ke daftar dengan status terkait. */
export function StatTiles({ items, label = "Ringkasan status" }: { items: StatTile[]; label?: string }) {
  return (
    <nav aria-label={label}>
      <ul className={cn("grid grid-cols-2 gap-3", cols[items.length] ?? "md:grid-cols-4")}>
        {items.map((item) => (
          <li key={item.label} className={items.length % 2 === 1 ? "last:col-span-2 md:last:col-span-1" : undefined}>
            <Link
              href={item.href}
              aria-current={item.active ? "page" : undefined}
              className={cn(
                "group relative flex h-full items-end justify-between gap-2 overflow-hidden rounded-[var(--radius-kartu)] border bg-lembar py-4 pr-3 pl-5 transition-colors",
                item.active
                  ? "border-tinta-800 ring-1 ring-tinta-800"
                  : "border-garis hover:border-tinta-700/60 hover:bg-tinta-50/40",
              )}
            >
              <span aria-hidden className={cn("absolute top-0 left-0 h-full w-1", toneBar[item.tone])} />
              <span className="min-w-0">
                <span className="block text-sm leading-snug text-redup group-hover:text-teks">{item.label}</span>
                <span className="mt-1 block font-display text-3xl font-bold text-teks angka">{item.value}</span>
              </span>
              <ChevronRight
                aria-hidden
                className={cn(
                  "mb-1.5 size-5 shrink-0 transition-transform group-hover:translate-x-0.5",
                  item.active ? "text-tinta-800" : "text-redup/70 group-hover:text-tinta-800",
                )}
              />
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
