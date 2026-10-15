import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/guard";
import { HistoryList } from "@/components/domain/history-list";

export const metadata: Metadata = { title: "Semua permohonan RT" };

export default async function RtRiwayatPage({ searchParams }: PageProps<"/rt/riwayat">) {
  const { supabase } = await requireRole("rt_rw");
  return (
    <HistoryList
      supabase={supabase}
      basePath="/rt/riwayat"
      detailPath="/rt/permohonan"
      statuses={["menunggu_rt", "ditolak_rt", "menunggu_kelurahan", "ditolak_kelurahan", "terbit"]}
      searchParams={await searchParams}
      title="Semua permohonan"
      description="Semua permohonan dari warga RT Anda, termasuk yang sudah diteruskan ke kelurahan."
    />
  );
}
