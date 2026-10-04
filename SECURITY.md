# Security Policy

## Supported version

Security fixes are applied to the current `main` branch and the latest production deployment built from it.

## Reporting a vulnerability

Please **do not open a public issue** for a suspected vulnerability.

Prefer GitHub's private vulnerability reporting flow when it is available for this repository:

1. Open the repository's **Security** tab.
2. Choose **Report a vulnerability**.
3. Include enough detail to reproduce and assess the issue.

If private vulnerability reporting is not available, contact the repository maintainer privately through the GitHub profile before sharing exploit details publicly.

Please include, when possible:

- affected route, feature, or component;
- impact and realistic attack scenario;
- reproduction steps or proof of concept;
- affected commit/version;
- relevant logs with secrets redacted;
- suggested mitigation, if known.

## Sensitive data

Never include real credentials in a report, issue, pull request, screenshot, or log. Redact:

- `AUTH_SECRET`;
- `AI_ENCRYPTION_KEY`;
- PostgreSQL credentials and `DATABASE_URL`;
- API Keys;
- OpenAI, Anthropic, Gemini, or other provider keys;
- production dumps or user data.

## Scope priorities

High-priority security areas include:

- authentication and authorization bypass;
- cross-user data access / ownership failures;
- API Key leakage or replay;
- password exposure;
- AI credential disclosure or encryption failures;
- SQL injection or unsafe query execution boundaries;
- secret leakage in logs, CI, images, or repository history;
- container or deployment paths that expose PostgreSQL or the application directly;
- vulnerabilities that permit remote code execution or privilege escalation.

## Disclosure

Please allow the maintainer time to investigate and prepare a fix before public disclosure. Once a fix is available, coordinated disclosure is preferred.

## Automated security checks

The repository uses automated checks including dependency auditing, secret scanning with gitleaks, Dependabot updates, and CodeQL. These checks complement — but do not replace — code review, tests, and responsible disclosure.

### Known tooling-only advisories

The full `npm audit` report is always emitted in CI. At the time this policy was added, current upstream releases of the Prisma CLI and Next.js ESLint tooling still carried high-severity advisories through development/CLI-only dependency chains.

The blocking audit check permits only the explicitly listed tooling packages in `scripts/check-audit.mjs`; any new high/critical package fails CI. The regular Docker CI separately verifies that Prisma CLI, MySQL tooling, deepmerge tooling, and braces are absent from the traffic-serving runtime image.

Dependabot remains enabled so the allowlist can be reduced as upstream fixes become available.
