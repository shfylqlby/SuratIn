-- SuratKu: fungsi transisi status, RLS, dan storage
-- Semua perubahan status lewat fungsi di bawah ini (satu transaksi per aksi).
-- Tidak ada policy INSERT/UPDATE/DELETE langsung untuk tabel permohonan.

-- Helper -------------------------------------------------------------------
create or replace function public.try_uuid(p text)
returns uuid language plpgsql immutable as $$
begin
  return p::uuid;
exception when others then
  return null;
end;
$$;

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
        or (p.role = 'admin_kelurahan' and r.kelurahan_id = p.kelurahan_id)
        or (
          p.role = 'camat'
          and exists (
            select 1 from public.regions_kelurahan k
            where k.id = r.kelurahan_id and k.kecamatan_id = p.kecamatan_id
          )
          and (
            r.status = 'menunggu_camat'
            or exists (select 1 from public.approvals a where a.request_id = r.id and a.actor_id = p.id)
          )
        )
        or p.role = 'super_admin'
      )
  );
$$;

-- Membuat profil warga saat registrasi. Peran SELALU warga; staf diatur oleh seed/admin.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
  insert into public.profiles (id, role, nama, email, nik, kelurahan_id)
  values (
    new.id,
    'warga',
    coalesce(nullif(trim(meta->>'nama'), ''), split_part(new.email, '@', 1)),
    new.email,
    nullif(meta->>'nik', ''),
    public.try_uuid(meta->>'kelurahan_id')
  );
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Validasi isian terhadap form_schema (lapisan kedua setelah Zod di server)
create or replace function public.validate_form(p_schema jsonb, p_form jsonb)
returns void language plpgsql immutable as $$
declare
  f jsonb;
  k text;
  v text;
  allowed text[];
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
    if v is not null and length(v) > 2000 then
      raise exception '% terlalu panjang', f->>'label' using errcode = '22023';
    end if;
    if v is not null and btrim(v) <> '' and f->>'type' in ('number', 'currency') then
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
    if v is not null and f->>'type' = 'select' and not (f->'options' ? v) then
      raise exception 'Pilihan % tidak valid', f->>'label' using errcode = '22023';
    end if;
  end loop;
end;
$$;

-- Isian readonly yang berasal dari profil selalu diambil ulang dari profil.
create or replace function public.apply_profile_prefill(p_schema jsonb, p_form jsonb, p_profile public.profiles)
returns jsonb language plpgsql stable as $$
declare
  f jsonb;
  col text;
  result jsonb := p_form;
  prof jsonb := to_jsonb(p_profile);
begin
  for f in select * from jsonb_array_elements(p_schema->'fields') loop
    if coalesce((f->>'readonly')::boolean, false) and (f->>'prefill') like 'profile.%' then
      col := substring(f->>'prefill' from 9);
      if prof ? col then
        result := result || jsonb_build_object(f->>'key', prof->>col);
      end if;
    end if;
  end loop;
  return result;
end;
$$;

-- Melampirkan berkas yang sudah diunggah warga ke Storage.
create or replace function public.attach_documents(p_request_id uuid, p_required jsonb, p_docs jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare
  d jsonb;
  req jsonb;
  v_kind public.document_kind;
  v_path text;
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

    insert into public.request_documents (request_id, kind, storage_path, file_name, mime, size_bytes)
    values (p_request_id, v_kind, v_path, left(coalesce(d->>'file_name', 'berkas'), 120), d->>'mime', (d->>'size_bytes')::int);
  end loop;

  for req in select * from jsonb_array_elements(p_required) loop
    if not exists (
      select 1 from public.request_documents
      where request_id = p_request_id and kind = (req->>'kind')::public.document_kind and is_current
    ) then
      raise exception '% wajib diunggah', req->>'label' using errcode = '22023';
    end if;
  end loop;
end;
$$;

create or replace function public.log_approval(
  p_request_id uuid, p_actor public.profiles, p_action public.approval_action,
  p_note text, p_from public.request_status, p_to public.request_status
) returns void language sql security definer set search_path = public as $$
  insert into public.approvals (request_id, actor_id, actor_role, actor_nama, actor_jabatan, action, note, from_status, to_status)
  values (p_request_id, p_actor.id, p_actor.role, p_actor.nama, p_actor.jabatan, p_action, nullif(btrim(p_note), ''), p_from, p_to);
$$;

-- Aksi warga ---------------------------------------------------------------
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
  if v_prof.kelurahan_id is null then
    raise exception 'Profil belum terhubung ke kelurahan' using errcode = '22023';
  end if;

  select * into v_type from public.letter_types where id = p_type_id and is_active;
  if v_type.id is null then
    raise exception 'Jenis surat tidak tersedia' using errcode = '22023';
  end if;

  v_form := public.apply_profile_prefill(v_type.form_schema, p_form, v_prof);
  perform public.validate_form(v_type.form_schema, v_form);

  v_ticket := 'REQ-' || extract(year from now())::int || '-' || lpad(nextval('public.ticket_seq')::text, 6, '0');

  insert into public.letter_requests (id, ticket_no, type_id, applicant_id, kelurahan_id, status, form_data)
  values (p_id, v_ticket, v_type.id, v_prof.id, v_prof.kelurahan_id, 'diajukan', v_form);

  perform public.attach_documents(p_id, v_type.required_documents, p_docs);
  perform public.log_approval(p_id, v_prof, 'submit', null, null, 'diajukan');
  return v_ticket;
end;
$$;

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
  if v_req.status <> 'ditolak' then
    raise exception 'Hanya permohonan yang ditolak yang dapat diajukan ulang' using errcode = '22023';
  end if;

  select * into v_type from public.letter_types where id = v_req.type_id;
  v_form := public.apply_profile_prefill(v_type.form_schema, p_form, v_prof);
  perform public.validate_form(v_type.form_schema, v_form);

  update public.letter_requests
    set form_data = v_form, status = 'diajukan', updated_at = now()
    where id = p_id;

  perform public.attach_documents(p_id, v_type.required_documents, p_docs);
  perform public.log_approval(p_id, v_prof, 'resubmit', p_note, 'ditolak', 'diajukan');
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
  if v_req.status not in ('diajukan', 'ditolak') then
    raise exception 'Permohonan ini tidak dapat dibatalkan' using errcode = '22023';
  end if;

  update public.letter_requests set status = 'dibatalkan', updated_at = now() where id = p_id;
  perform public.log_approval(p_id, v_prof, 'cancel', null, v_req.status, 'dibatalkan');
end;
$$;

-- Aksi staf ----------------------------------------------------------------
create or replace function public.staff_can_act(p_prof public.profiles, p_req public.letter_requests)
returns boolean language sql stable security definer set search_path = public as $$
  select case
    when p_prof.role = 'admin_kelurahan' then
      p_req.status = 'diajukan' and p_req.kelurahan_id = p_prof.kelurahan_id
    when p_prof.role = 'camat' then
      p_req.status = 'menunggu_camat'
      and exists (
        select 1 from public.regions_kelurahan k
        where k.id = p_req.kelurahan_id and k.kecamatan_id = p_prof.kecamatan_id
      )
    else false
  end;
$$;

create or replace function public.reject_request(p_id uuid, p_note text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_prof public.profiles;
  v_req public.letter_requests;
begin
  select * into v_prof from public.profiles where id = auth.uid();
  select * into v_req from public.letter_requests where id = p_id for update;
  if v_req.id is null or v_prof.id is null or not public.staff_can_act(v_prof, v_req) then
    raise exception 'Anda tidak berwenang menolak permohonan ini' using errcode = '42501';
  end if;
  if p_note is null or length(btrim(p_note)) < 10 then
    raise exception 'Catatan penolakan minimal 10 karakter' using errcode = '22023';
  end if;

  update public.letter_requests
    set status = 'ditolak', reject_reason = btrim(p_note), updated_at = now()
    where id = p_id;
  perform public.log_approval(p_id, v_prof, 'reject', p_note, v_req.status, 'ditolak');
end;
$$;

create or replace function public.forward_to_camat(p_id uuid, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_prof public.profiles;
  v_req public.letter_requests;
  v_requires boolean;
begin
  select * into v_prof from public.profiles where id = auth.uid();
  select * into v_req from public.letter_requests where id = p_id for update;
  if v_req.id is null or v_prof.id is null or v_prof.role <> 'admin_kelurahan'
     or not public.staff_can_act(v_prof, v_req) then
    raise exception 'Anda tidak berwenang menyetujui permohonan ini' using errcode = '42501';
  end if;
  select requires_camat into v_requires from public.letter_types where id = v_req.type_id;
  if not v_requires then
    raise exception 'Surat ini diterbitkan langsung oleh kelurahan' using errcode = '22023';
  end if;

  update public.letter_requests
    set status = 'menunggu_camat', reject_reason = null, updated_at = now()
    where id = p_id;
  perform public.log_approval(p_id, v_prof, 'approve_kelurahan', p_note, 'diajukan', 'menunggu_camat');
end;
$$;

-- Penerbitan (hanya service_role, dipanggil dari kode server) ----------------
create or replace function public.begin_issue(p_request_id uuid, p_actor_id uuid)
returns int language plpgsql security definer set search_path = public as $$
declare
  v_prof public.profiles;
  v_req public.letter_requests;
  v_requires boolean;
begin
  select * into v_prof from public.profiles where id = p_actor_id;
  select * into v_req from public.letter_requests where id = p_request_id;
  select requires_camat into v_requires from public.letter_types where id = v_req.type_id;
  if v_req.id is null or v_prof.id is null or not public.staff_can_act(v_prof, v_req)
     or (v_prof.role = 'admin_kelurahan' and v_requires)
     or (v_prof.role = 'camat' and not v_requires) then
    raise exception 'Anda tidak berwenang menerbitkan surat ini' using errcode = '42501';
  end if;
  return public.next_letter_number(v_req.kelurahan_id, extract(year from now())::int);
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
  v_requires boolean;
  v_kel_signer uuid;
  v_letter public.letters;
begin
  select * into v_prof from public.profiles where id = p_actor_id;
  select * into v_req from public.letter_requests where id = p_request_id for update;
  select requires_camat into v_requires from public.letter_types where id = v_req.type_id;

  if v_req.id is null or v_prof.id is null or not public.staff_can_act(v_prof, v_req)
     or (v_prof.role = 'admin_kelurahan' and v_requires)
     or (v_prof.role = 'camat' and not v_requires) then
    raise exception 'Anda tidak berwenang menerbitkan surat ini' using errcode = '42501';
  end if;

  if v_prof.role = 'camat' then
    select actor_id into v_kel_signer from public.approvals
      where request_id = p_request_id and action = 'approve_kelurahan'
      order by created_at desc limit 1;
    perform public.log_approval(p_request_id, v_prof, 'sign_camat', p_note, v_req.status, 'terbit');
  else
    v_kel_signer := v_prof.id;
    perform public.log_approval(p_request_id, v_prof, 'approve_kelurahan', p_note, v_req.status, 'terbit');
  end if;

  insert into public.letters (request_id, letter_no, verification_code, pdf_path, sha256, signed_by_kelurahan, signed_by_camat)
  values (
    p_request_id, p_letter_no, p_code, p_pdf_path, lower(p_sha256), v_kel_signer,
    case when v_prof.role = 'camat' then v_prof.id end
  )
  returning * into v_letter;

  update public.letter_requests
    set status = 'terbit', reject_reason = null, updated_at = now()
    where id = p_request_id;

  perform public.log_approval(p_request_id, v_prof, 'issue', 'Nomor surat ' || p_letter_no, 'terbit', 'terbit');
  return v_letter;
end;
$$;

-- Status terbit final: tidak ada perubahan status keluar dari terbit.
create or replace function public.guard_request_status()
returns trigger language plpgsql as $$
begin
  if old.status in ('terbit', 'dibatalkan') and new.status is distinct from old.status then
    raise exception 'Status % bersifat final', old.status;
  end if;
  return new;
end;
$$;

create trigger letter_requests_final_status before update on public.letter_requests
  for each row execute function public.guard_request_status();
