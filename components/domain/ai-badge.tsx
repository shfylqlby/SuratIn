import { CircleCheck, CircleHelp, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/cn";
import type { AiStatus } from "@/lib/types";

const STYLE: Record<AiStatus, { cls: string; label: string; Icon: typeof CircleCheck }> = {
  lolos: { cls: "border-terbit/30 bg-terbit-50 text-terbit", label: "Cek otomatis: jelas", Icon: CircleCheck },
  perlu_dicek: { cls: "border-proses/35 bg-proses-50 text-proses", label: "Cek otomatis: perlu dicek", Icon: TriangleAlert },
  belum_diperiksa: { cls: "border-garis bg-kertas text-redup", label: "Belum dicek otomatis", Icon: CircleHelp },
  gagal_diperiksa: { cls: "border-garis bg-kertas text-redup", label: "Cek otomatis tidak tersedia", Icon: CircleHelp },
};

/** Lencana hasil cek AI. Hanya informasi untuk petugas, tidak pernah menjadi keputusan. */
export function AiBadge({ status, message, className }: { status: AiStatus; message?: string | null; className?: string }) {
  const { cls, label, Icon } = STYLE[status] ?? STYLE.belum_diperiksa;
  return (
    <div className={cn("flex items-start gap-2 rounded-md border px-3 py-2 text-sm", cls, className)}>
      <Icon aria-hidden className="mt-0.5 size-4 shrink-0" />
      <p>
        <span className="font-semibold">{label}</span>
        {message && status === "perlu_dicek" ? <span className="text-teks">. {message}</span> : null}
      </p>
    </div>
  );
}
