import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { kecamatanOf, requireRole } from "@/lib/auth/guard";
import { isAiEnabled } from "@/lib/ai/client";
import { profilePrefill } from "@/lib/letters/form-schema";
import { submitRequestAction } from "@/app/actions/requests";
import { RequestWizardClient as RequestWizard } from "@/components/domain/request-wizard-client";
import { Notice } from "@/components/ui/notice";
import type { LetterType } from "@/lib/types";

export const metadata: Metadata = { title: "Formulir pengajuan" };
// Server action kirim dapat memeriksa ulang foto KTP/KK ke AI (lib/ai/document-gate.ts).
export const maxDuration = 60;

export default async function AjukanJenisPage({ params }: PageProps<"/warga/ajukan/[kode]">) {
  const { kode } = await params;
  const { supabase, profile } = await requireRole("warga");
  const { data: type } = await supabase.from("letter_types").select("*").eq("kode", kode).eq("is_active", true).maybeSingle<LetterType>();
  if (!type) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link href="/warga/ajukan" className="inline-flex min-h-11 items-center gap-1.5 font-medium text-tinta-800 hover:underline">
        <ArrowLeft aria-hidden className="size-4" /> Pilih surat lain
      </Link>
      <div>
        <h1 className="text-3xl font-bold text-tinta-900">{type.nama}</h1>
        <p className="mt-1 text-redup">{type.deskripsi}</p>
      </div>
      {!profile.nik ? (
        <Notice tone="galat" title="Akun Anda belum memiliki NIK">
          Hubungi kantor kelurahan untuk melengkapi data akun.
        </Notice>
      ) : !profile.rt_unit_id ? (
        <Notice tone="galat" title="Akun Anda belum terhubung ke RT/RW">
          Setiap surat diperiksa Ketua RT/RW lebih dulu. Hubungi kantor kelurahan untuk mengaitkan akun Anda ke RT/RW.
        </Notice>
      ) : (
        <RequestWizard
          mode="baru"
          type={type}
          requestId={crypto.randomUUID()}
          initialValues={profilePrefill(type.form_schema, profile, { kecamatan: await kecamatanOf(profile) })}
          action={submitRequestAction}
          aiEnabled={isAiEnabled()}
        />
      )}
    </div>
  );
}
