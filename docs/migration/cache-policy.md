# Cache policy

Strategy for caching in the split architecture: short TTL for hot reads and explicit invalidation.

## Scope

- **Backend (apps/backend)**: No application-level cache is implemented in Phase 4. DB is the source of truth.
- **Next.js API routes (/api/v1)**: No cache layer; they delegate to server actions.
- **Frontend**: No HTTP caching policy is set on API responses; browser may use its own heuristics. Client state (e.g. React state after listProjects) is in-memory only.

## Recommended policy (when adding cache)

### What to cache

- **Project types** (GET /api/v1/project-types): Rarely change. Cache with a short TTL (e.g. 60–300 seconds) or invalidate on project type create/update/delete in settings.
- **Project statuses** (GET /api/v1/project-statuses): Same as above.
- **Project list** (GET /api/v1/projects): Optional. If cached, use a very short TTL (e.g. 10–30 seconds) and cache per user + query (e.g. key = `projects:${userId}:${hash(params)}`).
- **Single project** (GET /api/v1/projects/:id): Optional short TTL; must invalidate on update/delete for that id.

### Invalidation

- On **create/update/delete project**: Invalidate list caches for any user who might see that project, and invalidate the single-project cache for that id.
- On **project type/status create/update/delete**: Invalidate project-types or project-statuses cache (and optionally project list if response includes type/status labels).

### Where to implement

- **Backend**: In-memory cache (e.g. node-cache) or Redis. Invalidate in the same process after mutations.
- **Next.js (if keeping API routes)**: Same idea; or use Next.js `unstable_cache` / fetch cache with revalidate.
- **Frontend**: Prefer refetch after mutations (e.g. router.refresh or refetch from adapter) rather than client-side cache beyond current page state.

## Current status

- **Phase 4**: No cache implemented. This document is the policy for when caching is added. After cutover, add caching to the backend for project-types and project-statuses first, then consider list/detail with short TTL and invalidation on write.
