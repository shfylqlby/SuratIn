-- Tambah isian "Kecamatan" (readonly, dari wilayah akun) pada data pemohon.

-- Prefill readonly kini juga mengenal `profile.kecamatan` (nama kecamatan dari kelurahan akun).
create or replace function public.apply_profile_prefill(p_schema jsonb, p_form jsonb, p_profile public.profiles)
returns jsonb language plpgsql stable set search_path = public as $$
declare
  f jsonb;
  col text;
  result jsonb := p_form;
  prof jsonb := to_jsonb(p_profile);
  v_kecamatan text;
begin
  select k.nama into v_kecamatan
  from public.regions_kelurahan l
  join public.regions_kecamatan k on k.id = l.kecamatan_id
  where l.id = p_profile.kelurahan_id;
  prof := prof || jsonb_build_object('kecamatan', v_kecamatan);

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

-- Sisipkan isian kecamatan tepat setelah "alamat" pada semua jenis surat.
update public.letter_types t
set form_schema = jsonb_set(
  t.form_schema,
  '{fields}',
  (
    select jsonb_agg(e order by o)
    from (
      select f as e, (i * 2)::int as o
      from jsonb_array_elements(t.form_schema->'fields') with ordinality as a(f, i)
      union all
      select
        '{"key":"kecamatan","label":"Kecamatan","type":"text","required":true,"prefill":"profile.kecamatan","readonly":true}'::jsonb,
        coalesce(
          (select (i * 2 + 1)::int from jsonb_array_elements(t.form_schema->'fields') with ordinality as b(f, i) where f->>'key' = 'alamat'),
          10000
        )
    ) s
  )
)
where not exists (
  select 1 from jsonb_array_elements(t.form_schema->'fields') x where x->>'key' = 'kecamatan'
);

-- Lengkapi permohonan yang sudah ada agar tampil konsisten.
update public.letter_requests r
set form_data = r.form_data || jsonb_build_object('kecamatan', k.nama)
from public.regions_kelurahan l
join public.regions_kecamatan k on k.id = l.kecamatan_id
where l.id = r.kelurahan_id and not (r.form_data ? 'kecamatan');
