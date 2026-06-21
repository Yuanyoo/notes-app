import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getAccessToken } from "@/lib/cookies";

const BACKEND = process.env.BACKEND_INTERNAL_URL ?? "http://localhost:8000";

export async function GET(): Promise<NextResponse> {
  const cookieStore = await cookies();
  const accessToken = getAccessToken(cookieStore);

  if (!accessToken) {
    return NextResponse.json({ detail: "Not authenticated." }, { status: 401 });
  }

  const res = await fetch(`${BACKEND}/api/auth/me`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  const data: unknown = await res.json();
  return NextResponse.json(data, { status: res.status });
}
