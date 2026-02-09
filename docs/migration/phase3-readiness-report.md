# Phase 3: Readiness report (Projects domain)

Per-endpoint readiness for cutting over to the backend. Update after each shadow run or test.

## How to run shadow mode

1. Set in `.env.local`:
   - `NEXT_PUBLIC_USE_PROJECTS_API=true`
   - `NEXT_PUBLIC_PROJECTS_BACKEND_URL=http://localhost:4000`
   - `NEXT_PUBLIC_PROJECTS_SHADOW_MODE=true`
2. Start backend: `npm run backend`.
3. Start frontend: `npm run dev`.
4. Use the app (open dashboard, filter projects, open project types/statuses). Check browser console for `[shadow]` logs: `[shadow] listProjects match` or `[shadow] listProjects diff (backend vs monolith): { params, diffs }`.
5. Fix any backend or contract issues that cause diffs; re-run until clean or diffs are acceptable.

## Readiness per endpoint

| Endpoint | Ready | Last checked | Diffs / issues |
|----------|-------|--------------|----------------|
| GET /api/v1/projects | ☐ | — | — |
| GET /api/v1/projects/:id | ☐ | — | — |
| POST /api/v1/projects | ☐ | — | — |
| PATCH /api/v1/projects/:id | ☐ | — | — |
| DELETE /api/v1/projects/:id | ☐ | — | — |
| GET /api/v1/project-types | ☐ | — | — |
| GET /api/v1/project-statuses | ☐ | — | — |

## Summary

- **Shadow mode**: Implemented for listProjects, getProjectTypes, getProjectStatuses (client-side). Diffs logged to console.
- **Cutover checklist**: See [phase3-cutover-checklist.md](./phase3-cutover-checklist.md).
- **Full cutover**: After all endpoints pass and FE flows are switched, remove shadow mode and monolith fallback in a later phase.
