import type { ComponentProps, ReactNode } from "react";
import { ChevronDown, CircleAlert } from "lucide-react";
import { cn } from "@/lib/cn";

export const inputClass =
  "block w-full min-h-12 rounded-[var(--radius-tombol)] border border-garis bg-lembar px-3.5 py-2.5 text-base text-teks placeholder:text-redup/70 transition-colors hover:border-tinta-600/50 focus:border-tinta-700 focus:outline-none focus-visible:outline-3 focus-visible:outline-map-500 aria-[invalid=true]:border-tolak";

/** Hanya untuk input/textarea: <select> selalu cocok dengan :read-only di Chrome sehingga tampak nonaktif. */
const readOnlyClass = "read-only:bg-kertas read-only:text-redup";

export function Field({
  id,
  label,
  hint,
  error,
  required,
  children,
  className,
}: {
  id: string;
  label: string;
  hint?: ReactNode;
  error?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={id} className="block text-[0.95rem] font-semibold text-teks">
        {label}
        {required ? null : <span className="ml-1.5 font-normal text-redup">(opsional)</span>}
      </label>
      {hint ? (
        <p id={`${id}-hint`} className="text-sm text-redup">
          {hint}
        </p>
      ) : null}
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="flex items-start gap-1.5 text-sm font-medium text-tolak">
          <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function describedBy(id: string, hint?: unknown, error?: unknown) {
  return [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(" ") || undefined;
}

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(inputClass, readOnlyClass, className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(inputClass, readOnlyClass, "min-h-28 resize-y", className)} {...props} />;
}

export function Select({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <div className="relative">
      <select className={cn(inputClass, "appearance-none pr-10", className)} {...props}>
        {children}
      </select>
      <ChevronDown aria-hidden className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-tinta-800" />
    </div>
  );
}
