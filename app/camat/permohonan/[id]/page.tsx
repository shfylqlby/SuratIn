import { redirect } from "next/navigation";

/** Rute tanda tangan camat lama: camat kini hanya memantau (PRD revisi 1 K2). */
export default function LegacyCamatRoute() {
  redirect("/camat");
}
