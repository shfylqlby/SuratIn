import { NextResponse, type NextRequest } from "next/server";
import { roleOrNull } from "@/lib/auth/guard";
import { maskNik, staffStatusLabel } from "@/lib/format";
import type { RequestStatus } from "@/lib/types";

export const runtime = "nodejs";

function csvCell(value: unknown) {
  let s = String(value ?? "");
  // Cegah formula injection saat dibuka di Excel/Sheets.
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

export async function GET(request: NextRequest) {
  const session = await roleOrNull("admin_kelurahan", "super_admin");
  if (!session) return NextResponse.json({ pesan: "Tidak berwenang" }, { status: 403 });

  const status = request.nextUrl.searchParams.get("status");
  const q = (request.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 60).replace(/[%,()*]/g, " ");

  let query = session.supabase
    .from("letter_requests")
    .select("ticket_no, status, submitted_at, updated_at, form_data, letter_types(nama), letters(letter_no, issued_at)")
    .order("submitted_at", { ascending: false })
    .limit(5000);
  if (status && status in staffStatusLabel) query = query.eq("status", status);
  if (q) query = query.or(`ticket_no.ilike.%${q}%,form_data->>nama.ilike.%${q}%`);
  const { data } = await query;

  const header = ["Nomor tiket", "Jenis surat", "Nama pemohon", "NIK", "Status", "Diajukan", "Diperbarui", "Nomor surat", "Tanggal terbit"];
  const lines = (data ?? []).map((r) => {
    const form = r.form_data as Record<string, string>;
    const letter = (Array.isArray(r.letters) ? r.letters[0] : r.letters) as { letter_no: string; issued_at: string } | null;
    return [
      r.ticket_no,
      (r.letter_types as unknown as { nama: string } | null)?.nama,
      form.nama,
      maskNik(form.nik),
      staffStatusLabel[r.status as RequestStatus],
      r.submitted_at,
      r.updated_at,
      letter?.letter_no ?? "",
      letter?.issued_at ?? "",
    ]
      .map(csvCell)
      .join(",");
  });

  const csv = "﻿" + [header.map(csvCell).join(","), ...lines].join("\r\n");
  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="rekap-permohonan-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
