# Phase 5: Full cutover and cleanup

## Summary

- **Projects UI** uses the **adapter** for all project operations (list, get, create, update, delete, types, statuses). When `NEXT_PUBLIC_USE_PROJECTS_API=true` and `NEXT_PUBLIC_PROJECTS_BACKEND_URL` is set, traffic goes to the standalone backend.
- **Monolith project paths** (server actions and Next.js API routes for projects) remain in the codebase for fallback and for RSC (server-side). They are **not used by the Projects UI** when the API/backend flags are enabled. No removal of code in Phase 5; optional future step is to remove or gate those paths.
- **RSC** (e.g. `/dashboard/projects` page, `/dashboard/projects/[id]`, settings): use **server-side fetcher** (`getProjectsWithFiltersServer`, `getProjectServer` from `@/lib/api/projects-server`). When backend is configured, these call the backend with a server-obtained JWT; otherwise they delegate to the existing server actions. So project list and detail are fully served from the backend when flags are set.

## Recommended env for cutover (backend-only)

Use this once the Phase 3 checklist is complete and you are ready to run on the backend only:

```env
NEXT_PUBLIC_USE_PROJECTS_API=true
NEXT_PUBLIC_PROJECTS_BACKEND_URL=http://localhost:4000
```

Leave `NEXT_PUBLIC_PROJECTS_SHADOW_MODE` unset or false for production.

For local development with shadow mode (dual-read and diff logging), set:

```env
NEXT_PUBLIC_PROJECTS_SHADOW_MODE=true
```

## Runbook: Running with backend

1. **Start backend**: From repo root, `npm run backend` (or `npm run backend:dev`). Backend uses same `DATABASE_URL` and `NEXTAUTH_SECRET` as the Next.js app (loads from root `.env`).
2. **Start frontend**: `npm run dev`. Set env as above so the frontend uses the backend for projects.
3. **Verify**: Open dashboard then Projects. Create, edit, and delete a project; list and filters should hit the backend. Check backend logs and, if shadow was on, browser console for diffs.
4. **Production**: Deploy backend; set `NEXT_PUBLIC_PROJECTS_BACKEND_URL` to the deployed backend URL. Do not set `NEXT_PUBLIC_PROJECTS_SHADOW_MODE` in production.

## What was done in Phase 5

- **Adapter**: Added `createProject(formData)`, `updateProject(id, formData)`, `deleteProject(id)`. When `useProjectsApi` is true, these call the SDK (and thus the backend when `NEXT_PUBLIC_PROJECTS_BACKEND_URL` is set). FormData is converted to the API JSON body.
- **UI**: Project create uses `projectsAdapter.createProject`. Project edit uses adapter for types, statuses, and `updateProject`. Project delete (dialog and card view) uses `projectsAdapter.deleteProject`.
- **Settings panels** for project types/statuses (create/update/delete type and status) still use server actions; the backend only exposes GET for types/statuses. No change in Phase 5.

## RSC → backend (done)

- **`src/lib/api/server-auth-token.ts`**: `getServerAuthToken()` returns the current session JWT using next-auth cookie (for server-side backend calls).
- **`src/lib/api/projects-server.ts`**: `getProjectsWithFiltersServer(params)` and `getProjectServer(id)` — when `NEXT_PUBLIC_USE_PROJECTS_API=true` and `NEXT_PUBLIC_PROJECTS_BACKEND_URL` are set, they fetch from the backend with the server token; otherwise they call the existing server actions.
- **RSC pages** now use these: `src/app/dashboard/projects/page.tsx`, `src/app/dashboard/projects/[id]/page.tsx`, `src/app/dashboard/projects/[id]/settings/page.tsx`.

## Monolith project paths (policy)

When `NEXT_PUBLIC_PROJECTS_BACKEND_URL` is set, **project server actions are not used** by the UI or RSC; all traffic goes through the adapter and `projects-server.ts` to the backend. The actions remain in the codebase only as fallback when the backend is not configured.

**Next.js API routes** (`/api/v1/projects`, `/api/v1/project-types`, `/api/v1/project-statuses`): **Policy — keep as same-origin proxy.** When the frontend uses the API (`NEXT_PUBLIC_USE_PROJECTS_API=true`) but does not set `NEXT_PUBLIC_PROJECTS_BACKEND_URL`, these routes delegate to server actions so the app works without a standalone backend. When the backend URL is set, the client and RSC call the backend directly, so these routes are not used. No removal required.

## Optional follow-ups

- **Remove or gate monolith project paths**: Optional; when backend is set, they are already unused. Can add a runtime guard later if desired.
