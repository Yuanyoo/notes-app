import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import * as oauth from "oauth4webapi";

import { CALLBACK_URL, cognitoClient, getAuthServer } from "@/lib/cognito";
import { COOKIE_NAMES, setAuthCookies } from "@/lib/cookies";

// Public client auth (PKCE — no client secret)
const clientAuth = oauth.None();

export async function GET(request: NextRequest): Promise<NextResponse> {
  const cookieStore = await cookies();

  const codeVerifier = cookieStore.get(COOKIE_NAMES.pkce_verifier)?.value;
  const expectedState = cookieStore.get(COOKIE_NAMES.pkce_state)?.value;

  if (!codeVerifier || !expectedState) {
    return NextResponse.redirect(new URL("/login?error=missing_pkce", request.url));
  }

  const authServer = await getAuthServer();

  let params: URLSearchParams;
  try {
    params = oauth.validateAuthResponse(
      authServer,
      cognitoClient,
      new URL(request.url),
      expectedState
    );
  } catch {
    return NextResponse.redirect(new URL("/login?error=invalid_state", request.url));
  }

  const tokenResponse = await oauth.authorizationCodeGrantRequest(
    authServer,
    cognitoClient,
    clientAuth,
    params,
    CALLBACK_URL,
    codeVerifier
  );

  let result: oauth.TokenEndpointResponse;
  try {
    result = await oauth.processAuthorizationCodeResponse(authServer, cognitoClient, tokenResponse);
  } catch {
    return NextResponse.redirect(new URL("/login?error=token_exchange_failed", request.url));
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const res = NextResponse.redirect(new URL("/notes", appUrl));

  setAuthCookies(res.cookies, {
    access_token: result.access_token,
    refresh_token: result.refresh_token,
    id_token: typeof result.id_token === "string" ? result.id_token : undefined,
  });

  res.cookies.set(COOKIE_NAMES.pkce_verifier, "", { httpOnly: true, maxAge: 0, path: "/" });
  res.cookies.set(COOKIE_NAMES.pkce_state, "", { httpOnly: true, maxAge: 0, path: "/" });

  return res;
}
