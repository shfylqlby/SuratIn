import type { Metadata } from "next";
import { CircleAlert, Filter } from "lucide-react";
import { requireRole } from "@/lib/auth/guard";
import { SLA } from "@/lib/config";
import { formatDurasi, formatTanggalIsian } from "@/lib/format";
import { defaultFilter, loadMonitoring } from "@/lib/monitoring";
import { buttonClass } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty";
import { Input, Select } from "@/components/ui/field";

export const metadata: Metadata = { title: "Monitoring layanan" };

const durasi = (h: number | null) => (h === null ? "-" : formatDurasi(h));

export default async function CamatMonitoringPage({ searchParams }: PageProps<"/camat">) {
  const { profile } = await requireRole("camat", "super_admin");
  const filter = defaultFilter(await searchParams);
  // Agregat dihitung di server; camat tidak pernah membaca tabel permohonan mentah.
  const data = await loadMonitoring(profile.role === "camat" ? profile.kecamatan_id : null, filter);
  const maxKel = Math.max(1, ...data.perKelurahan.map((k) => k.total));
  const maxType = Math.max(1, ...data.perType.map((t) => t.total));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-tinta-900">Monitoring layanan surat</h1>
        <p className="mt-1 text-redup">
          {formatTanggalIsian(filter.from)} sampai {formatTanggalIsian(filter.to)}. Hanya data agregat, tanpa nama dan NIK
          warga. Batas layanan: RT/RW {SLA.rtHours} jam, kelurahan {SLA.kelurahanHours} jam.
        </p>
      </div>

      <form method="get" className="flex flex-wrap items-end gap-3 rounded-[var(--radius-kartu)] border border-garis bg-lembar p-4" aria-label="Saring data">
        <label className="w-full space-y-1 sm:w-auto">
          <span className="block text-sm font-semibold text-teks">Dari</span>
          <Input type="date" name="dari" defaultValue={filter.from} className="angka" />
        </label>
        <label className="w-full space-y-1 sm:w-auto">
          <span className="block text-sm font-semibold text-teks">Sampai</span>
          <Input type="date" name="sampai" defaultValue={filter.to} className="angka" />
        </label>
        <label className="w-full space-y-1 sm:w-auto sm:min-w-44">
          <span className="block text-sm font-semibold text-teks">Kelurahan</span>
          <Select name="kelurahan" defaultValue={filter.kelurahanId ?? ""}>
            <option value="">Semua kelurahan</option>
            {data.kelurahanOptions.map((k) => (
              <option key={k.id} value={k.id}>
                {k.nama}
              </option>
            ))}
          </Select>
        </label>
        <label className="w-full space-y-1 sm:w-auto sm:min-w-52">
          <span className="block text-sm font-semibold text-teks">Jenis surat</span>
          <Select name="jenis" defaultValue={filter.typeKode ?? ""}>
            <option value="">Semua jenis</option>
            {data.typeOptions.map((t) => (
              <option key={t.kode} value={t.kode}>
                {t.nama}
              </option>
            ))}
          </Select>
        </label>
        <button className={buttonClass("tinta", "md", "min-h-12")}>
          <Filter aria-hidden /> Terapkan
        </button>
      </form>

      <section aria-label="Ringkasan" className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Kpi label="Total permohonan" value={data.kpi.total} />
        <Kpi label="Sedang diproses" value={data.kpi.proses} />
        <Kpi label="Terbit" value={data.kpi.terbit} />
        <Kpi label="Ditolak, menunggu perbaikan" value={data.kpi.ditolak} />
        <Kpi label="Dibatalkan warga" value={data.kpi.dibatalkan} />
        <Kpi label="Tahap lolos SLA" value={data.kpi.slaPct === null ? "-" : `${data.kpi.slaPct}%`} />
      </section>

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-teks">Perbandingan kelurahan</h2>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="text-redup">
              <tr className="border-b border-garis-halus">
                <th className="px-5 py-3 font-semibold">Kelurahan</th>
                <th className="px-3 py-3 font-semibold">Jumlah permohonan</th>
                <th className="px-3 py-3 text-right font-semibold">Di RT/RW</th>
                <th className="px-3 py-3 text-right font-semibold">Di kelurahan</th>
                <th className="px-3 py-3 text-right font-semibold">Terbit</th>
                <th className="px-3 py-3 text-right font-semibold">Ditolak</th>
                <th className="px-3 py-3 text-right font-semibold">Rata-rata tahap RT</th>
                <th className="px-5 py-3 text-right font-semibold">Rata-rata tahap kelurahan</th>
              </tr>
            </thead>
            <tbody className="angka">
              {data.perKelurahan.map((k) => (
                <tr key={k.id} className="border-b border-garis-halus last:border-0">
                  <th scope="row" className="px-5 py-3 font-semibold text-teks">
                    {k.nama}
                  </th>
                  <td className="px-3 py-3">
                    <Bar value={k.total} max={maxKel} label={`${k.nama}: ${k.total} permohonan`} />
                  </td>
                  <td className="px-3 py-3 text-right">{k.menunggu_rt}</td>
                  <td className="px-3 py-3 text-right">{k.menunggu_kelurahan}</td>
                  <td className="px-3 py-3 text-right">{k.terbit}</td>
                  <td className="px-3 py-3 text-right">{k.ditolak}</td>
                  <td className="px-3 py-3 text-right">{durasi(k.avgRt)}</td>
                  <td className="px-5 py-3 text-right">{durasi(k.avgKel)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <CardHeader className="flex items-center gap-2">
          <CircleAlert aria-hidden className="size-5 text-tolak" />
          <h2 className="font-semibold text-teks">Melewati batas layanan ({data.overdue.length})</h2>
        </CardHeader>
        {data.overdue.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-left text-sm">
              <thead className="text-redup">
                <tr className="border-b border-garis-halus">
                  <th className="px-5 py-3 font-semibold">Nomor tiket</th>
                  <th className="px-3 py-3 font-semibold">Jenis surat</th>
                  <th className="px-3 py-3 font-semibold">Tahap</th>
                  <th className="px-3 py-3 font-semibold">Dipegang</th>
                  <th className="px-5 py-3 text-right font-semibold">Lama menunggu</th>
                </tr>
              </thead>
              <tbody>
                {data.overdue.map((r) => (
                  <tr key={r.ticket} className="border-b border-garis-halus last:border-0">
                    <td className="px-5 py-3 font-semibold whitespace-nowrap text-teks angka">{r.ticket}</td>
                    <td className="px-3 py-3">{r.jenis}</td>
                    <td className="px-3 py-3">{r.tahap}</td>
                    <td className="px-3 py-3">{r.pemegang}</td>
                    <td className="px-5 py-3 text-right font-semibold text-tolak angka">
                      {formatDurasi(r.waited)} <span className="font-normal text-redup">/ {r.limit} jam</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="px-5 py-4 text-redup">Tidak ada permohonan yang melewati batas layanan.</p>
        )}
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-teks">Beban kerja RT/RW</h2>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-redup">
                <tr className="border-b border-garis-halus">
                  <th className="px-5 py-3 font-semibold">Unit</th>
                  <th className="px-3 py-3 text-right font-semibold">Antrean</th>
                  <th className="px-3 py-3 text-right font-semibold">Diproses</th>
                  <th className="px-5 py-3 text-right font-semibold">Rata-rata waktu</th>
                </tr>
              </thead>
              <tbody className="angka">
                {data.perRt.map((u) => (
                  <tr key={u.id} className="border-b border-garis-halus last:border-0">
                    <th scope="row" className="px-5 py-3 font-semibold text-teks">
                      {u.label} <span className="font-normal text-redup">· {u.kelurahan}</span>
                    </th>
                    <td className="px-3 py-3 text-right">{u.antrean}</td>
                    <td className="px-3 py-3 text-right">{u.diproses}</td>
                    <td className="px-5 py-3 text-right">{durasi(u.avgHours)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-teks">Beban kerja admin kelurahan</h2>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-redup">
                <tr className="border-b border-garis-halus">
                  <th className="px-5 py-3 font-semibold">Kelurahan</th>
                  <th className="px-3 py-3 text-right font-semibold">Antrean</th>
                  <th className="px-3 py-3 text-right font-semibold">Diproses</th>
                  <th className="px-5 py-3 text-right font-semibold">Rata-rata waktu</th>
                </tr>
              </thead>
              <tbody className="angka">
                {data.perAdmin.map((a) => (
                  <tr key={a.kelurahan} className="border-b border-garis-halus last:border-0">
                    <th scope="row" className="px-5 py-3 font-semibold text-teks">
                      {a.kelurahan}
                      <span className="block text-xs font-normal text-redup">{a.petugas}</span>
                    </th>
                    <td className="px-3 py-3 text-right">{a.antrean}</td>
                    <td className="px-3 py-3 text-right">{a.diproses}</td>
                    <td className="px-5 py-3 text-right">{durasi(a.avgHours)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-teks">Per jenis surat</h2>
        </CardHeader>
        {data.perType.some((t) => t.total) ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-redup">
                <tr className="border-b border-garis-halus">
                  <th className="px-5 py-3 font-semibold">Jenis surat</th>
                  <th className="px-3 py-3 font-semibold">Jumlah</th>
                  <th className="px-3 py-3 text-right font-semibold">Terbit</th>
                  <th className="px-5 py-3 text-right font-semibold">Rata-rata sampai terbit</th>
                </tr>
              </thead>
              <tbody className="angka">
                {data.perType.map((t) => (
                  <tr key={t.kode} className="border-b border-garis-halus last:border-0">
                    <th scope="row" className="px-5 py-3 font-semibold text-teks">
                      {t.nama}
                    </th>
                    <td className="px-3 py-3">
                      <Bar value={t.total} max={maxType} label={`${t.nama}: ${t.total} permohonan`} />
                    </td>
                    <td className="px-3 py-3 text-right">{t.terbit}</td>
                    <td className="px-5 py-3 text-right">{durasi(t.avgSelesai)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-5">
            <EmptyState title="Belum ada permohonan pada rentang ini" />
          </div>
        )}
      </Card>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-[var(--radius-kartu)] border border-garis bg-lembar p-4">
      <p className="text-sm text-redup">{label}</p>
      <p className="mt-1 font-display text-3xl font-bold text-tinta-900 angka">{value}</p>
    </div>
  );
}

/** Batang magnitudo satu warna; angkanya selalu tertulis, jadi warna bukan satu-satunya penanda. */
function Bar({ value, max, label }: { value: number; max: number; label: string }) {
  return (
    <div className="flex items-center gap-2" title={label}>
      <span className="relative h-2.5 w-full min-w-24 overflow-hidden rounded-full bg-garis-halus">
        <span className="absolute inset-y-0 left-0 rounded-full bg-tinta-700" style={{ width: `${(value / max) * 100}%` }} />
      </span>
      <span className="w-8 text-right font-semibold text-teks">{value}</span>
    </div>
  );
}
