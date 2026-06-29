import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { AUTH_COOKIE } from "./lib/auth";

const PUBLIC_PATHS = ["/gate", "/login"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAuthenticated = request.cookies.get(AUTH_COOKIE)?.value === "true";

  if (pathname.startsWith("/api/login")) {
    return NextResponse.next();
  }

  const isPublic = PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );

  if (isAuthenticated && pathname === "/login") {
    const response = NextResponse.next();
    response.cookies.delete(AUTH_COOKIE);
    return response;
  }

  if (isAuthenticated && pathname === "/gate") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (!isAuthenticated && !isPublic) {
    return NextResponse.redirect(new URL("/gate", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)" ],
};
