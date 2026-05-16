import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const failures = [];

assertPackageScript();
assertCampaignFilesExist();
assertCampaignPermissionPolicy();
assertCampaignSchemaShape();
assertCampaignActionGuardrails();
assertCampaignApprovalGuardrails();
assertCampaignAuditGuardrails();
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
    "src/app/dashboard/recall/campaigns/[campaignId]/page.tsx",
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

  if (!permissions.includes('"campaign:approve"')) {
    failures.push("campaign:approve permission must exist");
  }

  if (!/RECEPTIONIST:\s*\[[^\]]*"campaign:prepare"/.test(permissions)) {
    failures.push("RECEPTIONIST should be able to prepare campaign drafts");
  }

  if (/RECEPTIONIST:\s*\[[^\]]*"campaign:approve"/.test(permissions)) {
    failures.push("RECEPTIONIST should not approve campaign drafts by default");
  }

  if (!/MANAGER:\s*\[[^\]]*"campaign:approve"/.test(permissions)) {
    failures.push("MANAGER should be able to approve campaign drafts");
  }

  if (/DOCTOR:\s*\[[^\]]*"campaign:prepare"/.test(permissions)) {
    failures.push("DOCTOR should not prepare campaign drafts by default");
  }

  if (/DOCTOR:\s*\[[^\]]*"campaign:approve"/.test(permissions)) {
    failures.push("DOCTOR should not approve campaign drafts by default");
  }

  if (/STAFF:\s*\[[^\]]*"campaign:prepare"/.test(permissions)) {
    failures.push("STAFF should not prepare campaign drafts by default");
  }

  if (/STAFF:\s*\[[^\]]*"campaign:approve"/.test(permissions)) {
    failures.push("STAFF should not approve campaign drafts by default");
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

  for (const status of ["DRAFT", "IN_REVIEW", "APPROVED", "CANCELLED"]) {
    if (!new RegExp(`^\\s*${status}\\s*$`, "m").test(schema)) {
      failures.push(`RecallCampaignStatus must include ${status}`);
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

function assertCampaignApprovalGuardrails() {
  const actions = readFileSync("src/app/dashboard/recall/campaigns/actions.ts", "utf8");
  const repository = readFileSync("src/modules/recall/repository.ts", "utf8");
  const domain = readFileSync("src/modules/recall/index.ts", "utf8");

  for (const actionName of [
    "updateRecallCampaignDraftAction",
    "submitRecallCampaignForReviewAction",
    "approveRecallCampaignAction",
    "cancelRecallCampaignAction",
  ]) {
    if (!actions.includes(actionName)) {
      failures.push(`${actionName} must exist`);
    }
  }

  if (!actions.includes('requirePermission("campaign:approve")')) {
    failures.push("Approval action must require campaign:approve");
  }

  for (const repositoryName of [
    "updateRecallCampaignDraftForTenant",
    "submitRecallCampaignForTenantReview",
    "approveRecallCampaignForTenant",
    "cancelRecallCampaignForTenant",
    "getRecallCampaignReviewStateForTenant",
  ]) {
    if (!repository.includes(repositoryName)) {
      failures.push(`${repositoryName} must exist`);
    }
  }

  if (
    !repository.includes("createTenantScopedWhere(tenantId") &&
    !repository.includes("createTenantScopedWhere(input.tenantId")
  ) {
    failures.push("Campaign repository transitions must use tenant-scoped where clauses");
  }

  if (!domain.includes("Only DRAFT") && !domain.includes("canEditCampaignDraft")) {
    failures.push("Campaign domain must enforce DRAFT-only editing");
  }
}

function assertCampaignAuditGuardrails() {
  const audit = readFileSync("src/server/audit/index.ts", "utf8");

  for (const action of [
    "recall_campaign.draft_updated",
    "recall_campaign.submitted_for_review",
    "recall_campaign.approved",
    "recall_campaign.cancelled",
    "recall_campaign.approval_failed",
    "recall_campaign.message_updated",
  ]) {
    if (!audit.includes(action)) {
      failures.push(`${action} audit event must exist`);
    }
  }

  const unsafeAuditMetadata =
    /createRecallCampaign(?:DraftUpdated|MessageUpdated|SubmittedForReview|Approved|Cancelled|ApprovalFailed)AuditEvent[\s\S]*?metadata:\s*{[^}]*\b(messageTemplate|templatePreview|body|message)\b/i;

  if (unsafeAuditMetadata.test(audit)) {
    failures.push("Campaign audit metadata must not include raw message/template content");
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
