# Phase 4: Data/access hardening

## 1. Frontend has zero DB dependency

**Audit result**: The client bundle has no direct database access.

- All `prisma` / `@prisma` usage is in **server-only** code: `src/app/actions/*`, `src/app/api/*`, and `src/lib/*` (auth, rbac, activity-logger, etc.). These run only on the server (Node).
- **Client components** (`"use client"`) do not import Prisma or any DB driver. They call server actions or `fetch` to API routes; the adapter (`src/lib/api/projects-adapter.ts`) uses the SDK or server actions, never Prisma.
- **RSC pages** call server actions or async functions that use Prisma on the server.

**Conclusion**: No change required for “zero DB in frontend.” Keep any new client-side code free of Prisma/DB imports.

## 2. Query optimization notes

See [query-optimization-notes.md](./query-optimization-notes.md) for:

- Use of `select` / `include` in backend and monolith
- Pagination (skip/take, limit)
- N+1 avoidance and recommended patterns
- Index usage and recommended indexes

## 3. Cache policy

See [cache-policy.md](./cache-policy.md) for:

- Short TTL for hot reads (e.g. project list, project types/statuses)
- Explicit invalidation paths (e.g. on create/update/delete project)
- Where caching is applied (backend, API route layer, or not yet)

## 4. Index migration scripts

See [query-optimization-notes.md](./query-optimization-notes.md#indexes). The Prisma schema already defines indexes for Projects domain filters and lookups. Any new index should be added via a Prisma migration (e.g. `npx prisma migrate dev --name add_xyz_index`).
