import "server-only";
import { cookies } from "next/headers";
import { SIDEBAR_COOKIE } from "@/lib/nav";

/** Apakah pengguna terakhir kali menciutkan sidebar desktop. */
export async function sidebarCollapsed() {
  return (await cookies()).get(SIDEBAR_COOKIE)?.value === "ciut";
}
