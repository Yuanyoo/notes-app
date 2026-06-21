import Link from "next/link";

import { DevLoginForm } from "@/components/auth/DevLoginForm";

const IS_DEV_MODE = !process.env.COGNITO_CLIENT_ID;

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-[#faf1e3] flex items-center justify-center">
      <div className="flex flex-col items-center gap-6 w-full max-w-sm px-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/illustrations/cat-sleeping.png"
          alt="Sleeping cat"
          width={188}
          height={134}
          className="object-contain"
        />

        {/* Heading */}
        <h1 className="font-serif font-bold text-[48px] leading-tight text-[#88642a] text-center whitespace-nowrap">
          Yay, You&apos;re Back!
        </h1>

        {IS_DEV_MODE ? (
          /* ── Dev mode: email-only form, no Cognito needed ── */
          <DevLoginForm />
        ) : (
          /* ── Production: Cognito PKCE flow ── */
          <>
            <div className="w-full space-y-3">
              <div className="border border-[#957139] rounded-md h-[39px] flex items-center px-4">
                <span className="text-xs text-black/30 font-sans">Email address</span>
              </div>
              <div className="border border-[#957139] rounded-md h-[39px] flex items-center px-4">
                <span className="text-xs text-black/30 font-sans">Password</span>
              </div>
            </div>

            <Link
              href="/api/auth/login"
              className="w-full border border-[#957139] rounded-full h-[43px] flex items-center justify-center text-[#957139] font-sans font-bold text-base hover:bg-[#957139]/10 transition-colors"
            >
              Log In with Cognito
            </Link>

            <p className="text-xs font-sans text-black/60">
              <Link
                href="/api/auth/login"
                className="text-[#957139] underline underline-offset-2"
              >
                Oops! I&apos;ve never been here before
              </Link>
            </p>
          </>
        )}
      </div>
    </main>
  );
}
