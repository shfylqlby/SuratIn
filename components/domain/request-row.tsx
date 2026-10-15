import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { StatusBadge } from "./status-badge";
import { formatTanggal } from "@/lib/format";
import type { RequestStatus } from "@/lib/types";

export function RequestRow({
  href,
  ticket,
  title,
  subtitle,
  status,
  date,
  audience = "warga",
  aside,
}: {
  href: string;
  ticket: string;
  title: string;
  subtitle?: string;
  status: RequestStatus;
  date: string;
  audience?: "warga" | "staf";
  aside?: React.ReactNode;
}) {
  return (
    <li>
      <Link
        href={href}
        className="group flex items-center gap-4 rounded-[var(--radius-kartu)] border border-garis bg-lembar px-4 py-4 transition-colors hover:border-tinta-700/50 sm:px-5"
      >
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-teks group-hover:text-tinta-800">{title}</p>
          <p className="mt-0.5 text-sm text-redup">
            <span className="angka">{ticket}</span>
            {subtitle ? `, ${subtitle}` : ""}
            <span className="hidden sm:inline">, {formatTanggal(date)}</span>
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2 sm:hidden">
            <StatusBadge status={status} audience={audience} />
            {aside}
          </div>
        </div>
        <div className="hidden items-center gap-2 sm:flex">
          {aside}
          <StatusBadge status={status} audience={audience} />
        </div>
        <ChevronRight aria-hidden className="size-5 shrink-0 text-redup group-hover:text-tinta-800" />
      </Link>
    </li>
  );
}
