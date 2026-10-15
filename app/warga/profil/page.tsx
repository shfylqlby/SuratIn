import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/guard";
import { maskNik, rtLabel } from "@/lib/format";
import { Notice } from "@/components/ui/notice";
import { ProfileForm } from "./profile-form";
import { PasswordForm } from "./password-form";

export const metadata: Metadata = { title: "Profil" };

export default async function ProfilPage({ searchParams }: PageProps<"/warga/profil">) {
  const { profile, supabase } = await requireRole("warga");
  const sp = await searchParams;
  const [{ data: kel }, { data: unit }] = await Promise.all([
    profile.kelurahan_id
      ? supabase.from("regions_kelurahan").select("nama").eq("id", profile.kelurahan_id).single()
      : Promise.resolve({ data: null }),
    profile.rt_unit_id
      ? supabase.from("rt_units").select("rt_no, rw_no").eq("id", profile.rt_unit_id).single()
      : Promise.resolve({ data: null }),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-tinta-900">Profil</h1>
        <p className="mt-1 text-redup">Data ini otomatis mengisi formulir surat Anda.</p>
      </div>
      {sp.baru ? (
        <Notice tone="berhasil" title="Akun berhasil dibuat">
          Lengkapi data di bawah agar Anda tidak perlu mengetik ulang saat mengajukan surat.
        </Notice>
      ) : null}
      <dl className="grid gap-4 rounded-[var(--radius-kartu)] border border-garis bg-lembar p-5 sm:grid-cols-2">
        <div>
          <dt className="text-sm text-redup">NIK</dt>
          <dd className="font-semibold angka">{maskNik(profile.nik)}</dd>
        </div>
        <div>
          <dt className="text-sm text-redup">Email</dt>
          <dd className="font-semibold break-all">{profile.email}</dd>
        </div>
        <div>
          <dt className="text-sm text-redup">Kelurahan</dt>
          <dd className="font-semibold">{kel?.nama ?? "-"}</dd>
        </div>
        <div>
          <dt className="text-sm text-redup">RT/RW</dt>
          <dd className="font-semibold angka">{rtLabel(unit)}</dd>
        </div>
        <p className="text-sm text-redup sm:col-span-2">NIK, kelurahan, dan RT/RW hanya dapat diubah oleh petugas kelurahan.</p>
      </dl>
      <ProfileForm
        initial={{
          nama: profile.nama,
          tempat_lahir: profile.tempat_lahir ?? "",
          tanggal_lahir: profile.tanggal_lahir ?? "",
          pekerjaan: profile.pekerjaan ?? "",
          alamat: profile.alamat ?? "",
        }}
      />
      <section aria-labelledby="ganti-sandi" className="space-y-4 border-t border-garis pt-8">
        <div>
          <h2 id="ganti-sandi" className="text-xl font-bold text-tinta-900">
            Ganti kata sandi
          </h2>
          <p className="mt-1 text-redup">Masukkan kata sandi saat ini untuk memastikan ini benar Anda.</p>
        </div>
        <PasswordForm />
      </section>
    </div>
  );
}
