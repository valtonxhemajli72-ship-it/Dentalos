import { PrismaClient } from "@prisma/client";
import { env } from "@/lib/env";

export type DatabaseRequestContext = {
  tenantId: string;
  actorUserId?: string;
};

export const databaseAccessRules = [
  "Resolve tenant context before tenant-owned queries.",
  "Filter tenant-owned records by tenantId.",
  "Keep PII out of logs and audit metadata.",
] as const;

export class DatabaseUnavailableError extends Error {
  constructor(message = "Database is not configured or unavailable.") {
    super(message);
    this.name = "DatabaseUnavailableError";
  }
}

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export function isDatabaseConfigured(): boolean {
  return Boolean(env.databaseUrl && !env.databaseUrl.includes("USER:PASSWORD@HOST"));
}

export function getPrismaClient(): PrismaClient {
  if (!isDatabaseConfigured()) {
    throw new DatabaseUnavailableError("DATABASE_URL is not configured.");
  }

  globalForPrisma.prisma ??= new PrismaClient();
  return globalForPrisma.prisma;
}
