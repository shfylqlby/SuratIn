import type { z } from "zod";
import { validateIzinKeramaian } from "./izin_keramaian";

type Validator = (values: Record<string, string>, ctx: z.RefinementCtx) => void;

/** Validasi khusus per jenis surat (kode). Dipanggil di klien dan server lewat buildFormZod. */
export const letterValidators: Record<string, Validator> = {
  izin_keramaian: validateIzinKeramaian,
};
