import { NextResponse, type NextRequest } from "next/server";
import { roleOrNull } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/**
 * Membuka berkas KTP/KK (PRD revisi 1 §4.4):
 * 1. cek sesi & peran (camat tidak termasuk),
 * 2. cek kepemilikan lewat RLS tabel (warga pemilik / RT unit sama / kelurahan sama + status yang diizinkan),
 * 3. baru buat signed URL 60 detik dengan service role.
 */
export async function GET(_req: NextRequest, ctx: RouteContext<"/api/berkas/[id]">) {
  const session = await roleOrNull("warga", "rt_rw", "admin_kelurahan", "super_admin");
  if (!session) return NextResponse.json({ pesan: "Silakan masuk terlebih dahulu" }, { status: 401 });

  const { id } = await ctx.params;
  const { data: doc } = await session.supabase.from("request_documents").select("storage_path").eq("id", id).maybeSingle();
  if (!doc) return NextResponse.json({ pesan: "Berkas tidak ditemukan" }, { status: 404 });

  const { data, error } = await createAdminClient().storage.from("requests").createSignedUrl(doc.storage_path, 60);
  if (error || !data) return NextResponse.json({ pesan: "Berkas tidak dapat dibuka" }, { status: 403 });

  return NextResponse.redirect(data.signedUrl, { headers: { "Cache-Control": "no-store" } });
}
