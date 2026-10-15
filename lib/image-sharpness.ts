/**
 * Cek ketajaman foto di browser (PRD §8.5): varians Laplacian pada versi abu-abu yang diperkecil.
 * Tanpa memanggil AI dan tanpa mengirim gambar ke mana pun. Hasilnya hanya peringatan, tidak memblokir.
 *
 * Laplacian 4-tetangga menonjolkan tepi. Foto tajam (teks KTP/KK terbaca) punya banyak tepi kontras
 * sehingga variansnya tinggi; foto buram/goyang punya tepi landai sehingga variansnya rendah.
 */

/** Sisi terpanjang gambar yang dianalisis. Ukuran tetap membuat ambang konsisten antar resolusi kamera. */
export const SHARPNESS_SIDE = 640;
/**
 * Di bawah nilai ini foto dianggap buram. Kalibrasi pada KTP sintetis 1400 px (JPEG 80) yang diperkecil ke 640 px:
 * tajam ≈ 5000, blur σ1 ≈ 2500, σ2 ≈ 320 (masih terbaca), σ3 ≈ 43 (teks kecil sulit dibaca), σ4 ≈ 11.
 * Ambang sengaja rendah agar foto tajam yang kontrasnya rendah (cahaya redup) tidak ikut diperingatkan.
 */
export const BLUR_THRESHOLD = 50;

/** Varians Laplacian dari citra abu-abu (0–255), baris demi baris. Fungsi murni agar bisa diuji di Node. */
export function laplacianVariance(gray: Uint8Array | Uint8ClampedArray, width: number, height: number): number {
  if (width < 3 || height < 3) return 0;
  let sum = 0;
  let sumSq = 0;
  let n = 0;
  for (let y = 1; y < height - 1; y++) {
    const row = y * width;
    for (let x = 1; x < width - 1; x++) {
      const i = row + x;
      const v = gray[i - width] + gray[i + width] + gray[i - 1] + gray[i + 1] - 4 * gray[i];
      sum += v;
      sumSq += v * v;
      n++;
    }
  }
  const mean = sum / n;
  return sumSq / n - mean * mean;
}

/** Ubah RGBA (ImageData) ke abu-abu dengan bobot luminans BT.601. */
export function toGray(rgba: Uint8ClampedArray, width: number, height: number): Uint8Array {
  const gray = new Uint8Array(width * height);
  for (let i = 0, p = 0; i < gray.length; i++, p += 4) {
    gray[i] = (rgba[p] * 299 + rgba[p + 1] * 587 + rgba[p + 2] * 114) / 1000;
  }
  return gray;
}

export interface SharpnessResult {
  score: number;
  blurry: boolean;
}

/** Hanya di browser. Gagal apa pun (format tak didukung, canvas diblokir) → null, alur unggah tetap lanjut. */
export async function measureSharpness(file: Blob): Promise<SharpnessResult | null> {
  if (!file.type.startsWith("image/")) return null;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, SHARPNESS_SIDE / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(3, Math.round(bitmap.width * scale));
    const height = Math.max(3, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    const { data } = ctx.getImageData(0, 0, width, height);
    const score = laplacianVariance(toGray(data, width, height), width, height);
    return { score: Math.round(score), blurry: score < BLUR_THRESHOLD };
  } catch {
    return null;
  }
}
