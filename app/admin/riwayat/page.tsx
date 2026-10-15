import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/guard";
import { HistoryList } from "@/components/domain/history-list";

export const metadata: Metadata = { title: "Semua permohonan" };

export default async function AdminRiwayatPage({ searchParams }: PageProps<"/admin/riwayat">) {
  const { supabase } = await requireRole("admin_kelurahan", "super_admin");
  return (
    <HistoryList
      supabase={supabase}
      basePath="/admin/riwayat"
      detailPath="/admin/permohonan"
      statuses={["menunggu_kelurahan", "ditolak_kelurahan", "terbit"]}
      searchParams={await searchParams}
      title="Semua permohonan"
      description="Permohonan kelurahan Anda yang sudah melewati RT/RW. Pilih status untuk menyaring, atau cari nomor tiket dan nama pemohon."
      csvHref="/api/admin/rekap"
    />
  );
}
