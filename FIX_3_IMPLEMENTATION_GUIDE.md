# Fix #3: Remove Legacy RBAC Bypass - Implementation Guide

## Current Status: CRITICAL ISSUES FOUND (22) + HIGH (14) + MEDIUM (13) = 49 Total

### Overview of Work

This fix removes authorization bypasses where code checks `user.role === 'admin'` instead of using proper RBAC permission checks. The audit found:

- **22 Critical**: Direct role checks (e.g., `if (user.role === 'admin')`)
- **14 High**: Use of deprecated `hasPermissionOrRole()` function  
- **13 Medium**: Admin flags without permission verification

---

## Remediation Strategy

### Phase 1: Infrastructure (COMPLETE ✅)
- [x] Created `src/lib/rbac-helpers.ts` with `requirePermission()` and `hasPermissionWithoutRoleBypass()`
- [x] Deprecated `hasPermission()` to add warnings
- [x] Created `scripts/audit-rbac-bypasses.ts` to find all issues

### Phase 2: Critical Server Actions (IN PROGRESS)

**Priority files to fix (in order):**

1. **`src/lib/rbac.ts`** - Lines 92-94 (bypass in main RBAC function)
   - Status: ✅ DONE
   
2. **`src/app/actions/users.ts`** - Multiple role checks
   - Functions to fix:
     - `getUsers()` - line 56
     - `createUser()` - line 118
     - `updateUser()` - line 138
     - `deleteUser()` - access control

3. **`src/app/actions/teams.ts`** - 6 role checks
   - `createTeam()` - needs permission check
   - `deleteTeam()` - needs permission check  
   - `updateTeam()` - needs permission check

4. **`src/app/actions/projects.ts`** - Multiple issues
   - Lines 148-149: Role-based access
   - Multiple `hasPermissionOrRole()` calls

5. **`src/app/actions/tasks.ts`** - Multiple issues
   - Deprecated function calls

### Phase 3: UI Components
- Nav links that show/hide based on role (not security critical, but should be fixed)
- Settings pages that use role checks

### Phase 4: Verification & Testing
- Run audit script to verify no bypasses remain
- Test permission system still works
- Commit changes

---

## How to Fix Each Issue

### Pattern 1: Direct Role Check
```typescript
// ❌ BEFORE
if (session.user.role === "admin") {
    // Allow action
}

// ✅ AFTER
import { requirePermission } from "@/lib/rbac-helpers"

try {
    await requirePermission(
        parseInt(session.user.id),
        "permission.name"
    )
    // Allow action
} catch (error) {
    return handleAuthorizationError(error)
}
```

### Pattern 2: hasPermissionOrRole() Call
```typescript
// ❌ BEFORE
const hasPermission = await hasPermissionOrRole(
    userId,
    "permission.name",
    ["admin", "project_manager"]
)

// ✅ AFTER
import { requirePermission } from "@/lib/rbac-helpers"

try {
    await requirePermission(userId, "permission.name")
    // Has permission
} catch (error) {
    return { error: error.message }
}
```

### Pattern 3: Admin Variable Used for Access Control
```typescript
// ❌ BEFORE
const isAdmin = session.user.role === "admin"
if (!isAdmin) {
    return { error: "Unauthorized" }
}

// ✅ AFTER
import { requirePermission } from "@/lib/rbac-helpers"

try {
    await requirePermission(
        parseInt(session.user.id),
        "admin.access"
    )
} catch (error) {
    return { error: error.message, code: error.code }
}
```

---

## Files with Issues & Recommended Fixes

### Critical Files (Must Fix)
1. `src/app/actions/users.ts` - 3 critical issues
2. `src/app/actions/teams.ts` - 6 critical issues
3. `src/app/actions/projects.ts` - 4 critical + 5 high
4. `src/app/actions/tasks.ts` - 0 critical + 6 high
5. `src/lib/rbac.ts` - 2 critical (deprecated)

### High Priority (Should Fix)
6. `src/app/actions/project-settings.ts`
7. `src/app/actions/reports.ts`
8. `src/app/actions/settings.ts`
9. `src/app/actions/stats.ts`

### Medium Priority (Nice to Fix)
10. UI Components with role checks (nav-links, settings pages, etc)

---

## Testing the Fix

After making changes, run:

```bash
# Audit for remaining issues
npx ts-node scripts/audit-rbac-bypasses.ts

# Should output:
# ✅ No RBAC bypasses found!
```

---

## Progress Tracking

```
Infrastructure:        ✅ DONE
Critical Actions:      🟡 IN PROGRESS (0/5 files)
High Priority:         ⏳ NOT STARTED (0/4 files)
UI Components:         ⏳ NOT STARTED (0/5 files)
Testing & Verification: ⏳ NOT STARTED
Commit & Review:       ⏳ NOT STARTED
```

---

## Estimated Effort

- Phase 1 (Infrastructure): 1 hour ✅ COMPLETE
- Phase 2 (Critical Actions): 4 hours
- Phase 3 (High Priority): 2 hours
- Phase 4 (UI Components): 0.5 hours
- Phase 5 (Testing): 0.5 hours

**Total: 8 hours**

---

## Key Principles

1. **Never use `user.role === 'X'` for authorization**
   - Always use permission system
   - Role is just for display/UI hints

2. **Always throw/return errors properly**
   - Use `requirePermission()` which throws
   - Catch and handle with `handleAuthorizationError()`

3. **Test permission changes**
   - Clear permission cache when roles update
   - Verify permission system returns correct result

4. **Update activity logs**
   - Log who did what and whether they had permission
   - Helps with audit trail

---

## References

- `src/lib/rbac-helpers.ts` - All helper functions
- `src/lib/permissions.ts` - Permission key definitions
- `scripts/audit-rbac-bypasses.ts` - Audit tool

