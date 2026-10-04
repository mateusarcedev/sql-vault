# Contributing to SQL Vault

Thank you for your interest in contributing to SQL Vault.

> Language: **English** | [Português (Brasil)](CONTRIBUTING.md)

Before you start, read [ARCHITECTURE.en.md](ARCHITECTURE.en.md). It contains the architectural and security rules that contributions must preserve.

## Getting started

### 1. Requirements

- Node.js 22 LTS
- npm
- Docker + Docker Compose
- Git

### 2. Clone and configure

```bash
git clone https://github.com/mateusarcedev/sql-vault.git
cd sql-vault
cp .env.example .env
npm ci
```

Generate `AUTH_SECRET` and `AI_ENCRYPTION_KEY`:

```bash
node -e "const c=require('crypto'); console.log('AUTH_SECRET='+c.randomBytes(32).toString('base64')); console.log('AI_ENCRYPTION_KEY='+c.randomBytes(32).toString('base64'))"
```

Copy the generated values into `.env`.

### 3. Database

```bash
docker compose up -d db
npm run prisma:generate
npm run db:migrate:deploy
```

### 4. Development

```bash
npm run dev
```

The application is available at `http://localhost:3000`.

## Development standards

### Backend and API

- **Ownership:** every user-scoped read/write must enforce `userId`.
- **Authentication:** use the Auth.js session or `getUserFromApiKey` according to the route contract.
- **Soft delete:** Queries and Routines use `deletedAt`; do not hard-delete these models.
- **Versioning:** SQL changes must preserve the previous version.
- **Secrets:** never return passwords, persisted raw tokens, or AI credentials.
- **Migrations:** schema changes must use incremental, testable migrations.

### Frontend

- reuse existing components before creating new ones;
- use Zustand for global UI state;
- use TanStack Query for remote data;
- preserve the query-param-driven drawer/modal pattern;
- follow the design tokens in `ARCHITECTURE.en.md`.

## Validation before opening a PR

Run:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

If the change affects UI flows, authentication, navigation, or other critical integrations, install Playwright Chromium once and run:

```bash
npx playwright install chromium
npm run test:e2e
```

The E2E suite uses PostgreSQL and the demo seed; keep the local database prepared as described above.

If the change affects the database or Docker, also run:

```bash
npm run prisma:generate
npm run db:migrate:deploy
docker compose build
```

## Pull request checklist

- [ ] Scope is focused and clearly described.
- [ ] Lint passes.
- [ ] Typecheck passes.
- [ ] Unit/API tests pass.
- [ ] Playwright E2E passes when the changed flow is covered by the suite.
- [ ] Build passes.
- [ ] New routes or business rules have tests.
- [ ] Ownership and authentication were reviewed.
- [ ] No secret, `.env`, dump, or generated artifact was committed.
- [ ] PT/EN documentation was updated when applicable.
- [ ] Migrations are compatible with the deployment flow.

## Security

Do not open a public issue for vulnerabilities. See [SECURITY.md](SECURITY.md).

## VS Code extension

The extension is maintained in a separate repository and authenticates with API Keys. Extension-specific changes belong in that repository.

## Help

Open an issue for bugs, improvements, or contribution questions that do not contain sensitive security information.
