import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/guard";
import { ReviewScreen } from "@/components/domain/review-screen";

export const metadata: Metadata = { title: "Periksa permohonan" };

export default async function AdminReviewPage({ params }: PageProps<"/admin/permohonan/[id]">) {
  const { id } = await params;
  const { supabase } = await requireRole("admin_kelurahan", "super_admin");
  return <ReviewScreen supabase={supabase} role="admin_kelurahan" requestId={id} backHref="/admin" backLabel="Kembali ke antrean" />;
}
