import type { Metadata } from "next";
import { FileDown } from "lucide-react";
import { requireRole } from "@/lib/auth/guard";
import { Notice } from "@/components/ui/notice";
import { ReviewScreen } from "@/components/domain/review-screen";

export const metadata: Metadata = { title: "Periksa permohonan" };

export default async function RtReviewPage({ params, searchParams }: PageProps<"/rt/permohonan/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  const { supabase } = await requireRole("rt_rw");

  // Setelah setuju: tampilkan surat pengantar yang baru dibuat (PRD §11).
  const notice =
    sp.selesai === "setuju" ? (
      <Notice
        tone="berhasil"
        title="Disetujui. Surat pengantar RT/RW sudah dibuat"
        action={
          <a href={`/api/surat-pengantar/${id}`} target="_blank" rel="noopener" className="inline-flex items-center gap-1.5 font-semibold text-terbit underline underline-offset-4">
            <FileDown aria-hidden className="size-4" /> Lihat PDF pengantar
          </a>
        }
      >
        Permohonan diteruskan ke kelurahan untuk diperiksa dan diterbitkan.
      </Notice>
    ) : null;

  return <ReviewScreen supabase={supabase} role="rt_rw" requestId={id} backHref="/rt" backLabel="Kembali ke antrean" notice={notice} />;
}
