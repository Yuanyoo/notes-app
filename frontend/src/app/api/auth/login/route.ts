import { NextResponse } from "next/server";

import * as oauth from "oauth4webapi";

import {
  CALLBACK_URL,
  COGNITO_CLIENT_ID,
  getAuthServer,
} from "@/lib/cognito";
import { COOKIE_NAMES } from "@/lib/cookies";

export async function GET(): Promise<NextResponse> {
  const authServer = await getAuthServer();

  const codeVerifier = oauth.generateRandomCodeVerifier();
  const codeChallenge = await oauth.calculatePKCECodeChallenge(codeVerifier);
  const state = oauth.generateRandomState();

  const authUrl = new URL(authServer.authorization_endpoint!);
  authUrl.searchParams.set("client_id", COGNITO_CLIENT_ID);
  authUrl.searchParams.set("redirect_uri", CALLBACK_URL);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "openid email profile");
  authUrl.searchParams.set("code_challenge", codeChallenge);
  authUrl.searchParams.set("code_challenge_method", "S256");
  authUrl.searchParams.set("state", state);

  const res = NextResponse.redirect(authUrl);
  const opts = { httpOnly: true, sameSite: "lax" as const, path: "/", maxAge: 600 };
  res.cookies.set(COOKIE_NAMES.pkce_verifier, codeVerifier, opts);
  res.cookies.set(COOKIE_NAMES.pkce_state, state, opts);
  return res;
}
