import type { ReactNode } from "react";

/** Keadaan kosong: lembar kertas kosong bergaris + ajakan bertindak. */
export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-[var(--radius-kartu)] border border-dashed border-garis bg-lembar/60 px-6 py-12 text-center">
      <svg viewBox="0 0 64 72" aria-hidden className="mb-4 h-16 w-14 text-tinta-800/40">
        <path d="M6 4h36l16 16v48H6z" fill="#fff" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <path d="M42 4v16h16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <path d="M16 32h32M16 42h32M16 52h20" stroke="currentColor" strokeWidth="2" strokeDasharray="3 4" strokeLinecap="round" />
      </svg>
      <p className="font-display text-lg font-semibold text-teks">{title}</p>
      {children ? <div className="mt-1 max-w-sm text-redup">{children}</div> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
