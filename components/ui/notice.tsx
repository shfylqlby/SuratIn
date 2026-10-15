import type { ReactNode } from "react";
import { BadgeCheck, CircleAlert, Info, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/cn";

type Tone = "info" | "berhasil" | "peringatan" | "galat";

const tones: Record<Tone, { cls: string; Icon: typeof Info }> = {
  info: { cls: "border-tinta-800/20 bg-tinta-50 text-tinta-900", Icon: Info },
  berhasil: { cls: "border-terbit/30 bg-terbit-50 text-teks", Icon: BadgeCheck },
  peringatan: { cls: "border-proses/30 bg-proses-50 text-teks", Icon: TriangleAlert },
  galat: { cls: "border-tolak/30 bg-tolak-50 text-teks", Icon: CircleAlert },
};

const iconTone: Record<Tone, string> = {
  info: "text-tinta-700",
  berhasil: "text-terbit",
  peringatan: "text-proses",
  galat: "text-tolak",
};

export function Notice({
  tone = "info",
  title,
  children,
  action,
  className,
}: {
  tone?: Tone;
  title?: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  const { cls, Icon } = tones[tone];
  return (
    <div role={tone === "galat" ? "alert" : "status"} className={cn("flex gap-3 rounded-[var(--radius-kartu)] border p-4", cls, className)}>
      <Icon aria-hidden className={cn("mt-0.5 size-5 shrink-0", iconTone[tone])} />
      <div className="min-w-0 flex-1 space-y-1">
        {title ? <p className="font-semibold">{title}</p> : null}
        {children ? <div className="text-[0.95rem]">{children}</div> : null}
        {action ? <div className="pt-2">{action}</div> : null}
      </div>
    </div>
  );
}
