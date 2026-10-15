"use client";

import { useFormStatus } from "react-dom";
import { LoaderCircle } from "lucide-react";
import type { ComponentProps } from "react";
import { Button } from "./button";

export function SubmitButton({
  children,
  pendingText,
  ...props
}: ComponentProps<typeof Button> & { pendingText: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" {...props} disabled={pending || props.disabled} aria-busy={pending}>
      {pending ? (
        <>
          <LoaderCircle aria-hidden className="motion-safe:animate-spin" /> {pendingText}
        </>
      ) : (
        children
      )}
    </Button>
  );
}
