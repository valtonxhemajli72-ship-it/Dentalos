import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const failures = [];

const expectedTenantScopedModels = [
  "Membership",
  "TenantInvitation",
  "Patient",
  "Appointment",
  "RecallCampaign",
  "RecallCampaignPatient",
  "NotificationMessage",
  "PatientImportBatch",
  "AuditLog",
];

assertPackageScript();
assertRlsDocsExist();
assertExpectedModelsHaveTenantId();
assertExpectedModelsAreDocumented();
assertNoGlobalPatientContactUniqueness();
assertRlsIsDocumentedAsPlanned();
assertNoRlsDdlInMigrations();

if (failures.length > 0) {
  console.error("RLS readiness validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("RLS readiness validation passed.");

function assertPackageScript() {
  const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
  if (packageJson.scripts?.["rls:validate"] !== "node scripts/validate-rls-readiness.mjs") {
    failures.push("package.json must expose rls:validate");
  }
}

function assertRlsDocsExist() {
  for (const file of [
    "docs/rls-readiness.md",
    "docs/architecture-decisions/ADR-012-postgresql-rls-readiness.md",
  ]) {
    if (!existsSync(file)) {
      failures.push(`${file} must exist`);
    }
  }
}

function assertExpectedModelsHaveTenantId() {
  const schema = readFileSync("prisma/schema.prisma", "utf8");

  for (const model of expectedTenantScopedModels) {
    const block = getModelBlock(schema, model);
    if (!block) {
      failures.push(`Prisma model is missing: ${model}`);
      continue;
    }

    if (!/^\s*tenantId\s+String\b/m.test(block)) {
      failures.push(`${model} must keep a String tenantId field for shared-schema isolation`);
    }
  }
}

function assertExpectedModelsAreDocumented() {
  if (!existsSync("docs/rls-readiness.md")) {
    return;
  }

  const doc = readFileSync("docs/rls-readiness.md", "utf8");
  for (const model of expectedTenantScopedModels) {
    if (!doc.includes(`\`${model}\``)) {
      failures.push(`docs/rls-readiness.md must document ${model}`);
    }
  }
}

function assertNoGlobalPatientContactUniqueness() {
  const schema = readFileSync("prisma/schema.prisma", "utf8");
  const patient = getModelBlock(schema, "Patient");

  if (!patient) {
    failures.push("Prisma model is missing: Patient");
    return;
  }

  if (/^\s*(email|phone)\s+String\??\s+@unique\b/m.test(patient)) {
    failures.push("Patient email/phone must not be globally unique");
  }

  const uniquePattern = /@@unique\(\s*\[([^\]]+)\]/g;
  let match;

  while ((match = uniquePattern.exec(patient))) {
    const fields = match[1]
      .split(",")
      .map((field) => field.trim())
      .filter(Boolean);

    const includesContactField = fields.includes("email") || fields.includes("phone");
    if (includesContactField && !fields.includes("tenantId")) {
      failures.push("Patient contact uniqueness must be tenant-scoped");
    }
  }
}

function assertRlsIsDocumentedAsPlanned() {
  if (!existsSync("docs/rls-readiness.md")) {
    return;
  }

  const doc = readFileSync("docs/rls-readiness.md", "utf8");
  const requiredPhrases = [
    "not implemented or enabled yet",
    "defense-in-depth",
    "app.current_tenant_id",
    "current_setting('app.current_tenant_id', true)",
    "PgBouncer",
  ];

  for (const phrase of requiredPhrases) {
    if (!doc.includes(phrase)) {
      failures.push(`docs/rls-readiness.md must mention ${phrase}`);
    }
  }

  if (/app\.current_tenant_id'\)::uuid/.test(doc)) {
    failures.push(
      "RLS docs must not use UUID-only tenant policy examples while tenant IDs are CUID strings",
    );
  }
}

function assertNoRlsDdlInMigrations() {
  const migrationFiles = listFiles("prisma/migrations").filter((file) => file.endsWith(".sql"));

  for (const file of migrationFiles) {
    const content = readFileSync(file, "utf8");
    if (
      /\b(ENABLE\s+ROW\s+LEVEL\s+SECURITY|CREATE\s+POLICY|FORCE\s+ROW\s+LEVEL\s+SECURITY)\b/i.test(
        content,
      )
    ) {
      failures.push(`${file} enables RLS DDL before the planned rollout`);
    }
  }
}

function getModelBlock(schema, modelName) {
  const pattern = new RegExp(`model\\s+${modelName}\\s+{([\\s\\S]*?)\\n}`, "m");
  return pattern.exec(schema)?.[1] ?? null;
}

function listFiles(directory) {
  if (!existsSync(directory)) {
    return [];
  }

  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    const stats = statSync(path);

    return stats.isDirectory() ? listFiles(path) : [path];
  });
}
