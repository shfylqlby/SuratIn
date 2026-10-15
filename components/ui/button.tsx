import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

type Variant = "utama" | "tinta" | "garis" | "hantu" | "bahaya";
type Size = "md" | "lg" | "sm";

const base =
  "inline-flex items-center justify-center gap-2 rounded-[var(--radius-tombol)] font-semibold whitespace-nowrap transition-colors disabled:cursor-not-allowed disabled:opacity-55 [&_svg]:size-[1.15em] [&_svg]:shrink-0";

const variants: Record<Variant, string> = {
  utama: "bg-map-500 text-tinta-950 hover:bg-map-400 active:bg-map-600",
  tinta: "bg-tinta-800 text-white hover:bg-tinta-700 active:bg-tinta-900",
  garis: "border border-tinta-800/25 bg-lembar text-tinta-800 hover:border-tinta-800/60 hover:bg-tinta-50",
  hantu: "text-tinta-800 hover:bg-tinta-50",
  bahaya: "border border-tolak/30 bg-lembar text-tolak hover:bg-tolak-50",
};

const sizes: Record<Size, string> = {
  sm: "min-h-9 px-3 text-sm",
  md: "min-h-11 px-4 text-[0.95rem]",
  lg: "min-h-13 px-6 text-base",
};

export function buttonClass(variant: Variant = "tinta", size: Size = "md", className?: string) {
  return cn(base, variants[variant], sizes[size], className);
}

export function Button({
  variant = "tinta",
  size = "md",
  className,
  ...props
}: ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return <button className={buttonClass(variant, size, className)} {...props} />;
}

export function ButtonLink({
  variant = "tinta",
  size = "md",
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}
