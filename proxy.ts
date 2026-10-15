import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";
import { ROLE_HOME } from "@/lib/format";

const PROTECTED: Array<{ prefix: string; roles: string[] }> = [
  { prefix: "/warga", roles: ["warga"] },
  { prefix: "/rt", roles: ["rt_rw"] },
  { prefix: "/admin", roles: ["admin_kelurahan", "super_admin"] },
  { prefix: "/camat", roles: ["camat", "super_admin"] },
];

/**
 * Pengecekan awal (optimistic). Otorisasi sebenarnya tetap dilakukan di setiap
 * halaman, server action, route handler (requireRole) dan di database (RLS + fungsi).
 */
export async function proxy(request: NextRequest) {
  const { response, user, role } = await updateSession(request);
  const { pathname } = request.nextUrl;

  const rule = PROTECTED.find((r) => pathname === r.prefix || pathname.startsWith(`${r.prefix}/`));
  if (rule) {
    if (!user) {
      const url = new URL("/masuk", request.url);
      url.searchParams.set("lanjut", pathname);
      return NextResponse.redirect(url);
    }
    if (!role || !rule.roles.includes(role)) {
      return NextResponse.redirect(new URL(role ? ROLE_HOME[role as keyof typeof ROLE_HOME] ?? "/" : "/", request.url));
    }
  }

  if (user && role && (pathname === "/masuk" || pathname === "/daftar")) {
    return NextResponse.redirect(new URL(ROLE_HOME[role as keyof typeof ROLE_HOME] ?? "/", request.url));
  }

  return response();
}

export const config = {
  matcher: ["/warga/:path*", "/rt/:path*", "/admin/:path*", "/camat/:path*", "/masuk", "/daftar"],
};
