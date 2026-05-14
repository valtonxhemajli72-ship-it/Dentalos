"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() => {
        void signOut({ callbackUrl: "/" });
      }}
      className="rounded-md border border-line bg-white px-3 py-2 text-sm font-semibold text-ink transition hover:bg-surface"
    >
      Sign out
    </button>
  );
}
