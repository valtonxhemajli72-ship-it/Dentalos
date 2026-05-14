import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

const files = {
  page: "src/app/invitations/accept/page.tsx",
  action: "src/app/invitations/accept/actions.ts",
  form: "src/app/invitations/accept/accept-invitation-form.tsx",
  invitations: "src/modules/tenants/invitations.ts",
  audit: "src/server/audit/index.ts",
  teamAction: "src/app/dashboard/settings/team/actions.ts",
  teamPage: "src/app/dashboard/settings/team/page.tsx",
};

Object.values(files).forEach((file) => {
  assert.equal(existsSync(join(root, file)), true, `${file} must exist`);
});

const contents = Object.fromEntries(
  Object.entries(files).map(([key, file]) => [key, readFileSync(join(root, file), "utf8")]),
);

[
  "hashInvitationToken",
  "verifyInvitationToken",
  "getInvitationByTokenHash",
  "markExpiredInvitationsForTenant",
  "acceptTenantInvitation",
].forEach((symbol) => {
  assert.match(contents.invitations, new RegExp(`export .*${symbol}`), `${symbol} is required`);
});

[
  "invitation.accept_attempted",
  "invitation.accepted",
  "invitation.accept_failed",
  "invitation.accept_expired",
  "invitation.accept_revoked",
  "invitation.accept_email_mismatch",
  "membership.created_from_invitation",
].forEach((action) => {
  assert.match(contents.audit, new RegExp(action), `${action} audit action is required`);
});

assert.match(contents.action, /requireCurrentUser/, "accept action must require auth");
assert.match(contents.action, /acceptTenantInvitation/, "accept action must call domain service");
assert.doesNotMatch(
  contents.action,
  /formData\.get\(["']tenantId["']\)/,
  "tenantId must not come from form data",
);
assert.doesNotMatch(
  contents.action,
  /formData\.get\(["']role["']\)/,
  "role must not come from form data",
);
assert.doesNotMatch(
  contents.action,
  /tokenHash/,
  "tokenHash must not be exposed through action code",
);
assert.doesNotMatch(contents.page, /tokenHash/, "tokenHash must not be exposed through page code");
assert.doesNotMatch(
  contents.teamAction,
  /deliveryToken/,
  "team actions must not expose delivery tokens",
);
assert.doesNotMatch(
  contents.teamPage,
  /deliveryToken/,
  "team page must not expose delivery tokens",
);

[contents.page, contents.action, contents.form, contents.invitations, contents.teamAction].forEach(
  (content) => {
    assert.doesNotMatch(
      content,
      /console\.(log|info|warn|error|debug)/,
      "raw token logging is not allowed",
    );
  },
);

assert.match(
  contents.invitations,
  /timingSafeEqual/,
  "token verification should use timing-safe comparison",
);
assert.match(
  contents.invitations,
  /normalizeInvitationEmail\(authenticatedEmail\)/,
  "email match policy is required",
);
assert.match(
  contents.invitations,
  /invitation\.role === "OWNER"/,
  "owner invitations must fail closed",
);

console.log("Invitation acceptance validation passed.");
