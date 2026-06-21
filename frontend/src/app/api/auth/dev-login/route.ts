import { NextRequest, NextResponse } from "next/server";

import { COOKIE_NAMES } from "@/lib/cookies";

const BACKEND = process.env.BACKEND_INTERNAL_URL ?? "http://localhost:8000";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = (await request.json()) as { email?: string };
  const email = (body.email ?? "").trim().toLowerCase();

  if (!email || !email.includes("@")) {
    return NextResponse.json({ detail: "Valid email required." }, { status: 400 });
  }

  let backendRes: Response;
  try {
    backendRes = await fetch(`${BACKEND}/api/auth/dev-token/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
  } catch {
    return NextResponse.json(
      { detail: "Django is not running. Start it with: python manage.py runserver" },
      { status: 503 }
    );
  }

  // Guard against Django returning an HTML error page instead of JSON
  const contentType = backendRes.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    const text = await backendRes.text();
    console.error("[dev-login] Django returned non-JSON:", text.slice(0, 300));
    return NextResponse.json(
      { detail: `Django returned an unexpected response (${backendRes.status}). Did you restart Django after the last code change?` },
      { status: 502 }
    );
  }

  if (!backendRes.ok) {
    const err = (await backendRes.json()) as { detail?: string };
    return NextResponse.json(err, { status: backendRes.status });
  }

  const { access_token } = (await backendRes.json()) as { access_token: string };

  const response = NextResponse.json({ ok: true });
  response.cookies.set(COOKIE_NAMES.access, access_token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 86400 * 30, // 30 days
    secure: process.env.COOKIE_SECURE === "true",
  });
  return response;
}
