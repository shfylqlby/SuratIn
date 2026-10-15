import type { Metadata } from "next";
import Link from "next/link";
import { ResetForm } from "./reset-form";

export const metadata: Metadata = { title: "Lupa kata sandi" };

export default function LupaSandiPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-12 sm:px-6 md:py-16">
      <h1 className="text-3xl font-bold text-tinta-900 sm:text-4xl">Lupa kata sandi</h1>
      <p className="mt-2 text-redup">
        Masukkan email dan NIK yang Anda pakai saat mendaftar, lalu buat kata sandi baru. Khusus akun warga. Petugas RT/RW,
        kelurahan, dan camat menghubungi pengelola sistem.
      </p>
      <div className="mt-8">
        <ResetForm />
      </div>
      <p className="mt-6 text-redup">
        Sudah ingat?{" "}
        <Link href="/masuk" className="font-semibold text-tinta-800 underline underline-offset-4">
          Kembali ke halaman masuk
        </Link>
      </p>
    </div>
  );
}
