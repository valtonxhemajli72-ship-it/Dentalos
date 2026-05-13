type OptionalEnvName =
  | "DATABASE_URL"
  | "AUTH_SECRET"
  | "OPENAI_API_KEY"
  | "RESEND_API_KEY"
  | "TWILIO_ACCOUNT_SID"
  | "TWILIO_AUTH_TOKEN";

export const env = {
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  databaseUrl: process.env.DATABASE_URL,
  authSecret: process.env.AUTH_SECRET,
  openAiApiKey: process.env.OPENAI_API_KEY,
  resendApiKey: process.env.RESEND_API_KEY,
  twilioAccountSid: process.env.TWILIO_ACCOUNT_SID,
  twilioAuthToken: process.env.TWILIO_AUTH_TOKEN,
};

export function getRequiredEnv(name: OptionalEnvName): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function hasConfiguredIntegration(names: OptionalEnvName[]): boolean {
  return names.every((name) => Boolean(process.env[name]));
}
