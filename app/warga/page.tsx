import type { Metadata } from "next";
import Link from "next/link";
import { PenLine, UserRound } from "lucide-react";
import { requireRole } from "@/lib/auth/guard";
import { IN_PROGRESS_STATUSES, REJECTED_STATUSES } from "@/lib/format";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty";
import { Notice } from "@/components/ui/notice";
import { RequestRow } from "@/components/domain/request-row";
import { StatTiles } from "@/components/domain/stat-tiles";
import type { RequestStatus } from "@/lib/types";

export const metadata: Metadata = { title: "Permohonan saya" };

const FILTERS: Array<{ key: string; label: string; tone: "proses" | "tolak" | "terbit" | "netral"; statuses?: RequestStatus[] }> = [
  { key: "semua", label: "Semua permohonan", tone: "netral" },
  { key: "proses", label: "Sedang diproses", tone: "proses", statuses: IN_PROGRESS_STATUSES },
  { key: "perbaiki", label: "Perlu diperbaiki", tone: "tolak", statuses: REJECTED_STATUSES },
  { key: "terbit", label: "Surat terbit", tone: "terbit", statuses: ["terbit"] },
  { key: "batal", label: "Dibatalkan", tone: "netral", statuses: ["dibatalkan"] },
];

export default async function WargaPage({ searchParams }: PageProps<"/warga">) {
  const { supabase, profile } = await requireRole("warga");
  const sp = await searchParams;
  const filter = FILTERS.find((f) => f.key === sp.status) ?? FILTERS[0];

  const { data: allRows, error } = await supabase
    .from("letter_requests")
    .select("id, ticket_no, status, submitted_at, updated_at, letter_types(nama)")
    .order("updated_at", { ascending: false });

  // Penanda "Baru": keputusan RT/RW atau kelurahan setelah warga terakhir membuka detail permohonannya.
  const [{ data: others }, { data: seen }] = await Promise.all([
    supabase.from("approvals").select("request_id, created_at").neq("actor_id", profile.id),
    supabase.from("request_seen").select("request_id, seen_at"),
  ]);
  const seenAt = new Map((seen ?? []).map((v) => [v.request_id, new Date(v.seen_at).getTime()]));
  const fresh = new Set(
    (others ?? []).filter((a) => new Date(a.created_at).getTime() > (seenAt.get(a.request_id) ?? 0)).map((a) => a.request_id),
  );

  const countOf = (statuses?: RequestStatus[]) =>
    (allRows ?? []).filter((r) => !statuses || statuses.includes(r.status as RequestStatus)).length;
  const rows = (allRows ?? []).filter((r) => !filter.statuses || filter.statuses.includes(r.status as RequestStatus));
  const perluPerbaikan = countOf(REJECTED_STATUSES);
  const dibatalkan = countOf(["dibatalkan"]);

  const profileIncomplete = !profile.tempat_lahir || !profile.tanggal_lahir || !profile.alamat || !profile.pekerjaan;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-tinta-900">Permohonan saya</h1>
          <p className="mt-1 text-redup">Halo, {profile.nama.split(" ")[0]}. Status surat Anda diperbarui di sini.</p>
        </div>
        <ButtonLink href="/warga/ajukan" variant="utama" size="lg">
          <PenLine aria-hidden /> Ajukan surat
        </ButtonLink>
      </div>

      {fresh.size ? (
        <Notice tone="info" title={`${fresh.size} permohonan punya kabar baru`}>
          Petugas sudah memproses permohonan yang bertanda <span className="font-semibold">Baru</span>. Buka untuk melihat
          detailnya.
        </Notice>
      ) : null}

      {perluPerbaikan && filter.key !== "perbaiki" ? (
        <Notice
          tone="galat"
          title={`${perluPerbaikan} permohonan perlu Anda perbaiki`}
          action={
            <Link href="/warga?status=perbaiki" className="font-semibold text-tolak underline underline-offset-4">
              Lihat yang perlu diperbaiki
            </Link>
          }
        >
          Ketua RT/RW atau petugas kelurahan menuliskan apa yang kurang. Perbaiki lalu kirim ulang tanpa mengisi dari awal.
        </Notice>
      ) : null}

      {profileIncomplete ? (
        <Notice
          tone="info"
          title="Lengkapi profil agar formulir terisi otomatis"
          action={
            <Link href="/warga/profil" className="inline-flex items-center gap-1.5 font-semibold text-tinta-800 underline underline-offset-4">
              <UserRound aria-hidden className="size-4" /> Lengkapi profil
            </Link>
          }
        >
          Tempat dan tanggal lahir, pekerjaan, serta alamat akan dipakai di setiap pengajuan.
        </Notice>
      ) : null}

      <StatTiles
        label="Saring berdasarkan status"
        items={FILTERS.filter((f) => f.key !== "batal").map((f) => ({
          label: f.label,
          value: countOf(f.statuses),
          tone: f.tone,
          href: f.key === "semua" ? "/warga" : `/warga?status=${f.key}`,
          active: f === filter,
        }))}
      />
      {dibatalkan ? (
        <p className="-mt-2 text-sm text-redup">
          <Link
            href={filter.key === "batal" ? "/warga" : "/warga?status=batal"}
            className="font-semibold text-tinta-800 underline underline-offset-4"
          >
            {filter.key === "batal" ? "Tampilkan semua permohonan" : `Lihat ${dibatalkan} permohonan yang Anda batalkan`}
          </Link>
        </p>
      ) : null}

      {error ? (
        <Notice tone="galat" title="Daftar permohonan gagal dimuat">
          Muat ulang halaman. Jika masih gagal, periksa koneksi internet Anda.
        </Notice>
      ) : !rows.length ? (
        filter.key === "semua" ? (
          <EmptyState
            title="Belum ada permohonan"
            action={
              <ButtonLink href="/warga/ajukan" variant="utama">
                Ajukan surat pertama
              </ButtonLink>
            }
          >
            Pilih jenis surat, isi data, dan unggah foto KTP serta KK. Kurang dari 5 menit.
          </EmptyState>
        ) : (
          <EmptyState title={`Tidak ada permohonan di kategori ${filter.label.toLowerCase()}`} />
        )
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <RequestRow
              key={r.id}
              href={`/warga/permohonan/${r.id}`}
              ticket={r.ticket_no}
              title={(r.letter_types as unknown as { nama: string } | null)?.nama ?? "Surat"}
              status={r.status as RequestStatus}
              date={r.updated_at}
              aside={
                fresh.has(r.id) ? (
                  <span className="rounded-full bg-tinta-800 px-2 py-0.5 text-xs font-semibold text-white">Baru</span>
                ) : undefined
              }
            />
          ))}
        </ul>
      )}
    </div>
  );
}
