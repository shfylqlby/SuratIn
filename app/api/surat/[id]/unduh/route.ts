import { NextResponse, type NextRequest } from "next/server";
import { roleOrNull } from "@/lib/auth/guard";

export const runtime = "nodejs";

/**
 * Mengunduh PDF surat terbit. Byte yang dikirim persis sama dengan yang di-hash saat terbit,
 * sehingga pemeriksaan SHA-256 di halaman verifikasi akan cocok.
 */
export async function GET(_req: NextRequest, ctx: RouteContext<"/api/surat/[id]/unduh">) {
  const session = await roleOrNull("warga", "rt_rw", "admin_kelurahan", "super_admin");
  if (!session) return NextResponse.json({ pesan: "Silakan masuk terlebih dahulu" }, { status: 401 });

  const { id } = await ctx.params;
  const { data: letter } = await session.supabase.from("letters").select("pdf_path, letter_no").eq("request_id", id).maybeSingle();
  if (!letter) return NextResponse.json({ pesan: "Surat belum terbit" }, { status: 404 });

  const fileName = `Surat-${letter.letter_no.replace(/\//g, "-")}.pdf`;
  const { data, error } = await session.supabase.storage
    .from("letters")
    .createSignedUrl(letter.pdf_path, 60, { download: fileName });
  if (error || !data) return NextResponse.json({ pesan: "Surat tidak dapat diunduh" }, { status: 403 });

  return NextResponse.redirect(data.signedUrl, { headers: { "Cache-Control": "no-store" } });
}
