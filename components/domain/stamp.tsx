import { useId } from "react";
import { cn } from "@/lib/cn";

/** Stempel digital generik (bukan lambang resmi). Dipakai sebagai motif di UI. */
export function StampMark({
  ring = "KECAMATAN MAJU JAYA • KELURAHAN SIDOMULYO •",
  center = ["LURAH", "2026"],
  className,
  animate = false,
}: {
  ring?: string;
  center?: string[];
  className?: string;
  animate?: boolean;
}) {
  const id = useId().replace(/:/g, "");
  return (
    <svg
      viewBox="0 0 120 120"
      aria-hidden
      className={cn("text-stempel", animate && "motion-safe:animate-cap", !animate && "rotate-[-14deg] opacity-[0.88]", className)}
    >
      <defs>
        <path id={`ring-${id}`} d="M 60 60 m -42 0 a 42 42 0 1 1 84 0 a 42 42 0 1 1 -84 0" />
      </defs>
      <circle cx="60" cy="60" r="56" fill="none" stroke="currentColor" strokeWidth="3.2" />
      <circle cx="60" cy="60" r="51.5" fill="none" stroke="currentColor" strokeWidth="1" />
      <circle cx="60" cy="60" r="31" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <text fill="currentColor" fontSize="8.4" fontWeight="700" letterSpacing="0.6" fontFamily="var(--font-sans)">
        <textPath href={`#ring-${id}`} textLength="258" lengthAdjust="spacingAndGlyphs">
          {ring}
        </textPath>
      </text>
      {center.map((line, i) => (
        <text
          key={line}
          x="60"
          y={60 + (i - (center.length - 1) / 2) * 12 + 4}
          textAnchor="middle"
          fill="currentColor"
          fontSize={i === 0 ? 11 : 9.5}
          fontWeight="800"
          fontFamily="var(--font-sans)"
        >
          {line}
        </text>
      ))}
      <path d="M 37 60 l 1.5 -3.4 l 1.5 3.4 l -3 -2 h 3 z" fill="currentColor" />
      <path d="M 80 60 l 1.5 -3.4 l 1.5 3.4 l -3 -2 h 3 z" fill="currentColor" />
    </svg>
  );
}
