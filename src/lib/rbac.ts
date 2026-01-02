/**
 * RBAC Permission Checking Utilities
 */

import { prisma } from "@/lib/prisma"
import { PERMISSIONS } from "./permissions"

/**
 * Cache for user permissions (in-memory, can be replaced with Redis in production)
 */
const permissionCache = new Map<string, { permissions: string[], expiresAt: number }>()

const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

/**
 * Get all permissions for a user (with caching)
 */
export async function getUserPermissions(
  userId: number,
  projectId?: number
): Promise<string[]> {
  const cacheKey = `${userId}:${projectId || "global"}`
  const cached = permissionCache.get(cacheKey)
  
  if (cached && cached.expiresAt > Date.now()) {
    return cached.permissions
  }

  // Get all user roles (global and project-scoped)
  const userRoles = await prisma.userRole.findMany({
    where: {
      userId,
      OR: [
        { scopeType: null }, // Global roles
        { scopeType: "global" },
        ...(projectId ? [{ scopeType: "project", scopeId: projectId }] : []),
      ],
    },
    include: {
      role: {
        include: {
          permissions: {
            include: {
              permission: true,
            },
          },
        },
      },
    },
  })

  // Collect all unique permissions
  const permissionSet = new Set<string>()
  
  for (const userRole of userRoles) {
    for (const rolePermission of userRole.role.permissions) {
      permissionSet.add(rolePermission.permission.key)
    }
  }

  const permissions = Array.from(permissionSet)

  // Cache the result
  permissionCache.set(cacheKey, {
    permissions,
    expiresAt: Date.now() + CACHE_TTL,
  })

  return permissions
}

/**
 * Check if user has a specific permission
 * Supports both legacy role field and RBAC system
 */
export async function hasPermission(
  userId: number,
  permission: string,
  projectId?: number
): Promise<boolean> {
  // Check legacy role field first (for backward compatibility)
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  })

  // Legacy admin and project_manager roles have all permissions
  if (user?.role === "admin" || user?.role === "project_manager") {
    return true
  }

  // Check RBAC permissions
  const permissions = await getUserPermissions(userId, projectId)
  return permissions.includes(permission)
}

/**
 * Check if user has permission with legacy role fallback
 * This is a convenience function that checks both RBAC and legacy roles
 */
export async function hasPermissionOrRole(
  userId: number,
  permission: string,
  allowedLegacyRoles: string[] = ["admin", "project_manager"],
  projectId?: number
): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  })

  // Check legacy roles
  if (user?.role && allowedLegacyRoles.includes(user.role)) {
    return true
  }

  // Check RBAC permissions
  return hasPermission(userId, permission, projectId)
}

/**
 * Check if user has any of the specified permissions
 */
export async function hasAnyPermission(
  userId: number,
  permissions: string[],
  projectId?: number
): Promise<boolean> {
  const userPermissions = await getUserPermissions(userId, projectId)
  return permissions.some(perm => userPermissions.includes(perm))
}

/**
 * Check if user has all of the specified permissions
 */
export async function hasAllPermissions(
  userId: number,
  permissions: string[],
  projectId?: number
): Promise<boolean> {
  const userPermissions = await getUserPermissions(userId, projectId)
  return permissions.every(perm => userPermissions.includes(perm))
}

/**
 * Get user roles
 */
export async function getUserRoles(
  userId: number,
  projectId?: number
): Promise<Array<{ role: any, scopeType: string | null, scopeId: number | null }>> {
  const userRoles = await prisma.userRole.findMany({
    where: {
      userId,
      OR: [
        { scopeType: null },
        { scopeType: "global" },
        ...(projectId ? [{ scopeType: "project", scopeId: projectId }] : []),
      ],
    },
    include: {
      role: true,
    },
  })

  return userRoles.map(ur => ({
    role: ur.role,
    scopeType: ur.scopeType,
    scopeId: ur.scopeId,
  }))
}

/**
 * Check if user has a specific role
 */
export async function hasRole(
  userId: number,
  roleName: string,
  projectId?: number
): Promise<boolean> {
  const roles = await getUserRoles(userId, projectId)
  return roles.some(r => r.role.name === roleName)
}

/**
 * Clear permission cache for a user
 */
export function clearPermissionCache(userId: number, projectId?: number) {
  const cacheKey = `${userId}:${projectId || "global"}`
  permissionCache.delete(cacheKey)
}

/**
 * Clear all permission caches
 */
export function clearAllPermissionCaches() {
  permissionCache.clear()
}

/**
 * Require permission - throws error if user doesn't have permission
 */
export async function requirePermission(
  userId: number,
  permission: string,
  projectId?: number
): Promise<void> {
  const has = await hasPermission(userId, permission, projectId)
  if (!has) {
    throw new Error(`Permission denied: ${permission}`)
  }
}

/**
 * Require any permission - throws error if user doesn't have any of the permissions
 */
export async function requireAnyPermission(
  userId: number,
  permissions: string[],
  projectId?: number
): Promise<void> {
  const has = await hasAnyPermission(userId, permissions, projectId)
  if (!has) {
    throw new Error(`Permission denied: requires one of [${permissions.join(", ")}]`)
  }
}

