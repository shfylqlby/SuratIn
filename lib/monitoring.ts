import "server-only";
import { SLA } from "@/lib/config";
import { addDays, hoursSince, todayLocal } from "@/lib/format";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ApprovalAction, RequestStatus } from "@/lib/types";

/**
 * Agregat monitoring camat (PRD revisi 1 §7).
 * Dijalankan dengan service role SETELAH halaman memastikan peran camat/super_admin.
 * Yang dikembalikan hanya angka dan label unit. Tanpa nama warga, tanpa NIK, tanpa isi formulir.
 */

export interface MonitoringFilter {
  from: string; // YYYY-MM-DD (WIB)
  to: string; // YYYY-MM-DD (WIB), inklusif
  kelurahanId: string | null;
  typeKode: string | null;
}

interface Row {
  id: string;
  ticket_no: string;
  status: RequestStatus;
  kelurahan_id: string;
  rt_unit_id: string | null;
  type_id: string;
  submitted_at: string;
  stage_entered_at: string;
}

interface Appr {
  request_id: string;
  action: ApprovalAction;
  actor_id: string;
  actor_nama: string;
  created_at: string;
}

const IN_RT: RequestStatus[] = ["menunggu_rt"];
const IN_KEL: RequestStatus[] = ["menunggu_kelurahan"];
const REJECTED: RequestStatus[] = ["ditolak_rt", "ditolak_kelurahan"];

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const hoursBetween = (a: string, b: string) => (new Date(b).getTime() - new Date(a).getTime()) / 3_600_000;

/** Mulai hari (00:00 WIB) dalam ISO UTC. */
function startOfDayWib(isoDate: string) {
  return new Date(`${isoDate}T00:00:00+07:00`).toISOString();
}

export function defaultFilter(sp: Record<string, string | string[] | undefined>): MonitoringFilter {
  const today = todayLocal();
  const valid = (v: unknown) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
  let from = valid(sp.dari) ? (sp.dari as string) : addDays(today, -29);
  let to = valid(sp.sampai) ? (sp.sampai as string) : today;
  if (from > to) [from, to] = [to, from];
  return {
    from,
    to,
    kelurahanId: typeof sp.kelurahan === "string" && /^[0-9a-f-]{36}$/.test(sp.kelurahan) ? sp.kelurahan : null,
    typeKode: typeof sp.jenis === "string" && /^[a-z_-]{2,40}$/.test(sp.jenis) ? sp.jenis : null,
  };
}

export async function loadMonitoring(kecamatanId: string | null, filter: MonitoringFilter) {
  const db = createAdminClient();

  let kelQuery = db.from("regions_kelurahan").select("id, nama").order("nama");
  if (kecamatanId) kelQuery = kelQuery.eq("kecamatan_id", kecamatanId);
  const [{ data: kelurahan }, { data: types }] = await Promise.all([
    kelQuery,
    db.from("letter_types").select("id, kode, nama").eq("is_active", true).order("urutan"),
  ]);
  const kelIds = (kelurahan ?? []).map((k) => k.id).filter((id) => !filter.kelurahanId || id === filter.kelurahanId);
  const typeFilter = filter.typeKode ? (types ?? []).find((t) => t.kode === filter.typeKode)?.id ?? "00000000-0000-0000-0000-000000000000" : null;

  const { data: units } = kelIds.length
    ? await db.from("rt_units").select("id, kelurahan_id, rt_no, rw_no").in("kelurahan_id", kelIds).order("rw_no").order("rt_no")
    : { data: [] };

  const columns = "id, ticket_no, status, kelurahan_id, rt_unit_id, type_id, submitted_at, stage_entered_at";
  let rangeQuery = db
    .from("letter_requests")
    .select(columns)
    .in("kelurahan_id", kelIds.length ? kelIds : ["00000000-0000-0000-0000-000000000000"])
    .gte("submitted_at", startOfDayWib(filter.from))
    .lt("submitted_at", startOfDayWib(addDays(filter.to, 1)))
    .limit(5000);
  // Antrean & SLA saat ini tidak dibatasi rentang tanggal: permohonan lama yang masih menggantung tetap terlihat.
  let openQuery = db
    .from("letter_requests")
    .select(columns)
    .in("kelurahan_id", kelIds.length ? kelIds : ["00000000-0000-0000-0000-000000000000"])
    .in("status", [...IN_RT, ...IN_KEL])
    .limit(5000);
  if (typeFilter) {
    rangeQuery = rangeQuery.eq("type_id", typeFilter);
    openQuery = openQuery.eq("type_id", typeFilter);
  }
  const [{ data: rangeRows }, { data: openRows }] = await Promise.all([rangeQuery, openQuery]);
  const rows = (rangeRows ?? []) as Row[];
  const open = (openRows ?? []) as Row[];

  const ids = rows.map((r) => r.id);
  const approvals: Appr[] = [];
  for (let i = 0; i < ids.length; i += 200) {
    const { data } = await db
      .from("approvals")
      .select("request_id, action, actor_id, actor_nama, created_at")
      .in("request_id", ids.slice(i, i + 200))
      .order("created_at");
    approvals.push(...((data ?? []) as Appr[]));
  }

  // Durasi per tahap dari pasangan baris approvals.
  type Stage = { requestId: string; hours: number; actorId: string; actorNama: string };
  const rtStages: Stage[] = [];
  const kelStages: Stage[] = [];
  const completion = new Map<string, number>();
  const byRequest = new Map<string, Appr[]>();
  for (const a of approvals) byRequest.set(a.request_id, [...(byRequest.get(a.request_id) ?? []), a]);
  for (const [requestId, list] of byRequest) {
    let rtStart: string | null = null;
    let kelStart: string | null = null;
    const firstSubmit = list.find((a) => a.action === "submit")?.created_at;
    for (const a of list) {
      if (a.action === "submit" || a.action === "resubmit") rtStart = a.created_at;
      else if ((a.action === "approve_rt" || a.action === "reject_rt") && rtStart) {
        rtStages.push({ requestId, hours: hoursBetween(rtStart, a.created_at), actorId: a.actor_id, actorNama: a.actor_nama });
        rtStart = null;
        if (a.action === "approve_rt") kelStart = a.created_at;
      } else if ((a.action === "approve_kelurahan" || a.action === "reject_kelurahan") && kelStart) {
        kelStages.push({ requestId, hours: hoursBetween(kelStart, a.created_at), actorId: a.actor_id, actorNama: a.actor_nama });
        kelStart = null;
      } else if (a.action === "issue" && firstSubmit) {
        completion.set(requestId, hoursBetween(firstSubmit, a.created_at));
      }
    }
  }

  // % lolos SLA: tahap yang sudah selesai + tahap yang masih berjalan (diukur sampai sekarang).
  const now = Date.now();
  const stageChecks = [
    ...rtStages.map((s) => s.hours <= SLA.rtHours),
    ...kelStages.map((s) => s.hours <= SLA.kelurahanHours),
    ...rows.filter((r) => IN_RT.includes(r.status)).map((r) => hoursSince(r.stage_entered_at, now) <= SLA.rtHours),
    ...rows.filter((r) => IN_KEL.includes(r.status)).map((r) => hoursSince(r.stage_entered_at, now) <= SLA.kelurahanHours),
  ];

  const kpi = {
    total: rows.length,
    proses: rows.filter((r) => IN_RT.includes(r.status) || IN_KEL.includes(r.status)).length,
    terbit: rows.filter((r) => r.status === "terbit").length,
    ditolak: rows.filter((r) => REJECTED.includes(r.status)).length,
    // Ditampilkan agar total = diproses + terbit + ditolak + dibatalkan.
    dibatalkan: rows.filter((r) => r.status === "dibatalkan").length,
    slaPct: stageChecks.length ? Math.round((stageChecks.filter(Boolean).length / stageChecks.length) * 100) : null,
  };

  const requestKel = new Map(rows.map((r) => [r.id, r.kelurahan_id]));
  const kelName = new Map((kelurahan ?? []).map((k) => [k.id, k.nama]));
  const perKelurahan = (kelurahan ?? [])
    .filter((k) => kelIds.includes(k.id))
    .map((k) => {
      const mine = rows.filter((r) => r.kelurahan_id === k.id);
      return {
        id: k.id,
        nama: k.nama,
        total: mine.length,
        menunggu_rt: mine.filter((r) => r.status === "menunggu_rt").length,
        menunggu_kelurahan: mine.filter((r) => r.status === "menunggu_kelurahan").length,
        terbit: mine.filter((r) => r.status === "terbit").length,
        ditolak: mine.filter((r) => REJECTED.includes(r.status)).length,
        avgRt: avg(rtStages.filter((s) => requestKel.get(s.requestId) === k.id).map((s) => s.hours)),
        avgKel: avg(kelStages.filter((s) => requestKel.get(s.requestId) === k.id).map((s) => s.hours)),
      };
    });

  const requestUnit = new Map(rows.map((r) => [r.id, r.rt_unit_id]));
  const perRt = (units ?? []).map((u) => {
    const handled = rtStages.filter((s) => requestUnit.get(s.requestId) === u.id);
    return {
      id: u.id,
      label: `RT ${u.rt_no}/RW ${u.rw_no}`,
      kelurahan: kelName.get(u.kelurahan_id) ?? "-",
      antrean: open.filter((r) => r.rt_unit_id === u.id && IN_RT.includes(r.status)).length,
      diproses: handled.length,
      avgHours: avg(handled.map((s) => s.hours)),
    };
  });

  const adminMap = new Map<string, { nama: string; kelurahan: string; hours: number[] }>();
  for (const s of kelStages) {
    const entry = adminMap.get(s.actorId) ?? { nama: s.actorNama, kelurahan: kelName.get(requestKel.get(s.requestId) ?? "") ?? "-", hours: [] as number[] };
    entry.hours.push(s.hours);
    adminMap.set(s.actorId, entry);
  }
  const perAdmin = (kelurahan ?? [])
    .filter((k) => kelIds.includes(k.id))
    .map((k) => {
      const entries = [...adminMap.values()].filter((e) => e.kelurahan === k.nama);
      const hours = entries.flatMap((e) => e.hours);
      return {
        kelurahan: k.nama,
        petugas: entries.map((e) => e.nama).join(", ") || "-",
        antrean: open.filter((r) => r.kelurahan_id === k.id && IN_KEL.includes(r.status)).length,
        diproses: hours.length,
        avgHours: avg(hours),
      };
    });

  const typeName = new Map((types ?? []).map((t) => [t.id, t.nama]));
  const unitLabel = new Map((units ?? []).map((u) => [u.id, `RT ${u.rt_no}/RW ${u.rw_no}`]));
  const overdue = open
    .map((r) => {
      const atRt = IN_RT.includes(r.status);
      const limit = atRt ? SLA.rtHours : SLA.kelurahanHours;
      const waited = hoursSince(r.stage_entered_at, now);
      return {
        ticket: r.ticket_no,
        jenis: typeName.get(r.type_id) ?? "-",
        tahap: atRt ? "RT/RW" : "Kelurahan",
        pemegang: atRt
          ? `${unitLabel.get(r.rt_unit_id ?? "") ?? "RT -"}, ${kelName.get(r.kelurahan_id) ?? ""}`
          : `Kel. ${kelName.get(r.kelurahan_id) ?? "-"}`,
        waited,
        limit,
      };
    })
    .filter((r) => r.waited > r.limit)
    .sort((a, b) => b.waited - b.limit - (a.waited - a.limit));

  const perType = (types ?? [])
    .filter((t) => !filter.typeKode || t.kode === filter.typeKode)
    .map((t) => {
      const mine = rows.filter((r) => r.type_id === t.id);
      return {
        kode: t.kode,
        nama: t.nama,
        total: mine.length,
        terbit: mine.filter((r) => r.status === "terbit").length,
        avgSelesai: avg(mine.map((r) => completion.get(r.id)).filter((v): v is number => v !== undefined)),
      };
    });

  return {
    kelurahanOptions: kelurahan ?? [],
    typeOptions: (types ?? []).map((t) => ({ kode: t.kode, nama: t.nama })),
    kpi,
    perKelurahan,
    perRt,
    perAdmin,
    overdue,
    perType,
  };
}
