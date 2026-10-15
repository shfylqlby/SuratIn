import { NextResponse, type NextRequest } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { lookupLetter } from "@/lib/letters/verify";

export const runtime = "nodejs";

/** GET /api/verifikasi?q=<nomor surat | kode verifikasi> — 30 permintaan/menit/IP. */
export async function GET(request: NextRequest) {
  const limit = await rateLimit("verifikasi", 30);
  if (!limit.ok) {
    return NextResponse.json(
      { status: "dibatasi", pesan: "Terlalu banyak permintaan. Coba lagi sebentar." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );
  }
  const q = request.nextUrl.searchParams.get("q") ?? "";
  const result = await lookupLetter(q);
  if (!result) {
    return NextResponse.json({ status: "tidak_ditemukan" }, { status: 404, headers: { "Cache-Control": "no-store" } });
  }
  return NextResponse.json(
    {
      status: result.archiveIntact ? "asli" : "arsip_tidak_cocok",
      nomor_surat: result.letterNo,
      kode_verifikasi: result.code,
      jenis: result.jenis,
      tanggal_terbit: result.issuedAt,
      pemohon: result.pemohon,
      nik: result.nikMasked,
      kelurahan: result.kelurahan,
      kecamatan: result.kecamatan,
      sha256: result.sha256,
      riwayat: result.history,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
