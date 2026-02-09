# Query optimization notes

Guidance for backend and monolith to avoid N+1 queries, over-fetching, and slow filters.

## Backend (apps/backend)

### Projects list (GET /api/v1/projects)

- **Select**: Uses `projectListSelect` (id, name, description, status, type, projectStatusId, projectTypeId, projectManagerId, startDate, endDate, createdAt, createdById, projectManager with id/username/email/avatarUrl, _count tasks/projectUsers/notifications). No full model fetch.
- **Pagination**: `skip = (page - 1) * limit`, `take = limit` (max 100). Same `where` used for both `findMany` and `count` to avoid inconsistency.
- **N+1**: None; single findMany + single count. Relations (projectManager, _count) are loaded in the same query via select.

### Project by id (GET /api/v1/projects/:id)

- **Queries**: Three parallel queries (project with relations, tasks with assignees/attachments/dependencies, projectTeams with team/members). No N+1.
- **Select**: Explicit select on project, tasks, and projectTeams; nested relations limited to needed fields.

### Project types / statuses

- **Select**: Full model (small tables). Optional `_count.projects` for types when `includeUsageCount=true`. No N+1.

### RBAC (hasPermissionWithoutRoleBypass)

- One `userRole.findMany` with `include: { role: { include: { permissions: { include: { permission: true } } } } }`. Acceptable for auth path; consider caching per user/role in production.

## Monolith (src/app/actions)

- **projects.ts**: Uses `select` patterns (see `src/lib/query-optimization.ts`). getProjectsWithFilters uses findMany + count with same where; getProject uses three parallel queries. No N+1 in main paths.
- **tasks.ts**: Same idea: select, pagination, parallel queries where needed.
- **dashboard.ts**: Uses groupBy and count; ensure filters use indexed columns.

## Indexes

Existing Prisma indexes relevant to Projects and list/detail:

- **Project**: createdAt, status, projectStatusId, projectTypeId, projectManagerId, createdById, priority.
- **Task**: projectId, taskStatusId, status, priority, dueDate, createdAt, (projectId, taskStatusId), (projectId, priority).
- **UserRole**: userId, roleId, (scopeType, scopeId).
- **ProjectType / ProjectStatus**: isActive, displayOrder/orderIndex.

No additional index migration is required for the current Projects API. If new filters are added (e.g. full-text on name), add an index or full-text index via a new migration.

## Adding new indexes

1. Edit `prisma/schema.prisma`: add `@@index([field])` or `@@index([a, b])` to the model.
2. Run `npx prisma migrate dev --name add_<name>_index` (or create a manual SQL migration under `prisma/migrations/`).
3. Run `npx prisma generate` and deploy.
