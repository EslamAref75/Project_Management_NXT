# @pms/contracts

API contracts (OpenAPI 3) for the Project Management System. **Source of truth** for API boundaries between frontend and backend.

## Contract-first discipline

- **API changes must be reflected in the OpenAPI specs first.** Update the relevant YAML under `openapi/` (e.g. `projects-v1.yaml`, `tasks-v1.yaml`) before changing backend or SDK behavior.
- Breaking changes require a new version (e.g. v2) and a compatibility window; see [docs/migration/api-versioning.md](../../docs/migration/api-versioning.md).
- CI validates that OpenAPI files are well-formed (lint step). The frontend SDK in `packages/sdk` is kept aligned with these specs; optionally generate or diff from OpenAPI in CI.

## Contents

- `openapi/projects-v1.yaml` — Projects domain API v1 (list, get, create, update, delete, project-types, project-statuses)
- `openapi/tasks-v1.yaml` — Tasks domain API v1 (list, get, create, update, delete, task-statuses)

## Versioning policy

See [docs/migration/api-versioning.md](../../docs/migration/api-versioning.md) in the repo root.

## Usage

- API routes and backend services MUST implement these contracts.
- Frontend SDK is generated from or aligned with these specs.
- CI validates OpenAPI files (lint); contract tests can validate implementation against the spec.
