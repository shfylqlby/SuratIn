import { NextResponse, type NextRequest } from "next/server";
import { roleOrNull } from "@/lib/auth/guard";
import { loadLetterContext, renderPreview } from "@/lib/letters/issue";

export const runtime = "nodejs";

/** Pratinjau PDF untuk petugas sebelum terbit: tanpa nomor urut, TTD, stempel, dan QR. */
export async function GET(_req: NextRequest, ctx: RouteContext<"/api/permohonan/[id]/pratinjau">) {
  const session = await roleOrNull("admin_kelurahan", "super_admin");
  if (!session) return NextResponse.json({ pesan: "Tidak berwenang" }, { status: 403 });

  const { id } = await ctx.params;
  // Klien pengguna: RLS memastikan petugas hanya bisa membuka permohonan di wilayahnya.
  const letterCtx = await loadLetterContext(session.supabase, id);
  if (!letterCtx) return NextResponse.json({ pesan: "Permohonan tidak ditemukan" }, { status: 404 });

  const pdf = await renderPreview(letterCtx);
  return new NextResponse(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="pratinjau-${letterCtx.request.ticket_no}.pdf"`,
      "Cache-Control": "no-store",
      "X-Frame-Options": "SAMEORIGIN",
      "Content-Security-Policy": "frame-ancestors 'self'",
    },
  });
}
