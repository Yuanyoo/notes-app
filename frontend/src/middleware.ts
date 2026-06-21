import { NextRequest, NextResponse } from "next/server";

import { COOKIE_NAMES } from "@/lib/cookies";

const PUBLIC_PATHS = ["/login", "/api/auth"];

export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Check for access cookie (presence check only — full validation is in /api/auth/me)
  const hasAccess = request.cookies.has(COOKIE_NAMES.access);
  if (!hasAccess) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|illustrations/).*)"],
};
