import { readFileSync, existsSync } from "node:fs";

const requiredFiles = [
  "docker-compose.yml",
  ".env.example",
  "scripts/seed-demo-data.mjs",
  "docs/local-development.md",
  "docs/database-runtime.md",
  "prisma/migrations/migration_lock.toml",
];

const requiredPackageScripts = [
  "dev:db",
  "db:migrate",
  "db:generate",
  "db:seed",
  "db:studio",
  "db:reset",
  "db:validate",
];

const failures = [];

for (const file of requiredFiles) {
  if (!existsSync(file)) {
    failures.push(`Missing ${file}`);
  }
}

const packageJson = JSON.parse(readFileSync("package.json", "utf8"));

for (const scriptName of requiredPackageScripts) {
  if (!packageJson.scripts?.[scriptName]) {
    failures.push(`Missing package script: ${scriptName}`);
  }
}

const envExample = readFileSync(".env.example", "utf8");
const envRequirements = [
  "DATABASE_URL=",
  "NEXT_PUBLIC_APP_URL=",
  "NEXTAUTH_URL=",
  "NEXTAUTH_SECRET=",
  "AUTH_SECRET=",
  'DEMO_AUTH_ENABLED="true"',
];

for (const requirement of envRequirements) {
  if (!envExample.includes(requirement)) {
    failures.push(`.env.example missing ${requirement}`);
  }
}

const compose = readFileSync("docker-compose.yml", "utf8");
const composeRequirements = [
  "postgres:16-alpine",
  "klinika360_dev",
  "dentalos_dev_password",
  "5432:5432",
  "healthcheck:",
];

for (const requirement of composeRequirements) {
  if (!compose.includes(requirement)) {
    failures.push(`docker-compose.yml missing ${requirement}`);
  }
}

const seed = readFileSync("scripts/seed-demo-data.mjs", "utf8");
const seedRequirements = [
  "tenant_demo_klinika360",
  "tenant_demo_klinika360_specialists",
  "user_demo_klinika360_owner",
  "demo-user@example.test",
  "tokenHash",
  "patientImportBatch",
];

for (const requirement of seedRequirements) {
  if (!seed.includes(requirement)) {
    failures.push(`seed script missing ${requirement}`);
  }
}

const forbiddenSeedPatterns = [
  /console\.log\([^)]*example\.test/is,
  /console\.error\([^)]*DATABASE_URL[^)]*process\.env/is,
  /deliveryToken/is,
];

for (const pattern of forbiddenSeedPatterns) {
  if (pattern.test(seed)) {
    failures.push(`seed script matched forbidden pattern: ${pattern}`);
  }
}

if (failures.length > 0) {
  console.error("Local runtime validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Local runtime validation passed.");
