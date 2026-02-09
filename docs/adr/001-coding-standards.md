# ADR 001: Coding standards and lint policy

## Status

Accepted.

## Context

With multiple contributors and a 40+ organization, we need consistent quality gates and gradual tightening of static checks without blocking delivery.

## Decision

- **Unused variables:** `@typescript-eslint/no-unused-vars` is set to `warn` (not `off`). Fix or prefix with `_` when intentional. Exceptions are allowed per-file where necessary.
- **Explicit `any`:** Default remains `off` for the whole codebase. In **critical domains** (auth, permissions, RBAC: `src/lib/auth.ts`, `src/lib/permissions.ts`, `src/lib/rbac*.ts`, `src/lib/rbac-helpers.ts`) we use `warn` so new `any` usage is visible; aim to reduce over time.
- **Module boundaries:** API boundaries are defined by `packages/contracts` (OpenAPI). Frontend talks to backend via adapters and SDK. Server actions remain for monolith fallback; new features prefer contract-first and backend when applicable.
- **Trend:** We track lint exceptions and `any` usage sprint-over-sprint; goal is to reduce, not freeze.

## Consequences

- New unused variables will show as warnings in CI and locally.
- Critical auth/permission code will warn on new `any`; existing code can be fixed incrementally.
- See [eslint.config.mjs](../../eslint.config.mjs) for exact rule scope and paths.
