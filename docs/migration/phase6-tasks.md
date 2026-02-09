# Phase 6: Tasks domain

Tasks domain follows the same pattern as Projects: contract, Next.js API routes, SDK, adapter, backend module, then UI and RSC switched to adapter/server.

## What was done

- **Contract**: [packages/contracts/openapi/tasks-v1.yaml](../packages/contracts/openapi/tasks-v1.yaml) — list tasks (filters: search, projectId, status, priority, assigneeId, dates), get task, create, update, delete, GET task-statuses.
- **Next.js API**: [src/app/api/v1/tasks/route.ts](../../src/app/api/v1/tasks/route.ts) (GET list, POST create), [src/app/api/v1/tasks/[id]/route.ts](../../src/app/api/v1/tasks/[id]/route.ts) (GET, PATCH, DELETE), [src/app/api/v1/task-statuses/route.ts](../../src/app/api/v1/task-statuses/route.ts) (GET). All require session; delegate to server actions.
- **SDK**: [packages/sdk](../../packages/sdk) — `createTasksApi`, `tasksApi`, types; optional `getToken` for backend.
- **Adapter**: [src/lib/api/tasks-adapter.ts](../../src/lib/api/tasks-adapter.ts) — when `NEXT_PUBLIC_USE_TASKS_API=true`, uses SDK (same-origin or `NEXT_PUBLIC_TASKS_BACKEND_URL`); optional `NEXT_PUBLIC_TASKS_SHADOW_MODE`. Exposes `listTasks`, `getTask`, `getTaskStatuses`, `createTask`, `updateTask`, `deleteTask`.
- **Backend**: [apps/backend/src/routes/tasks.js](../../apps/backend/src/routes/tasks.js) — GET/POST /tasks, GET/PATCH/DELETE /tasks/:id, GET /task-statuses; JWT auth; RBAC for task.create, task.update, task.delete; list filtered by assignees/createdBy for non-admin.
- **RSC**: [src/lib/api/tasks-server.ts](../../src/lib/api/tasks-server.ts) — `getTasksWithFiltersServer`, `getTaskServer`; when Tasks API + backend URL set, fetch from backend with server token.
- **UI**: [src/app/dashboard/tasks/page.tsx](../../src/app/dashboard/tasks/page.tsx) and [src/app/dashboard/projects/[id]/tasks/[taskId]/page.tsx](../../src/app/dashboard/projects/[id]/tasks/[taskId]/page.tsx) use server fetcher. [tasks-dashboard](../../src/components/tasks/tasks-dashboard.tsx), [task-dialog](../../src/components/tasks/task-dialog.tsx), [task-edit-dialog](../../src/components/tasks/task-edit-dialog.tsx), [task-delete-dialog](../../src/components/tasks/task-delete-dialog.tsx) use adapter for list/create/update/delete. [task-status-update](../../src/components/tasks/task-status-update.tsx) uses `tasksAdapter.getTaskStatuses` for the status list; `updateTaskStatus` remains a server action (follow-up: add to adapter/backend).

## Env (Tasks)

```env
NEXT_PUBLIC_USE_TASKS_API=true
NEXT_PUBLIC_TASKS_BACKEND_URL=http://localhost:4000
# Optional: NEXT_PUBLIC_TASKS_SHADOW_MODE=true
```

Backend uses same `DATABASE_URL` and `NEXTAUTH_SECRET` as the Next.js app.

## Runbook

1. Start backend: `npm run backend` (or `npm run backend:dev`).
2. Set Tasks env vars above; run `npm run dev`.
3. Open dashboard → Tasks; create/edit/delete tasks. List and detail use backend when configured.

## Scope note

First scope: list, get, create, update, delete + task-statuses read. Status update (`updateTaskStatus`) and dependencyState filter in list can be added to backend and adapter in a follow-up.
