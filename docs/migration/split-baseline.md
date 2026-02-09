# Migration split baseline

Baseline document for the incremental frontend/backend split. Used to track inventory, metrics, and migration status.

## 1. Routes inventory

### Page routes

| Route | Description |
|-------|-------------|
| `/` | Landing |
| `/login` | Login |
| `/register` | Registration |
| `/dashboard` | Main dashboard |
| `/dashboard/projects` | Projects list |
| `/dashboard/projects/[id]` | Project details |
| `/dashboard/projects/[id]/tasks/[taskId]` | Task details |
| `/dashboard/projects/[id]/settings` | Project settings |
| `/dashboard/projects/[id]/notifications` | Project notifications |
| `/dashboard/tasks` | Tasks list |
| `/dashboard/users` | Users list |
| `/dashboard/users/[id]` | User details |
| `/dashboard/teams` | Teams list |
| `/dashboard/teams/[id]` | Team details |
| `/dashboard/settings` | App settings |
| `/dashboard/settings/projects` | Project metadata (types/statuses) |
| `/dashboard/reports` | Reports |
| `/dashboard/reports/progress` | Progress report |
| `/dashboard/focus` | Focus board |
| `/dashboard/today-tasks-assignment` | Today's tasks assignment |
| `/dashboard/admin/activity-logs` | Activity logs |
| `/dashboard/admin/roles` | Roles & RBAC |

### API routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/auth/[...nextauth]` | * | NextAuth (session, login, etc.) |
| `/api/attachments/[id]` | GET, OPTIONS | Secure file download |
| `/api/forecast/task/[id]` | * | Task forecast |
| `/api/productivity/project/[id]` | * | Project productivity |
| `/api/productivity/user/[id]` | * | User productivity |
| `/api/stats/export` | POST | Stats export (CSV) |
| `/api/metrics` | GET | Baseline metrics (Phase 0) |
| `/api/v1/projects` | GET, POST | Projects list/create (Phase 1) |
| `/api/v1/projects/[id]` | GET, PATCH, DELETE | Project get/update/delete |
| `/api/v1/project-types` | GET | Project types |
| `/api/v1/project-statuses` | GET | Project statuses |
| `/api/v1/tasks` | GET, POST | Tasks list/create (Phase 6) |
| `/api/v1/tasks/[id]` | GET, PATCH, DELETE | Task get/update/delete |
| `/api/v1/task-statuses` | GET | Task statuses |

---

## 2. Server actions inventory

| Action file | Primary domain | Reads DB | Writes DB |
|-------------|----------------|----------|-----------|
| `activity-logs.ts` | Users / RBAC | Yes | No |
| `attachments.ts` | Attachments | Yes | Yes |
| `comments.ts` | Tasks | Yes | Yes |
| `dashboard.ts` | Reporting / stats | Yes | No |
| `dependencies.ts` | Tasks | Yes | Yes |
| `focus.ts` | Focus | Yes | Yes |
| `forecasting.ts` | Forecasting | Yes | No |
| `logo-upload.ts` | Settings | Yes | Yes |
| `notifications.ts` | Notifications | Yes | Yes |
| `progress-report.ts` | Reporting / stats | Yes | No |
| `project-notifications.ts` | Notifications / Projects | Yes | Yes |
| `project-priority.ts` | Projects | Yes | Yes |
| `project-settings.ts` | Projects | Yes | Yes |
| `project-statuses.ts` | Projects (metadata) | Yes | Yes |
| `project-types.ts` | Projects (metadata) | Yes | Yes |
| `projects.ts` | Projects | Yes | Yes |
| `rbac.ts` | Users / RBAC | Yes | Yes |
| `register.ts` | Auth / Users | Yes | Yes |
| `reports.ts` | Reporting / stats | Yes | No |
| `settings.ts` | Settings | Yes | Yes |
| `stats.ts` | Reporting / stats | Yes | Yes |
| `subtasks.ts` | Tasks | Yes | Yes |
| `task-statuses.ts` | Tasks (metadata) | Yes | Yes |
| `tasks.ts` | Tasks | Yes | Yes |
| `teams.ts` | Teams | Yes | Yes |
| `today-tasks-assignment.ts` | Today assignment | Yes | Yes |
| `user-settings.ts` | Users / Settings | Yes | Yes |
| `users.ts` | Users | Yes | Yes |

---

## 3. Baseline metrics

Request-level metrics are recorded by middleware and exposed at **GET /api/metrics**. Initial baseline is collected via **GET /api/metrics** after exercising the app.

- **Latency**: p50, p95 (milliseconds) — time from request start to middleware return (request-level; not full server-action duration).
- **Error rate**: fraction of responses with status >= 400 (middleware sees status of `NextResponse.next()`; route-level status may differ).
- **Throughput**: request count since process start; snapshot includes `periodStart` / `periodEnd`.

### How to capture baseline

1. Run the app: `npm run dev`.
2. Exercise representative flows (e.g. load dashboard, open projects, open a task).
3. Call **GET /api/metrics** with an authenticated session (e.g. browser while logged in, or `curl` with session cookie). Save the JSON.
   - Example (with session cookie): `curl -s -b "next-auth.session-token=YOUR_COOKIE" http://localhost:3000/api/metrics`
4. Paste the snapshot below and/or store in CI for comparison after split.

### Baseline snapshot (placeholder)

Record the output of `GET /api/metrics` here after a short manual run:

```json
{
  "requestCount": 0,
  "errorRate": 0,
  "latencyP50Ms": 0,
  "latencyP95Ms": 0,
  "periodStart": "",
  "periodEnd": ""
}
```

---

## 4. Migration status table

| Domain | Owner | Contract defined | Backend module | FE switched | Deprecated |
|--------|-------|------------------|----------------|-------------|------------|
| Auth / Users | — | Not started | Not started | No | — |
| Projects | — | Done (v1) | Done (apps/backend) | Adapter (full); backend when flags set | Phase 5 cutover done |
| Tasks | — | Done (v1) | Done (apps/backend) | Adapter + server; backend when flags set | Phase 6 |
| Teams | — | Not started | Not started | No | — |
| Notifications | — | Not started | Not started | No | — |
| Settings | — | Not started | Not started | No | — |
| Reports / Stats | — | Not started | Not started | No | — |
| Focus | — | Not started | Not started | No | — |
| Attachments | — | Not started | Not started | No | — |
| Forecasting | — | Not started | Not started | No | — |
| RBAC | — | Not started | Not started | No | — |

Until the split, the monolith owns all domains. Post-split ownership will be per-domain (backend module + frontend adapter).

---

## 5. Phase 6 (Tasks domain)

- **Contract**: [packages/contracts/openapi/tasks-v1.yaml](packages/contracts/openapi/tasks-v1.yaml) — list, get, create, update, delete, task-statuses.
- **Next.js API**: `/api/v1/tasks`, `/api/v1/tasks/[id]`, `/api/v1/task-statuses` delegate to server actions when same-origin.
- **SDK**: [packages/sdk](packages/sdk) — `createTasksApi`, `tasksApi`; optional `getToken` for backend.
- **Adapter**: [src/lib/api/tasks-adapter.ts](src/lib/api/tasks-adapter.ts) — env flags `NEXT_PUBLIC_USE_TASKS_API`, `NEXT_PUBLIC_TASKS_BACKEND_URL`, optional `NEXT_PUBLIC_TASKS_SHADOW_MODE`.
- **Backend**: [apps/backend/src/routes/tasks.js](apps/backend/src/routes/tasks.js) — list, get, create, update, delete, GET task-statuses; JWT auth and RBAC.
- **RSC**: [src/lib/api/tasks-server.ts](src/lib/api/tasks-server.ts) — `getTasksWithFiltersServer`, `getTaskServer`; use backend when flags set.
- **UI**: Tasks dashboard, task dialog, edit dialog, delete dialog use adapter; task list/detail pages use server fetcher. Status update (`updateTaskStatus`) remains server action for now (follow-up).
- **Docs**: [docs/migration/phase6-tasks.md](docs/migration/phase6-tasks.md).
