import { BadgeCheck, CircleAlert, FileText, PenLine, RotateCcw, Stamp, Ban } from "lucide-react";
import { cn } from "@/lib/cn";
import { actionLabel, formatTanggalJam, roleLabel } from "@/lib/format";
import type { Approval, ApprovalAction } from "@/lib/types";

const REJECT = "bg-tolak-50 text-tolak border-tolak/30";

const icons: Record<ApprovalAction, { Icon: typeof FileText; tone: string }> = {
  submit: { Icon: FileText, tone: "bg-tinta-50 text-tinta-800 border-tinta-800/20" },
  resubmit: { Icon: RotateCcw, tone: "bg-tinta-50 text-tinta-800 border-tinta-800/20" },
  approve_rt: { Icon: BadgeCheck, tone: "bg-terbit-50 text-terbit border-terbit/30" },
  reject_rt: { Icon: CircleAlert, tone: REJECT },
  reject_kelurahan: { Icon: CircleAlert, tone: REJECT },
  approve_kelurahan: { Icon: BadgeCheck, tone: "bg-terbit-50 text-terbit border-terbit/30" },
  reject: { Icon: CircleAlert, tone: REJECT },
  sign_camat: { Icon: PenLine, tone: "bg-stempel-50 text-stempel border-stempel/30" },
  cancel: { Icon: Ban, tone: "bg-kertas text-redup border-garis" },
  issue: { Icon: Stamp, tone: "bg-stempel text-white border-stempel" },
};

export function Timeline({
  items,
  pending,
  showActor = true,
}: {
  items: Approval[];
  pending?: string | null;
  showActor?: boolean;
}) {
  return (
    <ol className="relative">
      {items.map((item, i) => {
        const { Icon, tone } = icons[item.action];
        const last = i === items.length - 1 && !pending;
        return (
          <li key={item.id} className="relative flex gap-4 pb-6 last:pb-0">
            {!last ? <span aria-hidden className="absolute top-10 bottom-0 left-[19px] w-px bg-garis" /> : null}
            <span className={cn("relative z-10 grid size-10 shrink-0 place-items-center rounded-full border", tone)}>
              <Icon aria-hidden className="size-[18px]" />
            </span>
            <div className="min-w-0 pt-1.5">
              <p className="font-semibold text-teks">{actionLabel[item.action]}</p>
              <p className="text-sm text-redup">
                <time dateTime={item.created_at} className="angka">
                  {formatTanggalJam(item.created_at)}
                </time>
                {showActor ? (
                  <>
                    {" "}
                    oleh {item.actor_nama}
                    {item.actor_role !== "warga" ? `, ${item.actor_jabatan ?? roleLabel[item.actor_role]}` : ""}
                  </>
                ) : null}
              </p>
              {item.note && item.action !== "issue" ? (
                <p
                  className={cn(
                    "mt-2 rounded-md border px-3 py-2 text-[0.95rem]",
                    item.action.startsWith("reject") ? "border-tolak/25 bg-tolak-50 text-teks" : "border-garis bg-kertas",
                  )}
                >
                  {item.note}
                </p>
              ) : null}
              {item.action === "issue" && item.note ? (
                <p className="mt-1 text-sm font-medium text-stempel angka">{item.note}</p>
              ) : null}
            </div>
          </li>
        );
      })}
      {pending ? (
        <li className="relative flex gap-4">
          <span className="relative z-10 grid size-10 shrink-0 place-items-center rounded-full border border-dashed border-proses/50 bg-lembar">
            <span className="size-2.5 rounded-full bg-proses" />
          </span>
          <p className="pt-2 text-redup">{pending}</p>
        </li>
      ) : null}
    </ol>
  );
}
