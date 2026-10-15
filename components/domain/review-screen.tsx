import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileDown, FileSearch, Clock3 } from "lucide-react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SLA } from "@/lib/config";
import { formatDurasi, formatTanggalJam, hoursSince, maskNik, rtLabel } from "@/lib/format";
import { isAiEnabled } from "@/lib/ai/client";
import { Card, CardHeader } from "@/components/ui/card";
import { Notice } from "@/components/ui/notice";
import { StatusBadge } from "./status-badge";
import { Timeline } from "./timeline";
import { BerkasViewer } from "./berkas-viewer";
import { ReviewActions } from "./review-actions";
import { FormDataList } from "./request-details";
import type { Approval, LetterRequest, LetterType, Profile, RequestDocument, RtLetter, RtUnit } from "@/lib/types";

/**
 * Halaman pemeriksaan bersama untuk RT/RW dan admin kelurahan.
 * Semua data dibaca dengan klien pengguna, jadi RLS membatasi ke unit RT / kelurahan aktor.
 */
export async function ReviewScreen({
  supabase,
  role,
  requestId,
  backHref,
  backLabel,
  notice,
}: {
  supabase: SupabaseClient;
  role: "rt_rw" | "admin_kelurahan";
  requestId: string;
  backHref: string;
  backLabel: string;
  notice?: React.ReactNode;
}) {
  const { data: request } = await supabase.from("letter_requests").select("*").eq("id", requestId).maybeSingle<LetterRequest>();
  if (!request) notFound();

  const [{ data: type }, { data: approvals }, { data: docs }, { data: applicant }, { data: unit }, { data: rtLetter }] = await Promise.all([
    supabase.from("letter_types").select("*").eq("id", request.type_id).single<LetterType>(),
    supabase.from("approvals").select("*").eq("request_id", requestId).order("created_at").returns<Approval[]>(),
    supabase.from("request_documents").select("*").eq("request_id", requestId).eq("is_current", true).order("kind").returns<RequestDocument[]>(),
    supabase.from("profiles").select("*").eq("id", request.applicant_id).maybeSingle<Profile>(),
    request.rt_unit_id
      ? supabase.from("rt_units").select("*").eq("id", request.rt_unit_id).maybeSingle<RtUnit>()
      : Promise.resolve({ data: null }),
    supabase.from("rt_letters").select("*").eq("request_id", requestId).maybeSingle<RtLetter>(),
  ]);
  if (!type) notFound();

  const stageStatus = role === "rt_rw" ? "menunggu_rt" : "menunggu_kelurahan";
  const actionable = request.status === stageStatus;
  const limit = role === "rt_rw" ? SLA.rtHours : SLA.kelurahanHours;
  const waited = hoursSince(request.stage_entered_at);
  const late = actionable && waited > limit;
  const aiOn = isAiEnabled();
  const nikMismatch = applicant?.nik && request.form_data.nik !== applicant.nik;

  const checklist =
    role === "rt_rw"
      ? [
          `Pemohon benar warga ${rtLabel(unit)}`,
          "Alamat di formulir sesuai tempat tinggal pemohon",
          "Foto KTP terbaca jelas dan namanya sesuai formulir",
        ]
      : [
          "Surat pengantar RT/RW ada dan sesuai pemohon",
          "Foto KTP terbaca jelas dan tidak terpotong",
          `NIK di KTP sama dengan ${maskNik(request.form_data.nik)}`,
          "Nama dan alamat sesuai KTP serta Kartu Keluarga",
          ...(type.kode === "sktm" || type.kode === "penghasilan_ortu" ? ["Penghasilan yang diisi masuk akal"] : []),
          ...(type.kode === "izin_keramaian" ? ["Tanggal, jam, dan penggunaan jalan acara wajar"] : []),
        ];

  return (
    <div className="space-y-6">
      <Link href={backHref} className="inline-flex min-h-11 items-center gap-1.5 font-medium text-tinta-800 hover:underline">
        <ArrowLeft aria-hidden className="size-4" /> {backLabel}
      </Link>

      {notice}

      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm text-redup angka">
            {request.ticket_no}, {rtLabel(unit)}, masuk tahap ini {formatTanggalJam(request.stage_entered_at)}
          </p>
          <h1 className="text-3xl font-bold text-tinta-900">{request.form_data.nama}</h1>
          <p className="mt-1 text-redup">
            {type.nama}.{" "}
            {role === "rt_rw"
              ? "Setelah Anda setujui, surat pengantar RT/RW dibuat dan permohonan diteruskan ke kelurahan."
              : type.output_kind === "surat_pengantar"
                ? "Hasil akhirnya surat pengantar kelurahan ke kepolisian."
                : "Hasil akhirnya surat keterangan bertanda tangan lurah."}
          </p>
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <StatusBadge status={request.status} audience="staf" />
          {actionable ? (
            <span className={late ? "inline-flex items-center gap-1 rounded-full bg-tolak px-2.5 py-1 text-xs font-semibold text-white" : "inline-flex items-center gap-1 text-sm text-redup"}>
              <Clock3 aria-hidden className="size-3.5" />
              {late ? `Lewat SLA ${limit} jam, menunggu ${formatDurasi(waited)}` : `Menunggu ${formatDurasi(waited)}`}
            </span>
          ) : null}
          {role === "admin_kelurahan" && actionable ? (
            <a
              href={`/api/permohonan/${requestId}/pratinjau`}
              target="_blank"
              rel="noopener"
              className="inline-flex min-h-11 items-center gap-1.5 rounded-md px-2 text-sm font-semibold text-tinta-800 hover:bg-tinta-50"
            >
              <FileSearch aria-hidden className="size-4" /> Pratinjau surat
            </a>
          ) : null}
          {request.status === "terbit" ? (
            <a
              href={`/api/surat/${requestId}/unduh`}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-md px-2 text-sm font-semibold text-tinta-800 hover:bg-tinta-50"
            >
              <FileDown aria-hidden className="size-4" /> Unduh surat terbit (PDF)
            </a>
          ) : null}
        </div>
      </header>

      {nikMismatch ? (
        <Notice tone="peringatan" title="NIK di formulir berbeda dengan NIK akun">
          Periksa KTP dengan teliti sebelum menyetujui.
        </Notice>
      ) : null}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <h2 className="font-semibold text-teks">Data pemohon</h2>
            </CardHeader>
            <FormDataList schema={type.form_schema} data={request.form_data} />
          </Card>

          {rtLetter ? (
            <Card>
              <CardHeader className="flex items-center justify-between gap-3">
                <h2 className="font-semibold text-teks">Surat pengantar RT/RW</h2>
                <a
                  href={`/api/surat-pengantar/${requestId}`}
                  target="_blank"
                  rel="noopener"
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-md px-2 text-sm font-semibold text-tinta-800 hover:bg-tinta-50"
                >
                  <FileDown aria-hidden className="size-4" /> Buka PDF
                </a>
              </CardHeader>
              <p className="px-5 py-4 text-teks">
                Nomor <span className="font-semibold angka">{rtLetter.letter_no}</span>, dibuat {formatTanggalJam(rtLetter.issued_at)}.
              </p>
            </Card>
          ) : role === "admin_kelurahan" && actionable ? (
            <Notice tone="galat" title="Surat pengantar RT/RW belum ada">
              Permohonan ini tidak bisa diterbitkan sebelum ada surat pengantar RT/RW.
            </Notice>
          ) : null}

          {actionable ? (
            <Card>
              <CardHeader>
                <h2 className="font-semibold text-teks">Keputusan</h2>
              </CardHeader>
              <div className="px-5 py-5">
                <ReviewActions requestId={requestId} role={role} checklist={checklist} />
              </div>
            </Card>
          ) : (
            <Notice tone="info">Permohonan ini tidak sedang menunggu keputusan Anda. Riwayatnya tercatat di bawah.</Notice>
          )}

          <Card>
            <CardHeader>
              <h2 className="font-semibold text-teks">Riwayat</h2>
            </CardHeader>
            <div className="px-5 py-5">
              <Timeline items={approvals ?? []} />
            </div>
          </Card>
        </div>

        <Card className="overflow-hidden lg:sticky lg:top-4">
          <CardHeader>
            <h2 className="font-semibold text-teks">Berkas pemohon</h2>
          </CardHeader>
          <BerkasViewer
            docs={(docs ?? []).map((d) => ({
              id: d.id,
              kind: d.kind,
              mime: d.mime,
              file_name: d.file_name,
              ai:
                d.kind !== "pendukung" && (aiOn || d.ai_status !== "belum_diperiksa")
                  ? { status: d.ai_status, message: d.ai_result?.message ?? null }
                  : undefined,
            }))}
          />
        </Card>
      </div>
    </div>
  );
}
