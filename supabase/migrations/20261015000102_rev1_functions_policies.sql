-- Revisi 1 (3/3): alur Warga -> RT/RW -> Kelurahan -> Terbit, RLS baru, dan data referensi.
-- Camat tidak lagi ada di alur dan tidak membaca tabel mentah (hanya agregat lewat server).

-- =============================================================================
-- Data referensi: wilayah fiktif (id lama dipertahankan agar FK tetap utuh)
-- =============================================================================
insert into public.regions_kecamatan (id, nama, kode, alamat_kantor, nama_camat, nip_camat) values
  ('0b1f0000-0000-4000-8000-000000000001', 'Maju Jaya', 'KEC-MJY', 'Jl. Merdeka No. 1, Kecamatan Maju Jaya',
   'Drs. Hendra Wijaya, M.Si.', '197203141998031004')
on conflict (id) do update set nama = excluded.nama, kode = excluded.kode, alamat_kantor = excluded.alamat_kantor,
  nama_camat = excluded.nama_camat, nip_camat = excluded.nip_camat;

insert into public.regions_kelurahan (id, kecamatan_id, nama, kode, alamat_kantor, kop_nama_lurah, nip_lurah) values
  ('0b1f0000-0000-4000-8000-000000000011', '0b1f0000-0000-4000-8000-000000000001', 'Sidomulyo', 'KEL-SDM',
   'Jl. Melati No. 12, Kelurahan Sidomulyo', 'Rina Marlina, S.Sos.', '198105222009012003'),
  ('0b1f0000-0000-4000-8000-000000000012', '0b1f0000-0000-4000-8000-000000000001', 'Karang Anyar', 'KEL-KRA',
   'Jl. Kenanga No. 40, Kelurahan Karang Anyar', 'Muhammad Ridwan, S.E.', '197908112006041011')
on conflict (id) do update set nama = excluded.nama, kode = excluded.kode, alamat_kantor = excluded.alamat_kantor,
  kop_nama_lurah = excluded.kop_nama_lurah, nip_lurah = excluded.nip_lurah;

insert into public.rt_units (id, kelurahan_id, rw_no, rt_no) values
  ('0b1f0000-0000-4000-8000-000000000101', '0b1f0000-0000-4000-8000-000000000011', '01', '01'),
  ('0b1f0000-0000-4000-8000-000000000102', '0b1f0000-0000-4000-8000-000000000011', '01', '02'),
  ('0b1f0000-0000-4000-8000-000000000103', '0b1f0000-0000-4000-8000-000000000012', '02', '03'),
  ('0b1f0000-0000-4000-8000-000000000104', '0b1f0000-0000-4000-8000-000000000012', '02', '04')
on conflict (id) do nothing;

-- =============================================================================
-- Jenis surat (5 jenis). Baris lama 'pengantar-skck' dinonaktifkan, tidak dihapus.
-- =============================================================================
update public.letter_types set is_active = false where kode = 'pengantar-skck';

update public.letter_types set
  deskripsi = 'Untuk keringanan biaya sekolah, berobat, atau mendaftar bantuan sosial.',
  kode_klasifikasi = '460', output_kind = 'surat_keterangan', requires_rt = true, addressee = null,
  template_key = 'sktm', urutan = 1, is_active = true
where kode = 'sktm';

insert into public.letter_types
  (kode, nama, deskripsi, kode_klasifikasi, requires_camat, requires_rt, output_kind, addressee, template_key, urutan, form_schema, required_documents)
values
(
  'domisili', 'Surat Keterangan Domisili',
  'Bukti bahwa Anda tinggal di wilayah kelurahan ini, misalnya untuk bank, sekolah, atau pekerjaan.',
  '470', false, true, 'surat_keterangan', null, 'domisili', 2,
  '{"fields": [
    {"key":"nama","label":"Nama lengkap","type":"text","required":true,"prefill":"profile.nama","readonly":true},
    {"key":"nik","label":"NIK","type":"text","required":true,"prefill":"profile.nik","readonly":true},
    {"key":"ttl","label":"Tempat, tanggal lahir","type":"text","required":true,"prefill":"profile.ttl","placeholder":"Sidomulyo, 17 Agustus 1985"},
    {"key":"jenis_kelamin","label":"Jenis kelamin","type":"select","required":true,"options":["Laki-laki","Perempuan"]},
    {"key":"pekerjaan","label":"Pekerjaan","type":"text","required":true,"prefill":"profile.pekerjaan"},
    {"key":"alamat","label":"Alamat tinggal sekarang","type":"textarea","required":true,"prefill":"profile.alamat","hint":"Tulis nama jalan dan nomor rumah."},
    {"key":"kecamatan","label":"Kecamatan","type":"text","required":true,"prefill":"profile.kecamatan","readonly":true},
    {"key":"lama_tinggal","label":"Lama tinggal (tahun)","type":"number","required":true,"min":0,"max":100},
    {"key":"keperluan","label":"Keperluan surat","type":"select","required":true,"options":["Perbankan","Pendidikan","Pekerjaan","Administrasi","Lainnya"]}
  ]}'::jsonb,
  '[{"kind":"ktp","label":"Foto KTP"},{"kind":"kk","label":"Foto Kartu Keluarga"}]'::jsonb
),
(
  'penghasilan_ortu', 'Surat Keterangan Penghasilan Orang Tua',
  'Untuk pengajuan keringanan UKT atau beasiswa mahasiswa. Diajukan oleh orang tua.',
  '470', false, true, 'surat_keterangan', null, 'penghasilan_ortu', 3,
  '{"fields": [
    {"key":"nama","label":"Nama orang tua (pemohon)","type":"text","required":true,"prefill":"profile.nama","readonly":true},
    {"key":"nik","label":"NIK orang tua","type":"text","required":true,"prefill":"profile.nik","readonly":true},
    {"key":"pekerjaan","label":"Pekerjaan orang tua","type":"text","required":true,"prefill":"profile.pekerjaan"},
    {"key":"penghasilan","label":"Penghasilan per bulan (Rp)","type":"currency","required":true,"min":0},
    {"key":"alamat","label":"Alamat orang tua","type":"textarea","required":true,"prefill":"profile.alamat"},
    {"key":"kecamatan","label":"Kecamatan","type":"text","required":true,"prefill":"profile.kecamatan","readonly":true},
    {"key":"nama_mahasiswa","label":"Nama mahasiswa","type":"text","required":true},
    {"key":"nim","label":"NIM","type":"text","required":true},
    {"key":"kampus","label":"Perguruan tinggi","type":"text","required":true},
    {"key":"prodi","label":"Program studi","type":"text","required":true},
    {"key":"keperluan","label":"Keperluan surat","type":"select","required":true,"options":["Keringanan UKT","Beasiswa","Lainnya"]},
    {"key":"nama_beasiswa","label":"Nama beasiswa","type":"text","required":false,"hint":"Isi jika keperluannya beasiswa."}
  ]}'::jsonb,
  '[{"kind":"ktp","label":"Foto KTP orang tua"},{"kind":"kk","label":"Foto Kartu Keluarga"}]'::jsonb
),
(
  'skck', 'Surat Pengantar SKCK',
  'Pengantar dari kelurahan untuk mengurus SKCK di kepolisian.',
  '330', false, true, 'surat_pengantar',
  '{"kepada":"Kepala Kepolisian Sektor/Resor setempat","di":"Tempat"}'::jsonb, 'pengantar_skck', 4,
  '{"fields": [
    {"key":"nama","label":"Nama lengkap","type":"text","required":true,"prefill":"profile.nama","readonly":true},
    {"key":"nik","label":"NIK","type":"text","required":true,"prefill":"profile.nik","readonly":true},
    {"key":"ttl","label":"Tempat, tanggal lahir","type":"text","required":true,"prefill":"profile.ttl","placeholder":"Sidomulyo, 17 Agustus 1985"},
    {"key":"jenis_kelamin","label":"Jenis kelamin","type":"select","required":true,"options":["Laki-laki","Perempuan"]},
    {"key":"agama","label":"Agama","type":"select","required":true,"options":["Islam","Kristen","Katolik","Hindu","Buddha","Konghucu"]},
    {"key":"status_perkawinan","label":"Status perkawinan","type":"select","required":true,"options":["Belum kawin","Kawin","Cerai hidup","Cerai mati"]},
    {"key":"pekerjaan","label":"Pekerjaan","type":"text","required":true,"prefill":"profile.pekerjaan"},
    {"key":"alamat","label":"Alamat lengkap","type":"textarea","required":true,"prefill":"profile.alamat"},
    {"key":"kecamatan","label":"Kecamatan","type":"text","required":true,"prefill":"profile.kecamatan","readonly":true},
    {"key":"keperluan","label":"Keperluan SKCK","type":"select","required":true,"options":["Melamar kerja","CPNS","Pendidikan","Lainnya"]},
    {"key":"instansi_tujuan","label":"Instansi tujuan","type":"text","required":false,"placeholder":"PT Maju Bersama"}
  ]}'::jsonb,
  '[{"kind":"ktp","label":"Foto KTP"},{"kind":"kk","label":"Foto Kartu Keluarga"},{"kind":"pendukung","label":"Pas foto","optional":true}]'::jsonb
),
(
  'izin_keramaian', 'Surat Pengantar Izin Keramaian',
  'Pengantar ke kepolisian untuk acara yang mengundang banyak orang. Ajukan paling lambat 3 hari sebelum acara.',
  '300', false, true, 'surat_pengantar',
  '{"kepada":"Kepala Kepolisian Sektor setempat","di":"Tempat"}'::jsonb, 'pengantar_keramaian', 5,
  '{"fields": [
    {"key":"nama","label":"Nama pemohon","type":"text","required":true,"prefill":"profile.nama","readonly":true},
    {"key":"nik","label":"NIK pemohon","type":"text","required":true,"prefill":"profile.nik","readonly":true},
    {"key":"alamat","label":"Alamat pemohon","type":"textarea","required":true,"prefill":"profile.alamat"},
    {"key":"kecamatan","label":"Kecamatan","type":"text","required":true,"prefill":"profile.kecamatan","readonly":true},
    {"key":"jenis_acara","label":"Jenis acara","type":"select","required":true,"options":["Pernikahan","Khitanan","Syukuran","Hiburan","Lainnya"]},
    {"key":"nama_acara","label":"Nama acara","type":"text","required":true,"placeholder":"Resepsi pernikahan Andi dan Sari"},
    {"key":"tanggal_acara","label":"Tanggal acara","type":"date","required":true,"minDaysAhead":3,"hint":"Paling cepat 3 hari dari hari ini."},
    {"key":"jam_mulai","label":"Jam mulai","type":"time","required":true},
    {"key":"jam_selesai","label":"Jam selesai","type":"time","required":true,"after":"jam_mulai"},
    {"key":"lokasi","label":"Lokasi acara","type":"textarea","required":true},
    {"key":"nama_jalan","label":"Nama jalan","type":"text","required":true},
    {"key":"penggunaan_jalan","label":"Penggunaan jalan","type":"select","required":true,"options":["Tidak menggunakan jalan","Sebagian badan jalan","Penutupan total"]},
    {"key":"perkiraan_tamu","label":"Perkiraan jumlah tamu","type":"number","required":true,"min":1,"max":100000},
    {"key":"hiburan","label":"Hiburan","type":"select","required":true,"options":["Tidak ada","Organ tunggal","Sound system","Band","Lainnya"]},
    {"key":"penanggung_jawab","label":"Nama penanggung jawab","type":"text","required":true,"prefill":"profile.nama"},
    {"key":"no_hp","label":"Nomor HP penanggung jawab","type":"phone","required":true,"placeholder":"081234567890"}
  ]}'::jsonb,
  '[{"kind":"ktp","label":"Foto KTP penanggung jawab"},{"kind":"kk","label":"Foto Kartu Keluarga","optional":true}]'::jsonb
)
on conflict (kode) do update set
  nama = excluded.nama, deskripsi = excluded.deskripsi, kode_klasifikasi = excluded.kode_klasifikasi,
  requires_rt = excluded.requires_rt, output_kind = excluded.output_kind, addressee = excluded.addressee,
  template_key = excluded.template_key, urutan = excluded.urutan, form_schema = excluded.form_schema,
  required_documents = excluded.required_documents, is_active = true;

-- =============================================================================
-- Pemetaan status lama (data demo akan di-reset, ini hanya jaring pengaman)
-- =============================================================================
alter table public.letter_requests disable trigger letter_requests_final_status;
update public.letter_requests set status = 'menunggu_rt' where status = 'diajukan';
update public.letter_requests set status = 'menunggu_kelurahan' where status = 'menunggu_camat';
update public.letter_requests set status = 'ditolak_kelurahan' where status = 'ditolak';
update public.letter_requests set stage_entered_at = coalesce(updated_at, now());
alter table public.letter_requests enable trigger letter_requests_final_status;
alter table public.letter_requests alter column status set default 'menunggu_rt';

-- =============================================================================
-- Helper peran (security definer: tidak memicu rekursi policy pada profiles)
-- =============================================================================
create or replace function public.can_access_request(p_request_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from public.letter_requests r
    join public.profiles p on p.id = auth.uid()
    where r.id = p_request_id
      and (
        r.applicant_id = p.id
        or (p.role = 'rt_rw' and p.rt_unit_id is not null and r.rt_unit_id = p.rt_unit_id)
        or (
          p.role = 'admin_kelurahan'
          and r.kelurahan_id = p.kelurahan_id
          and r.status in ('menunggu_kelurahan', 'ditolak_kelurahan', 'terbit')
        )
        or p.role = 'super_admin'
      )
  );
$$;

-- Registrasi: peran SELALU warga; RT hanya diterima jika memang milik kelurahan yang dipilih.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_kel uuid := public.try_uuid(meta->>'kelurahan_id');
  v_rt uuid;
begin
  select u.id into v_rt from public.rt_units u
    where u.id = public.try_uuid(meta->>'rt_unit_id') and u.kelurahan_id = v_kel;
  insert into public.profiles (id, role, nama, email, nik, kelurahan_id, rt_unit_id)
  values (
    new.id,
    'warga',
    coalesce(nullif(trim(meta->>'nama'), ''), split_part(new.email, '@', 1)),
    new.email,
    nullif(meta->>'nik', ''),
    v_kel,
    v_rt
  );
  return new;
end;
$$;

-- Validasi isian (lapisan kedua setelah Zod): kini mengenal date, time, phone,
-- minDaysAhead (tanggal minimal H+n dalam WIB) dan after (jam harus setelah isian lain).
create or replace function public.validate_form(p_schema jsonb, p_form jsonb)
returns void language plpgsql stable set search_path = public as $$
declare
  f jsonb;
  k text;
  v text;
  other text;
  allowed text[];
  today_wib date := (now() at time zone 'Asia/Jakarta')::date;
begin
  if jsonb_typeof(p_form) <> 'object' then
    raise exception 'Isian formulir tidak valid' using errcode = '22023';
  end if;

  select coalesce(array_agg(x->>'key'), '{}') into allowed
  from jsonb_array_elements(p_schema->'fields') x;

  for k in select jsonb_object_keys(p_form) loop
    if not k = any(allowed) then
      raise exception 'Isian "%" tidak dikenal', k using errcode = '22023';
    end if;
  end loop;

  for f in select * from jsonb_array_elements(p_schema->'fields') loop
    v := p_form->>(f->>'key');
    if coalesce((f->>'required')::boolean, false) and (v is null or btrim(v) = '') then
      raise exception '% wajib diisi', f->>'label' using errcode = '22023';
    end if;
    continue when v is null or btrim(v) = '';
    if length(v) > 2000 then
      raise exception '% terlalu panjang', f->>'label' using errcode = '22023';
    end if;
    if f->>'type' in ('number', 'currency') then
      if v !~ '^[0-9]+$' then
        raise exception '% harus berupa angka', f->>'label' using errcode = '22023';
      end if;
      if f ? 'min' and v::numeric < (f->>'min')::numeric then
        raise exception '% terlalu kecil', f->>'label' using errcode = '22023';
      end if;
      if f ? 'max' and v::numeric > (f->>'max')::numeric then
        raise exception '% terlalu besar', f->>'label' using errcode = '22023';
      end if;
    end if;
    if f->>'type' = 'select' and not (f->'options' ? v) then
      raise exception 'Pilihan % tidak valid', f->>'label' using errcode = '22023';
    end if;
    if f->>'type' = 'date' then
      if v !~ '^\d{4}-\d{2}-\d{2}$' or public.try_date(v) is null then
        raise exception '% tidak valid', f->>'label' using errcode = '22023';
      end if;
      if f ? 'minDaysAhead' and v::date < today_wib + (f->>'minDaysAhead')::int then
        raise exception 'Pengajuan izin keramaian minimal % hari sebelum acara.', f->>'minDaysAhead' using errcode = '22023';
      end if;
    end if;
    if f->>'type' = 'time' then
      if v !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then
        raise exception '% tidak valid', f->>'label' using errcode = '22023';
      end if;
      if f ? 'after' then
        other := p_form->>(f->>'after');
        if other is not null and v <= other then
          raise exception '% harus setelah jam mulai', f->>'label' using errcode = '22023';
        end if;
      end if;
    end if;
    if f->>'type' = 'phone' and v !~ '^\+?[0-9]{9,15}$' then
      raise exception '% tidak valid', f->>'label' using errcode = '22023';
    end if;
  end loop;
end;
$$;

create or replace function public.try_date(p text)
returns date language plpgsql immutable as $$
begin
  return p::date;
exception when others then
  return null;
end;
$$;

-- Melampirkan berkas. Berkas dengan "optional": true pada required_documents tidak wajib.
-- Hasil cek AI yang sudah ada (ai_document_checks) disalin ke baris berkas.
create or replace function public.attach_documents(p_request_id uuid, p_required jsonb, p_docs jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare
  d jsonb;
  req jsonb;
  v_kind public.document_kind;
  v_path text;
  v_ai public.ai_document_checks;
begin
  if p_docs is null then
    p_docs := '[]'::jsonb;
  end if;
  if jsonb_typeof(p_docs) <> 'array' or jsonb_array_length(p_docs) > 10 then
    raise exception 'Daftar berkas tidak valid' using errcode = '22023';
  end if;

  for d in select * from jsonb_array_elements(p_docs) loop
    v_kind := (d->>'kind')::public.document_kind;
    v_path := d->>'storage_path';

    if v_path is null or v_path not like p_request_id::text || '/%' then
      raise exception 'Lokasi berkas tidak valid' using errcode = '22023';
    end if;
    if d->>'mime' not in ('image/jpeg', 'image/png', 'application/pdf') then
      raise exception 'Format berkas harus JPG, PNG, atau PDF' using errcode = '22023';
    end if;
    if not exists (
      select 1 from storage.objects o
      where o.bucket_id = 'requests' and o.name = v_path and o.owner_id = auth.uid()::text
    ) then
      raise exception 'Berkas belum terunggah' using errcode = '22023';
    end if;

    if v_kind <> 'pendukung' then
      update public.request_documents
        set is_current = false
        where request_id = p_request_id and kind = v_kind and is_current;
    end if;

    select * into v_ai from public.ai_document_checks
      where storage_path = v_path and user_id = auth.uid();

    insert into public.request_documents
      (request_id, kind, storage_path, file_name, mime, size_bytes, ai_status, ai_result, ai_checked_at)
    values (
      p_request_id, v_kind, v_path, left(coalesce(d->>'file_name', 'berkas'), 120), d->>'mime', (d->>'size_bytes')::int,
      coalesce(v_ai.ai_status, 'belum_diperiksa'), v_ai.ai_result, v_ai.checked_at
    );
  end loop;

  for req in select * from jsonb_array_elements(p_required) loop
    continue when coalesce((req->>'optional')::boolean, false);
    if not exists (
      select 1 from public.request_documents
      where request_id = p_request_id and kind = (req->>'kind')::public.document_kind and is_current
    ) then
      raise exception '% wajib diunggah', req->>'label' using errcode = '22023';
    end if;
  end loop;
end;
$$;

-- =============================================================================
-- Aksi warga
-- =============================================================================
create or replace function public.submit_request(p_id uuid, p_type_id uuid, p_form jsonb, p_docs jsonb)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_prof public.profiles;
  v_type public.letter_types;
  v_form jsonb;
  v_ticket text;
begin
  select * into v_prof from public.profiles where id = auth.uid();
  if v_prof.id is null or v_prof.role <> 'warga' then
    raise exception 'Hanya warga yang dapat mengajukan surat' using errcode = '42501';
  end if;
  if v_prof.kelurahan_id is null or v_prof.rt_unit_id is null then
    raise exception 'Akun Anda belum terhubung ke kelurahan dan RT/RW. Hubungi kantor kelurahan.' using errcode = '22023';
  end if;
  if not exists (select 1 from public.rt_units u where u.id = v_prof.rt_unit_id and u.kelurahan_id = v_prof.kelurahan_id) then
    raise exception 'RT/RW akun Anda tidak cocok dengan kelurahannya' using errcode = '22023';
  end if;

  select * into v_type from public.letter_types where id = p_type_id and is_active;
  if v_type.id is null then
    raise exception 'Jenis surat tidak tersedia' using errcode = '22023';
  end if;

  v_form := public.apply_profile_prefill(v_type.form_schema, p_form, v_prof);
  perform public.validate_form(v_type.form_schema, v_form);

  v_ticket := 'REQ-' || extract(year from now())::int || '-' || lpad(nextval('public.ticket_seq')::text, 6, '0');

  -- Snapshot kelurahan + unit RT dari profil (warga tidak bisa memilih unit lain).
  insert into public.letter_requests
    (id, ticket_no, type_id, applicant_id, kelurahan_id, rt_unit_id, status, form_data, stage_entered_at)
  values (p_id, v_ticket, v_type.id, v_prof.id, v_prof.kelurahan_id, v_prof.rt_unit_id, 'menunggu_rt', v_form, now());

  perform public.attach_documents(p_id, v_type.required_documents, p_docs);
  perform public.log_approval(p_id, v_prof, 'submit', null, null, 'menunggu_rt');
  return v_ticket;
end;
$$;

-- K10: penolakan dari RT maupun kelurahan kembali ke tahap RT.
create or replace function public.resubmit_request(p_id uuid, p_form jsonb, p_docs jsonb, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_prof public.profiles;
  v_req public.letter_requests;
  v_type public.letter_types;
  v_form jsonb;
begin
  select * into v_prof from public.profiles where id = auth.uid();
  select * into v_req from public.letter_requests where id = p_id for update;
  if v_req.id is null or v_prof.id is null or v_req.applicant_id <> v_prof.id then
    raise exception 'Permohonan tidak ditemukan' using errcode = '42501';
  end if;
  if v_req.status not in ('ditolak_rt', 'ditolak_kelurahan', 'ditolak') then
    raise exception 'Hanya permohonan yang ditolak yang dapat diajukan ulang' using errcode = '22023';
  end if;

  select * into v_type from public.letter_types where id = v_req.type_id;
  v_form := public.apply_profile_prefill(v_type.form_schema, p_form, v_prof);
  perform public.validate_form(v_type.form_schema, v_form);

  update public.letter_requests
    set form_data = v_form, status = 'menunggu_rt', stage_entered_at = now(), updated_at = now(),
        rt_unit_id = coalesce(rt_unit_id, v_prof.rt_unit_id)
    where id = p_id and status = v_req.status;

  -- Surat pengantar RT lama tidak berlaku lagi; RT membuat yang baru dari data final.
  delete from public.rt_letters where request_id = p_id;

  perform public.attach_documents(p_id, v_type.required_documents, p_docs);
  perform public.log_approval(p_id, v_prof, 'resubmit', p_note, v_req.status, 'menunggu_rt');
end;
$$;

create or replace function public.cancel_request(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_prof public.profiles;
  v_req public.letter_requests;
begin
  select * into v_prof from public.profiles where id = auth.uid();
  select * into v_req from public.letter_requests where id = p_id for update;
  if v_req.id is null or v_prof.id is null or v_req.applicant_id <> v_prof.id then
    raise exception 'Permohonan tidak ditemukan' using errcode = '42501';
  end if;
  if v_req.status not in ('menunggu_rt', 'ditolak_rt', 'ditolak_kelurahan', 'diajukan', 'ditolak') then
    raise exception 'Permohonan ini tidak dapat dibatalkan' using errcode = '22023';
  end if;

  update public.letter_requests set status = 'dibatalkan', stage_entered_at = now(), updated_at = now()
    where id = p_id and status = v_req.status;
  perform public.log_approval(p_id, v_prof, 'cancel', null, v_req.status, 'dibatalkan');
end;
$$;

-- =============================================================================
-- Aksi petugas (RT/RW dan admin kelurahan)
-- =============================================================================
create or replace function public.staff_can_act(p_prof public.profiles, p_req public.letter_requests)
returns boolean language sql stable security definer set search_path = public as $$
  select case
    when p_prof.role = 'rt_rw' then
      p_req.status = 'menunggu_rt' and p_prof.rt_unit_id is not null and p_req.rt_unit_id = p_prof.rt_unit_id
    when p_prof.role = 'admin_kelurahan' then
      p_req.status = 'menunggu_kelurahan' and p_req.kelurahan_id = p_prof.kelurahan_id
    else false
  end;
$$;

-- Tolak: RT (menunggu_rt -> ditolak_rt) atau kelurahan (menunggu_kelurahan -> ditolak_kelurahan).
create or replace function public.reject_request(p_id uuid, p_note text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_prof public.profiles;
  v_req public.letter_requests;
  v_to public.request_status;
  v_action public.approval_action;
  v_rows int;
begin
  select * into v_prof from public.profiles where id = auth.uid();
  select * into v_req from public.letter_requests where id = p_id for update;
  if v_req.id is null or v_prof.id is null or not public.staff_can_act(v_prof, v_req) then
    raise exception 'Anda tidak berwenang menolak permohonan ini' using errcode = '42501';
  end if;
  if p_note is null or length(btrim(p_note)) < 10 then
    raise exception 'Catatan penolakan minimal 10 karakter' using errcode = '22023';
  end if;

  if v_prof.role = 'rt_rw' then
    v_to := 'ditolak_rt';
    v_action := 'reject_rt';
  else
    v_to := 'ditolak_kelurahan';
    v_action := 'reject_kelurahan';
  end if;

  update public.letter_requests
    set status = v_to, reject_reason = btrim(p_note), stage_entered_at = now(), updated_at = now()
    where id = p_id and status = v_req.status;
  get diagnostics v_rows = row_count;
  if v_rows = 0 then
    raise exception 'Permohonan sudah diproses pihak lain' using errcode = '22023';
  end if;
  perform public.log_approval(p_id, v_prof, v_action, p_note, v_req.status, v_to);
end;
$$;

-- Persetujuan RT (hanya service_role, setelah PDF pengantar terunggah) -----------
create or replace function public.begin_rt_approval(p_request_id uuid, p_actor_id uuid)
returns int language plpgsql security definer set search_path = public as $$
declare
  v_prof public.profiles;
  v_req public.letter_requests;
begin
  select * into v_prof from public.profiles where id = p_actor_id;
  select * into v_req from public.letter_requests where id = p_request_id;
  if v_req.id is null or v_prof.id is null or v_prof.role <> 'rt_rw' or not public.staff_can_act(v_prof, v_req) then
    raise exception 'Anda tidak berwenang menyetujui permohonan ini' using errcode = '42501';
  end if;
  return public.next_rt_letter_number(v_req.rt_unit_id, extract(year from now() at time zone 'Asia/Jakarta')::int);
end;
$$;

create or replace function public.finalize_rt_approval(
  p_request_id uuid, p_actor_id uuid, p_letter_no text, p_pdf_path text, p_sha256 text, p_note text default null
) returns public.rt_letters
language plpgsql security definer set search_path = public as $$
declare
  v_prof public.profiles;
  v_req public.letter_requests;
  v_letter public.rt_letters;
  v_rows int;
begin
  select * into v_prof from public.profiles where id = p_actor_id;
  select * into v_req from public.letter_requests where id = p_request_id for update;
  if v_req.id is null or v_prof.id is null or v_prof.role <> 'rt_rw' or not public.staff_can_act(v_prof, v_req) then
    raise exception 'Permohonan sudah diproses pihak lain' using errcode = '22023';
  end if;

  update public.letter_requests
    set status = 'menunggu_kelurahan', reject_reason = null, stage_entered_at = now(), updated_at = now()
    where id = p_request_id and status = 'menunggu_rt';
  get diagnostics v_rows = row_count;
  if v_rows = 0 then
    raise exception 'Permohonan sudah diproses pihak lain' using errcode = '22023';
  end if;

  delete from public.rt_letters where request_id = p_request_id;
  insert into public.rt_letters (request_id, rt_unit_id, letter_no, pdf_path, sha256, issued_by)
  values (p_request_id, v_req.rt_unit_id, p_letter_no, p_pdf_path, lower(p_sha256), v_prof.id)
  returning * into v_letter;

  perform public.log_approval(p_request_id, v_prof, 'approve_rt', p_note, 'menunggu_rt', 'menunggu_kelurahan');
  return v_letter;
end;
$$;

-- Penerbitan oleh admin kelurahan (hanya service_role) -------------------------
create or replace function public.begin_issue(p_request_id uuid, p_actor_id uuid)
returns int language plpgsql security definer set search_path = public as $$
declare
  v_prof public.profiles;
  v_req public.letter_requests;
begin
  select * into v_prof from public.profiles where id = p_actor_id;
  select * into v_req from public.letter_requests where id = p_request_id;
  if v_req.id is null or v_prof.id is null or v_prof.role <> 'admin_kelurahan' or not public.staff_can_act(v_prof, v_req) then
    raise exception 'Anda tidak berwenang menerbitkan surat ini' using errcode = '42501';
  end if;
  if not exists (select 1 from public.rt_letters where request_id = p_request_id) then
    raise exception 'Surat pengantar RT/RW belum ada' using errcode = '22023';
  end if;
  return public.next_letter_number(v_req.kelurahan_id, extract(year from now() at time zone 'Asia/Jakarta')::int);
end;
$$;

create or replace function public.finalize_issue(
  p_request_id uuid, p_actor_id uuid, p_letter_no text, p_code text, p_pdf_path text, p_sha256 text,
  p_note text default null
) returns public.letters
language plpgsql security definer set search_path = public as $$
declare
  v_prof public.profiles;
  v_req public.letter_requests;
  v_letter public.letters;
  v_rows int;
begin
  select * into v_prof from public.profiles where id = p_actor_id;
  select * into v_req from public.letter_requests where id = p_request_id for update;
  if v_req.id is null or v_prof.id is null or v_prof.role <> 'admin_kelurahan' or not public.staff_can_act(v_prof, v_req) then
    raise exception 'Permohonan sudah diproses pihak lain' using errcode = '22023';
  end if;

  update public.letter_requests
    set status = 'terbit', reject_reason = null, stage_entered_at = now(), updated_at = now()
    where id = p_request_id and status = 'menunggu_kelurahan';
  get diagnostics v_rows = row_count;
  if v_rows = 0 then
    raise exception 'Permohonan sudah diproses pihak lain' using errcode = '22023';
  end if;

  insert into public.letters (request_id, letter_no, verification_code, pdf_path, sha256, signed_by_kelurahan, signed_by_camat)
  values (p_request_id, p_letter_no, p_code, p_pdf_path, lower(p_sha256), v_prof.id, null)
  returning * into v_letter;

  perform public.log_approval(p_request_id, v_prof, 'approve_kelurahan', p_note, 'menunggu_kelurahan', 'terbit');
  perform public.log_approval(p_request_id, v_prof, 'issue', 'Nomor surat ' || p_letter_no, 'terbit', 'terbit');
  return v_letter;
end;
$$;

-- Jalur camat lama ditutup (fungsi dibiarkan, hak eksekusi dicabut).
revoke execute on function public.forward_to_camat(uuid, text) from authenticated;

-- =============================================================================
-- RLS
-- =============================================================================
create policy "surat pengantar rt sesuai permohonan" on public.rt_letters for select to authenticated
  using (public.can_access_request(request_id));

-- Upload berkas: folder permohonan baru, atau miliknya yang sedang ditolak.
create or replace function public.can_upload_request_file(p_name text)
returns boolean language sql stable security definer set search_path = public as $$
  with folder as (select public.try_uuid(split_part(p_name, '/', 1)) as id)
  select
    (select role from public.profiles where id = auth.uid()) = 'warga'
    and (select id from folder) is not null
    and (
      not exists (select 1 from public.letter_requests r where r.id = (select id from folder))
      or exists (
        select 1 from public.letter_requests r
        where r.id = (select id from folder) and r.applicant_id = auth.uid()
          and r.status in ('ditolak_rt', 'ditolak_kelurahan', 'ditolak')
      )
    );
$$;

-- PDF pengantar RT tersimpan di bucket letters dengan awalan rt/.
create policy "baca pdf pengantar rt" on storage.objects for select to authenticated
  using (
    bucket_id = 'letters'
    and exists (
      select 1 from public.rt_letters l
      where l.pdf_path = storage.objects.name and public.can_access_request(l.request_id)
    )
  );

-- =============================================================================
-- Hak eksekusi fungsi
-- =============================================================================
revoke execute on function public.try_date(text) from public, anon, authenticated;
revoke execute on function public.begin_rt_approval(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.finalize_rt_approval(uuid, uuid, text, text, text, text) from public, anon, authenticated;
grant execute on function public.begin_rt_approval(uuid, uuid) to service_role;
grant execute on function public.finalize_rt_approval(uuid, uuid, text, text, text, text) to service_role;
grant execute on function public.try_date(text) to authenticated, service_role;
