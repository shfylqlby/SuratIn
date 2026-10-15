import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/auth/guard";
import { SLA, verifyHref } from "@/lib/config";
import { hoursSince, rtLabel } from "@/lib/format";
import { EmptyState } from "@/components/ui/empty";
import { Notice } from "@/components/ui/notice";
import { RequestRow } from "@/components/domain/request-row";
import { SlaChip } from "@/components/domain/sla-chip";
import { StatTiles } from "@/components/domain/stat-tiles";
import type { RequestStatus } from "@/lib/types";

export const metadata: Metadata = { title: "Antrean kelurahan" };

export default async function AdminPage({ searchParams }: PageProps<"/admin">) {
  const { supabase } = await requireRole("admin_kelurahan", "super_admin");
  const sp = await searchParams;
  const onlyLate = sp.sla === "lewat";

  // RLS: admin hanya melihat permohonan kelurahannya yang sudah lewat tahap RT.
  const [{ data: allQueue, error }, { data: all }] = await Promise.all([
    supabase
      .from("letter_requests")
      .select("id, ticket_no, status, submitted_at, stage_entered_at, form_data, letter_types(nama), rt_units(rt_no, rw_no)")
      .eq("status", "menunggu_kelurahan")
      .order("stage_entered_at", { ascending: true }),
    supabase.from("letter_requests").select("status"),
  ]);

  const counts = countByStatus(all ?? []);
  const isLate = (r: { stage_entered_at: string }) => hoursSince(r.stage_entered_at) > SLA.kelurahanHours;
  const overdue = (allQueue ?? []).filter(isLate).length;
  const queue = onlyLate ? (allQueue ?? []).filter(isLate) : allQueue;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-tinta-900">{onlyLate ? "Antrean lewat batas layanan" : "Antrean kelurahan"}</h1>
        <p className="mt-1 text-redup">
          Permohonan yang sudah disetujui RT/RW. Terlama di paling atas. Batas layanan tahap kelurahan {SLA.kelurahanHours} jam.
        </p>
      </div>

      {sp.selesai === "tolak" ? <Notice tone="berhasil">Permohonan dikembalikan ke warga beserta catatan Anda.</Notice> : null}
      {sp.selesai === "terbit" ? (
        <Notice
          tone="berhasil"
          title="Surat diterbitkan"
          action={
            typeof sp.kode === "string" ? (
              <Link href={verifyHref(sp.kode, "/admin")} className="font-semibold text-terbit underline underline-offset-4">
                Lihat halaman verifikasinya
              </Link>
            ) : null
          }
        >
          Nomor surat, tanda tangan, stempel, dan kode QR sudah dibubuhkan. Warga sudah bisa mengunduh PDF-nya.
        </Notice>
      ) : null}

      <StatTiles
        items={[
          { label: "Perlu diperiksa", value: counts.menunggu_kelurahan ?? 0, tone: "proses", href: "/admin", active: !onlyLate },
          {
            label: `Lewat ${SLA.kelurahanHours} jam`,
            value: overdue,
            tone: overdue ? "tolak" : "netral",
            href: "/admin?sla=lewat",
            active: onlyLate,
          },
          { label: "Dikembalikan ke warga", value: counts.ditolak_kelurahan ?? 0, tone: "tolak", href: "/admin/riwayat?status=ditolak_kelurahan" },
          { label: "Sudah terbit", value: counts.terbit ?? 0, tone: "terbit", href: "/admin/riwayat?status=terbit" },
        ]}
      />

      {error ? (
        <Notice tone="galat" title="Antrean gagal dimuat">
          Muat ulang halaman.
        </Notice>
      ) : !queue?.length ? (
        <EmptyState title={onlyLate ? "Tidak ada permohonan yang lewat batas layanan" : "Antrean kosong"}>
          {onlyLate
            ? "Semua permohonan masih dalam batas waktu."
            : "Permohonan baru muncul di sini setelah disetujui Ketua RT/RW."}
        </EmptyState>
      ) : (
        <ul className="space-y-3">
          {queue.map((r) => (
            <RequestRow
              key={r.id}
              href={`/admin/permohonan/${r.id}`}
              ticket={r.ticket_no}
              title={(r.form_data as Record<string, string>).nama ?? "-"}
              subtitle={`${(r.letter_types as unknown as { nama: string } | null)?.nama ?? "Surat"} · ${rtLabel(r.rt_units as unknown as { rt_no: string; rw_no: string } | null)}`}
              status={r.status as RequestStatus}
              audience="staf"
              date={r.submitted_at}
              aside={<SlaChip since={r.stage_entered_at} limitHours={SLA.kelurahanHours} />}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function countByStatus(rows: Array<{ status: string }>) {
  const out: Partial<Record<RequestStatus, number>> = {};
  for (const r of rows) out[r.status as RequestStatus] = (out[r.status as RequestStatus] ?? 0) + 1;
  return out;
}
