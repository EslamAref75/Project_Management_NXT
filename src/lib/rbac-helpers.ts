/**
 * RBAC Helper Functions - Proper Authorization Without Role Bypasses
 * 
 * These functions ensure that all permission checks go through the RBAC system,
 * preventing authorization bypasses from legacy role-based checks.
 */

import { prisma } from "@/lib/prisma"
import { hasPermission, clearPermissionCache } from "@/lib/rbac"

/**
 * Custom error classes for authorization
 */
export class UnauthorizedError extends Error {
  constructor(message: string, public code: string = "UNAUTHORIZED") {
    super(message)
    this.name = "UnauthorizedError"
  }
}

export class ForbiddenError extends Error {
  constructor(message: string, public code: string = "FORBIDDEN") {
    super(message)
    this.name = "ForbiddenError"
  }
}

export class NotFoundError extends Error {
  constructor(message: string, public code: string = "NOT_FOUND") {
    super(message)
    this.name = "NotFoundError"
  }
}

/**
 * Require specific permission - throws UnauthorizedError if denied
 * This is the ONLY way to check permissions - no role-based bypasses
 *
 * @param userId - User ID to check
 * @param permission - Permission key (e.g., "project.delete")
 * @param projectId - Optional project ID for resource-scoped permissions
 * @throws UnauthorizedError if permission denied
 *
 * @example
 * await requirePermission(userId, "project.delete", projectId)
 */
export async function requirePermission(
  userId: number,
  permission: string,
  projectId?: number
): Promise<void> {
  // Check permission through RBAC system ONLY
  // No role checks, no bypasses
  const allowed = await hasPermissionWithoutRoleBypass(userId, permission, projectId)

  if (!allowed) {
    throw new UnauthorizedError(`Permission denied: ${permission}`, "PERMISSION_DENIED")
  }
}

/**
 * Require any of multiple permissions
 * Throws error if user has none of them
 *
 * @param userId - User ID
 * @param permissions - Array of permission keys
 * @param projectId - Optional project ID
 * @throws UnauthorizedError if all permissions denied
 */
export async function requireAnyPermission(
  userId: number,
  permissions: string[],
  projectId?: number
): Promise<void> {
  // Check if user has at least one permission
  for (const permission of permissions) {
    const allowed = await hasPermissionWithoutRoleBypass(userId, permission, projectId)
    if (allowed) return
  }

  throw new UnauthorizedError(
    `Permission denied: requires one of [${permissions.join(", ")}]`,
    "PERMISSION_DENIED"
  )
}

/**
 * Check permission WITHOUT role-based bypasses
 * This is the core RBAC check - pure permission system
 *
 * @param userId - User ID
 * @param permission - Permission key
 * @param projectId - Optional project ID
 * @returns true if user has the permission
 */
export async function hasPermissionWithoutRoleBypass(
  userId: number,
  permission: string,
  projectId?: number
): Promise<boolean> {
  // Check through RBAC system only
  // The old hasPermission() function had bypasses for admin role
  // We use a pure RBAC check here

  try {
    // Get user's roles and their permissions
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

    // Check if any role has the permission
    for (const userRole of userRoles) {
      for (const rolePermission of userRole.role.permissions) {
        if (rolePermission.permission.key === permission) {
          return true
        }
      }
    }

    return false
  } catch (error) {
    console.error(`Error checking permission ${permission} for user ${userId}:`, error)
    // Fail secure - deny access on error
    return false
  }
}

/**
 * Verify user can access a project with specific permission
 * Throws error if project doesn't exist or user lacks permission
 *
 * @param userId - User ID
 * @param projectId - Project ID
 * @param permission - Permission key (e.g., "project.delete")
 * @throws NotFoundError if project doesn't exist
 * @throws UnauthorizedError if permission denied
 */
export async function verifyProjectAccess(
  userId: number,
  projectId: number,
  permission: string
): Promise<void> {
  // 1. Verify project exists
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true },
  })

  if (!project) {
    throw new NotFoundError(`Project ${projectId} not found`)
  }

  // 2. Check permission through RBAC (no bypasses)
  const allowed = await hasPermissionWithoutRoleBypass(userId, permission, projectId)

  if (!allowed) {
    throw new UnauthorizedError(
      `You don't have permission to ${permission} on this project`,
      "PROJECT_ACCESS_DENIED"
    )
  }
}

/**
 * Verify user can access a task with specific permission
 * Throws error if task doesn't exist or user lacks permission
 *
 * @param userId - User ID
 * @param taskId - Task ID
 * @param permission - Permission key (e.g., "task.update")
 * @throws NotFoundError if task doesn't exist
 * @throws UnauthorizedError if permission denied
 */
export async function verifyTaskAccess(
  userId: number,
  taskId: number,
  permission: string
): Promise<void> {
  // 1. Get task and its project
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: {
      id: true,
      projectId: true,
    },
  })

  if (!task) {
    throw new NotFoundError(`Task ${taskId} not found`)
  }

  // 2. Check permission on the project
  // Tasks are scoped to projects, so we check project-level permissions
  const allowed = await hasPermissionWithoutRoleBypass(userId, permission, task.projectId)

  if (!allowed) {
    throw new UnauthorizedError(
      `You don't have permission to ${permission} on this task`,
      "TASK_ACCESS_DENIED"
    )
  }
}

/**
 * Verify user is project owner/creator
 * Used for operations that should only be available to the creator
 *
 * @param userId - User ID
 * @param projectId - Project ID
 * @throws NotFoundError if project doesn't exist
 * @throws UnauthorizedError if not the creator
 */
export async function verifyProjectOwner(userId: number, projectId: number): Promise<void> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, createdById: true },
  })

  if (!project) {
    throw new NotFoundError(`Project ${projectId} not found`)
  }

  if (project.createdById !== userId) {
    throw new UnauthorizedError(`You are not the owner of this project`, "NOT_OWNER")
  }
}

/**
 * Check if user is admin through RBAC (has admin role in system)
 * Does NOT grant automatic permissions - must still check individual permissions
 *
 * @param userId - User ID
 * @returns true if user has the "admin" role
 * @deprecated - Use specific permission checks instead
 */
export async function isAdminUser(userId: number): Promise<boolean> {
  const adminRole = await prisma.userRole.findFirst({
    where: {
      userId,
      role: {
        name: "admin",
      },
    },
  })

  return !!adminRole
}

/**
 * Clear permission cache when user roles change
 * Must be called after updating user permissions/roles
 *
 * @param userId - User ID whose cache to clear
 * @param projectId - Optional project ID for project-scoped changes
 */
export function invalidateUserPermissionCache(userId: number, projectId?: number): void {
  clearPermissionCache(userId, projectId)
}

/**
 * Clear all permission caches (use sparingly)
 */
export function invalidateAllPermissionCaches(): void {
  clearPermissionCache(0, undefined) // This clears all caches
}

/**
 * Handle authorization errors in server actions
 *
 * @param error - Error thrown during authorization
 * @returns Response object with error details
 *
 * @example
 * try {
 *   await requirePermission(userId, 'project.delete')
 * } catch (error) {
 *   return handleAuthorizationError(error)
 * }
 */
export function handleAuthorizationError(
  error: unknown
): { error: string; code: string; status: number; success: false } {
  if (error instanceof UnauthorizedError) {
    return { error: error.message, code: error.code, status: 403, success: false }
  }

  if (error instanceof ForbiddenError) {
    return { error: error.message, code: error.code, status: 403, success: false }
  }

  if (error instanceof NotFoundError) {
    return { error: error.message, code: error.code, status: 404, success: false }
  }

  console.error("Unknown authorization error:", error)
  return {
    error: "Authorization failed",
    code: "AUTHORIZATION_ERROR",
    status: 500,
    success: false
  }
}
