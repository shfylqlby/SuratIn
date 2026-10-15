import "server-only";

/**
 * Klien AI untuk cek dokumen. SATU-SATUNYA file yang tahu detail penyedia AI.
 * Variabel lingkungan dibaca di dalam fungsi (lazy) agar build tidak gagal saat belum diisi.
 *
 * Format: kompatibel chat completions (POST {AI_BASE_URL}/chat/completions, gambar sebagai data URL).
 * Meminta `stream: true` karena gateway default membalas SSE dan jauh lebih cepat dalam mode stream
 * (uji 15 Okt 2026: stream ±2–8 dtk, non-stream ±45 dtk). Balasan JSON biasa tetap didukung.
 * Jika penyedia memakai format lain, sesuaikan hanya di file ini.
 */

export interface AiConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
  timeoutMs: number;
  maxPerHour: number;
}

/** null = fitur AI mati (AI_ENABLED bukan "true" atau kunci kosong). Aplikasi tetap berjalan normal. */
export function aiConfig(): AiConfig | null {
  const apiKey = process.env.AI_API_KEY?.trim();
  if (process.env.AI_ENABLED !== "true" || !apiKey) return null;
  return {
    baseUrl: (process.env.AI_BASE_URL?.trim() || "https://api.shofiyulqalby.dev/v1").replace(/\/$/, ""),
    apiKey,
    model: process.env.AI_MODEL?.trim() || "gpt-4o-mini",
    // Per percobaan (maks. 2 percobaan). Harus 2× nilai ini < maxDuration route cek dokumen (30 dtk).
    timeoutMs: Number(process.env.AI_TIMEOUT_MS) || 12_000,
    maxPerHour: Number(process.env.AI_MAX_CHECKS_PER_HOUR) || 20,
  };
}

export function isAiEnabled() {
  return aiConfig() !== null;
}

export class AiUnavailableError extends Error {}

type Content = unknown;

function contentText(content: Content): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content.map((c) => (typeof c === "object" && c && "text" in c ? String((c as { text: unknown }).text) : "")).join("");
  }
  return "";
}

/** Balasan non-stream: { choices: [{ message: { content } }] }. */
function readJson(raw: string): string {
  try {
    const json = JSON.parse(raw) as { choices?: Array<{ message?: { content?: Content } }> };
    return contentText(json.choices?.[0]?.message?.content);
  } catch {
    return "";
  }
}

/** Balasan stream (SSE): gabungkan choices[0].delta.content dari setiap baris "data: {...}". */
function readSse(raw: string): string {
  let out = "";
  for (const line of raw.split(/\r?\n/)) {
    const data = line.startsWith("data:") ? line.slice(5).trim() : "";
    if (!data || data === "[DONE]") continue;
    try {
      const chunk = JSON.parse(data) as { choices?: Array<{ delta?: { content?: Content }; message?: { content?: Content } }> };
      const choice = chunk.choices?.[0];
      out += contentText(choice?.delta?.content ?? choice?.message?.content);
    } catch {
      // potongan yang bukan JSON (komentar keep-alive) dilewati
    }
  }
  return out;
}

/** Mengirim satu gambar + prompt sistem, mengembalikan teks balasan mentah dari model. */
export async function classifyImage(input: { system: string; user: string; image: Uint8Array; mime: string }): Promise<string> {
  const cfg = aiConfig();
  if (!cfg) throw new AiUnavailableError("AI tidak aktif");

  // Latensi gateway bimodal (uji 15 Okt 2026: 4–7 dtk atau ±70 dtk). Percobaan yang macet diputus
  // lalu diulang sekali, karena percobaan kedua biasanya kebagian jalur cepat. Total tetap < maxDuration route.
  let last: AiUnavailableError | null = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return await requestOnce(cfg, input);
    } catch (e) {
      last = e instanceof AiUnavailableError ? e : new AiUnavailableError("AI tidak dapat dihubungi");
      if (!(last instanceof AiRetryableError)) break;
    }
  }
  throw last ?? new AiUnavailableError("AI tidak dapat dihubungi");
}

/** Timeout, gangguan jaringan, 429, atau 5xx: layak dicoba ulang. */
class AiRetryableError extends AiUnavailableError {}

async function requestOnce(cfg: AiConfig, input: { system: string; user: string; image: Uint8Array; mime: string }): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), cfg.timeoutMs);
  try {
    const dataUrl = `data:${input.mime};base64,${Buffer.from(input.image).toString("base64")}`;
    const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${cfg.apiKey}` },
      body: JSON.stringify({
        model: cfg.model,
        temperature: 0,
        stream: true,
        max_tokens: 300,
        messages: [
          { role: "system", content: input.system },
          {
            role: "user",
            content: [
              { type: "text", text: input.user },
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          },
        ],
      }),
    });
    if (!res.ok) {
      const Err = res.status === 429 || res.status >= 500 ? AiRetryableError : AiUnavailableError;
      const detail = (await res.text().catch(() => "")).replace(/\s+/g, " ").slice(0, 200);
      throw new Err(`AI membalas HTTP ${res.status} (model ${cfg.model}): ${detail}`);
    }
    const raw = await res.text();
    const text = (res.headers.get("content-type") ?? "").includes("text/event-stream") || raw.trimStart().startsWith("data:")
      ? readSse(raw)
      : readJson(raw);
    if (!text) throw new AiUnavailableError("Balasan AI tidak berisi teks");
    return text;
  } catch (e) {
    if (e instanceof AiUnavailableError) throw e;
    throw new AiRetryableError(
      e instanceof Error && e.name === "AbortError"
        ? `AI tidak membalas dalam ${cfg.timeoutMs} ms`
        : `AI tidak dapat dihubungi: ${e instanceof Error ? (e.cause instanceof Error ? e.cause.message : e.message) : String(e)}`,
    );
  } finally {
    clearTimeout(timer);
  }
}
