# Phase 3: Strangler migration (Projects domain)

## Done

- **Shadow mode**: When `NEXT_PUBLIC_PROJECTS_SHADOW_MODE=true` and backend is used, read operations (listProjects, getProjectTypes, getProjectStatuses) also call the monolith (same-origin `/api/v1/*`). Responses are compared; diffs are logged to the browser console (`[shadow] ... diff (backend vs monolith)`). The UI always receives the backend response.
- **Compare helper**: `src/lib/api/shadow-compare.ts` — `compareAndLog(operation, params, backendResult, monolithResult)` does a shallow diff and logs.
- **Cutover checklist**: [phase3-cutover-checklist.md](./phase3-cutover-checklist.md) — pass/fail criteria per endpoint and FE-switched table.
- **Readiness report**: [phase3-readiness-report.md](./phase3-readiness-report.md) — how to run shadow mode and a per-endpoint readiness table.
- **Adapter**: `getProject(id)` added; project detail/settings pages still use the action from RSC (adapter getProject is for client-side use).

## How to run shadow mode

1. Set `NEXT_PUBLIC_USE_PROJECTS_API=true`, `NEXT_PUBLIC_PROJECTS_BACKEND_URL=http://localhost:4000`, `NEXT_PUBLIC_PROJECTS_SHADOW_MODE=true`.
2. Start backend and frontend; use projects list and filters. Check the browser console for `[shadow]` logs.
3. Fix any backend or contract issues that produce diffs; re-run until clean or diffs are documented as acceptable.

## Next (Phase 4 / 5)

- Phase 4: Data/access hardening (zero DB in frontend, query optimization, caching).
- Phase 5: Full cutover (flags to backend-only, remove deprecated monolith project paths).
