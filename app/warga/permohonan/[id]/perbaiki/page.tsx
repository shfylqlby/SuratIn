import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { kecamatanOf, requireRole } from "@/lib/auth/guard";
import { isAiEnabled } from "@/lib/ai/client";
import { REJECTED_STATUSES } from "@/lib/format";
import { profilePrefill } from "@/lib/letters/form-schema";
import { resubmitRequestAction } from "@/app/actions/requests";
import { RequestWizardClient as RequestWizard } from "@/components/domain/request-wizard-client";
import type { LetterRequest, LetterType, RequestDocument } from "@/lib/types";

export const metadata: Metadata = { title: "Perbaiki permohonan" };
// Server action kirim dapat memeriksa ulang foto KTP/KK ke AI (lib/ai/document-gate.ts).
export const maxDuration = 60;

export default async function PerbaikiPage({ params }: PageProps<"/warga/permohonan/[id]/perbaiki">) {
  const { id } = await params;
  const { supabase, profile } = await requireRole("warga");

  const { data: request } = await supabase.from("letter_requests").select("*").eq("id", id).maybeSingle<LetterRequest>();
  if (!request) notFound();
  if (!REJECTED_STATUSES.includes(request.status)) redirect(`/warga/permohonan/${id}`);

  const [{ data: type }, { data: docs }] = await Promise.all([
    supabase.from("letter_types").select("*").eq("id", request.type_id).single<LetterType>(),
    supabase.from("request_documents").select("*").eq("request_id", id).eq("is_current", true).returns<RequestDocument[]>(),
  ]);
  if (!type) notFound();

  const existingDocs: Record<string, string> = {};
  for (const d of docs ?? []) existingDocs[d.kind] = d.file_name;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link href={`/warga/permohonan/${id}`} className="inline-flex min-h-11 items-center gap-1.5 font-medium text-tinta-800 hover:underline">
        <ArrowLeft aria-hidden className="size-4" /> Kembali ke detail
      </Link>
      <div>
        <p className="text-sm text-redup angka">{request.ticket_no}</p>
        <h1 className="text-3xl font-bold text-tinta-900">Perbaiki {type.nama}</h1>
        <p className="mt-1 text-redup">
          Isian dan berkas sebelumnya sudah terisi. Ubah hanya bagian yang diminta. Setelah dikirim, permohonan diperiksa ulang
          mulai dari Ketua RT/RW.
        </p>
      </div>
      <RequestWizard
        mode="perbaiki"
        type={type}
        requestId={id}
        initialValues={profilePrefill(type.form_schema, profile, { kecamatan: await kecamatanOf(profile) }, request.form_data)}
        existingDocs={existingDocs}
        rejectReason={request.reject_reason}
        rejectedBy={request.status === "ditolak_rt" ? "Ketua RT/RW" : "petugas kelurahan"}
        action={resubmitRequestAction}
        aiEnabled={isAiEnabled()}
      />
    </div>
  );
}
