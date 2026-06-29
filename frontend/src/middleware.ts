import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const AUTH_COOKIE = "tg_auth";

const PUBLIC_PATHS = ["/gate", "/login"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAuthenticated = request.cookies.get(AUTH_COOKIE)?.value === "true";

  if (pathname.startsWith("/api/login")) {
    return NextResponse.next();
  }

  // Force login page and clear session for the root URL
  if (pathname === "/") {
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete(AUTH_COOKIE);
    return response;
  }

  const isPublic = PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );

  if (pathname === "/login") {
    const response = NextResponse.next();
    response.cookies.delete(AUTH_COOKIE);
    return response;
  }

  if (isAuthenticated && pathname === "/gate") {
    return NextResponse.redirect(new URL("/home", request.url));
  }

  if (!isAuthenticated && !isPublic) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)" ],
};
