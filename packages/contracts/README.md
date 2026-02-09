# @pms/contracts

API contracts (OpenAPI 3) for the Project Management System. Source of truth for API boundaries between frontend and backend.

## Contents

- `openapi/projects-v1.yaml` — Projects domain API v1 (list, get, create, update, delete, project-types, project-statuses)

## Versioning policy

See [docs/migration/api-versioning.md](../../docs/migration/api-versioning.md) in the repo root.

## Usage

- API routes and backend services MUST implement these contracts.
- Frontend SDK is generated from or aligned with these specs.
- CI can validate implementation against the spec (contract tests).
