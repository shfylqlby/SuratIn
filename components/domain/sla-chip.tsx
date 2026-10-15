import { Clock3 } from "lucide-react";
import { formatDurasi, hoursSince } from "@/lib/format";

/** Lama menunggu di tahap ini; merah jika melewati batas SLA tahap. */
export function SlaChip({ since, limitHours }: { since: string; limitHours: number }) {
  const waited = hoursSince(since);
  const late = waited > limitHours;
  return (
    <span
      className={
        late
          ? "inline-flex items-center gap-1 rounded-full bg-tolak px-2.5 py-1 text-xs font-semibold text-white"
          : "inline-flex items-center gap-1 text-sm text-redup"
      }
    >
      <Clock3 aria-hidden className="size-3.5" />
      {late ? `Lewat SLA, ${formatDurasi(waited)}` : formatDurasi(waited)}
    </span>
  );
}
