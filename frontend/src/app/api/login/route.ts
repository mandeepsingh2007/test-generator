import { NextResponse } from "next/server";

const AUTH_COOKIE = "tg_auth";
const VALID_ID = "testid";
const VALID_PASSWORD = "testpass";

export async function POST(request: Request) {
  let body: { id?: string; password?: string };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const id = body.id?.trim() ?? "";
  const password = body.password ?? "";

  if (!(id === VALID_ID && password === VALID_PASSWORD)) {
    return NextResponse.json(
      { error: "Invalid ID or password. Please try again." },
      { status: 401 }
    );
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set(AUTH_COOKIE, "true", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return response;
}
