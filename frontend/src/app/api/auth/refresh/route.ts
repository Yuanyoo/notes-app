import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import * as oauth from "oauth4webapi";

import { cognitoClient, getAuthServer } from "@/lib/cognito";
import { COOKIE_NAMES, getRefreshToken, setAuthCookies } from "@/lib/cookies";

const clientAuth = oauth.None();

export async function POST(): Promise<NextResponse> {
  const cookieStore = await cookies();
  const refreshToken = getRefreshToken(cookieStore);

  if (!refreshToken) {
    return NextResponse.json({ detail: "No refresh token." }, { status: 401 });
  }

  const authServer = await getAuthServer();

  const tokenResponse = await oauth.refreshTokenGrantRequest(
    authServer,
    cognitoClient,
    clientAuth,
    refreshToken
  );

  let result: oauth.TokenEndpointResponse;
  try {
    result = await oauth.processRefreshTokenResponse(authServer, cognitoClient, tokenResponse);
  } catch {
    return NextResponse.json({ detail: "Refresh failed." }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });

  setAuthCookies(res.cookies, {
    access_token: result.access_token,
    refresh_token: result.refresh_token ?? refreshToken,
    id_token: typeof result.id_token === "string" ? result.id_token : undefined,
  });

  res.cookies.set(COOKIE_NAMES.pkce_verifier, "", { httpOnly: true, maxAge: 0, path: "/" });

  return res;
}
