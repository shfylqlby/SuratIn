import { NextResponse, type NextRequest } from "next/server";
import { roleOrNull } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/**
 * Membuka PDF Surat Pengantar RT/RW sebuah permohonan.
 * Kepemilikan dicek dengan RLS (warga pemilik, RT unit terkait, admin kelurahan terkait),
 * baru kemudian signed URL 60 detik dibuat dengan service role. Camat tidak pernah lolos.
 */
export async function GET(_req: NextRequest, ctx: RouteContext<"/api/surat-pengantar/[id]">) {
  const session = await roleOrNull("warga", "rt_rw", "admin_kelurahan", "super_admin");
  if (!session) return NextResponse.json({ pesan: "Silakan masuk terlebih dahulu" }, { status: 401 });

  const { id } = await ctx.params;
  const { data: letter } = await session.supabase.from("rt_letters").select("pdf_path, letter_no").eq("request_id", id).maybeSingle();
  if (!letter) return NextResponse.json({ pesan: "Surat pengantar belum dibuat" }, { status: 404 });

  const fileName = `Pengantar-${letter.letter_no.replace(/\//g, "-")}.pdf`;
  const { data, error } = await createAdminClient().storage.from("letters").createSignedUrl(letter.pdf_path, 60, { download: fileName });
  if (error || !data) return NextResponse.json({ pesan: "Surat pengantar tidak dapat dibuka" }, { status: 403 });

  return NextResponse.redirect(data.signedUrl, { headers: { "Cache-Control": "no-store" } });
}
