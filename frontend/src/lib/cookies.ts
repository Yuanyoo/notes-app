import { ResponseCookies } from "next/dist/compiled/@edge-runtime/cookies";
import { ReadonlyRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies";

const SECURE = process.env.COOKIE_SECURE === "true";
const BASE_OPTS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: SECURE,
  path: "/",
};

export const COOKIE_NAMES = {
  access: "cognito_access",
  refresh: "cognito_refresh",
  id: "cognito_id",
  pkce_verifier: "pkce_verifier",
  pkce_state: "pkce_state",
} as const;

export function setAuthCookies(
  cookies: ResponseCookies,
  tokens: { access_token: string; refresh_token?: string; id_token?: string }
) {
  cookies.set(COOKIE_NAMES.access, tokens.access_token, {
    ...BASE_OPTS,
    maxAge: 60 * 60, // 1 hour (Cognito default)
  });

  if (tokens.refresh_token) {
    cookies.set(COOKIE_NAMES.refresh, tokens.refresh_token, {
      ...BASE_OPTS,
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });
  }

  if (tokens.id_token) {
    cookies.set(COOKIE_NAMES.id, tokens.id_token, {
      ...BASE_OPTS,
      maxAge: 60 * 60,
    });
  }
}

export function clearAuthCookies(cookies: ResponseCookies) {
  [COOKIE_NAMES.access, COOKIE_NAMES.refresh, COOKIE_NAMES.id].forEach((name) =>
    cookies.set(name, "", { ...BASE_OPTS, maxAge: 0 })
  );
}

export function getAccessToken(cookies: ReadonlyRequestCookies): string | undefined {
  return cookies.get(COOKIE_NAMES.access)?.value;
}

export function getRefreshToken(cookies: ReadonlyRequestCookies): string | undefined {
  return cookies.get(COOKIE_NAMES.refresh)?.value;
}
