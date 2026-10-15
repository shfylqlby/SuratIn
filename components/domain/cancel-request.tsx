"use client";

import { useActionState, useState } from "react";
import { cancelRequestAction } from "@/app/actions/requests";
import type { ActionState } from "@/lib/action-state";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";

export function CancelRequest({ requestId }: { requestId: string }) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState<ActionState, FormData>(cancelRequestAction, {});

  if (!open) {
    return (
      <Button variant="hantu" size="sm" onClick={() => setOpen(true)} className="text-redup hover:text-tolak">
        Batalkan permohonan
      </Button>
    );
  }
  return (
    <form action={action} className="space-y-3 rounded-[var(--radius-kartu)] border border-tolak/30 bg-tolak-50 p-4">
      <input type="hidden" name="request_id" value={requestId} />
      <p className="font-semibold text-teks">Batalkan permohonan ini?</p>
      <p className="text-sm text-redup">Permohonan yang dibatalkan tidak bisa dilanjutkan. Anda perlu mengajukan baru jika membutuhkan surat ini lagi.</p>
      {state.error ? <p className="text-sm font-medium text-tolak">{state.error}</p> : null}
      <div className="flex flex-wrap gap-2">
        <SubmitButton variant="bahaya" size="sm" pendingText="Membatalkan…">
          Ya, batalkan
        </SubmitButton>
        <Button type="button" variant="garis" size="sm" onClick={() => setOpen(false)}>
          Tidak jadi
        </Button>
      </div>
    </form>
  );
}
