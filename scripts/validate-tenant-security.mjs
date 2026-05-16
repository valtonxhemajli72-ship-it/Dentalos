import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const failures = [];

assertPackageScript();
assertNoTrackedEnvFiles();
assertTenantScopedRepositoryNames();
assertTenantOwnedPrismaPatterns();
assertNoSensitiveConsoleOutput();
assertServerActionGuardrails();
assertDemoFallbacksAreLocalOnly();

if (failures.length > 0) {
  console.error("Tenant security validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Tenant security validation passed.");

function assertPackageScript() {
  const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
  if (packageJson.scripts?.["tenant:validate"] !== "node scripts/validate-tenant-security.mjs") {
    failures.push("package.json must expose tenant:validate");
  }
}

function assertNoTrackedEnvFiles() {
  const result = spawnSync("git", ["ls-files"], {
    encoding: "utf8",
    windowsHide: true,
  });

  if (result.status !== 0) {
    return;
  }

  for (const file of result.stdout.split(/\r?\n/).filter(Boolean)) {
    if (/^\.env(?:\.local|\.production|\.staging)?$/.test(file)) {
      failures.push(`tracked environment file is not allowed: ${file}`);
    }
  }
}

function assertTenantScopedRepositoryNames() {
  const repositoryFiles = listFiles("src/modules").filter(
    (file) => file.endsWith("repository.ts") || /src[\\/]modules[\\/]tenants[\\/]/.test(file),
  );
  const tenantOwnedNamePattern =
    /(Patient|Appointment|RecallCampaign|Recall|NotificationMessage|Notification|PatientImportBatch|ImportBatch|AuditLog)/;
  const allowedScopePattern = /(ForTenant|TenantScoped|Tenant|Demo|map|build|toPrisma|fromPrisma)/;

  for (const file of repositoryFiles) {
    const content = readFileSync(file, "utf8");
    const functionPattern = /export\s+(?:async\s+)?function\s+([A-Za-z0-9_]+)/g;
    let match;

    while ((match = functionPattern.exec(content))) {
      const name = match[1];

      if (tenantOwnedNamePattern.test(name) && !allowedScopePattern.test(name)) {
        failures.push(`${file} exports tenant-owned helper without explicit tenant scope: ${name}`);
      }
    }
  }
}

function assertTenantOwnedPrismaPatterns() {
  const files = [
    ...listFiles("src/modules").filter((file) => file.endsWith(".ts")),
    ...listFiles("src/server").filter((file) => file.endsWith(".ts")),
    ...listFiles("src/app").filter((file) => file.endsWith(".ts") || file.endsWith(".tsx")),
  ];
  const tenantOwnedDelegates =
    "(patient|appointment|recallCampaign|notificationMessage|patientImportBatch|auditLog)";

  for (const file of files) {
    const content = readFileSync(file, "utf8");

    if (new RegExp(`\\.${tenantOwnedDelegates}\\.findUnique\\s*\\(`).test(content)) {
      failures.push(`${file} uses findUnique on tenant-owned data; use tenant-scoped findFirst`);
    }

    if (
      new RegExp(
        `\\.${tenantOwnedDelegates}\\.(update|delete|updateMany|deleteMany)\\s*\\(\\s*{\\s*where\\s*:\\s*{\\s*id\\s*:`,
        "s",
      ).test(content)
    ) {
      failures.push(`${file} mutates tenant-owned data by id without an obvious tenantId filter`);
    }
  }
}

function assertNoSensitiveConsoleOutput() {
  const files = [
    ...listFiles("src").filter((file) => /\.(ts|tsx)$/.test(file)),
    ...listFiles("scripts").filter((file) => file.endsWith(".mjs")),
  ];
  const sensitiveConsolePattern =
    /console\.(log|info|warn|error|debug)\([^)]*(token|secret|password|session|cookie|oauth|refresh|accessToken|idToken)/is;

  for (const file of files) {
    const content = readFileSync(file, "utf8");

    if (sensitiveConsolePattern.test(content)) {
      failures.push(`${file} appears to print token, secret, session, or cookie data`);
    }
  }
}

function assertServerActionGuardrails() {
  const tenantActions = readFileSync("src/server/auth/tenant-actions.ts", "utf8");
  if (!/requirePermission\(["']tenant:switch["']\)/.test(tenantActions)) {
    failures.push("switchTenantAction must require tenant:switch permission");
  }

  const acceptAction = readFileSync("src/app/invitations/accept/actions.ts", "utf8");
  const requireUserIndex = acceptAction.indexOf("requireCurrentUser()");
  const tokenReadIndex = acceptAction.indexOf('formData.get("token")');

  if (requireUserIndex === -1 || tokenReadIndex === -1 || requireUserIndex > tokenReadIndex) {
    failures.push("invitation acceptance action must authenticate before reading the raw token");
  }

  for (const file of [
    "src/app/invitations/accept/actions.ts",
    "src/app/invitations/accept/page.tsx",
    "src/app/dashboard/settings/team/actions.ts",
    "src/app/dashboard/settings/team/page.tsx",
  ]) {
    const content = readFileSync(file, "utf8");

    if (/formData\.get\(["']tenantId["']\)/.test(content)) {
      failures.push(`${file} must not trust tenantId from form data`);
    }

    if (/tokenHash/.test(content)) {
      failures.push(`${file} must not expose tokenHash`);
    }
  }
}

function assertDemoFallbacksAreLocalOnly() {
  for (const file of ["src/app/dashboard/patients/page.tsx", "src/app/dashboard/recall/page.tsx"]) {
    const content = readFileSync(file, "utf8");

    if (!/function canUseDemoFallback/.test(content)) {
      failures.push(`${file} must guard demo fallback with development demo auth`);
    }
  }
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
