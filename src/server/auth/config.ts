import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { env } from "@/lib/env";

type GoogleProfile = {
  email?: string;
  email_verified?: boolean;
};

export function getAuthSecret(): string | undefined {
  return env.authSecret ?? env.nextAuthSecret;
}

export function isGoogleOAuthConfigured(): boolean {
  return Boolean(env.authGoogleId && env.authGoogleSecret);
}

export function isRealAuthProviderConfigured(): boolean {
  return Boolean(getAuthSecret() && isGoogleOAuthConfigured());
}

export function getConfiguredAuthProviderIds(): string[] {
  return isGoogleOAuthConfigured() ? ["google"] : [];
}

export const authOptions: NextAuthOptions = {
  secret: getAuthSecret(),
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/sign-in",
    error: "/sign-in",
  },
  providers: [
    ...(env.authGoogleId && env.authGoogleSecret
      ? [
          GoogleProvider({
            clientId: env.authGoogleId,
            clientSecret: env.authGoogleSecret,
          }),
        ]
      : []),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (!user.email) {
        return false;
      }

      if (account?.provider === "google") {
        const googleProfile = profile as GoogleProfile | undefined;

        if (googleProfile?.email_verified === false) {
          return false;
        }
      }

      return true;
    },
  },
};
