import type { Metadata } from "next";
import { BadgeCheck, FilePen, LockKeyhole, UserCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = { title: "Daftar" };

const langkah = [
  { icon: FilePen, judul: "Ajukan surat dari rumah", isi: "Data diri terisi otomatis di setiap permohonan." },
  { icon: UserCheck, judul: "Diperiksa Ketua RT/RW", isi: "Permohonan langsung masuk ke RT/RW yang Anda pilih." },
  { icon: BadgeCheck, judul: "Diterbitkan kelurahan", isi: "Unduh surat PDF ber-QR yang bisa dicek keasliannya." },
];

export default async function DaftarPage() {
  const supabase = await createClient();
  const [{ data }, { data: units }] = await Promise.all([
    supabase.from("regions_kelurahan").select("id, nama, regions_kecamatan(nama)").order("nama"),
    supabase.from("rt_units").select("id, kelurahan_id, rt_no, rw_no").order("rw_no").order("rt_no"),
  ]);

  const kelurahan = (data ?? []).map((k) => ({
    id: k.id as string,
    nama: k.nama as string,
    kecamatan: (k.regions_kecamatan as unknown as { nama: string } | null)?.nama ?? "",
  }));

  return (
    <div className="mx-auto grid max-w-5xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.25fr_0.75fr] md:py-16">
      <div className="min-w-0">
        <h1 className="text-3xl font-bold text-tinta-900 sm:text-4xl">Daftar akun warga</h1>
        <p className="mt-2 max-w-prose text-redup">Sekali daftar, Anda bisa mengajukan berbagai surat tanpa mengisi data diri berulang kali.</p>
        <div className="mt-8">
          <RegisterForm
            kelurahan={kelurahan}
            rtUnits={(units ?? []).map((u) => ({ id: u.id, kelurahan_id: u.kelurahan_id, label: `RT ${u.rt_no} / RW ${u.rw_no}` }))}
          />
        </div>
      </div>

      <aside className="space-y-5 md:sticky md:top-24 md:self-start">
        <div className="rounded-[var(--radius-kartu)] border border-garis bg-lembar p-5">
          <h2 className="font-bold text-tinta-900">Setelah mendaftar</h2>
          <ol className="mt-4 space-y-4">
            {langkah.map(({ icon: Icon, judul, isi }) => (
              <li key={judul} className="flex gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-tinta-50 text-tinta-800">
                  <Icon aria-hidden className="size-4.5" />
                </span>
                <div>
                  <p className="font-semibold text-teks">{judul}</p>
                  <p className="text-sm text-redup">{isi}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
        <div className="flex gap-3 rounded-[var(--radius-kartu)] bg-tinta-900 p-5 text-sm text-tinta-50">
          <LockKeyhole aria-hidden className="mt-0.5 size-5 shrink-0 text-map-400" />
          <p>
            <span className="block font-semibold text-white">NIK Anda terlindungi</span>
            Hanya terlihat oleh Anda dan petugas wilayah Anda. Di halaman publik NIK selalu disamarkan.
          </p>
        </div>
      </aside>
    </div>
  );
}
