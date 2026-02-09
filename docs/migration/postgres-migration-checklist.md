# PostgreSQL migration checklist

This checklist covers migrating the PMS database from SQLite to PostgreSQL: staging setup, migration execution, data verification, rollback, and production cutover.

## Prerequisites

- PostgreSQL server (e.g. 14+) available for staging and production.
- Backup of existing SQLite database (copy `prisma/dev.db` or your current DB file).
- Environment variables documented in root [.env.example](../../.env.example): `DATABASE_URL` (pooled), `DIRECT_URL` (direct for migrations).

**Local SQLite-only development:** To use SQLite without PostgreSQL, set `provider = "sqlite"` in [prisma/schema.prisma](../../prisma/schema.prisma), remove the `directUrl` line, and set `DATABASE_URL="file:./dev.db"` in `.env`.

---

## 1. Staging database creation

- [ ] Create a dedicated PostgreSQL database for staging (e.g. `project_management_staging`).
- [ ] Create a database user with privileges for that database.
- [ ] Set connection pooling (e.g. PgBouncer) if using serverless or high concurrency; use direct connection for migrations.
- [ ] Configure firewall/security so only app and CI can reach the DB.

---

## 2. Prisma schema and env (staging)

- [ ] In [prisma/schema.prisma](../../prisma/schema.prisma): `provider = "postgresql"`, `url = env("DATABASE_URL")`, `directUrl = env("DIRECT_URL")`.
- [ ] In staging `.env`: set `DATABASE_URL` (pooled, e.g. `postgresql://user:pass@host:5432/project_management_staging?schema=public`) and `DIRECT_URL` (e.g. `postgresql://user:pass@host:5432/project_management_staging`).
- [ ] Run `npx prisma generate`.
- [ ] If starting from empty DB: run `npx prisma migrate deploy` (or `npx prisma db push` for prototyping). If migrating data from SQLite, use the data migration steps below first, then run migrations.

---

## 3. Data migration (SQLite → PostgreSQL)

- [ ] Export critical data from SQLite (or take a file copy as backup).
- [ ] Option A — Fresh start on staging: run Prisma migrations on empty PostgreSQL, then run seed: `npx prisma db push` or `npx prisma migrate deploy`, then `npm run seed`. Validate app behavior.
- [ ] Option B — Migrate existing data: use a one-off script or tool (e.g. Prisma + raw queries, or pgloader) to copy data from SQLite to PostgreSQL. Run after `prisma migrate deploy` so schema exists. Verify foreign keys and constraints.
- [ ] Record row counts for critical tables (User, Project, Task, etc.) before and after for verification.

---

## 4. Staging verification

- [ ] Run `npx prisma migrate deploy` (or `npx prisma db push`) on staging and confirm no errors.
- [ ] Run data verification:
  - [ ] Table row counts: run `node scripts/verify-db-counts.js` (with staging `DATABASE_URL`/`DIRECT_URL`) and compare to expected or SQLite counts.
  - [ ] Spot-check: login, load dashboard, open a project, open a task, create/update/delete a task.
  - [ ] Run any existing tests against staging DB (e.g. point `DATABASE_URL` to staging and run `npm run test:run`).
- [ ] Document any schema or seed differences and fix before production.

**Verification script:** From repo root with `DATABASE_URL` and `DIRECT_URL` set, run `node scripts/verify-db-counts.js` to print row counts for User, Project, Task, Team, and ActivityLog. Use output for before/after comparison.

---

## 5. Rollback procedure

- [ ] **Before production cutover:** Take a full backup of PostgreSQL production DB (if already on Postgres) or ensure SQLite backup is available.
- [ ] **If rollback needed:** Restore from backup; revert `DATABASE_URL` and `DIRECT_URL` to previous DB; redeploy app; verify health.
- [ ] Keep Prisma schema in sync with rollback target (e.g. keep a branch or tag with SQLite schema if rolling back to SQLite).

---

## 6. Production cutover

- [ ] Create production PostgreSQL database and user; set `DATABASE_URL` and `DIRECT_URL` in production env (secrets).
- [ ] Schedule a maintenance window if migrating existing production data.
- [ ] Run `npx prisma migrate deploy` on production (or data migration script if moving from SQLite).
- [ ] Run same data verification as staging (counts, spot-checks, smoke tests).
- [ ] Switch application to use new `DATABASE_URL` / `DIRECT_URL` and deploy.
- [ ] Monitor logs and errors; confirm zero data loss per verification checklist.
- [ ] Retire or archive old SQLite DB only after a defined period of stability.

---

## 7. Success criteria

- Staging and production run on PostgreSQL.
- Zero data loss: verification scripts and spot-checks pass.
- All critical user flows work (auth, projects, tasks, dashboard).
