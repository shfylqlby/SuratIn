"use client";

import { useEffect } from "react";

/** Menghapus draf lokal setelah permohonan berhasil dikirim. */
export function ClearDraft({ keys }: { keys: string[] }) {
  useEffect(() => {
    for (const k of keys) localStorage.removeItem(k);
  }, [keys]);
  return null;
}
