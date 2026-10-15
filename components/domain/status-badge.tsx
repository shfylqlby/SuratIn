import { Ban, BadgeCheck, CircleAlert, Clock3, House, Landmark, PenLine } from "lucide-react";
import { cn } from "@/lib/cn";
import { staffStatusLabel, statusLabel } from "@/lib/format";
import type { RequestStatus } from "@/lib/types";

const styles: Record<RequestStatus, { cls: string; Icon: typeof Clock3 }> = {
  menunggu_rt: { cls: "bg-proses-50 text-proses border-proses/25", Icon: House },
  menunggu_kelurahan: { cls: "bg-proses-50 text-proses border-proses/25", Icon: Landmark },
  ditolak_rt: { cls: "bg-tolak-50 text-tolak border-tolak/25", Icon: CircleAlert },
  ditolak_kelurahan: { cls: "bg-tolak-50 text-tolak border-tolak/25", Icon: CircleAlert },
  diajukan: { cls: "bg-proses-50 text-proses border-proses/25", Icon: Clock3 },
  menunggu_camat: { cls: "bg-proses-50 text-proses border-proses/25", Icon: PenLine },
  ditolak: { cls: "bg-tolak-50 text-tolak border-tolak/25", Icon: CircleAlert },
  terbit: { cls: "bg-terbit-50 text-terbit border-terbit/25", Icon: BadgeCheck },
  dibatalkan: { cls: "bg-kertas text-redup border-garis", Icon: Ban },
};

export function StatusBadge({
  status,
  audience = "warga",
  className,
}: {
  status: RequestStatus;
  audience?: "warga" | "staf";
  className?: string;
}) {
  const { cls, Icon } = styles[status];
  const label = audience === "staf" ? staffStatusLabel[status] : statusLabel[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-sm leading-none font-semibold whitespace-nowrap",
        cls,
        className,
      )}
    >
      <Icon aria-hidden className="size-4" strokeWidth={2.2} />
      {label}
    </span>
  );
}
