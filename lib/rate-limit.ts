import "server-only";
import { headers } from "next/headers";

type Bucket = { count: number; resetAt: number };
const store = new Map<string, Bucket>();

/**
 * Rate limit sederhana per IP (in-memory, per instance server).
 * Cukup untuk prototipe; untuk produksi skala kota gunakan Redis/Upstash.
 */
export async function rateLimit(scope: string, limit: number, windowMs = 60_000) {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "lokal";
  const key = `${scope}:${ip}`;
  const now = Date.now();
  const bucket = store.get(key);

  if (store.size > 5000) {
    for (const [k, b] of store) if (b.resetAt < now) store.delete(k);
  }

  if (!bucket || bucket.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfter: 0 };
  }
  bucket.count += 1;
  if (bucket.count > limit) {
    return { ok: false, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) };
  }
  return { ok: true, retryAfter: 0 };
}
