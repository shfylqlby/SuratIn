import Link from "next/link";
import { appConfig } from "@/lib/config";
import { cn } from "@/lib/cn";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn("size-8", className)}>
      <path d="M6 3h14l6 6v20H6z" fill="#fff" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M20 3v6h6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M10 12h8M10 16h11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="19.5" cy="23" r="5" fill="none" stroke="var(--color-stempel)" strokeWidth="1.8" />
      <circle cx="19.5" cy="23" r="2.4" fill="var(--color-stempel)" />
    </svg>
  );
}

export function Logo({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={cn("inline-flex min-h-11 items-center gap-2 text-tinta-800", className)}>
      <LogoMark />
      <span className="font-display text-xl font-bold tracking-tight">{appConfig.name}</span>
    </Link>
  );
}
