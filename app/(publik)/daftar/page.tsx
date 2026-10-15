import type { Metadata } from "next";
import Link from "next/link";
import { LockKeyhole } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = { title: "Daftar" };

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
    <div className="mx-auto max-w-lg px-4 py-12 sm:px-6 md:py-16">
      <h1 className="text-3xl font-bold text-tinta-900 sm:text-4xl">Daftar akun warga</h1>
      <p className="mt-2 text-redup">Sekali daftar, Anda bisa mengajukan berbagai surat tanpa mengisi data diri berulang kali.</p>
      <p className="mt-4 flex items-start gap-2 rounded-md bg-tinta-50 px-3 py-2.5 text-sm text-tinta-900">
        <LockKeyhole aria-hidden className="mt-0.5 size-4 shrink-0" />
        NIK hanya terlihat oleh Anda dan petugas wilayah Anda. Di halaman publik NIK selalu disamarkan.
      </p>
      <div className="mt-8">
        <RegisterForm
          kelurahan={kelurahan}
          rtUnits={(units ?? []).map((u) => ({ id: u.id, kelurahan_id: u.kelurahan_id, label: `RT ${u.rt_no} / RW ${u.rw_no}` }))}
        />
      </div>
      <p className="mt-6 text-redup">
        Sudah punya akun?{" "}
        <Link href="/masuk" className="font-semibold text-tinta-800 underline underline-offset-4">
          Masuk
        </Link>
      </p>
    </div>
  );
}
