import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const failures = [];

const knownJobNames = [
  "patient_import.process",
  "recall_campaign.prepare",
  "recall_campaign.validate_audience",
  "notification.prepare_batch",
  "notification.dispatch_placeholder",
  "report.generate_placeholder",
];

assertFilesExist();
assertPackageScript();
assertKnownJobNames();
assertSafetyGuardrails();
assertNoProviderCalls();
assertDocs();

if (failures.length > 0) {
  console.error("Worker queue interface validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Worker queue interface validation passed.");

function assertFilesExist() {
  for (const file of [
    "src/server/jobs/index.ts",
    "src/server/jobs/safety.ts",
    "src/server/jobs/registry.ts",
    "docs/worker-queue-interface.md",
  ]) {
    if (!existsSync(file)) {
      failures.push(`${file} must exist`);
    }
  }
}

function assertPackageScript() {
  const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
  if (
    packageJson.scripts?.["jobs:validate"] !== "node scripts/validate-worker-queue-interface.mjs"
  ) {
    failures.push("package.json must expose jobs:validate");
  }
}

function assertKnownJobNames() {
  const index = readFileSync("src/server/jobs/index.ts", "utf8");
  const registry = readFileSync("src/server/jobs/registry.ts", "utf8");
  const docs = readFileSync("docs/worker-queue-interface.md", "utf8");

  for (const jobName of knownJobNames) {
    if (!index.includes(jobName) && !registry.includes(jobName)) {
      failures.push(`${jobName} must be defined in the job interface or registry`);
    }

    if (!docs.includes(jobName)) {
      failures.push(`${jobName} must be documented`);
    }
  }
}

function assertSafetyGuardrails() {
  const safety = readFileSync("src/server/jobs/safety.ts", "utf8");

  for (const key of [
    "password",
    "token",
    "secret",
    "cookie",
    "authorization",
    "email",
    "phone",
    "rawCsv",
    "messageBody",
    "invitationToken",
    "tokenHash",
  ]) {
    if (!safety.includes(key)) {
      failures.push(`Job safety guardrail must reject ${key}`);
    }
  }

  for (const helper of [
    "assertTenantJobContext",
    "assertSafeJobMetadata",
    "createIdempotencyKey",
    "redactJobPayloadForLogs",
    "isKnownJobName",
    "requireJobIdempotencyKey",
  ]) {
    if (!safety.includes(`function ${helper}`)) {
      failures.push(`${helper} must exist`);
    }
  }
}

function assertNoProviderCalls() {
  const files = listFiles("src/server/jobs").filter((file) => /\.(ts|tsx)$/.test(file));
  const providerPattern =
    /(redis|sqs|eventbridge|temporal|bullmq|kafka|twilio|resend|sendgrid|mailgun|nodemailer|fetch\s*\(|axios|providerMessageId|sendSms|sendEmail|sendWhatsApp)/i;

  for (const file of files) {
    const content = readFileSync(file, "utf8");
    if (providerPattern.test(content)) {
      failures.push(`${file} appears to include real queue or provider code`);
    }

    if (/console\./.test(content)) {
      failures.push(`${file} must not log job payloads directly`);
    }
  }
}

function assertDocs() {
  const docs = readFileSync("docs/worker-queue-interface.md", "utf8").toLowerCase();

  for (const phrase of [
    "no real queueing",
    "no provider adapter",
    "no-pii",
    "idempotency",
    "dead-letter",
    "tenantid",
  ]) {
    if (!docs.includes(phrase)) {
      failures.push(`docs/worker-queue-interface.md must mention ${phrase}`);
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
