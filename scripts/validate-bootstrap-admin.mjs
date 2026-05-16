import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const requiredFiles = [
  "scripts/bootstrap-first-admin.mjs",
  "src/modules/tenants/bootstrap.ts",
  "scripts/validate-bootstrap-admin.mjs",
  "docs/admin-bootstrap.md",
  "docs/auth.md",
  "docs/local-development.md",
  "docs/database-runtime.md",
  "docs/security.md",
  "docs/architecture.md",
  ".env.example",
  "package.json",
];

for (const file of requiredFiles) {
  assert.equal(existsSync(file), true, `${file} must exist`);
}

const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
assert.equal(
  packageJson.scripts?.["bootstrap:admin"],
  "node scripts/bootstrap-first-admin.mjs",
  "bootstrap:admin package script is required",
);
assert.equal(
  packageJson.scripts?.["bootstrap:validate"],
  "node scripts/validate-bootstrap-admin.mjs",
  "bootstrap:validate package script is required",
);

const envExample = readFileSync(".env.example", "utf8");

[
  'SETUP_BOOTSTRAP_SECRET="replace-with-local-or-staging-setup-secret"',
  'BOOTSTRAP_TENANT_NAME="Klinika360 Demo Clinic"',
  'BOOTSTRAP_OWNER_EMAIL="owner@example.test"',
  'BOOTSTRAP_OWNER_NAME="Demo Owner"',
].forEach((requirement) => {
  assert.match(envExample, escapeRegExp(requirement), `.env.example missing ${requirement}`);
});

const bootstrapScript = readFileSync("scripts/bootstrap-first-admin.mjs", "utf8");
const bootstrapService = readFileSync("src/modules/tenants/bootstrap.ts", "utf8");
const audit = readFileSync("src/server/audit/index.ts", "utf8");
const docs = [
  "README.md",
  "docs/admin-bootstrap.md",
  "docs/auth.md",
  "docs/local-development.md",
  "docs/database-runtime.md",
  "docs/security.md",
  "docs/architecture.md",
].map((file) => readFileSync(file, "utf8"));

[
  "validateBootstrapInput",
  "bootstrapFirstTenantOwner",
  "ensureTenantExists",
  "ensureUserExists",
  "ensureOwnerMembershipExists",
].forEach((symbol) => {
  assert.match(bootstrapService, new RegExp(`export .*${symbol}`), `${symbol} is required`);
});

[
  "tenant.bootstrap_started",
  "tenant.bootstrap_completed",
  "tenant.bootstrap_failed",
  "membership.owner_bootstrapped",
].forEach((action) => {
  assert.match(audit, new RegExp(action), `${action} audit action is required`);
});

[
  "SETUP_BOOTSTRAP_SECRET",
  "BOOTSTRAP_SECRET",
  "timingSafeEqual",
  "BOOTSTRAP_ALLOW_INSECURE_LOCAL",
].forEach((requirement) => {
  assert.match(bootstrapScript, new RegExp(requirement), `bootstrap script missing ${requirement}`);
});

assert.doesNotMatch(
  bootstrapScript,
  /console\.(log|info|warn|error|debug)\([^)]*(BOOTSTRAP_SECRET|SETUP_BOOTSTRAP_SECRET|ownerEmail|BOOTSTRAP_OWNER_EMAIL|tenantName|BOOTSTRAP_TENANT_NAME)/is,
  "bootstrap script must not print secrets or raw bootstrap input",
);

assert.doesNotMatch(
  bootstrapService,
  /metadata:\s*{[^}]*ownerEmail|metadata:\s*{[^}]*ownerName|metadata:\s*{[^}]*tenantName/is,
  "bootstrap audit metadata must not include raw names or emails",
);

for (const doc of docs) {
  assert.match(doc, /bootstrap/i, "docs must mention admin bootstrap");
}

for (const appFile of listFiles("src/app")) {
  const content = readFileSync(appFile, "utf8");
  assert.doesNotMatch(
    content,
    /SETUP_BOOTSTRAP_SECRET|bootstrapFirstTenantOwner/,
    "bootstrap must not be exposed through public app routes",
  );
}

console.log("Admin bootstrap validation passed.");

function escapeRegExp(value) {
  return new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
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
