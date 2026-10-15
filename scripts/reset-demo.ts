/**
 * Mengosongkan SEMUA data permohonan demo (permohonan, berkas, riwayat, surat terbit, nomor surat)
 * agar `npm run seed:demo` bisa membuat ulang data yang bersih.
 *
 *   npm run reset:demo
 *
 * Riwayat (approvals) dan surat terbit (letters) dikunci trigger. Skrip ini mematikan trigger
 * tersebut SEMENTARA di dalam satu transaksi, lalu menyalakannya kembali. Akun pengguna tidak dihapus.
 * Membutuhkan SUPABASE_DB_URL (koneksi pemilik tabel) dan SUPABASE_SERVICE_ROLE_KEY.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { Client } from "pg";
import { createClient } from "@supabase/supabase-js";

const DB_URL = process.env.SUPABASE_DB_URL;
if (!DB_URL) {
  console.error("Atur SUPABASE_DB_URL di .env.local");
  process.exit(1);
}

const storage = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
}).storage;

async function emptyBucket(bucket: string, prefix = ""): Promise<number> {
  let removed = 0;
  const { data } = await storage.from(bucket).list(prefix, { limit: 1000 });
  for (const item of data ?? []) {
    const path = prefix ? `${prefix}/${item.name}` : item.name;
    if (item.id === null) {
      removed += await emptyBucket(bucket, path);
    } else {
      await storage.from(bucket).remove([path]);
      removed++;
    }
  }
  return removed;
}

async function main() {
  // TLS diverifikasi dengan root CA resmi Supabase (scripts/certs).
  const ca = readFileSync(path.join(process.cwd(), "scripts", "certs", "supabase-prod-ca-2021.crt"), "utf8");
  const db = new Client({ connectionString: DB_URL, ssl: { ca } });
  await db.connect();
  try {
    await db.query("begin");
    await db.query("alter table public.approvals disable trigger user");
    await db.query("alter table public.letters disable trigger user");
    await db.query("alter table public.letter_requests disable trigger user");
    const counts = await db.query(`
      with a as (delete from public.approvals returning 1),
           l as (delete from public.letters returning 1),
           d as (delete from public.request_documents returning 1)
      select (select count(*) from a) approvals, (select count(*) from l) letters, (select count(*) from d) docs`);
    await db.query("delete from public.rt_letters");
    await db.query("delete from public.ai_document_checks");
    await db.query("delete from public.ai_check_log");
    const req = await db.query("delete from public.letter_requests");
    await db.query("delete from public.letter_counters");
    await db.query("delete from public.rt_letter_counters");
    await db.query("alter sequence public.ticket_seq restart with 1");
    await db.query("alter table public.approvals enable trigger user");
    await db.query("alter table public.letters enable trigger user");
    await db.query("alter table public.letter_requests enable trigger user");
    await db.query("commit");
    const c = counts.rows[0];
    console.log(`Database: ${req.rowCount} permohonan, ${c.letters} surat, ${c.approvals} riwayat, ${c.docs} berkas dihapus.`);
  } catch (e) {
    await db.query("rollback");
    throw e;
  } finally {
    await db.end();
  }

  const files = (await emptyBucket("requests")) + (await emptyBucket("letters"));
  console.log(`Storage: ${files} berkas dihapus.`);
  console.log("Selesai. Jalankan `npm run seed:demo` untuk mengisi data demo baru.");
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
