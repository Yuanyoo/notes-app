/**
 * General proxy for Django API endpoints.
 * All /api/proxy/** requests are forwarded to the backend with the Bearer token
 * extracted from the httpOnly access cookie.
 *
 * Browser JS calls /api/proxy/notes/ → this handler → http://backend:8000/api/notes/
 */

import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { getAccessToken } from "@/lib/cookies";

const BACKEND = process.env.BACKEND_INTERNAL_URL ?? "http://localhost:8000";

type Params = { path: string[] };

async function proxy(request: NextRequest, params: Params): Promise<NextResponse> {
  const cookieStore = await cookies();
  const accessToken = getAccessToken(cookieStore);

  if (!accessToken) {
    return NextResponse.json({ detail: "Not authenticated." }, { status: 401 });
  }

  const pathSegment = params.path.join("/");
  const queryString = request.nextUrl.search;
  const backendUrl = `${BACKEND}/api/${pathSegment}/${queryString}`;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };

  let body: string | undefined;
  if (!["GET", "HEAD"].includes(request.method)) {
    body = await request.text();
  }

  const res = await fetch(backendUrl, {
    method: request.method,
    headers,
    body,
    cache: "no-store",
  });

  // 204 No Content has no body — return it directly without trying to parse JSON
  if (res.status === 204) {
    return new NextResponse(null, { status: 204 });
  }

  const data: unknown = await res.json().catch(() => null);
  return NextResponse.json(data, { status: res.status });
}

export const GET = (req: NextRequest, { params }: { params: Params }) => proxy(req, params);
export const POST = (req: NextRequest, { params }: { params: Params }) => proxy(req, params);
export const PATCH = (req: NextRequest, { params }: { params: Params }) => proxy(req, params);
export const PUT = (req: NextRequest, { params }: { params: Params }) => proxy(req, params);
export const DELETE = (req: NextRequest, { params }: { params: Params }) => proxy(req, params);
