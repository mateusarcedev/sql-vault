# Database Contexts + Public Visibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement Database Contexts with ownership-safe CRUD, optional linking in Queries/Routines, public visibility rules, AI contextual analysis, and export/import v3 compatibility.

**Architecture:** Add a new `DatabaseContext` model and extend Query/Routine with `databaseId` and `isPublic`. Enforce effective public visibility via API predicates (resource public + context public), keep existing SQL versioning unchanged, and inject raw schema context into AI analyze when `databaseId` is provided.

**Tech Stack:** Next.js App Router, TypeScript, Prisma + SQLite, NextAuth/Auth.js + API key auth, Zustand stores, next-intl, Vitest.

---

## File Structure Map

### New files
- `app/api/database-contexts/route.ts` — list/create Database Contexts with scope filtering.
- `app/api/database-contexts/[id]/route.ts` — get/update/delete Database Context by id.
- `app/[locale]/(app)/databases/page.tsx` — dedicated management page.
- `components/database-context-drawer.tsx` — create/edit drawer for context records.
- `store/database-context-store.ts` — client state + CRUD calls.
- `types/database-context.ts` — shared type contracts (`SchemaFormat`, entity types).
- `tests/api/database-contexts.test.ts` — API contract tests for context resource.
- `tests/api/ai-analyze-database-context.test.ts` — AI analyze with `databaseId` tests.
- `tests/api/export-import-v3.test.ts` — v3 roundtrip and compatibility tests.

### Modified files
- `prisma/schema.prisma` — add `DatabaseContext`; add `databaseId`/`isPublic` fields to Query/Routine.
- `app/api/queries/route.ts` — accept/store `databaseId` and `isPublic`; public scope list.
- `app/api/queries/[id]/route.ts` — update validations and response shape.
- `app/api/routines/route.ts` — accept/store `databaseId` and `isPublic`; public scope list.
- `app/api/routines/[id]/route.ts` — update validations and response shape.
- `app/api/ai/analyze/route.ts` — accept `databaseId` and fetch context.
- `lib/ai/index.ts` — extend analyze entrypoint for optional context payload.
- `lib/ai/prompt.ts` — append context block + truncation policy.
- `lib/ai/providers/openai.ts` — pass new prompt args.
- `lib/ai/providers/anthropic.ts` — pass new prompt args.
- `lib/ai/providers/gemini.ts` — pass new prompt args.
- `lib/ai/providers/ollama.ts` — pass new prompt args.
- `app/api/export/route.ts` — implement versioned export payload up to v3.
- `app/api/import/route.ts` — import v3 database contexts and id mapping.
- `components/query-drawer.tsx` — context selector + public toggle guardrails.
- `components/routine-drawer.tsx` — context selector + public toggle guardrails.
- `components/ai-analysis-panel.tsx` — optional `databaseId` input to analyze action.
- `hooks/use-ai-analyze.ts` — send `databaseId` in request body.
- `store/query-store.ts` — include new fields in create/update payloads.
- `store/routine-store.ts` — include new fields in create/update payloads.
- `types/query.ts` — add `databaseId`, `isPublic`, owner metadata for public scope.
- `types/routine.ts` — add `databaseId`, `isPublic`, owner metadata for public scope.
- `app/[locale]/(app)/settings/page.tsx` — add Database Contexts section/tab entrypoint.
- `messages/pt-BR.json` — strings for contexts and visibility hints.
- `messages/en.json` — strings for contexts and visibility hints.
- `ARCHITECTURE.md` — document new model + routes + visibility rules.
- `ARCHITECTURE.en.md` — English sync.

---

### Task 1: Prisma schema and migration safety

**Files:**
- Modify: `prisma/schema.prisma`
- Test: `tests/api/database-contexts.test.ts`

- [ ] **Step 1: Write failing test for schema-backed CRUD assumptions**

```ts
it('creates database context with required fields', async () => {
  // expect POST /api/database-contexts with required payload to return 200/201
})
```

- [ ] **Step 2: Run targeted test to verify failure**

Run: `npm run test -- tests/api/database-contexts.test.ts`
Expected: FAIL (route/model missing)

- [ ] **Step 3: Update Prisma schema minimally**

Implement:
- `model DatabaseContext`
- `Query.databaseId String?`, `Query.isPublic Boolean @default(false)`
- `Routine.databaseId String?`, `Routine.isPublic Boolean @default(false)`
- relations + explicit indexes:
  - `Query @@index([userId, isPublic])`
  - `Query @@index([databaseId])`
  - `Routine @@index([userId, isPublic])`
  - `Routine @@index([databaseId])`
  - `DatabaseContext @@index([userId, isPublic])`

- [ ] **Step 4: Create migration and generate Prisma client**

Run: `npx prisma migrate dev --name add_database_contexts_visibility`
Expected: migration created and client regenerated

- [ ] **Step 5: Re-run targeted test (still expected partial fail)**

Run: `npm run test -- tests/api/database-contexts.test.ts`
Expected: FAIL now at missing API behavior, not schema

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
 git commit -m "feat(prisma): add database contexts and visibility fields"
```

### Task 2: Database Context API (`/api/database-contexts`)

**Files:**
- Create: `app/api/database-contexts/route.ts`
- Create: `app/api/database-contexts/[id]/route.ts`
- Create/Modify Test: `tests/api/database-contexts.test.ts`

- [ ] **Step 1: Write failing API tests**

```ts
it('returns only owner contexts on scope=mine')
it('returns public contexts on scope=public')
it('supports session auth and api-key auth')
it('rejects invalid enum values for type/schemaFormat')
it('enforces schemaDefinition max length')
it('sets linked resources databaseId=null on delete')
it('deletes context and nullifies links atomically')
```

Enum contract for tests/validation:
- `type`: `postgresql|mysql|sqlite|sqlserver|oracle|other`
- `schemaFormat`: `prisma|sql|other`

- [ ] **Step 2: Run tests and confirm failures**

Run: `npm run test -- tests/api/database-contexts.test.ts`
Expected: FAIL (routes absent)

- [ ] **Step 3: Implement `GET/POST /api/database-contexts`**

Requirements:
- auth: session or api key (same standard as business routes)
- scope filtering `mine|public|all`
- strict enum validation at runtime for `type` and `schemaFormat`
- validate `schemaDefinition` max 10000

- [ ] **Step 4: Implement `GET/PUT/DELETE /api/database-contexts/[id]`**

Requirements:
- owner-only mutate
- read allowed for owner or public record
- delete behavior with `prisma.$transaction()`:
  1) `updateMany` Query where `databaseId = contextId` set `databaseId = null`, `isPublic = false`
  2) `updateMany` Routine where `databaseId = contextId` set `databaseId = null`, `isPublic = false`
  3) hard delete DatabaseContext by id
  4) rollback all if any step fails
- public scope shape includes owner metadata and excludes raw `schemaDefinition` by default list response

- [ ] **Step 5: Re-run tests**

Run: `npm run test -- tests/api/database-contexts.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add app/api/database-contexts tests/api/database-contexts.test.ts
 git commit -m "feat(api): add database-contexts CRUD with ownership and scope"
```

### Task 3: Query API contract updates (`databaseId`, `isPublic`, public scope)

**Files:**
- Modify: `app/api/queries/route.ts`
- Modify: `app/api/queries/[id]/route.ts`
- Test: `tests/api/queries.test.ts` (create if absent under `tests/api/`)

- [ ] **Step 1: Write failing tests for new query behavior**

```ts
it('rejects create/update when databaseId belongs to another user')
it('forces isPublic=false when databaseId is null')
it('lists only effective public queries on scope=public')
it('includes owner metadata in public scope responses')
it('owner can always read own resources regardless of public flags')

it('public visibility matrix: resource public + context public => visible')
it('public visibility matrix: resource public + context private => hidden')
it('public visibility matrix: resource private + context public => hidden')
it('public visibility matrix: resource public + no context => hidden')
```

- [ ] **Step 2: Run targeted tests**

Run: `npm run test -- tests/api/queries.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement API changes minimally**

Requirements:
- validate `databaseId` ownership on write
- apply effective-public rule
- include `owner` metadata for public list response
- ensure public predicate requires both resource and linked context public
- keep SQL versioning behavior unchanged

- [ ] **Step 4: Re-run tests**

Run: `npm run test -- tests/api/queries.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/api/queries tests/api/queries.test.ts
 git commit -m "feat(api): extend queries with database context and public scope"
```

### Task 4: Routine API contract updates (`databaseId`, `isPublic`, public scope)

**Files:**
- Modify: `app/api/routines/route.ts`
- Modify: `app/api/routines/[id]/route.ts`
- Test: `tests/api/routines.test.ts` (create if absent)

- [ ] **Step 1: Write failing routine tests mirroring query rules**
- [ ] **Step 1: Write failing routine tests with explicit parity to Query rules**
  - ownership validation on `databaseId`
  - effective-public visibility matrix (same 4 cases as Query)
  - owner metadata in public scope
  - owner can always read own resources
- [ ] **Step 2: Run tests and verify failure**
- [ ] **Step 3: Implement routine API updates with same effective-public rule**
- [ ] **Step 4: Ensure parameters JSON serialization behavior remains intact (Routine-specific invariant)**
- [ ] **Step 5: Re-run tests and verify pass**
- [ ] **Step 6: Commit**

```bash
git add app/api/routines tests/api/routines.test.ts
 git commit -m "feat(api): extend routines with database context and public scope"
```

### Task 5: AI analyze with database context injection

**Files:**
- Modify: `app/api/ai/analyze/route.ts`
- Modify: `lib/ai/index.ts`
- Modify: `lib/ai/prompt.ts`
- Modify: `lib/ai/providers/openai.ts`
- Modify: `lib/ai/providers/anthropic.ts`
- Modify: `lib/ai/providers/gemini.ts`
- Modify: `lib/ai/providers/ollama.ts`
- Create/Modify Test: `tests/api/ai-analyze-database-context.test.ts`

- [ ] **Step 1: Write failing tests for `databaseId` success and 404 cases**
- [ ] **Step 2: Run tests and verify failure**
- [ ] **Step 3: Update route payload contract (`sql`, `dialect`, `databaseId?`)**
- [ ] **Step 4: Resolve context (owner OR public) and return 404 before provider when inaccessible**
- [ ] **Step 5: Update prompt builder to include context block + 8000-char truncation**
- [ ] **Step 5: Update prompt builder to include context block + 8000-char truncation + truncation debug log**
- [ ] **Step 6: Update provider wrappers to pass new prompt args**
- [ ] **Step 7: Re-run tests and verify pass**
- [ ] **Step 8: Commit**

```bash
git add app/api/ai/analyze lib/ai tests/api/ai-analyze-database-context.test.ts
 git commit -m "feat(ai): support database context in analyze prompt"
```

### Task 6: Export/import versioned payload alignment (v1/v2/v3)

**Execution order note:** Execute this task after Task 9 (all API/UI field changes settled).

**Files:**
- Modify: `app/api/export/route.ts`
- Modify: `app/api/import/route.ts`
- Modify: `tests/api/import.test.ts`
- Create: `tests/api/export-import-v3.test.ts`

- [ ] **Step 1: Write failing tests for version map and v3 roundtrip**
- [ ] **Step 1: Write failing tests for version map and v3 roundtrip**
  - prerequisite assertion: v2 export compatibility remains valid before v3 enablement
- [ ] **Step 2: Run tests to confirm failure**
- [ ] **Step 3: Update export route to emit versioned JSON payloads**

Expected map:
- v1: legacy
- v2: v1 + routines
- v3: v2 + databaseContexts + `databaseId` + `isPublic`

- [ ] **Step 4: Update import route to parse v3 and map oldContextId->newContextId**
- [ ] **Step 4: Update import route to parse v3 and map oldContextId->newContextId**
  - add test for mapping fallback (`databaseId -> null` when context missing)
- [ ] **Step 5: keep v1/v2 compatibility tests green**
- [ ] **Step 6: Re-run import/export tests**

Run: `npm run test -- tests/api/import.test.ts tests/api/export-import-v3.test.ts`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add app/api/export app/api/import tests/api/import.test.ts tests/api/export-import-v3.test.ts
 git commit -m "feat(data): add export/import v3 with database context mapping"
```

### Task 7: Types and stores for new contracts

**Files:**
- Create: `types/database-context.ts`
- Modify: `types/query.ts`
- Modify: `types/routine.ts`
- Create: `store/database-context-store.ts`
- Modify: `store/query-store.ts`
- Modify: `store/routine-store.ts`

- [ ] **Step 1: Write failing unit/integration expectations for payload fields in stores**
- [ ] **Step 2: Implement shared types (`SchemaFormat`, context entity, public owner metadata)**
- [ ] **Step 3: Add database-context store CRUD methods**
- [ ] **Step 4: Extend query/routine store create/update payloads with `databaseId`, `isPublic`**
- [ ] **Step 5: Run affected tests**

Run: `npm run test -- tests/api/*.test.ts`
Expected: PASS (or no regressions)

- [ ] **Step 6: Commit**

```bash
git add types store
 git commit -m "feat(frontend-state): add database context types and stores"
```

### Task 8: UI for Database Context management (Settings + /databases)

**Files:**
- Create: `app/[locale]/(app)/databases/page.tsx`
- Create: `components/database-context-drawer.tsx`
- Modify: `app/[locale]/(app)/settings/page.tsx`
- Modify: `messages/pt-BR.json`
- Modify: `messages/en.json`

- [ ] **Step 1: Add failing UI test/smoke checks if project has pattern**
- [ ] **Step 2: Implement dedicated `/databases` page list + actions**
- [ ] **Step 3: Implement settings section/tab entry for quick management**
- [ ] **Step 4: Implement create/edit drawer with schema text area and format selector**
- [ ] **Step 5: Add i18n labels/messages**
  - include guardrail keys for public visibility hints
  - `database.context.required_for_public`
  - `database.context.must_be_public`
- [ ] **Step 6: Run lint and targeted tests**

Run: `npm run lint`
Expected: no new lint errors

- [ ] **Step 7: Commit**

```bash
git add app/[locale]/(app)/databases components/database-context-drawer.tsx app/[locale]/(app)/settings/page.tsx messages
 git commit -m "feat(ui): add database context management surfaces"
```

### Task 9: Query/Routine drawers + AI panel wiring

**Files:**
- Modify: `components/query-drawer.tsx`
- Modify: `components/routine-drawer.tsx`
- Modify: `components/ai-analysis-panel.tsx`
- Modify: `hooks/use-ai-analyze.ts`

- [ ] **Step 1: Write/adjust failing UI behavior tests if available**
- [ ] **Step 2: Add Database Context selector in both drawers**
- [ ] **Step 3: Add `isPublic` toggle with guardrails**

Guardrails:
- disable when no context selected
- disable when selected context is private
- add explicit UI tests/assertions:
  - `isPublic` toggle disabled when `databaseId === null`
  - `isPublic` toggle disabled when selected context `isPublic === false`
  - hint message rendered for both cases

- [ ] **Step 4: Pass selected `databaseId` to AI analyze panel/hook**
- [ ] **Step 5: Run lint + test subset**

Run: `npm run lint && npm run test -- tests/api/ai-analyze-database-context.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add components/query-drawer.tsx components/routine-drawer.tsx components/ai-analysis-panel.tsx hooks/use-ai-analyze.ts
 git commit -m "feat(ui): wire database context and public visibility in drawers and AI panel"
```

### Task 10: Docs and architecture sync

**Files:**
- Modify: `ARCHITECTURE.md`
- Modify: `ARCHITECTURE.en.md`
- Optionally Modify: `README.md`, `README.en.md` (if feature surfaced publicly)

- [ ] **Step 1: Update architecture docs with new model/routes/rules**
- [ ] **Step 2: Confirm route map includes `/api/database-contexts` and scope behaviors**
- [ ] **Step 3: Run markdown lint/quick sanity if available**
- [ ] **Step 4: Commit**

```bash
git add ARCHITECTURE.md ARCHITECTURE.en.md README.md README.en.md
 git commit -m "docs: document database contexts and public visibility model"
```

### Task 11: Full verification pass

**Files:**
- N/A (verification only)

- [ ] **Step 1: Run focused API tests**

Run: `npm run test -- tests/api`
Expected: PASS

- [ ] **Step 2: Run full test suite**

Run: `npm run test`
Expected: PASS (or only pre-existing unrelated failures)

- [ ] **Step 3: Run lint**

Run: `npm run lint`
Expected: PASS

- [ ] **Step 4: Run build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 5: Final commit (if needed)**

```bash
git add -A
 git commit -m "chore: finalize database context feature and validations"
```

---

## Notes for Implementer

- Preserve existing Query/Routine SQL versioning semantics exactly.
- Keep `schemaDefinition` raw; do not add semantic parsing.
- Ownership predicates must be centralized and reused to avoid accidental leakage.
- Prefer minimal changes per task and keep commits small.
- If any existing tests are flaky/unrelated, report separately; do not silently adjust behavior outside scope.
