"use client";

import { Notice } from "@/components/ui/notice";
import { Button } from "@/components/ui/button";

export default function SegmentError({ reset }: { error: Error; reset: () => void }) {
  return (
    <Notice
      tone="galat"
      title="Halaman gagal dimuat"
      action={
        <Button variant="garis" onClick={reset}>
          Coba lagi
        </Button>
      }
    >
      Terjadi gangguan saat mengambil data. Periksa koneksi internet, lalu coba lagi.
    </Notice>
  );
}
