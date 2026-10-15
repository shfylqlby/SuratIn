import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download, FileDown, PenLine, ShieldCheck } from "lucide-react";
import { verifyHref } from "@/lib/config";
import { requireRole } from "@/lib/auth/guard";
import { REJECTED_STATUSES, formatTanggal, formatTanggalJam } from "@/lib/format";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Notice } from "@/components/ui/notice";
import { StatusBadge } from "@/components/domain/status-badge";
import { Timeline } from "@/components/domain/timeline";
import { StampMark } from "@/components/domain/stamp";
import { ClearDraft } from "@/components/domain/clear-draft";
import { CancelRequest } from "@/components/domain/cancel-request";
import { DocumentList, FormDataList } from "@/components/domain/request-details";
import type { Approval, Letter, LetterRequest, LetterType, RequestDocument, RtLetter } from "@/lib/types";

const PENDING: Partial<Record<LetterRequest["status"], string>> = {
  menunggu_rt: "Menunggu pemeriksaan Ketua RT/RW",
  menunggu_kelurahan: "Menunggu pemeriksaan dan penerbitan oleh kelurahan",
  diajukan: "Menunggu pemeriksaan petugas kelurahan",
  menunggu_camat: "Menunggu tanda tangan camat",
};

export const metadata: Metadata = { title: "Detail permohonan" };

export default async function DetailPermohonanPage({ params, searchParams }: PageProps<"/warga/permohonan/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  const { supabase } = await requireRole("warga");

  const { data: request } = await supabase.from("letter_requests").select("*").eq("id", id).maybeSingle<LetterRequest>();
  if (!request) notFound();

  // Tandai sudah dibaca: penanda "Baru" di dasbor hilang untuk permohonan ini.
  await supabase.rpc("mark_request_seen", { p_id: id });

  const [{ data: type }, { data: approvals }, { data: docs }, { data: letter }, { data: rtLetter }, { data: wilayah }] = await Promise.all([
    supabase.from("letter_types").select("*").eq("id", request.type_id).single<LetterType>(),
    supabase.from("approvals").select("*").eq("request_id", id).order("created_at").returns<Approval[]>(),
    supabase.from("request_documents").select("*").eq("request_id", id).eq("is_current", true).order("kind").returns<RequestDocument[]>(),
    supabase.from("letters").select("*").eq("request_id", id).maybeSingle<Letter>(),
    supabase.from("rt_letters").select("*").eq("request_id", id).maybeSingle<RtLetter>(),
    supabase
      .from("regions_kelurahan")
      .select("nama, regions_kecamatan(nama)")
      .eq("id", request.kelurahan_id)
      .maybeSingle<{ nama: string; regions_kecamatan: { nama: string } | null }>(),
  ]);

  const pending = PENDING[request.status] ?? null;
  const rejected = REJECTED_STATUSES.includes(request.status);
  const rejectedBy =
    request.status === "ditolak_rt" ? "Ketua RT/RW" : request.status === "ditolak_kelurahan" ? "petugas kelurahan" : "petugas";
  const lastReject = [...(approvals ?? [])].reverse().find((a) => a.action.startsWith("reject"));

  return (
    <div className="space-y-6">
      {sp.terkirim || sp.diperbaiki ? <ClearDraft keys={[`suratin:draf:${type?.kode}`, `suratin:perbaikan:${id}`]} /> : null}

      <Link href="/warga" className="inline-flex min-h-11 items-center gap-1.5 font-medium text-tinta-800 hover:underline">
        <ArrowLeft aria-hidden className="size-4" /> Semua permohonan
      </Link>

      {sp.terkirim ? (
        <Notice tone="berhasil" title="Permohonan terkirim">
          Simpan nomor tiket <span className="font-semibold angka">{request.ticket_no}</span>. Kami akan memperbarui status di halaman ini.
        </Notice>
      ) : null}
      {sp.diperbaiki ? (
        <Notice tone="berhasil" title="Perbaikan terkirim">
          Permohonan kembali ke Ketua RT/RW untuk diperiksa ulang, lalu diteruskan ke kelurahan.
        </Notice>
      ) : null}

      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm text-redup angka">{request.ticket_no}</p>
          <h1 className="text-3xl font-bold text-tinta-900">{type?.nama}</h1>
          <p className="mt-1 text-redup">Diajukan {formatTanggal(request.submitted_at)}</p>
        </div>
        <StatusBadge status={request.status} className="self-start text-base" />
      </header>

      {rejected ? (
        <section aria-labelledby="perbaiki" className="rounded-[var(--radius-kartu)] border-2 border-tolak/40 bg-lembar p-5">
          <h2 id="perbaiki" className="text-xl font-bold text-tolak">
            Perlu diperbaiki
          </h2>
          <p className="mt-1 text-sm text-redup">
            Dikembalikan oleh <span className="font-semibold text-teks">{lastReject?.actor_nama ?? rejectedBy}</span> ({rejectedBy})
            {lastReject ? `, ${formatTanggalJam(lastReject.created_at)}` : ""}. Catatannya:
          </p>
          <blockquote className="mt-2 border-l-4 border-tolak/50 pl-4 text-lg text-teks">{request.reject_reason}</blockquote>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <ButtonLink href={`/warga/permohonan/${id}/perbaiki`} variant="utama" size="lg">
              <PenLine aria-hidden /> Perbaiki & ajukan ulang
            </ButtonLink>
            <CancelRequest requestId={id} />
          </div>
        </section>
      ) : null}

      {request.status === "terbit" && letter ? (
        <section aria-labelledby="terbit" className="relative overflow-hidden rounded-[var(--radius-kartu)] border-2 border-terbit/40 bg-lembar p-5">
          <StampMark
            animate
            className="pointer-events-none absolute -right-4 -bottom-6 size-36 opacity-80 sm:right-4 sm:bottom-auto sm:top-3 sm:size-32"
            ring={`KECAMATAN ${wilayah?.regions_kecamatan?.nama ?? ""} • KELURAHAN ${wilayah?.nama ?? ""} •`.toUpperCase()}
            center={["TERBIT", new Date(letter.issued_at).getFullYear().toString()]}
          />
          <h2 id="terbit" className="text-xl font-bold text-terbit">
            Surat Anda sudah terbit
          </h2>
          <dl className="mt-3 space-y-1 text-teks">
            <div>
              <dt className="inline text-redup">Nomor surat: </dt>
              <dd className="inline font-semibold angka">{letter.letter_no}</dd>
            </div>
            <div>
              <dt className="inline text-redup">Tanggal terbit: </dt>
              <dd className="inline font-semibold">{formatTanggal(letter.issued_at)}</dd>
            </div>
          </dl>
          <div className="relative mt-5 flex flex-col gap-3 sm:flex-row">
            <a href={`/api/surat/${id}/unduh`} className="inline-flex min-h-13 items-center justify-center gap-2 rounded-[var(--radius-tombol)] bg-map-500 px-6 font-semibold text-tinta-950 hover:bg-map-400">
              <Download aria-hidden className="size-5" /> Unduh surat (PDF)
            </a>
            <ButtonLink href={verifyHref(letter.verification_code, `/warga/permohonan/${id}`)} variant="garis" size="lg">
              <ShieldCheck aria-hidden /> Lihat halaman verifikasi
            </ButtonLink>
          </div>
          <p className="relative mt-3 max-w-md text-sm text-redup">
            Kirim PDF ini apa adanya. Jika berkas diedit atau disimpan ulang dari aplikasi lain, pemeriksaan keaslian akan gagal.
          </p>
        </section>
      ) : null}

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_1.1fr]">
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-teks">Perjalanan permohonan</h2>
          </CardHeader>
          <div className="px-5 py-5">
            <Timeline items={approvals ?? []} pending={pending} />
          </div>
        </Card>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <h2 className="font-semibold text-teks">Data yang diajukan</h2>
            </CardHeader>
            {type ? <FormDataList schema={type.form_schema} data={request.form_data} /> : null}
          </Card>
          <Card>
            <CardHeader>
              <h2 className="font-semibold text-teks">Berkas</h2>
            </CardHeader>
            <DocumentList docs={docs ?? []} />
          </Card>
          {rtLetter ? (
            <Card>
              <CardHeader className="flex items-center justify-between gap-3">
                <h2 className="font-semibold text-teks">Surat pengantar RT/RW</h2>
                <a
                  href={`/api/surat-pengantar/${id}`}
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-md px-2 text-sm font-semibold text-tinta-800 hover:bg-tinta-50"
                >
                  <FileDown aria-hidden className="size-4" /> Unduh
                </a>
              </CardHeader>
              <p className="px-5 py-4 text-teks">
                Nomor <span className="font-semibold angka">{rtLetter.letter_no}</span>, {formatTanggal(rtLetter.issued_at)}.
              </p>
            </Card>
          ) : null}
          {request.status === "menunggu_rt" || request.status === "diajukan" ? <CancelRequest requestId={id} /> : null}
        </div>
      </div>
    </div>
  );
}
