/**
 * Helpers for the Cognito OIDC PKCE flow executed in Next.js Route Handlers.
 * All token handling happens server-side — no tokens reach the browser.
 */

import * as client from "oauth4webapi";

const COGNITO_REGION = process.env.COGNITO_REGION ?? "";
const COGNITO_USER_POOL_ID = process.env.COGNITO_USER_POOL_ID ?? "";
const COGNITO_CLIENT_ID = process.env.COGNITO_CLIENT_ID ?? "";
const COGNITO_DOMAIN = process.env.COGNITO_DOMAIN ?? "";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const CALLBACK_URL = `${APP_URL}/api/auth/callback`;

export const issuerUrl = new URL(
  `https://cognito-idp.${COGNITO_REGION}.amazonaws.com/${COGNITO_USER_POOL_ID}`
);

export const cognitoClient: client.Client = {
  client_id: COGNITO_CLIENT_ID,
  token_endpoint_auth_method: "none",
};

let _authServer: client.AuthorizationServer | null = null;

export async function getAuthServer(): Promise<client.AuthorizationServer> {
  if (_authServer) return _authServer;
  const response = await client.discoveryRequest(issuerUrl, { algorithm: "oidc" });
  _authServer = await client.processDiscoveryResponse(issuerUrl, response);
  return _authServer;
}

export function cognitoDomain(): string {
  return COGNITO_DOMAIN
    ? `https://${COGNITO_DOMAIN}`
    : `https://${COGNITO_USER_POOL_ID}.auth.${COGNITO_REGION}.amazoncognito.com`;
}

export { client, COGNITO_CLIENT_ID };
