-- SuratIn: data referensi demo.
-- Wilayah fiktif (Kecamatan Maju Jaya: Sidomulyo & Karang Anyar), unit RT, dan 4 jenis surat lain
-- dibuat oleh migrasi 20261015000102. File ini hanya menambahkan SKTM (skema lama dipertahankan).
-- Akun demo, permohonan contoh, dan surat terbit dibuat oleh `npm run seed:demo`.

insert into public.letter_types
  (kode, nama, deskripsi, kode_klasifikasi, requires_camat, requires_rt, output_kind, template_key, urutan, form_schema, required_documents)
values
(
  'sktm',
  'Surat Keterangan Tidak Mampu',
  'Untuk keringanan biaya sekolah, berobat, atau mendaftar bantuan sosial.',
  '460', false, true, 'surat_keterangan', 'sktm', 1,
  '{
    "fields": [
      {"key":"nama","label":"Nama lengkap","type":"text","required":true,"prefill":"profile.nama","readonly":true},
      {"key":"nik","label":"NIK","type":"text","required":true,"prefill":"profile.nik","readonly":true},
      {"key":"ttl","label":"Tempat, tanggal lahir","type":"text","required":true,"prefill":"profile.ttl","placeholder":"Sidomulyo, 17 Agustus 1985"},
      {"key":"pekerjaan","label":"Pekerjaan","type":"text","required":true,"prefill":"profile.pekerjaan"},
      {"key":"alamat","label":"Alamat lengkap","type":"textarea","required":true,"prefill":"profile.alamat","hint":"Tulis nama jalan dan nomor rumah."},
      {"key":"kecamatan","label":"Kecamatan","type":"text","required":true,"prefill":"profile.kecamatan","readonly":true},
      {"key":"penghasilan","label":"Penghasilan per bulan (Rp)","type":"currency","required":true,"min":0},
      {"key":"tanggungan","label":"Jumlah tanggungan","type":"number","required":true,"min":0,"max":20,"hint":"Jumlah anggota keluarga yang Anda biayai."},
      {"key":"keperluan","label":"Keperluan surat","type":"select","options":["Pendidikan","Kesehatan","Bantuan sosial","Lainnya"],"required":true}
    ]
  }'::jsonb,
  '[{"kind":"ktp","label":"Foto KTP"},{"kind":"kk","label":"Foto Kartu Keluarga"}]'::jsonb
)
on conflict (kode) do nothing;
