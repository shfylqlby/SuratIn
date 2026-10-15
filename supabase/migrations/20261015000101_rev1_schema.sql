-- Revisi 1 (2/3): tabel dan kolom baru. Semua perubahan additive.

-- Unit RT (satu baris = satu RT beserta RW-nya) -------------------------------
create table if not exists public.rt_units (
  id uuid primary key default gen_random_uuid(),
  kelurahan_id uuid not null references public.regions_kelurahan (id) on delete restrict,
  rw_no text not null,
  rt_no text not null,
  created_at timestamptz not null default now(),
  unique (kelurahan_id, rw_no, rt_no)
);

alter table public.profiles add column if not exists rt_unit_id uuid references public.rt_units (id);
alter table public.letter_requests add column if not exists rt_unit_id uuid references public.rt_units (id);
alter table public.letter_requests add column if not exists stage_entered_at timestamptz not null default now();
-- rt_unit_id sengaja NULLABLE agar data lama tidak menggagalkan migrasi.
-- Kewajiban mengisinya ditegakkan oleh submit_request untuk permohonan baru.
create index if not exists letter_requests_rt_idx on public.letter_requests (rt_unit_id, status, stage_entered_at);

-- Jenis surat ------------------------------------------------------------------
alter table public.letter_types add column if not exists output_kind text not null default 'surat_keterangan'
  check (output_kind in ('surat_keterangan', 'surat_pengantar'));
alter table public.letter_types add column if not exists requires_rt boolean not null default true;
alter table public.letter_types add column if not exists addressee jsonb;
-- requires_camat TIDAK dihapus. Kode baru berhenti membacanya.

-- Hasil cek AI per berkas -------------------------------------------------------
alter table public.request_documents add column if not exists ai_status text not null default 'belum_diperiksa'
  check (ai_status in ('belum_diperiksa', 'lolos', 'perlu_dicek', 'gagal_diperiksa'));
alter table public.request_documents add column if not exists ai_result jsonb;
alter table public.request_documents add column if not exists ai_checked_at timestamptz;

-- Hasil cek AI untuk berkas yang baru diunggah tetapi permohonannya belum dikirim.
-- Baris request_documents baru dibuat saat pengajuan; attach_documents menyalin hasil dari sini.
create table if not exists public.ai_document_checks (
  storage_path text primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  ai_status text not null check (ai_status in ('belum_diperiksa', 'lolos', 'perlu_dicek', 'gagal_diperiksa')),
  ai_result jsonb,
  checked_at timestamptz not null default now()
);

-- Surat pengantar RT/RW ----------------------------------------------------------
create table if not exists public.rt_letters (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique references public.letter_requests (id) on delete cascade,
  rt_unit_id uuid not null references public.rt_units (id),
  letter_no text not null unique,
  pdf_path text not null,
  sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  issued_by uuid not null references public.profiles (id),
  issued_at timestamptz not null default now()
);

create table if not exists public.rt_letter_counters (
  rt_unit_id uuid not null references public.rt_units (id),
  year int not null,
  last_number int not null default 0,
  primary key (rt_unit_id, year)
);

create or replace function public.next_rt_letter_number(p_rt_unit uuid, p_year int)
returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  insert into public.rt_letter_counters (rt_unit_id, year, last_number)
  values (p_rt_unit, p_year, 1)
  on conflict (rt_unit_id, year)
  do update set last_number = rt_letter_counters.last_number + 1
  returning last_number into n;
  return n;
end $$;
revoke all on function public.next_rt_letter_number(uuid, int) from public, anon, authenticated;
grant execute on function public.next_rt_letter_number(uuid, int) to service_role;

-- Log pemakaian AI (pembatasan laju; memori proses tidak bertahan di serverless) --
create table if not exists public.ai_check_log (
  id bigserial primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists ai_check_log_user_time on public.ai_check_log (user_id, created_at desc);

-- RLS & hak akses tabel baru ------------------------------------------------------
alter table public.rt_units enable row level security;
alter table public.rt_letters enable row level security;
alter table public.rt_letter_counters enable row level security;
alter table public.ai_check_log enable row level security;
alter table public.ai_document_checks enable row level security;

revoke insert, update, delete, truncate on public.rt_units, public.rt_letters from anon, authenticated;
revoke all on public.rt_letter_counters, public.ai_check_log, public.ai_document_checks from anon, authenticated;
revoke all on public.rt_letters from anon;

-- Data wilayah boleh dibaca publik (form registrasi). Tidak ada data sensitif.
drop policy if exists rt_units_public_read on public.rt_units;
create policy rt_units_public_read on public.rt_units for select to anon, authenticated using (true);
