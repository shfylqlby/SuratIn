import type { Metadata } from "next";
import { TriangleAlert } from "lucide-react";
import { appConfig } from "@/lib/config";

export const metadata: Metadata = { title: "Tentang" };

export default function TentangPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6 md:py-16">
      <h1 className="text-4xl font-bold text-tinta-900 sm:text-5xl">Tentang {appConfig.name}</h1>
      <p className="mt-5 text-xl text-redup">
        Warga masih harus datang ke kantor kelurahan untuk surat yang sebenarnya bisa diurus dari rumah. Bagi yang
        bekerja, lansia, atau tinggal jauh dari kantor, satu surat bisa berarti izin kerja setengah hari dan ongkos
        perjalanan.
      </p>
      <p className="mt-4 text-lg text-teks">
        Di {appConfig.name}, surat diperiksa RT/RW lalu kelurahan, diterbitkan dengan tanda tangan dan stempel digital,
        dan bisa diverifikasi siapa saja. Tersedia lima jenis surat: SKTM, Surat Keterangan Domisili, Surat Keterangan
        Penghasilan Orang Tua, Surat Pengantar SKCK, dan Surat Pengantar Izin Keramaian. Demo ini memakai dua kelurahan
        fiktif, Sidomulyo dan Karang Anyar, masing-masing dengan dua RT.
      </p>

      <section aria-labelledby="alur" className="mt-12">
        <h2 id="alur" className="text-2xl font-bold text-tinta-900">Alur dari awal sampai surat bisa dicek</h2>
        <ol className="mt-5 space-y-4 border-l-2 border-tinta-800/20 pl-6">
          {[
            ["Pengajuan", "Warga mengisi formulir dan mengunggah KTP serta KK dari ponsel."],
            ["Pemeriksaan RT/RW", "Ketua RT/RW memastikan pemohon benar warganya. Jika setuju, sistem membuat Surat Pengantar RT/RW."],
            ["Pemeriksaan kelurahan", "Petugas kelurahan memeriksa berkas dan surat pengantar RT/RW. Jika ada yang kurang, permohonan dikembalikan dengan alasan yang jelas dan diperiksa ulang mulai dari RT/RW."],
            ["Surat terbit", "PDF dibuat dengan nomor surat resmi, tanda tangan lurah, stempel kelurahan, dan kode QR. Sidik SHA-256 berkas dicatat."],
            ["Pemantauan camat", "Camat memantau beban kerja dan batas layanan tiap RT dan kelurahan lewat angka rekap, tanpa melihat data pribadi."],
            ["Verifikasi publik", "Siapa pun dapat memeriksa keaslian surat dan riwayat persetujuannya tanpa akun."],
          ].map(([t, d]) => (
            <li key={t}>
              <p className="font-semibold text-teks">{t}</p>
              <p className="text-redup">{d}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="percaya" className="mt-12">
        <h2 id="percaya" className="text-2xl font-bold text-tinta-900">Mengapa suratnya bisa dipercaya</h2>
        <ul className="mt-5 space-y-3 text-redup">
          <li>
            <span className="font-semibold text-teks">Nomor surat dari database.</span> Nomor urut diambil secara atomik
            per kelurahan per tahun, jadi dua surat tidak mungkin mendapat nomor yang sama.
          </li>
          <li>
            <span className="font-semibold text-teks">Stempel hanya setelah persetujuan terakhir.</span> Satu-satunya
            jalur yang membubuhkan tanda tangan dan stempel adalah aksi penerbitan oleh pejabat tertinggi dalam alur surat itu.
          </li>
          <li>
            <span className="font-semibold text-teks">Riwayat yang tidak bisa diubah.</span> Setiap aksi tercatat di
            jejak audit yang hanya bisa ditambah. Database menolak perubahan atau penghapusan baris.
          </li>
          <li>
            <span className="font-semibold text-teks">Sidik dokumen.</span> Hash SHA-256 dari berkas PDF final disimpan.
            Mengubah satu huruf saja membuat verifikasi gagal.
          </li>
          <li>
            <span className="font-semibold text-teks">Jenis surat baru tanpa kode baru.</span> Formulir, validasi, dan
            pemeriksaan server dibangkitkan dari skema jenis surat.
          </li>
        </ul>
      </section>

      <section aria-labelledby="batas" className="mt-12 rounded-[var(--radius-kartu)] border border-proses/35 bg-proses-50 p-6">
        <h2 id="batas" className="flex items-center gap-2 text-2xl font-bold text-teks">
          <TriangleAlert aria-hidden className="size-6 text-proses" /> Batasan prototipe
        </h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-teks">
          <li>
            Tanda tangan dan stempel di sini adalah <strong>simulasi visual ditambah hash dokumen</strong>, bukan tanda
            tangan elektronik tersertifikasi BSrE/BSSN. Surat dari prototipe ini tidak berlaku sebagai dokumen resmi.
          </li>
          <li>NIK belum dicocokkan ke Dukcapil. Seluruh data wilayah, pejabat, dan warga pada demo adalah fiktif.</li>
          <li>Lambang pada kop dan stempel adalah desain generik, bukan lambang daerah resmi.</li>
          <li>Notifikasi WhatsApp/SMS dan pembayaran belum tersedia.</li>
          <li>
            Lupa kata sandi cukup dengan email dan NIK, karena belum ada pengiriman email atau SMS. NIK bukan data rahasia,
            jadi cara ini hanya layak untuk prototipe; versi produksi perlu kode OTP ke nomor ponsel atau email.
          </li>
          <li>
            Foto KTP/KK dapat diperiksa otomatis oleh layanan AI pihak ketiga. Foto yang jelas-jelas bukan KTP/KK ditolak;
            soal kejelasan foto hanya saran. AI diminta tidak membaca data pribadi, dan RT serta kelurahan tetap memeriksa
            berkas.
          </li>
        </ul>
      </section>

      <section aria-labelledby="roadmap" className="mt-12">
        <h2 id="roadmap" className="text-2xl font-bold text-tinta-900">Rencana pengembangan</h2>
        <ol className="mt-5 grid gap-3 sm:grid-cols-2">
          {[
            ["Tanda tangan elektronik tersertifikasi", "Integrasi BSrE/BSSN sehingga PDF membawa sertifikat yang diakui hukum."],
            ["Verifikasi NIK via Dukcapil", "Data pemohon dicocokkan otomatis saat pendaftaran."],
            ["Notifikasi WhatsApp", "Kabar status langsung ke ponsel warga, tanpa perlu membuka aplikasi."],
            ["Skala kota", "Banyak kecamatan dan kelurahan, dengan panel pengelola untuk jenis surat dan akun petugas."],
          ].map(([t, d]) => (
            <li key={t} className="rounded-[var(--radius-kartu)] border border-garis bg-lembar p-4">
              <p className="font-semibold text-teks">{t}</p>
              <p className="mt-1 text-sm text-redup">{d}</p>
            </li>
          ))}
        </ol>
      </section>
    </article>
  );
}
