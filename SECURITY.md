# Security Policy

Klinika360 is the public product identity for the DentalOS repository. The product handles sensitive clinic workflows, so security reports should be handled privately and with care.

## Reporting A Vulnerability

Please do not open a public issue for suspected vulnerabilities. Report privately through GitHub's private vulnerability reporting when available, or contact the repository owner through a private channel.

Include:

- A concise description of the issue.
- Affected routes, files, or workflows.
- Reproduction steps using fake data only.
- Expected impact and suggested severity.

Do not include:

- Real patient data.
- Real clinic data.
- Secrets, tokens, cookies, or private certificates.
- Screenshots or logs that contain patient PII or credentials.

## Responsible Disclosure

Please allow time for triage and remediation before public disclosure. Do not access, modify, export, or retain data that does not belong to you.

## Security Expectations

- No production auth bypasses.
- No tenant-owned data access without tenant context.
- No PII in logs, audit metadata, issues, screenshots, or pull requests.
- No raw CSV storage in patient import metadata.
- No secrets committed to the repository.
- Security-sensitive changes require careful review before merge.
