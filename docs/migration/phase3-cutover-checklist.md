# Phase 3: Projects domain cutover checklist

Use this checklist to validate each endpoint before full cutover. Run with shadow mode first and fix any diffs, then flip to backend-only.

## Prerequisites

- Backend running (`npm run backend`), same DB and `NEXTAUTH_SECRET` as frontend.
- Frontend env: `NEXT_PUBLIC_USE_PROJECTS_API=true`, `NEXT_PUBLIC_PROJECTS_BACKEND_URL=http://localhost:4000`.
- Optional: `NEXT_PUBLIC_PROJECTS_SHADOW_MODE=true` to run dual-read and log diffs.

## Pass/fail criteria

- **Pass**: Response shape matches contract; status 2xx; no unexpected errors; in shadow mode, no diffs (or only acceptable ones).
- **Fail**: Non-2xx, missing/extra fields, or shadow diff on critical fields (e.g. total, project ids).

## Endpoints

| Endpoint | Method | Pass | Fail | Notes |
|----------|--------|------|------|-------|
| List projects | GET /api/v1/projects | [ ] | [ ] | Same total and ids as monolith for given filters. |
| Get project | GET /api/v1/projects/:id | [ ] | [ ] | Same shape and data; tasks and projectTeams included. |
| Create project | POST /api/v1/projects | [ ] | [ ] | 200, project created; RBAC enforced. |
| Update project | PATCH /api/v1/projects/:id | [ ] | [ ] | 200, project updated. |
| Delete project | DELETE /api/v1/projects/:id | [ ] | [ ] | 200, project removed. |
| Project types | GET /api/v1/project-types | [ ] | [ ] | Same list as monolith. |
| Project statuses | GET /api/v1/project-statuses | [ ] | [ ] | Same list as monolith. |

## FE switched (traffic to backend)

| Flow | Using backend | Notes |
|------|----------------|-------|
| Projects list (dashboard) | Yes | Adapter listProjects + getProjectTypes. |
| Project create (dialog) | Yes | Phase 5: adapter createProject. |
| Project update (edit dialog) | Yes | Phase 5: adapter updateProject + getProjectTypes/getProjectStatuses. |
| Project delete | Yes | Phase 5: adapter deleteProject. |
| Project detail (single project) | Yes | RSC uses getProjectServer (backend when configured). |
| Project settings | Yes | RSC uses getProjectServer (backend when configured). |
| Project types/statuses in settings/dialogs | Yes | Adapter getProjectTypes, getProjectStatuses. |

## Cutover steps

1. Run shadow mode; fix any backend bugs that cause diffs.
2. Mark all endpoints as Pass.
3. ~~Switch create/update/delete to adapter~~ **Done in Phase 5.**
4. Optionally switch project detail/settings to backend (server-side token or proxy).
5. Set flags to backend-only; monitor errors and latency.
6. See [phase5-cutover.md](./phase5-cutover.md) for runbook and recommended env.
