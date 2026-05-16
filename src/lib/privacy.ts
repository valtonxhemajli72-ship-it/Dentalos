export type AuditMetadataValue = string | number | boolean | null | undefined;
export type AuditMetadataRecord = Record<string, AuditMetadataValue>;

const emailPattern = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const phonePattern = /(?:\+?\d[\d\s().-]{6,}\d)/;
const unsafeMetadataKeyPattern =
  /(firstName|lastName|fullName|name|email|phone|note|message|body|raw|csv|contactValue|address|dob|birth|token|secret|password|session|cookie|oauth|credential)/i;

export function maskEmail(email: string): string {
  const [localPart, domain] = email.split("@");
  const visible = localPart?.slice(0, 1) || "*";
  const [domainLabel, ...domainParts] = domain?.split(".") ?? [];
  const suffix = domainParts.length > 0 ? `.${domainParts.at(-1)}` : "";
  const maskedDomain = domainLabel ? `${domainLabel.slice(0, 1)}***${suffix}` : "masked";

  return domain ? `${visible}***@${maskedDomain}` : "Email provided";
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

export function maskContactValue(value: string | null | undefined): string {
  if (!value) {
    return "No contact method";
  }

  if (isLikelyEmail(value)) {
    return maskEmail(value);
  }

  if (isLikelyPhone(value)) {
    return maskPhone(value);
  }

  return "Contact provided";
}

export function redactAuditMetadata(
  metadata: AuditMetadataRecord | undefined,
): AuditMetadataRecord {
  return Object.fromEntries(
    Object.entries(metadata ?? {}).map(([key, value]) => [
      unsafeMetadataKeyPattern.test(key) ? "redactedKey" : key,
      typeof value === "string" ? redactPII(value) : value,
    ]),
  );
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
