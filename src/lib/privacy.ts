export type AuditMetadataValue = string | number | boolean | null | undefined;
export type AuditMetadataRecord = Record<string, AuditMetadataValue>;

const emailPattern = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const phonePattern = /(?:\+?\d[\d\s().-]{6,}\d)/;
const unsafeMetadataKeyPattern =
  /(firstName|lastName|fullName|name|email|phone|note|message|body|raw|csv|contactValue)/i;

export function maskEmail(email: string): string {
  const [localPart, domain] = email.split("@");
  const visible = localPart?.slice(0, 1) || "*";
  return domain ? `${visible}***@${domain}` : "Email provided";
}

export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  const suffix = digits.slice(-2);
  return suffix ? `Phone ending ${suffix}` : "Phone provided";
}

export function isLikelyEmail(value: string): boolean {
  return emailPattern.test(value);
}

export function isLikelyPhone(value: string): boolean {
  const digitCount = value.replace(/\D/g, "").length;
  return digitCount >= 7 && phonePattern.test(value);
}

export function redactPII(value: string): string {
  return value.replace(emailPattern, "[redacted-email]").replace(phonePattern, "[redacted-phone]");
}

export function assertNoPIIInAuditMetadata(metadata: AuditMetadataRecord | undefined): void {
  Object.entries(metadata ?? {}).forEach(([key, value]) => {
    if (unsafeMetadataKeyPattern.test(key)) {
      throw new Error(`Audit metadata key is not allowed: ${key}`);
    }

    if (typeof value === "string" && (isLikelyEmail(value) || isLikelyPhone(value))) {
      throw new Error(`Audit metadata value appears to contain PII: ${key}`);
    }
  });
}
