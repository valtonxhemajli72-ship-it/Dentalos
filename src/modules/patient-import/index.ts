import { maskContactValue } from "@/lib/privacy";
import type { RecallContactChannel } from "@/modules/patients/recall";

export type PatientImportColumn =
  | "firstName"
  | "lastName"
  | "email"
  | "phone"
  | "lastVisitDate"
  | "nextAppointmentDate"
  | "preferredContactChannel"
  | "notes";

export type PatientImportIssueCode =
  | "empty_row"
  | "missing_name"
  | "invalid_email"
  | "invalid_date"
  | "duplicate_email"
  | "duplicate_phone"
  | "duplicate_identity"
  | "unsupported_contact_channel";

export type PatientImportParsedRow = {
  rowNumber: number;
  values: Partial<Record<PatientImportColumn, string>>;
};

export type PatientImportNormalizedRow = {
  rowNumber: number;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  lastVisitDate?: string;
  nextAppointmentDate?: string;
  preferredContactChannel?: RecallContactChannel;
  notes?: string;
};

export type PatientImportIssue = {
  rowNumber: number;
  code: PatientImportIssueCode;
  message: string;
  field?: PatientImportColumn;
};

export type PatientImportValidationResult = {
  validRows: PatientImportNormalizedRow[];
  invalidRows: PatientImportNormalizedRow[];
  issues: PatientImportIssue[];
};

export type PatientDraft = {
  tenantId?: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  lastVisitAt?: Date;
  nextAppointmentAt?: Date;
  preferredContactChannel: RecallContactChannel;
  notes?: string;
};

export type PatientImportSummary = {
  rowCount: number;
  validRowCount: number;
  invalidRowCount: number;
  duplicateEmailCount: number;
  duplicatePhoneCount: number;
  duplicateRowCount: number;
  emailCount: number;
  phoneCount: number;
};

export type PatientImportPreviewRow = {
  rowNumber: number;
  label: string;
  contactIndicators: string[];
  preferredContactChannel: RecallContactChannel;
  nextAppointmentDate?: string;
  lastVisitDate?: string;
  issues: PatientImportIssue[];
};

export type PatientImportPreview = {
  summary: PatientImportSummary;
  rows: PatientImportPreviewRow[];
  issues: PatientImportIssue[];
  drafts: PatientDraft[];
};

const supportedColumns: PatientImportColumn[] = [
  "firstName",
  "lastName",
  "email",
  "phone",
  "lastVisitDate",
  "nextAppointmentDate",
  "preferredContactChannel",
  "notes",
];

const columnAliases: Record<string, PatientImportColumn> = {
  firstname: "firstName",
  first_name: "firstName",
  "first name": "firstName",
  lastname: "lastName",
  last_name: "lastName",
  "last name": "lastName",
  email: "email",
  emailaddress: "email",
  email_address: "email",
  phone: "phone",
  phonenumber: "phone",
  phone_number: "phone",
  lastvisitdate: "lastVisitDate",
  last_visit_date: "lastVisitDate",
  "last visit date": "lastVisitDate",
  nextappointmentdate: "nextAppointmentDate",
  next_appointment_date: "nextAppointmentDate",
  "next appointment date": "nextAppointmentDate",
  preferredcontactchannel: "preferredContactChannel",
  preferred_contact_channel: "preferredContactChannel",
  "preferred contact channel": "preferredContactChannel",
  notes: "notes",
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const supportedContactChannels: RecallContactChannel[] = ["email", "sms", "phone"];

export const patientImportExampleCsv = [
  "firstName,lastName,email,phone,lastVisitDate,nextAppointmentDate,preferredContactChannel,notes",
  "Patient,A,patient-a@example.test,+1555010101,2025-11-20,,email,Due for recall review",
  "Patient,B,,+1555010102,2025-10-14,2026-05-22,sms,Already scheduled",
  "Patient,C,patient-c@example.test,,2024-08-09,,phone,Needs manual review",
].join("\n");

export function parsePatientImportCsv(csvText: string): PatientImportParsedRow[] {
  const parsedRows = parseCsv(csvText);
  const headerIndex = parsedRows.findIndex(hasContent);

  if (headerIndex === -1) {
    return [];
  }

  const headerRow = parsedRows[headerIndex];
  const dataRows = parsedRows.slice(headerIndex + 1);
  const rowsWithoutTrailingEmptyRows = [...dataRows];

  while (
    rowsWithoutTrailingEmptyRows.length > 0 &&
    !hasContent(rowsWithoutTrailingEmptyRows[rowsWithoutTrailingEmptyRows.length - 1])
  ) {
    rowsWithoutTrailingEmptyRows.pop();
  }

  const headers = headerRow.map((header) => resolveColumn(header));

  return rowsWithoutTrailingEmptyRows.map((row, index) => {
    const values: Partial<Record<PatientImportColumn, string>> = {};

    row.forEach((value, columnIndex) => {
      const column = headers[columnIndex];

      if (column) {
        values[column] = value.trim();
      }
    });

    return {
      rowNumber: headerIndex + index + 2,
      values,
    };
  });
}

export function normalizePatientImportRows(
  rows: PatientImportParsedRow[],
): PatientImportNormalizedRow[] {
  return rows.map((row) => {
    const preferredContactChannel = normalizeContactChannel(row.values.preferredContactChannel);

    return {
      rowNumber: row.rowNumber,
      firstName: normalizeText(row.values.firstName),
      lastName: normalizeText(row.values.lastName),
      email: normalizeEmail(row.values.email),
      phone: normalizePhone(row.values.phone),
      lastVisitDate: normalizeText(row.values.lastVisitDate),
      nextAppointmentDate: normalizeText(row.values.nextAppointmentDate),
      preferredContactChannel,
      notes: normalizeText(row.values.notes),
    };
  });
}

export function validatePatientImportRows(
  rows: PatientImportNormalizedRow[],
): PatientImportValidationResult {
  const issues: PatientImportIssue[] = [];
  const emailRows = new Map<string, number[]>();
  const phoneRows = new Map<string, number[]>();
  const identityRows = new Map<string, number[]>();

  rows.forEach((row) => {
    if (isEmptyImportRow(row)) {
      issues.push({
        rowNumber: row.rowNumber,
        code: "empty_row",
        message: "Row is empty.",
      });
      return;
    }

    if (!row.firstName && !row.lastName) {
      issues.push({
        rowNumber: row.rowNumber,
        code: "missing_name",
        field: "firstName",
        message: "At least one name field is required.",
      });
    }

    if (row.email && !emailPattern.test(row.email)) {
      issues.push({
        rowNumber: row.rowNumber,
        code: "invalid_email",
        field: "email",
        message: "Email address is not valid.",
      });
    }

    addDuplicateCandidate(emailRows, row.email, row.rowNumber);
    addDuplicateCandidate(phoneRows, normalizedPhoneKey(row.phone), row.rowNumber);
    addDuplicateCandidate(identityRows, normalizedIdentityKey(row), row.rowNumber);

    validateDateField(row, "lastVisitDate", issues);
    validateDateField(row, "nextAppointmentDate", issues);

    if (
      row.preferredContactChannel &&
      !supportedContactChannels.includes(row.preferredContactChannel)
    ) {
      issues.push({
        rowNumber: row.rowNumber,
        code: "unsupported_contact_channel",
        field: "preferredContactChannel",
        message: "Preferred contact channel must be email, sms, or phone.",
      });
    }
  });

  appendDuplicateIssues(emailRows, issues, "duplicate_email", "email", "Email is duplicated.");
  appendDuplicateIssues(phoneRows, issues, "duplicate_phone", "phone", "Phone is duplicated.");
  appendDuplicateIssues(
    identityRows,
    issues,
    "duplicate_identity",
    "lastVisitDate",
    "Patient name and last visit date are duplicated.",
  );

  const issuesByRow = groupIssuesByRow(issues);
  const validRows = rows.filter((row) => !issuesByRow.has(row.rowNumber));
  const invalidRows = rows.filter((row) => issuesByRow.has(row.rowNumber));

  return {
    validRows,
    invalidRows,
    issues,
  };
}

export function summarizePatientImport(
  rows: PatientImportNormalizedRow[],
  validation: PatientImportValidationResult,
): PatientImportSummary {
  const duplicateRowNumbers = new Set(
    validation.issues
      .filter((issue) =>
        ["duplicate_email", "duplicate_phone", "duplicate_identity"].includes(issue.code),
      )
      .map((issue) => issue.rowNumber),
  );

  return {
    rowCount: rows.length,
    validRowCount: validation.validRows.length,
    invalidRowCount: validation.invalidRows.length,
    duplicateEmailCount: validation.issues.filter((issue) => issue.code === "duplicate_email")
      .length,
    duplicatePhoneCount: validation.issues.filter((issue) => issue.code === "duplicate_phone")
      .length,
    duplicateRowCount: duplicateRowNumbers.size,
    emailCount: rows.filter((row) => Boolean(row.email)).length,
    phoneCount: rows.filter((row) => Boolean(row.phone)).length,
  };
}

export type PatientImportClientPreview = Omit<PatientImportPreview, "drafts">;

export function createPatientImportPreview(csvText: string): PatientImportPreview {
  const parsedRows = parsePatientImportCsv(csvText);
  const normalizedRows = normalizePatientImportRows(parsedRows);
  const validation = validatePatientImportRows(normalizedRows);
  const issuesByRow = groupIssuesByRow(validation.issues);

  return {
    summary: summarizePatientImport(normalizedRows, validation),
    rows: normalizedRows.map((row) => ({
      rowNumber: row.rowNumber,
      label: buildMaskedPatientLabel(row),
      contactIndicators: buildContactIndicators(row),
      preferredContactChannel: row.preferredContactChannel ?? "email",
      nextAppointmentDate: row.nextAppointmentDate,
      lastVisitDate: row.lastVisitDate,
      issues: issuesByRow.get(row.rowNumber) ?? [],
    })),
    issues: validation.issues,
    drafts: validation.validRows.map(mapImportRowToPatientDraft),
  };
}

export function createPatientImportClientPreview(csvText: string): PatientImportClientPreview {
  const preview = createPatientImportPreview(csvText);

  return {
    summary: preview.summary,
    rows: preview.rows,
    issues: preview.issues,
  };
}

export function mapImportRowToPatientDraft(row: PatientImportNormalizedRow): PatientDraft {
  return {
    firstName: row.firstName ?? "Unknown",
    lastName: row.lastName ?? "Patient",
    email: row.email,
    phone: row.phone,
    lastVisitAt: parseIsoDate(row.lastVisitDate),
    nextAppointmentAt: parseIsoDate(row.nextAppointmentDate),
    preferredContactChannel: row.preferredContactChannel ?? inferContactChannel(row),
    notes: row.notes,
  };
}

function parseCsv(csvText: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let inQuotes = false;

  for (let index = 0; index < csvText.length; index += 1) {
    const character = csvText[index];
    const nextCharacter = csvText[index + 1];

    if (character === '"' && inQuotes && nextCharacter === '"') {
      value += '"';
      index += 1;
      continue;
    }

    if (character === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (character === "," && !inQuotes) {
      row.push(value);
      value = "";
      continue;
    }

    if ((character === "\n" || character === "\r") && !inQuotes) {
      if (character === "\r" && nextCharacter === "\n") {
        index += 1;
      }

      row.push(value);
      rows.push(row);
      row = [];
      value = "";
      continue;
    }

    value += character;
  }

  row.push(value);
  rows.push(row);

  return rows;
}

function hasContent(row: string[]): boolean {
  return row.some((cell) => cell.trim().length > 0);
}

function resolveColumn(header: string): PatientImportColumn | undefined {
  const normalizedHeader = header.trim().replace(/\s+/g, " ").toLowerCase();
  const compactHeader = normalizedHeader.replace(/[\s_-]/g, "");

  return columnAliases[normalizedHeader] ?? columnAliases[compactHeader];
}

function normalizeText(value: string | undefined): string | undefined {
  const normalized = value?.trim().replace(/\s+/g, " ");
  return normalized ? normalized : undefined;
}

function normalizeEmail(value: string | undefined): string | undefined {
  return normalizeText(value)?.toLowerCase();
}

function normalizePhone(value: string | undefined): string | undefined {
  return normalizeText(value);
}

function normalizeContactChannel(value: string | undefined): RecallContactChannel | undefined {
  const normalized = normalizeText(value)?.toLowerCase();

  if (!normalized) {
    return undefined;
  }

  if (normalized === "text" || normalized === "sms") {
    return "sms";
  }

  if (normalized === "email" || normalized === "phone") {
    return normalized;
  }

  return normalized as RecallContactChannel;
}

function isEmptyImportRow(row: PatientImportNormalizedRow): boolean {
  return supportedColumns.every((column) => !row[column]);
}

function addDuplicateCandidate(
  candidates: Map<string, number[]>,
  value: string | undefined,
  rowNumber: number,
) {
  if (!value) {
    return;
  }

  candidates.set(value, [...(candidates.get(value) ?? []), rowNumber]);
}

function normalizedPhoneKey(phone: string | undefined): string | undefined {
  const digits = phone?.replace(/\D/g, "");
  return digits && digits.length >= 7 ? digits : undefined;
}

export function normalizedPatientImportPhoneKey(phone: string | undefined): string | undefined {
  return normalizedPhoneKey(phone);
}

export function normalizedPatientImportIdentityKey(
  row: Pick<PatientImportNormalizedRow, "firstName" | "lastName" | "lastVisitDate">,
): string | undefined {
  return normalizedIdentityKey(row);
}

function normalizedIdentityKey(
  row: Pick<PatientImportNormalizedRow, "firstName" | "lastName" | "lastVisitDate">,
): string | undefined {
  if (!row.firstName || !row.lastName || !row.lastVisitDate) {
    return undefined;
  }

  return `${row.firstName.toLowerCase()}|${row.lastName.toLowerCase()}|${row.lastVisitDate}`;
}

function validateDateField(
  row: PatientImportNormalizedRow,
  field: "lastVisitDate" | "nextAppointmentDate",
  issues: PatientImportIssue[],
) {
  const value = row[field];

  if (!value) {
    return;
  }

  if (!datePattern.test(value) || !parseIsoDate(value)) {
    issues.push({
      rowNumber: row.rowNumber,
      code: "invalid_date",
      field,
      message: `${field} must use YYYY-MM-DD format.`,
    });
  }
}

function appendDuplicateIssues(
  candidates: Map<string, number[]>,
  issues: PatientImportIssue[],
  code: "duplicate_email" | "duplicate_phone" | "duplicate_identity",
  field: PatientImportColumn,
  message: string,
) {
  candidates.forEach((rowNumbers) => {
    if (rowNumbers.length < 2) {
      return;
    }

    rowNumbers.forEach((rowNumber) => {
      issues.push({
        rowNumber,
        code,
        field,
        message,
      });
    });
  });
}

function groupIssuesByRow(issues: PatientImportIssue[]): Map<number, PatientImportIssue[]> {
  return issues.reduce((grouped, issue) => {
    grouped.set(issue.rowNumber, [...(grouped.get(issue.rowNumber) ?? []), issue]);
    return grouped;
  }, new Map<number, PatientImportIssue[]>());
}

function buildMaskedPatientLabel(row: PatientImportNormalizedRow): string {
  const firstInitial = row.firstName?.at(0)?.toUpperCase();
  const lastInitial = row.lastName?.at(0)?.toUpperCase();
  const initials = [firstInitial, lastInitial].filter(Boolean).join("");

  return initials ? `Patient ${initials}` : `Row ${row.rowNumber}`;
}

function buildContactIndicators(row: PatientImportNormalizedRow): string[] {
  const indicators: string[] = [];

  if (row.email) {
    indicators.push(maskContactValue(row.email));
  }

  if (row.phone) {
    indicators.push(maskContactValue(row.phone));
  }

  return indicators.length > 0 ? indicators : ["No contact method"];
}

function inferContactChannel(row: PatientImportNormalizedRow): RecallContactChannel {
  if (row.preferredContactChannel) {
    return row.preferredContactChannel;
  }

  if (row.email) {
    return "email";
  }

  if (row.phone) {
    return "phone";
  }

  return "email";
}

function parseIsoDate(value: string | undefined): Date | undefined {
  if (!value || !datePattern.test(value)) {
    return undefined;
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);
  const [year, month, day] = value.split("-").map(Number);

  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return undefined;
  }

  return parsed;
}
