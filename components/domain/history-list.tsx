import Link from "next/link";
import { Download, Search } from "lucide-react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { rtLabel, staffStatusLabel } from "@/lib/format";
import { buttonClass } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty";
import { RequestRow } from "./request-row";
import { StatTiles } from "./stat-tiles";
import type { RequestStatus } from "@/lib/types";

type Tone = "proses" | "tolak" | "terbit" | "netral";

const TONE: Partial<Record<RequestStatus, Tone>> = {
  menunggu_rt: "proses",
  ditolak_rt: "tolak",
  menunggu_kelurahan: "proses",
  ditolak_kelurahan: "tolak",
  terbit: "terbit",
  dibatalkan: "netral",
};

/**
 * Daftar semua permohonan dengan saringan status dan pencarian.
 * Data dibaca dengan klien pengguna: RLS menentukan baris apa saja yang terlihat.
 */
export async function HistoryList({
  supabase,
  basePath,
  detailPath,
  statuses,
  searchParams,
  title,
  description,
  csvHref,
}: {
  supabase: SupabaseClient;
  basePath: string;
  detailPath: string;
  statuses: RequestStatus[];
  searchParams: Record<string, string | string[] | undefined>;
  title: string;
  description: string;
  csvHref?: string;
}) {
  const sp = searchParams;
  const status = statuses.includes(sp.status as RequestStatus) || sp.status === "dibatalkan" ? (sp.status as RequestStatus) : null;
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 60) : "";
  const safe = q.replace(/[%,()*]/g, " ");

  const href = (s: RequestStatus | null) => {
    const params = new URLSearchParams({ ...(s ? { status: s } : {}), ...(q ? { q } : {}) });
    const qs = params.toString();
    return `${basePath}${qs ? `?${qs}` : ""}`;
  };

  let query = supabase
    .from("letter_requests")
    .select("id, ticket_no, status, updated_at, form_data, letter_types(nama), rt_units(rt_no, rw_no)")
    .order("updated_at", { ascending: false })
    .limit(200);
  if (status) query = query.eq("status", status);
  if (q) query = query.or(`ticket_no.ilike.%${safe}%,form_data->>nama.ilike.%${safe}%`);

  let countQuery = supabase.from("letter_requests").select("status");
  if (q) countQuery = countQuery.or(`ticket_no.ilike.%${safe}%,form_data->>nama.ilike.%${safe}%`);

  const [{ data: rows }, { data: all }] = await Promise.all([query, countQuery]);
  const counts: Partial<Record<RequestStatus, number>> = {};
  for (const r of all ?? []) counts[r.status as RequestStatus] = (counts[r.status as RequestStatus] ?? 0) + 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-tinta-900">{status ? `Permohonan: ${staffStatusLabel[status].toLowerCase()}` : title}</h1>
          <p className="mt-1 text-redup">{description}</p>
        </div>
        {csvHref ? (
          <a
            href={`${csvHref}?${new URLSearchParams({ ...(status ? { status } : {}), ...(q ? { q } : {}) })}`}
            className={buttonClass("garis", "md")}
          >
            <Download aria-hidden /> Unduh rekap CSV
          </a>
        ) : null}
      </div>

      <StatTiles
        label="Saring berdasarkan status"
        items={[
          { label: "Semua", value: all?.length ?? 0, tone: "netral", href: href(null), active: !status },
          ...statuses.map((s) => ({
            label: staffStatusLabel[s],
            value: counts[s] ?? 0,
            tone: TONE[s] ?? "netral",
            href: href(s),
            active: status === s,
          })),
        ]}
      />

      <form method="get" className="flex flex-col gap-2 sm:flex-row" role="search">
        {status ? <input type="hidden" name="status" value={status} /> : null}
        <label htmlFor="cari" className="sr-only">
          Cari
        </label>
        <input
          id="cari"
          name="q"
          defaultValue={q}
          placeholder="REQ-2026-000123 atau nama pemohon"
          className="min-h-12 flex-1 rounded-[var(--radius-tombol)] border border-garis bg-lembar px-3.5 text-base hover:border-tinta-600/50 focus:border-tinta-700 focus:outline-none"
        />
        <button className={buttonClass("tinta", "md", "min-h-12")}>
          <Search aria-hidden /> Cari
        </button>
      </form>

      {counts.dibatalkan && !statuses.includes("dibatalkan") ? (
        <p className="text-sm text-redup">
          <Link href={href(status === "dibatalkan" ? null : "dibatalkan")} className="font-semibold text-tinta-800 underline underline-offset-4">
            {status === "dibatalkan" ? "Tampilkan semua status" : `Lihat ${counts.dibatalkan} permohonan yang dibatalkan warga`}
          </Link>
        </p>
      ) : null}

      {!rows?.length ? (
        <EmptyState
          title={status ? `Tidak ada permohonan di kategori ${staffStatusLabel[status].toLowerCase()}` : "Tidak ada permohonan yang cocok"}
        >
          {q ? `Tidak ada hasil untuk pencarian “${q}”.` : null}
        </EmptyState>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <RequestRow
              key={r.id}
              href={`${detailPath}/${r.id}`}
              ticket={r.ticket_no}
              title={(r.form_data as Record<string, string>).nama ?? "-"}
              subtitle={`${(r.letter_types as unknown as { nama: string } | null)?.nama ?? "Surat"} · ${rtLabel(r.rt_units as unknown as { rt_no: string; rw_no: string } | null)}`}
              status={r.status as RequestStatus}
              audience="staf"
              date={r.updated_at}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
