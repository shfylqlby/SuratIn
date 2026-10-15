-- SuratKu: Row Level Security, hak akses tabel, dan Storage

alter table public.regions_kecamatan enable row level security;
alter table public.regions_kelurahan enable row level security;
alter table public.profiles enable row level security;
alter table public.letter_types enable row level security;
alter table public.letter_requests enable row level security;
alter table public.request_documents enable row level security;
alter table public.approvals enable row level security;
alter table public.letters enable row level security;
alter table public.letter_counters enable row level security;

-- Aplikasi tidak pernah menulis langsung ke tabel; semua lewat fungsi.
revoke insert, update, delete, truncate on all tables in schema public from anon, authenticated;
revoke all on public.letter_counters from anon, authenticated;
revoke all on public.letters from anon;
revoke all on public.approvals from anon;
revoke all on public.request_documents from anon;
revoke all on public.letter_requests from anon;
revoke all on public.profiles from anon;

-- Warga hanya boleh mengubah kolom profil yang aman (bukan role/nik/wilayah).
grant update (nama, tempat_lahir, tanggal_lahir, alamat, pekerjaan) on public.profiles to authenticated;

-- Wilayah & jenis surat: data referensi publik
create policy "wilayah kecamatan terbaca" on public.regions_kecamatan for select to anon, authenticated using (true);
create policy "wilayah kelurahan terbaca" on public.regions_kelurahan for select to anon, authenticated using (true);
create policy "jenis surat aktif terbaca" on public.letter_types for select to anon, authenticated using (is_active);

-- Profil
create policy "profil sendiri" on public.profiles for select to authenticated
  using (id = auth.uid());
create policy "profil pemohon di wilayah staf" on public.profiles for select to authenticated
  using (exists (
    select 1 from public.letter_requests r
    where r.applicant_id = profiles.id and public.can_access_request(r.id)
  ));
create policy "ubah profil sendiri" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- Permohonan
create policy "permohonan sesuai peran" on public.letter_requests for select to authenticated
  using (public.can_access_request(id));

create policy "berkas sesuai permohonan" on public.request_documents for select to authenticated
  using (public.can_access_request(request_id));

-- Audit trail: hanya baca; INSERT lewat fungsi security definer, tidak ada UPDATE/DELETE.
create policy "riwayat sesuai permohonan" on public.approvals for select to authenticated
  using (public.can_access_request(request_id));

create policy "surat milik sendiri / wilayah" on public.letters for select to authenticated
  using (public.can_access_request(request_id));

-- Storage ------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('requests', 'requests', false, 3145728, array['image/jpeg', 'image/png', 'application/pdf']),
  ('letters', 'letters', false, 5242880, array['application/pdf'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Warga boleh mengunggah ke folder permohonan baru (belum ada) atau miliknya yang sedang ditolak.
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
        where r.id = (select id from folder) and r.applicant_id = auth.uid() and r.status = 'ditolak'
      )
    );
$$;

create policy "unggah berkas permohonan" on storage.objects for insert to authenticated
  with check (bucket_id = 'requests' and public.can_upload_request_file(name));

create policy "baca berkas permohonan" on storage.objects for select to authenticated
  using (
    bucket_id = 'requests'
    and (
      owner_id = auth.uid()::text
      or public.can_access_request(public.try_uuid(split_part(name, '/', 1)))
    )
  );

create policy "baca pdf surat" on storage.objects for select to authenticated
  using (
    bucket_id = 'letters'
    and exists (
      select 1 from public.letters l
      where l.pdf_path = storage.objects.name and public.can_access_request(l.request_id)
    )
  );

-- Hak eksekusi fungsi ------------------------------------------------------
revoke execute on all functions in schema public from public, anon, authenticated;

grant execute on function public.try_uuid(text) to anon, authenticated;
grant execute on function public.can_access_request(uuid) to authenticated;
grant execute on function public.can_upload_request_file(text) to authenticated;
grant execute on function public.submit_request(uuid, uuid, jsonb, jsonb) to authenticated;
grant execute on function public.resubmit_request(uuid, jsonb, jsonb, text) to authenticated;
grant execute on function public.cancel_request(uuid) to authenticated;
grant execute on function public.reject_request(uuid, text) to authenticated;
grant execute on function public.forward_to_camat(uuid, text) to authenticated;

grant execute on function public.next_letter_number(uuid, int) to service_role;
grant execute on function public.begin_issue(uuid, uuid) to service_role;
grant execute on function public.finalize_issue(uuid, uuid, text, text, text, text, text) to service_role;

-- Trigger function dipanggil oleh auth (supabase_auth_admin)
grant execute on function public.handle_new_user() to supabase_auth_admin;

alter default privileges in schema public revoke execute on functions from public, anon, authenticated;
