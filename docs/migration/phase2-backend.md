# Phase 2: Backend service skeleton

## Done

- **apps/backend**: Node.js (Express) service, JavaScript.
  - Health: `GET /health`.
  - Auth: JWT verification via `NEXTAUTH_SECRET`; `Authorization: Bearer <token>`.
  - Projects API: `GET/POST /api/v1/projects`, `GET/PATCH/DELETE /api/v1/projects/:id`, `GET /api/v1/project-types`, `GET /api/v1/project-statuses`.
  - Prisma: own schema copy under `apps/backend/prisma`; same DB as monolith.
  - RBAC: `hasPermissionWithoutRoleBypass` ported for `project.viewAll`, `project.create`, `project.update`, `project.delete`.
- **Next.js**: `GET /api/auth/token` returns session JWT for backend calls.
- **SDK**: `createProjectsApi({ baseUrl, getToken })` for backend URL + Bearer token.
- **Adapter**: When `NEXT_PUBLIC_PROJECTS_BACKEND_URL` is set, adapter uses backend + getToken (fetch `/api/auth/token`).

## How to run

1. Start backend: from repo root, `npm run backend` (or `npm run backend:dev`). Uses root `.env` for `DATABASE_URL` and `NEXTAUTH_SECRET`; listens on `PORT` (default 4000).
2. Optional: set `CORS_ORIGIN=http://localhost:3000` so the frontend can call the backend.
3. To use backend from frontend: set `NEXT_PUBLIC_USE_PROJECTS_API=true` and `NEXT_PUBLIC_PROJECTS_BACKEND_URL=http://localhost:4000`.

## Fallback

With flags unset, the app keeps using server actions (and optional same-origin `/api/v1`). Backend is an additional path behind flags.
