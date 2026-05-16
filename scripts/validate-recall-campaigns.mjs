import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const failures = [];

assertPackageScript();
assertCampaignFilesExist();
assertCampaignPermissionPolicy();
assertCampaignSchemaShape();
assertCampaignActionGuardrails();
assertNoOutboundDeliveryCode();
assertDocsMentionNoSendBehavior();

if (failures.length > 0) {
  console.error("Recall campaign validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Recall campaign validation passed.");

function assertPackageScript() {
  const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
  if (packageJson.scripts?.["campaign:validate"] !== "node scripts/validate-recall-campaigns.mjs") {
    failures.push("package.json must expose campaign:validate");
  }
}

function assertCampaignFilesExist() {
  for (const file of [
    "src/app/dashboard/recall/campaigns/new/page.tsx",
    "src/app/dashboard/recall/campaigns/actions.ts",
    "src/modules/recall/index.ts",
    "src/modules/recall/repository.ts",
  ]) {
    if (!existsSync(file)) {
      failures.push(`${file} must exist`);
    }
  }
}

function assertCampaignPermissionPolicy() {
  const permissions = readFileSync("src/server/auth/permissions.ts", "utf8");

  if (!permissions.includes('"campaign:prepare"')) {
    failures.push("campaign:prepare permission must exist");
  }

  if (!/RECEPTIONIST:\s*\[[^\]]*"campaign:prepare"/.test(permissions)) {
    failures.push("RECEPTIONIST should be able to prepare campaign drafts");
  }

  if (/DOCTOR:\s*\[[^\]]*"campaign:prepare"/.test(permissions)) {
    failures.push("DOCTOR should not prepare campaign drafts by default");
  }

  if (/STAFF:\s*\[[^\]]*"campaign:prepare"/.test(permissions)) {
    failures.push("STAFF should not prepare campaign drafts by default");
  }
}

function assertCampaignSchemaShape() {
  const schema = readFileSync("prisma/schema.prisma", "utf8");
  const campaign = getModelBlock(schema, "RecallCampaign");
  const selection = getModelBlock(schema, "RecallCampaignPatient");

  if (!campaign) {
    failures.push("RecallCampaign model must exist");
    return;
  }

  for (const field of ["tenantId", "channel", "audienceCount", "createdByUserId"]) {
    if (!new RegExp(`^\\s*${field}\\s+`, "m").test(campaign)) {
      failures.push(`RecallCampaign must include ${field}`);
    }
  }

  if (!selection) {
    failures.push("RecallCampaignPatient model must exist");
    return;
  }

  for (const field of ["tenantId", "campaignId", "patientId"]) {
    if (!new RegExp(`^\\s*${field}\\s+`, "m").test(selection)) {
      failures.push(`RecallCampaignPatient must include ${field}`);
    }
  }
}

function assertCampaignActionGuardrails() {
  if (!existsSync("src/app/dashboard/recall/campaigns/actions.ts")) {
    return;
  }

  const actions = readFileSync("src/app/dashboard/recall/campaigns/actions.ts", "utf8");
  const requirePermissionIndex = actions.indexOf('requirePermission("campaign:prepare")');
  const formReadIndex = actions.indexOf("formData.get");

  if (requirePermissionIndex === -1) {
    failures.push("Campaign actions must require campaign:prepare");
  }

  if (formReadIndex !== -1 && requirePermissionIndex > formReadIndex) {
    failures.push("Campaign actions must require permission before parsing form data");
  }

  if (/formData\.get\(["']tenantId["']\)/.test(actions)) {
    failures.push("Campaign actions must not trust tenantId from form data");
  }
}

function assertNoOutboundDeliveryCode() {
  const files = [
    ...listFiles("src/modules/recall"),
    ...listFiles("src/app/dashboard/recall/campaigns"),
  ].filter((file) => /\.(ts|tsx)$/.test(file));
  const outboundPattern =
    /(twilio|resend|sendgrid|mailgun|fetch\s*\(|sendSms|sendEmail|sendWhatsApp|providerMessageId)/i;

  for (const file of files) {
    const content = readFileSync(file, "utf8");
    if (outboundPattern.test(content)) {
      failures.push(`${file} appears to include outbound delivery code`);
    }
  }
}

function assertDocsMentionNoSendBehavior() {
  const docs = ["docs/recall-mvp.md", "docs/security.md", "docs/architecture.md", "README.md"];

  for (const file of docs) {
    const content = readFileSync(file, "utf8").toLowerCase();
    if (!content.includes("no-send") && !content.includes("no messages are sent")) {
      failures.push(`${file} must document no-send campaign behavior`);
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
