import type { TenantRole } from "@/modules/tenants";

export type PolicyAction =
  | "patient.read"
  | "patient.list"
  | "patient.import"
  | "recall.prepare"
  | "notification.prepare"
  | "tenant.admin"
  | "tenant.export"
  | "billing.manage";

export type PolicyResource =
  | "Patient"
  | "Appointment"
  | "PatientImportBatch"
  | "RecallCampaign"
  | "NotificationMessage"
  | "Tenant"
  | "BillingAccount";

export type PolicyContext = {
  tenantId: string;
  actorUserId: string;
  userRole: TenantRole;
};

export type PolicyDecision = {
  allowed: boolean;
  reason: string;
};

export interface PolicyEngine {
  decide(input: {
    action: PolicyAction;
    resource: PolicyResource;
    context: PolicyContext;
  }): Promise<PolicyDecision>;
}

const ownerAdminActions: PolicyAction[] = ["tenant.admin", "tenant.export", "billing.manage"];
const clinicianActions: PolicyAction[] = [
  "patient.read",
  "patient.list",
  "recall.prepare",
  "notification.prepare",
];
const staffActions: PolicyAction[] = [
  "patient.read",
  "patient.list",
  "patient.import",
  "recall.prepare",
  "notification.prepare",
];

export function createLocalPolicyEngine(): PolicyEngine {
  return {
    async decide({ action, context }) {
      if (!context.tenantId || !context.actorUserId) {
        return { allowed: false, reason: "Tenant and actor context are required." };
      }

      if (context.userRole === "OWNER" || context.userRole === "ADMIN") {
        return { allowed: true, reason: "Owner or admin role allowed by local policy." };
      }

      if (context.userRole === "CLINICIAN" && clinicianActions.includes(action)) {
        return { allowed: true, reason: "Clinician role allowed by local policy." };
      }

      if (context.userRole === "STAFF" && staffActions.includes(action)) {
        return { allowed: true, reason: "Staff role allowed by local policy." };
      }

      if (ownerAdminActions.includes(action)) {
        return { allowed: false, reason: "Owner or admin role required." };
      }

      return { allowed: false, reason: "Action is not allowed by local policy." };
    },
  };
}

export const policyRoadmapNote =
  "OPA may implement PolicyEngine later; product modules should use this boundary instead of direct OPA calls.";
