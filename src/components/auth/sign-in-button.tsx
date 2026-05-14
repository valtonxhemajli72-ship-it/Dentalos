"use client";

import { signIn } from "next-auth/react";

type SignInButtonProps = {
  providerId: "google";
  callbackUrl?: string;
};

export function SignInButton({ providerId, callbackUrl = "/dashboard" }: SignInButtonProps) {
  return (
    <button
      type="button"
      onClick={() => {
        void signIn(providerId, { callbackUrl });
      }}
      className="inline-flex min-h-11 items-center justify-center rounded-md bg-brand-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
    >
      Continue with Google
    </button>
  );
}
