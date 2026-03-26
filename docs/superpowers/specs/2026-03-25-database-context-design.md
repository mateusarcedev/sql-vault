# SQL Vault — Database Contexts + Public Visibility (Design)

Date: 2026-03-25  
Status: Draft approved for implementation planning

## 1) Summary

This design introduces an optional **Database Context** entity owned by users and linkable from Queries and Routines.  
The context is used as additional prompt input for AI analysis and supports controlled public visibility.

Primary outcomes:
- Optional database context association on Query/Routine (`databaseId` nullable)
- Per-resource public visibility (`isPublic`) for Query and Routine
- Per-context public visibility (`isPublic`) for Database Context
- Public listing visibility only when **both** resource and context are public
- `isPublic` is only effective when `databaseId` is set and points to a public context
- Author metadata exposed for public resources (creator name + "Pública" badge)
- AI analyze can receive `databaseId` and inject raw schema context without parsing
- Export/import support extended to payload v3

## 2) Goals

- Add user-scoped Database Context CRUD (`/api/database-contexts`) with ownership guarantees
- Preserve local-first architecture and existing ownership model
- Improve semantic quality of AI analysis by adding explicit schema context
- Keep backward compatibility with existing data and API consumers

## 3) Non-goals

- No semantic schema validation
- No schema parsing/AST generation
- No external database synchronization
- No automatic schema inference from SQL

## 4) Domain Model

### 4.1 New entity: DatabaseContext

Fields:
- `id: string`
- `name: string`
- `type: DatabaseType` (`postgresql|mysql|sqlite|sqlserver|oracle|other`)
- `schemaDefinition: string` (raw text)
- `schemaFormat: SchemaFormat` (`prisma|sql|other`)
- `isPublic: boolean` (default `false`)
- `userId: string` (required ownership)
- `createdAt: DateTime`
- `updatedAt: DateTime`

Relations:
- `user -> User`
- `queries -> Query[]`
- `routines -> Routine[]`

Delete behavior:
- Hard delete allowed for DatabaseContext
- On delete: linked Query/Routine keep integrity by setting `databaseId = null` atomically (required behavior)

### 4.2 Existing entities (extensions)

#### Query
- Add `databaseId?: string | null`
- Add `isPublic: boolean` default `false`

#### Routine
- Add `databaseId?: string | null`
- Add `isPublic: boolean` default `false`

Compatibility:
- Existing records remain valid with `databaseId = null` and `isPublic = false`

## 5) Visibility and Authorization Rules

### 5.1 Ownership baseline
- All private operations remain owner-scoped by `userId`
- No cross-user access for private resources

### 5.2 Public visibility rule
A Query/Routine is visible to other users only if:
1. Resource `isPublic = true`, and
2. Linked DatabaseContext exists and `isPublic = true`

Effective visibility rule:
- If `databaseId = null`, resource is always private to its owner even if `isPublic = true`
- If context visibility becomes private later, all linked public resources become hidden from other users immediately

Additionally:
- Public listing responses include author metadata (`owner.id`, `owner.name`) and visibility marker
- Owner always sees own resources regardless of public flags

### 5.3 Error semantics
- `401` unauthenticated
- `404` resource not found or not accessible (anti-enumeration)
- `403` only when explicit ownership violation must be signaled in owner-only mutation flows

## 6) API Design

### 6.1 New endpoints: Database Contexts

- `GET /api/database-contexts`
  - Supports `scope=mine|public|all` (default `mine`)
- `POST /api/database-contexts`
- `GET /api/database-contexts/[id]`
- `PUT /api/database-contexts/[id]`
- `DELETE /api/database-contexts/[id]` (hard delete)

Validation:
- `name`, `type`, `schemaDefinition`, `schemaFormat` required on create
- `type` and `schemaFormat` strict enum validation
- `schemaDefinition` max length: 10,000 chars

### 6.2 Query/Routine contract updates

Create/Update accept:
- `databaseId?: string | null`
- `isPublic?: boolean`

Rules:
- If `databaseId` provided, it must reference an accessible context under owner rules for write flows
- If `databaseId = null`, API stores `isPublic = false` (effective public publishing requires linked context)
- Existing SQL versioning behavior remains unchanged

Public discovery endpoints:
- `GET /api/queries?scope=public`
- `GET /api/routines?scope=public`

Public scope response shape additions:
- `owner: { id: string, name: string | null }`
- `isPublic: true`
- linked context metadata (`databaseId`, `databaseContext.name`, `databaseContext.type`)

### 6.3 AI Analyze update

`POST /api/ai/analyze` accepts optional `databaseId`.

When `databaseId` is present:
- Resolve context by access rule (owner OR public)
- If inaccessible/missing: `404` before invoking provider
- Inject additional prompt block with:
  - Database type
  - Schema format
  - Raw schema definition (truncated when needed)
  - SQL being analyzed

No backend parsing of schema; text is forwarded as context.

## 7) Prompt Contract for AI

Prompt system/user composition will append a structured section:
- `Database type: <type>`
- `Schema format: <schemaFormat>`
- `Schema definition: <schemaDefinition or truncated schemaDefinition>`
- `SQL under analysis: <sql>`

Prompt size policy:
- If `schemaDefinition` > 8,000 chars, truncate to 8,000 and append `[...schema truncated]`
- Log truncation event for diagnostics (without logging full schema content)

Expected effects:
- Better table/column grounding
- Lower ambiguity in complex SQL interpretation
- Fewer hallucinated relations

## 8) Frontend UX

### 8.1 Settings integration
- Add new section/tab “Database Contexts” under Settings for quick CRUD
- If tab architecture is not present, implement as a section in current settings page while preserving route compatibility

### 8.2 Dedicated page
- Add `/databases` page for full management and discoverability

### 8.3 Query/Routine drawers
- Add optional Database Context selector
- Add visibility toggle (`isPublic`)
- Keep existing drawer pattern and URL query-state behavior

Visibility UX guardrails:
- If `databaseId = null`, disable `isPublic` toggle and show hint: “Selecione um Contexto de BD para publicar.”
- If selected context is private, disable `isPublic` toggle and show hint: “Contexto selecionado é privado.”

### 8.4 Public presentation
- Public cards/list rows show:
  - creator identity (name)
  - "Pública" badge
  - existing `DatabaseBadge` usage preserved

## 9) Export/Import v3

Version map:
- v1: Queries + Tags (legacy)
- v2: v1 + Routines
- v3: v2 + DatabaseContexts + `databaseId` + `isPublic`

### 9.1 Export
Introduce payload version `3` including:
- `databaseContexts`
- Query additions: `databaseId`, `isPublic`
- Routine additions: `databaseId`, `isPublic`

Legacy JSON exports remain supported for compatibility. SQL export remains unchanged.

### 9.2 Import
- Continue accepting v1/v2
- Add v3 parsing path
- Import strategy:
  - for each imported context, upsert by `(name, userId)` and build `oldContextId -> newContextId` mapping
  - resolve imported Query/Routine `databaseId` using this mapping
  - fallback to `null` when mapping unavailable

Ownership safety:
- Imported entities always belong to current authenticated user
- No direct cross-user ownership transfer

## 10) Data Migration (Prisma)

Schema changes:
- Add `DatabaseContext` model
- Add nullable `databaseId` + boolean `isPublic` to `Query`
- Add nullable `databaseId` + boolean `isPublic` to `Routine`
- Add indexes for visibility/read patterns:
  - `(userId, isPublic)`
  - `(databaseId)`

Migration requirements:
- Default values ensure legacy data remains functional
- No destructive migration for existing tables

## 11) Testing Strategy

### API tests
- DatabaseContext CRUD ownership paths
- Public scope read behavior (`mine/public/all`)
- Query/Routine create/update with valid/invalid `databaseId`
- AI analyze with and without `databaseId`
- AI analyze inaccessible `databaseId` returns `404`
- Export v3 + import v3 roundtrip integrity
- Query/Routine public scope endpoints return only effective public items
- Write with foreign `databaseId` (another user) is rejected

### Integration tests
- Public visibility matrix:
  - resource public + context public => visible
  - resource public + context private => hidden
  - resource private + context public => hidden
  - resource public + no context => hidden
  - context changed public->private => linked resources become hidden

### Performance/edge tests
- Hard delete context with many linked resources sets `databaseId = null` safely
- Import v3 with duplicated context names behaves deterministically

### Regression tests
- Existing query/routine versioning unchanged
- Existing v1/v2 import still passes

## 12) Risks and Mitigations

- Risk: Public filtering regressions exposing private data  
  Mitigation: centralize query predicates and test visibility matrix.

- Risk: Import mapping ambiguities for contexts  
  Mitigation: deterministic mapping and null fallback with report counters.

- Risk: Prompt token growth due to large schemaDefinition  
  Mitigation: enforce max input size + prompt truncation strategy in MVP.

## 13) Rollout Sequence

1. Prisma schema + migration
2. `/api/database-contexts` endpoints
3. Query/Routine API contract updates (`databaseId`, `isPublic`)
4. AI analyze context injection
5. UI in Settings and `/databases`
6. Drawer updates for Query/Routine
7. Export/import v3
8. Test pass and verification

Prerequisite note:
- Update JSON export behavior to be consistent with v2+ semantics before enabling full v3 rollout.

## 14) Decision Log

- Chosen architecture: **Option A** (direct model extension)
- CRUD route path: `/api/database-contexts`
- Management surfaces: Settings **and** dedicated page
- Public rule applies to **both** Query and Routine
- AI inaccessible `databaseId` handled as `404`

## 15) Open Follow-ups (post-MVP)

- Add pagination/sorting for public discovery views
- Add creator profile display enhancements
- Add optional schema size warnings for AI context cost
