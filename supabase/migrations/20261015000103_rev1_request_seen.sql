-- Revisi 1, audit UI #10: penanda "Baru" di dasbor warga.
-- Mencatat kapan pemohon terakhir membuka detail permohonannya. Permohonan dianggap punya kabar baru bila ada
-- baris approvals dari pihak lain (RT/RW atau kelurahan) setelah waktu ini.

create table if not exists public.request_seen (
  request_id uuid not null references public.letter_requests (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  seen_at timestamptz not null default now(),
  primary key (request_id, user_id)
);

alter table public.request_seen enable row level security;
revoke all on public.request_seen from anon;
revoke insert, update, delete, truncate on public.request_seen from authenticated;
grant select on public.request_seen to authenticated;

drop policy if exists request_seen_own on public.request_seen;
create policy request_seen_own on public.request_seen
  for select to authenticated
  using (user_id = auth.uid());

-- Satu-satunya jalur tulis: hanya pemohon permohonan itu sendiri.
create or replace function public.mark_request_seen(p_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.request_seen (request_id, user_id, seen_at)
  select r.id, auth.uid(), now()
    from public.letter_requests r
   where r.id = p_id and r.applicant_id = auth.uid()
  on conflict (request_id, user_id) do update set seen_at = excluded.seen_at;
$$;

revoke all on function public.mark_request_seen(uuid) from public, anon;
grant execute on function public.mark_request_seen(uuid) to authenticated;
