# SQL Vault Architecture

> Language: **English** | [Português (Brasil)](ARCHITECTURE.md)

## 1. Project Overview

SQL Vault is a local-first system for developers, data analysts, and engineering teams to organize, version, and execute SQL queries and database routines in a centralized repository. It focuses on fast search, tagging, versioning, and secure integrations with external tools.

## 2. Technology Stack

* **Next.js 16 (App Router)**: Full-stack React framework with API routes and clear server/client component boundaries.
* **TypeScript**: Strong typing and safer contracts across the codebase.
* **Prisma**: Type-safe ORM for data access, migrations, and schema generation.
* **SQLite**: Primary local database, aligned with the local-first model.
* **NextAuth v5 (Auth.js)**: Session authentication with secure HTTP-only cookies and bcrypt password checks.
* **next-intl**: Internationalization with locale-prefixed routes (`/en`, `/pt-BR`) and language-specific message catalogs.
* **TanStack Query**: Remote state, caching, background updates, and invalidation.
* **Zustand**: Lightweight global state for UI and interaction flows.
* **shadcn/ui**: Accessible, customizable UI components built on Radix primitives.
* **Tailwind CSS**: Utility-first styling directly in React components.
* **Monaco Editor**: Advanced SQL editing with syntax highlighting/autocomplete.
* **bcryptjs**: Password hashing/checking in the credentials auth provider.

## 3. Project Structure

* `app/(auth)/`: Public unauthenticated routes (login/signup).
* `app/(app)/`: Main authenticated routes.
* `app/api/`: REST handlers with auth/ownership checks.
* `components/`: Reusable UI components.
* `store/`: Zustand stores by domain (`query-store.ts`, `routine-store.ts`, `ui-store.ts`).
* `types/`: Shared TypeScript types and interfaces.
* `lib/`: Utility layer and system singletons (`db.ts`, `auth-api-key.ts`).
* `prisma/`: `schema.prisma`, migrations, and SQLite file (`dev.db`).

## 4. Database Schema

* **User**
  * Required: `email`, `password` (hashed)
  * Relations: `queries`, `routines`, `tags`, `apiKeys`
* **Query**
  * Required: `id`, `name`, `sql`, `database`, `status`, `isFavorite`, `copyCount`, `userId`
  * Soft delete: `deletedAt`
  * Relations: many `tags`, many `versions`
* **QueryVersion**
  * Immutable snapshot of a Query (`id`, `queryId`, `sql`, `createdAt`)
  * Auto-created when query SQL changes in `PUT /api/queries/[id]`
* **Tag**
  * Required: `id`, `name`, `color`, `userId`
  * Shared metadata entity across Queries and Routines
* **Routine**
  * Required: `id`, `name`, `sql`, `database`, `type`, `userId`
  * `parameters` is JSON serialized as string at persistence boundary
  * Soft delete: `deletedAt`
  * Relations: many `tags`, many `versions`
* **RoutineVersion**
  * Immutable snapshot of a Routine (`id`, `routineId`, `sql`, `createdAt`)
  * Auto-created when routine SQL changes in `PUT /api/routines/[id]`
* **ApiKey**
  * Required: `id`, `name`, `token`, `userId`
  * Metadata: `lastUsedAt`, `regeneratedAt`
* **UserAIConfig**
  * Required: `userId`, `provider`, `model`
  * Optional provider keys: `openaiApiKey`, `anthropicApiKey`, `geminiApiKey`

## 5. Architectural Rules

1. **Ownership required**: User data models must be tied to `userId`.
2. **Soft delete**: `Query`/`Routine` must use `deletedAt`, not hard delete.
3. **Routine parameters**: Always deserialize before response, serialize before persistence.
4. **Shared metadata**: `Tag` can relate to both `Query` and `Routine` using separate relations.
5. **Token security**: Raw API key token is returned only once on `POST /api/keys`.
6. **Automatic versioning**: On SQL change in `PUT` handlers, create version snapshot before update.

## 6. Authentication

Dual auth model:

1. **NextAuth v5 session cookies** (web UI)
2. **Personal API Keys (Bearer token)** for external clients (e.g. VS Code extension)

Single source for API key resolution: `lib/auth-api-key.ts` (`getUserFromApiKey`).

## 7. API Conventions

1. Resolve active `userId` early in every authenticated handler.
2. Standard statuses:
   * `401` unauthenticated
   * `403` ownership violation
   * `404` resource missing or soft-deleted
3. Ownership filtering must be embedded in Prisma `where` clauses.
4. Date fields should be serialized as ISO 8601 at API boundary.

## 8. Route Map

**Queries API**
* `GET /api/queries`
* `POST /api/queries`
* `GET /api/queries/[id]`
* `PUT /api/queries/[id]`
* `DELETE /api/queries/[id]` (soft delete)
* `POST /api/queries/[id]/copy`

**Routines API**
* `GET /api/routines`
* `POST /api/routines`
* `GET /api/routines/[id]`
* `PUT /api/routines/[id]`
* `DELETE /api/routines/[id]` (soft delete)
* `POST /api/routines/[id]/copy`

**Tags API**
* `GET /api/tags`
* `POST /api/tags`

**Versions API**
* `GET /api/queries/[id]/versions`
* `POST /api/queries/[id]/versions/[versionId]/restore`
* `GET /api/routines/[id]/versions`
* `POST /api/routines/[id]/versions/[versionId]/restore`

**Export/Import API**
* `GET /api/export?format=json`
* `GET /api/export?format=sql`
* `POST /api/import` (session-only)

**API Keys API** (session-only)
* `GET /api/keys`
* `POST /api/keys`
* `DELETE /api/keys/[id]`
* `POST /api/keys/[id]/regenerate`

**AI API** (session-authenticated)
* `GET /api/ai/config`
* `PUT /api/ai/config`
* `GET /api/ai/models?provider=` (dynamic provider model listing with short-lived cache)
* `POST /api/ai/analyze` (structured SQL analysis output)

## 9. Frontend Patterns

1. Zustand for cross-component UI state; TanStack Query for server state.
2. Drawer/modal state in URL query params (deep-linkable).
3. Route-group separation: `(auth)` and `(app)`.
4. Store initialization only after confirmed authenticated session.
5. Reuse core UI components aggressively instead of ad-hoc duplication.

## 10. UI Design Tokens

**Core colors**
* Background: `#0F172A`
* Sidebar/Cards: `#1E293B`
* Borders: `#334155`
* Primary text: `#F1F5F9`
* Secondary text: `#94A3B8`
* Accent: `#3B82F6`

**Tag palette (fixed 8 colors)**
1. `#ef4444`
2. `#f97316`
3. `#eab308`
4. `#22c55e`
5. `#06b6d4`
6. `#3b82f6`
7. `#a855f7`
8. `#ec4899`

## 11. What NOT to Do

* ❌ Never return password hashes or API key tokens in list/read responses.
* ❌ Never expose `Routine.parameters` as raw JSON string to frontend.
* ❌ Never initialize app stores before `status === 'authenticated'`.
* ❌ Never model systemic enums (`DatabaseType`, `RoutineType`) as tags.
* ❌ Never add runtime dependencies without explicit architectural reason.

## 12. Environment Variables

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | Yes | SQLite path (e.g. `file:./prisma/dev.db`) |
| `AUTH_SECRET` | Yes | NextAuth secret (`openssl rand -base64 32`) |
| `NEXTAUTH_URL` | Prod yes | Base URL (e.g. `http://localhost:3000`) |

`.env.example` starter:

```env
DATABASE_URL="file:./prisma/dev.db"
AUTH_SECRET=""
NEXTAUTH_URL="http://localhost:3000"
```

## 13. VS Code Extension

Separate repository: `github.com/{user}/sqlvault-vscode`

Authentication: API key only (`Authorization: Bearer {token}`)

Consumed routes:
* `GET /api/queries?search={term}`
* `POST /api/queries`
* `GET /api/tags`
* `POST /api/queries/[id]/copy`

Commands:
* `SQL Vault: Search Query` (`Cmd+Shift+S`)
* `SQL Vault: Save Selected SQL`
* `SQL Vault: Configure API Key`

User settings:

```json
{
  "sqlvault.apiUrl": "http://localhost:3000",
  "sqlvault.apiKey": ""
}
```
