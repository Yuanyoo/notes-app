import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { clearAuthCookies } from "@/lib/cookies";
import { cognitoDomain, COGNITO_CLIENT_ID } from "@/lib/cognito";

export async function POST(): Promise<NextResponse> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const logoutUri = encodeURIComponent(appUrl);
  const cognitoLogoutUrl = `${cognitoDomain()}/logout?client_id=${COGNITO_CLIENT_ID}&logout_uri=${logoutUri}`;

  const res = NextResponse.redirect(cognitoLogoutUrl);
  const cookieStore = await cookies();
  void cookieStore;
  clearAuthCookies(res.cookies);
  return res;
}
