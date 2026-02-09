# API versioning policy

- **URL path versioning**: APIs are versioned by path prefix, e.g. `/api/v1/projects`. New breaking versions use a new prefix (`/api/v2/...`).
- **Stability**: Within a major version (v1), we add new optional fields or new endpoints only. Breaking changes (removing fields, changing types, changing semantics) require a new version.
- **Deprecation**: Before removing a version, deprecate it (e.g. `Deprecation` header or doc) and provide a migration window; then remove in a later release.
- **OpenAPI**: Each version has an OpenAPI spec under `packages/contracts/openapi/` (e.g. `projects-v1.yaml`). CI should validate that implementations conform to the spec.
