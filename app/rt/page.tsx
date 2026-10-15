import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/guard";
import { SLA } from "@/lib/config";
import { hoursSince } from "@/lib/format";
import { EmptyState } from "@/components/ui/empty";
import { Notice } from "@/components/ui/notice";
import { RequestRow } from "@/components/domain/request-row";
import { SlaChip } from "@/components/domain/sla-chip";
import { StatTiles } from "@/components/domain/stat-tiles";
import type { RequestStatus } from "@/lib/types";

export const metadata: Metadata = { title: "Antrean RT/RW" };

export default async function RtPage({ searchParams }: PageProps<"/rt">) {
  const { supabase, profile } = await requireRole("rt_rw");
  const sp = await searchParams;
  const onlyLate = sp.sla === "lewat";

  // RLS: RT/RW hanya melihat permohonan dari unit RT-nya sendiri.
  const [{ data: allQueue, error }, { data: all }] = await Promise.all([
    supabase
      .from("letter_requests")
      .select("id, ticket_no, status, submitted_at, stage_entered_at, form_data, letter_types(nama)")
      .eq("status", "menunggu_rt")
      .order("stage_entered_at", { ascending: true }),
    supabase.from("letter_requests").select("status"),
  ]);

  const counts: Partial<Record<RequestStatus, number>> = {};
  for (const r of all ?? []) counts[r.status as RequestStatus] = (counts[r.status as RequestStatus] ?? 0) + 1;
  const isLate = (r: { stage_entered_at: string }) => hoursSince(r.stage_entered_at) > SLA.rtHours;
  const overdue = (allQueue ?? []).filter(isLate).length;
  const queue = onlyLate ? (allQueue ?? []).filter(isLate) : allQueue;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-tinta-900">{onlyLate ? "Antrean lewat batas layanan" : "Antrean RT/RW"}</h1>
        <p className="mt-1 text-redup">
          Halo, {profile.nama.split(" ")[0]}. Periksa apakah pemohon benar warga Anda, lalu setujui atau kembalikan. Batas
          layanan tahap RT/RW {SLA.rtHours} jam.
        </p>
      </div>

      {sp.selesai === "tolak" ? <Notice tone="berhasil">Permohonan dikembalikan ke warga beserta catatan Anda.</Notice> : null}

      <StatTiles
        items={[
          { label: "Perlu diperiksa", value: counts.menunggu_rt ?? 0, tone: "proses", href: "/rt", active: !onlyLate },
          { label: `Lewat ${SLA.rtHours} jam`, value: overdue, tone: overdue ? "tolak" : "netral", href: "/rt?sla=lewat", active: onlyLate },
          { label: "Di kelurahan", value: counts.menunggu_kelurahan ?? 0, tone: "netral", href: "/rt/riwayat?status=menunggu_kelurahan" },
          { label: "Sudah terbit", value: counts.terbit ?? 0, tone: "terbit", href: "/rt/riwayat?status=terbit" },
        ]}
      />

      {error ? (
        <Notice tone="galat" title="Antrean gagal dimuat">
          Muat ulang halaman.
        </Notice>
      ) : !queue?.length ? (
        <EmptyState title={onlyLate ? "Tidak ada permohonan yang lewat batas layanan" : "Antrean kosong"}>
          {onlyLate ? "Semua permohonan masih dalam batas waktu." : "Permohonan baru dari warga RT Anda akan muncul di sini."}
        </EmptyState>
      ) : (
        <ul className="space-y-3">
          {queue.map((r) => (
            <RequestRow
              key={r.id}
              href={`/rt/permohonan/${r.id}`}
              ticket={r.ticket_no}
              title={(r.form_data as Record<string, string>).nama ?? "-"}
              subtitle={(r.letter_types as unknown as { nama: string } | null)?.nama}
              status={r.status as RequestStatus}
              audience="staf"
              date={r.submitted_at}
              aside={<SlaChip since={r.stage_entered_at} limitHours={SLA.rtHours} />}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
