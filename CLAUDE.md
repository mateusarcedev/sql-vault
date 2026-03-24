# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start development server (Next.js)
npm run build        # Production build
npm run lint         # ESLint
npm run test         # Run tests once (Vitest)
npm run test:watch   # Watch mode
npm run test:coverage # Coverage report
npx prisma migrate dev   # Apply/create DB migrations
npx prisma studio        # Visual DB browser
```

## Architecture Overview

**SQL Vault** is a local-first SQL query management system. It's a full-stack Next.js (App Router) application backed by SQLite via Prisma, with a companion VS Code extension.

### Route Structure

- `app/(auth)/` — Public routes (login, signup)
- `app/(app)/` — Authenticated routes (dashboard, consultas, routines, settings, tags, lixeira)
- `app/api/` — RESTful API handlers organized by resource

### State Management

Three layers work together:
1. **TanStack Query** — All server state (API fetches, caching, background sync, cache invalidation after mutations)
2. **Zustand** — Global UI state (`store/query-store.ts`, `store/routine-store.ts`, `store/ui-store.ts`)
3. **URL query params** — Drawer/modal open state (e.g., `?drawer=new`, `?drawer=edit`), enabling deep-linking

### Authentication (Dual)

- **Web UI**: NextAuth v5 (JWT cookies via `auth.ts` / `auth.config.ts`)
- **External clients (VS Code extension)**: Bearer token API keys, resolved in `lib/auth-api-key.ts`
- All API routes must accept both auth methods and enforce user ownership on every query

### Database Rules (Prisma + SQLite)

Key schema rules from `ARCHITECTURE.md`:
- **Ownership**: Every resource (Query, Routine, Tag, ApiKey) belongs to a `userId`. All DB queries MUST filter by `userId`.
- **Soft delete**: Use `deletedAt` timestamp, never hard-delete Queries or Routines.
- **Automatic versioning**: On any SQL content change, create a new `QueryVersion` or `RoutineVersion` snapshot.
- **API Key security**: The raw token is returned only once on creation (POST); never expose it in GET responses.
- **Routine parameters**: Stored as a JSON string in `Routine.parameters`; deserialize when returning from API.

### Key Files

| File | Purpose |
|------|---------|
| `auth.ts` / `auth.config.ts` | NextAuth configuration |
| `lib/db.ts` | Prisma client singleton |
| `lib/auth-api-key.ts` | API key auth resolver |
| `prisma/schema.prisma` | 7-model DB schema |
| `middleware.ts` | Route protection middleware |
| `components/providers.tsx` | Client-side provider tree |

### Component Patterns

- UI primitives live in `components/ui/` (shadcn/ui, Radix-based)
- Domain components: `QueryCard`, `QueryDrawer`, `RoutineCard`, `RoutineDrawer`, `VersionTimeline`, `VersionDiffModal`, `CommandPalette`
- Monaco Editor used for SQL editing with syntax highlighting
- Skeleton components provided for loading states

### Error Conventions

- `401` — No valid session or API key
- `403` — Ownership violation (accessing another user's resource)
- `404` — Resource missing or soft-deleted

## Environment Variables

```
DATABASE_URL=file:./prisma/dev.db
AUTH_SECRET=<openssl rand -base64 32>
NEXTAUTH_URL=http://localhost:3000
```
