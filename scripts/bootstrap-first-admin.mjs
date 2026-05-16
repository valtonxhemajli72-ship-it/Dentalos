import { spawnSync } from "node:child_process";
import { timingSafeEqual } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const moduleWarningFlag = "--disable-warning=MODULE_TYPELESS_PACKAGE_JSON";

if (!process.execArgv.includes(moduleWarningFlag)) {
  const scriptPath = fileURLToPath(import.meta.url);
  const result = spawnSync(
    process.execPath,
    [moduleWarningFlag, scriptPath, ...process.argv.slice(2)],
    {
      env: process.env,
      stdio: "inherit",
      windowsHide: true,
    },
  );

  process.exit(result.status ?? 1);
}

loadOptionalEnvFile(".env.local");
loadOptionalEnvFile(".env");

const args = parseArgs(process.argv.slice(2));

try {
  assertBootstrapSecret({
    expectedSecret: process.env.SETUP_BOOTSTRAP_SECRET,
    suppliedSecret: getArgValue(args, "bootstrap-secret") ?? process.env.BOOTSTRAP_SECRET,
    allowInsecureLocal:
      process.env.NODE_ENV === "development" &&
      (getArgFlag(args, "allow-insecure-local") ||
        process.env.BOOTSTRAP_ALLOW_INSECURE_LOCAL === "true"),
  });

  const { PrismaClient } = await import("@prisma/client");
  const { bootstrapFirstTenantOwner } = await import("../src/modules/tenants/bootstrap.ts");
  const prisma = new PrismaClient();

  try {
    const result = await bootstrapFirstTenantOwner(
      {
        tenantName: getArgValue(args, "tenant-name") ?? process.env.BOOTSTRAP_TENANT_NAME,
        ownerEmail: getArgValue(args, "owner-email") ?? process.env.BOOTSTRAP_OWNER_EMAIL,
        ownerName: getArgValue(args, "owner-name") ?? process.env.BOOTSTRAP_OWNER_NAME,
      },
      { db: prisma },
    );

    printSafeSummary(result);
  } finally {
    await prisma.$disconnect();
  }
} catch (error) {
  printSafeFailure(error);
  process.exit(1);
}

function parseArgs(argv) {
  const parsed = new Map();

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (!token.startsWith("--")) {
      throw new Error("Unsupported bootstrap argument format.");
    }

    const withoutPrefix = token.slice(2);
    const equalsIndex = withoutPrefix.indexOf("=");
    const rawKey = equalsIndex >= 0 ? withoutPrefix.slice(0, equalsIndex) : withoutPrefix;
    const inlineValue = equalsIndex >= 0 ? withoutPrefix.slice(equalsIndex + 1) : undefined;

    if (!rawKey) {
      throw new Error("Unsupported bootstrap argument format.");
    }

    if (inlineValue !== undefined) {
      parsed.set(rawKey, inlineValue);
      continue;
    }

    const nextToken = argv[index + 1];

    if (!nextToken || nextToken.startsWith("--")) {
      parsed.set(rawKey, true);
      continue;
    }

    parsed.set(rawKey, nextToken);
    index += 1;
  }

  return parsed;
}

function getArgValue(args, key) {
  const value = args.get(key);
  return typeof value === "string" ? value : undefined;
}

function getArgFlag(args, key) {
  return args.get(key) === true || args.get(key) === "true";
}

function assertBootstrapSecret({ expectedSecret, suppliedSecret, allowInsecureLocal }) {
  if (allowInsecureLocal) {
    return;
  }

  if (!expectedSecret || !suppliedSecret) {
    throw new Error(
      "Bootstrap secret is required. Configure SETUP_BOOTSTRAP_SECRET and provide BOOTSTRAP_SECRET.",
    );
  }

  if (!safeSecretEquals(expectedSecret, suppliedSecret)) {
    throw new Error("Bootstrap secret did not match.");
  }
}

function safeSecretEquals(expectedSecret, suppliedSecret) {
  const expected = Buffer.from(expectedSecret);
  const supplied = Buffer.from(suppliedSecret);
  const length = Math.max(expected.length, supplied.length);

  if (length === 0) {
    return false;
  }

  const expectedPadded = Buffer.alloc(length);
  const suppliedPadded = Buffer.alloc(length);
  expected.copy(expectedPadded);
  supplied.copy(suppliedPadded);

  return timingSafeEqual(expectedPadded, suppliedPadded) && expected.length === supplied.length;
}

function loadOptionalEnvFile(path) {
  if (!existsSync(path)) {
    return;
  }

  const file = readFileSync(path, "utf8");

  for (const line of file.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const match = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(trimmed);

    if (!match) {
      continue;
    }

    const [, key, rawValue] = match;

    if (process.env[key] !== undefined) {
      continue;
    }

    process.env[key] = normalizeEnvFileValue(rawValue);
  }
}

function normalizeEnvFileValue(rawValue) {
  const value = rawValue.trim();

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}

function printSafeSummary(result) {
  console.log("First clinic admin bootstrap completed.");
  console.log(`tenantId=${result.tenantId} tenant=${result.tenantState}`);
  console.log(`userId=${result.userId} user=${result.userState}`);
  console.log(`membershipId=${result.membershipId} membership=${result.membershipState}`);
  console.log(
    `setupStatus=${result.setupStatus} setupStateChanged=${String(result.setupStateChanged)}`,
  );
  console.log(`auditEventsWritten=${result.auditEventsWritten}`);
}

function printSafeFailure(error) {
  if (
    error?.name === "BootstrapInputError" ||
    error?.name === "BootstrapConflictError" ||
    error?.message ===
      "Bootstrap secret is required. Configure SETUP_BOOTSTRAP_SECRET and provide BOOTSTRAP_SECRET." ||
    error?.message === "Bootstrap secret did not match." ||
    error?.message === "Unsupported bootstrap argument format."
  ) {
    console.error(error.message);
    return;
  }

  console.error("First clinic admin bootstrap failed. Check database connectivity and migrations.");

  if (process.env.NODE_ENV === "development" && error?.name) {
    console.error(`Failure category: ${error.name}`);
  }
}
