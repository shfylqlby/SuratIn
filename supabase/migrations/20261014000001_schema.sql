-- SuratKu: skema inti
create extension if not exists pgcrypto;

create type public.user_role as enum ('warga', 'admin_kelurahan', 'camat', 'super_admin');
create type public.request_status as enum ('diajukan', 'ditolak', 'menunggu_camat', 'terbit', 'dibatalkan');
create type public.approval_action as enum ('submit', 'resubmit', 'approve_kelurahan', 'reject', 'sign_camat', 'cancel', 'issue');
create type public.document_kind as enum ('ktp', 'kk', 'pendukung');

-- Wilayah ------------------------------------------------------------------
create table public.regions_kecamatan (
  id uuid primary key default gen_random_uuid(),
  nama text not null,
  kode text not null unique,
  alamat_kantor text not null default '',
  nama_camat text not null default '',
  nip_camat text not null default ''
);

create table public.regions_kelurahan (
  id uuid primary key default gen_random_uuid(),
  kecamatan_id uuid not null references public.regions_kecamatan (id),
  nama text not null,
  kode text not null unique,
  alamat_kantor text not null default '',
  kop_nama_lurah text not null default '',
  nip_lurah text not null default ''
);

-- Profil -------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role not null default 'warga',
  nama text not null,
  email text,
  nik text unique check (nik is null or nik ~ '^[0-9]{16}$'),
  tempat_lahir text,
  tanggal_lahir date,
  alamat text,
  pekerjaan text,
  kelurahan_id uuid references public.regions_kelurahan (id),
  kecamatan_id uuid references public.regions_kecamatan (id),
  jabatan text,
  nip text,
  created_at timestamptz not null default now()
);

-- Jenis surat --------------------------------------------------------------
create table public.letter_types (
  id uuid primary key default gen_random_uuid(),
  kode text not null unique,
  nama text not null,
  deskripsi text not null default '',
  kode_klasifikasi text not null,
  requires_camat boolean not null default false,
  form_schema jsonb not null,
  required_documents jsonb not null default '[]'::jsonb,
  template_key text not null,
  is_active boolean not null default true,
  urutan int not null default 0
);

-- Permohonan ---------------------------------------------------------------
create sequence public.ticket_seq;

create table public.letter_requests (
  id uuid primary key default gen_random_uuid(),
  ticket_no text not null unique,
  type_id uuid not null references public.letter_types (id),
  applicant_id uuid not null references public.profiles (id),
  kelurahan_id uuid not null references public.regions_kelurahan (id),
  status public.request_status not null default 'diajukan',
  form_data jsonb not null,
  reject_reason text,
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index letter_requests_status_idx on public.letter_requests (kelurahan_id, status, submitted_at);
create index letter_requests_applicant_idx on public.letter_requests (applicant_id, updated_at desc);

create table public.request_documents (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.letter_requests (id),
  kind public.document_kind not null,
  storage_path text not null,
  file_name text not null,
  mime text not null,
  size_bytes int not null check (size_bytes > 0 and size_bytes <= 3145728),
  uploaded_at timestamptz not null default now(),
  is_current boolean not null default true
);
create index request_documents_request_idx on public.request_documents (request_id);

-- Audit trail (append-only) ------------------------------------------------
create table public.approvals (
  id bigint generated always as identity primary key,
  request_id uuid not null references public.letter_requests (id),
  actor_id uuid not null references public.profiles (id),
  actor_role public.user_role not null,
  actor_nama text not null,
  actor_jabatan text,
  action public.approval_action not null,
  note text,
  from_status public.request_status,
  to_status public.request_status not null,
  created_at timestamptz not null default now()
);
create index approvals_request_idx on public.approvals (request_id, created_at);

create or replace function public.forbid_approval_mutation()
returns trigger language plpgsql as $$
begin
  raise exception 'Tabel approvals bersifat append-only; % tidak diizinkan', tg_op;
end;
$$;

create trigger approvals_no_update before update or delete on public.approvals
  for each row execute function public.forbid_approval_mutation();
create trigger approvals_no_truncate before truncate on public.approvals
  for each statement execute function public.forbid_approval_mutation();

-- Surat terbit -------------------------------------------------------------
create table public.letters (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique references public.letter_requests (id),
  letter_no text not null unique,
  verification_code text not null unique,
  pdf_path text not null,
  sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  issued_at timestamptz not null default now(),
  signed_by_kelurahan uuid references public.profiles (id),
  signed_by_camat uuid references public.profiles (id)
);

create or replace function public.forbid_letter_mutation()
returns trigger language plpgsql as $$
begin
  raise exception 'Surat yang sudah terbit tidak dapat diubah atau dihapus';
end;
$$;

create trigger letters_immutable before update or delete on public.letters
  for each row execute function public.forbid_letter_mutation();

-- Penomoran surat atomik ---------------------------------------------------
create table public.letter_counters (
  kelurahan_id uuid not null references public.regions_kelurahan (id),
  year int not null,
  last_number int not null default 0,
  primary key (kelurahan_id, year)
);

create or replace function public.next_letter_number(p_kelurahan_id uuid, p_year int)
returns int
language sql
security definer
set search_path = public
as $$
  insert into public.letter_counters as c (kelurahan_id, year, last_number)
  values (p_kelurahan_id, p_year, 1)
  on conflict (kelurahan_id, year)
  do update set last_number = c.last_number + 1
  returning last_number;
$$;
