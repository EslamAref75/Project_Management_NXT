# Role-Based Access Control (RBAC) System

## Overview

The RBAC system provides fine-grained access control for administrative and management users across the Project Management System.

## Architecture

### Database Models

1. **Role** - Defines roles (Super Admin, System Admin, Project Admin, Audit Admin, etc.)
2. **Permission** - Defines granular permissions (e.g., `project.create`, `task.assign`)
3. **RolePermission** - Many-to-many relationship between roles and permissions
4. **UserRole** - Many-to-many relationship between users and roles, with scope support (global/project)

### Permission Structure

Permissions follow the format: `module.action` or `module.category.action`

Examples:
- `project.create`
- `task.assign`
- `settings.global.edit`
- `log.view`

### Default Roles

1. **Super Admin**
   - Full access to all modules
   - All permissions
   - Cannot be deleted

2. **System Admin**
   - Manage users, teams, projects
   - Modify global & project settings
   - View activity logs
   - Cannot manage roles (except read)

3. **Project Admin**
   - Manage assigned projects only
   - Assign tasks & Today's Tasks
   - Manage dependencies
   - View project-level logs

4. **Audit Admin**
   - View activity logs only
   - Export logs
   - Read-only access
   - No modification permissions

## Usage

### Permission Checking

```typescript
import { hasPermission, requirePermission } from "@/lib/rbac"
import { PERMISSIONS } from "@/lib/permissions"

// Check permission
const canCreate = await hasPermission(userId, PERMISSIONS.PROJECT.CREATE)

// Require permission (throws if not granted)
await requirePermission(userId, PERMISSIONS.PROJECT.CREATE, projectId)
```

### Server Actions

All server actions should check permissions before executing:

```typescript
const hasPermission = await import("@/lib/rbac").then(m => 
  m.hasPermission(parseInt(session.user.id), PERMISSIONS.PROJECT.CREATE)
).catch(() => false)

if (!hasPermission && session.user.role !== "admin") {
  return { error: "Permission denied" }
}
```

### UI Components

Hide/disable UI elements based on permissions:

```typescript
const canCreate = await hasPermission(userId, PERMISSIONS.PROJECT.CREATE)

{canCreate && <Button>Create Project</Button>}
```

## Initialization

After migrating the database and regenerating Prisma client:

```bash
node scripts/initialize-rbac.js
```

This will:
1. Create all permission definitions
2. Create default roles
3. Assign permissions to roles

## Migration Steps

1. **Stop dev server** (if running)
2. **Run migration script**: `node scripts/apply-rbac-migration.js`
3. **Regenerate Prisma client**: `npx prisma generate`
4. **Initialize RBAC**: `node scripts/initialize-rbac.js`
5. **Restart dev server**: `npm run dev`

## Security Notes

- **Deny by default**: All actions require explicit permission
- **Legacy admin role**: Users with `role === "admin"` have all permissions (backward compatibility)
- **Permission caching**: Permissions are cached for 5 minutes for performance
- **System roles**: Cannot be deleted or modified (Super Admin)
- **Audit logging**: All role/permission changes are logged

## Extensibility

The system is designed to support:
- Project-scoped permissions
- Multiple roles per user
- Custom roles and permissions
- Future ABAC (Attribute-Based Access Control) integration

