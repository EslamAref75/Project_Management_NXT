"use server"

import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { z } from "zod"
import { revalidatePath } from "next/cache"
import { logActivity } from "@/lib/activity-logger"
import { clearPermissionCache } from "@/lib/rbac"
import { PERMISSIONS, DEFAULT_ROLES, getAllPermissions } from "@/lib/permissions"

const roleSchema = z.object({
  name: z.string().min(1, "Role name is required"),
  description: z.string().optional(),
  permissionIds: z.array(z.number()).optional(),
})

/**
 * Get all roles
 */
export async function getRoles() {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error("Unauthorized")

  // Check permission
  const hasPermission = await import("@/lib/rbac").then(m => 
    m.hasPermission(parseInt(session.user.id), PERMISSIONS.ROLE.READ)
  ).catch(() => false)

  if (!hasPermission && session.user.role !== "admin") {
    throw new Error("Permission denied")
  }

  const roles = await prisma.role.findMany({
    include: {
      _count: {
        select: {
          permissions: true,
          userRoles: true,
        },
      },
      permissions: {
        include: {
          permission: true,
        },
      },
    },
    orderBy: { name: "asc" },
  })

  return roles
}

/**
 * Get a single role by ID
 */
export async function getRole(id: number) {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error("Unauthorized")

  const hasPermission = await import("@/lib/rbac").then(m => 
    m.hasPermission(parseInt(session.user.id), PERMISSIONS.ROLE.READ)
  ).catch(() => false)

  if (!hasPermission && session.user.role !== "admin") {
    throw new Error("Permission denied")
  }

  const role = await prisma.role.findUnique({
    where: { id },
    include: {
      permissions: {
        include: {
          permission: true,
        },
      },
      userRoles: {
        include: {
          user: {
            select: { id: true, username: true, email: true },
          },
        },
      },
    },
  })

  return role
}

/**
 * Create a new role
 */
export async function createRole(formData: FormData) {
  const session = await getServerSession(authOptions)
  if (!session) return { error: "Unauthorized" }

  const hasPermission = await import("@/lib/rbac").then(m => 
    m.hasPermission(parseInt(session.user.id), PERMISSIONS.ROLE.CREATE)
  ).catch(() => false)

  if (!hasPermission && session.user.role !== "admin") {
    return { error: "Permission denied" }
  }

  const name = formData.get("name") as string
  const description = formData.get("description") as string
  const permissionIdsStr = formData.get("permissionIds") as string

  let permissionIds: number[] = []
  if (permissionIdsStr) {
    try {
      permissionIds = JSON.parse(permissionIdsStr)
    } catch {
      // Ignore parse errors
    }
  }

  const validated = roleSchema.safeParse({ name, description, permissionIds })

  if (!validated.success) {
    return { error: "Validation failed" }
  }

  try {
    const role = await prisma.role.create({
      data: {
        name: validated.data.name,
        description: validated.data.description || null,
        permissions: validated.data.permissionIds && validated.data.permissionIds.length > 0 ? {
          create: validated.data.permissionIds.map(permissionId => ({
            permissionId,
          })),
        } : undefined,
      },
      include: {
        permissions: {
          include: { permission: true },
        },
      },
    })

    // Log activity
    await logActivity({
      actionType: "role_created",
      actionCategory: "settings",
      actionSummary: `Role "${role.name}" created`,
      actionDetails: {
        roleId: role.id,
        roleName: role.name,
        permissionCount: role.permissions.length,
      },
      performedById: parseInt(session.user.id),
      entityType: "role",
      entityId: role.id,
    })

    revalidatePath("/dashboard/admin/roles")
    return { success: true, role }
  } catch (e: any) {
    if (e.code === "P2002") {
      return { error: "Role with this name already exists" }
    }
    console.error(e)
    return { error: "Failed to create role" }
  }
}

/**
 * Update a role
 */
export async function updateRole(id: number, formData: FormData) {
  const session = await getServerSession(authOptions)
  if (!session) return { error: "Unauthorized" }

  const hasPermission = await import("@/lib/rbac").then(m => 
    m.hasPermission(parseInt(session.user.id), PERMISSIONS.ROLE.UPDATE)
  ).catch(() => false)

  if (!hasPermission && session.user.role !== "admin") {
    return { error: "Permission denied" }
  }

  // Check if role is system role
  const existingRole = await prisma.role.findUnique({
    where: { id },
    select: { isSystemRole: true, name: true },
  })

  if (existingRole?.isSystemRole && existingRole.name === "Super Admin") {
    return { error: "Cannot modify Super Admin role" }
  }

  const name = formData.get("name") as string
  const description = formData.get("description") as string
  const permissionIdsStr = formData.get("permissionIds") as string

  let permissionIds: number[] = []
  if (permissionIdsStr) {
    try {
      permissionIds = JSON.parse(permissionIdsStr)
    } catch {
      // Ignore parse errors
    }
  }

  const validated = roleSchema.partial().safeParse({ name, description, permissionIds })

  if (!validated.success) {
    return { error: "Validation failed" }
  }

  try {
    // Update role
    const role = await prisma.role.update({
      where: { id },
      data: {
        name: validated.data.name,
        description: validated.data.description !== undefined ? validated.data.description : undefined,
      },
    })

    // Update permissions if provided
    if (validated.data.permissionIds !== undefined) {
      // Remove all existing permissions
      await prisma.rolePermission.deleteMany({
        where: { roleId: id },
      })

      // Add new permissions (SQLite doesn't support createMany with unique constraints)
      if (permissionIds.length > 0) {
        for (const permissionId of permissionIds) {
          try {
            await prisma.rolePermission.create({
              data: {
                roleId: id,
                permissionId,
              },
            })
          } catch (e: any) {
            // Skip if already exists
            if (e.code !== 'P2002') {
              throw e
            }
          }
        }
      }

      // Clear permission caches for all users with this role
      const usersWithRole = await prisma.userRole.findMany({
        where: { roleId: id },
        select: { userId: true, scopeId: true },
      })

      for (const userRole of usersWithRole) {
        clearPermissionCache(userRole.userId, userRole.scopeId || undefined)
      }
    }

    // Log activity
    await logActivity({
      actionType: "role_updated",
      actionCategory: "settings",
      actionSummary: `Role "${role.name}" updated`,
      actionDetails: {
        roleId: role.id,
        roleName: role.name,
      },
      performedById: parseInt(session.user.id),
      entityType: "role",
      entityId: role.id,
    })

    revalidatePath("/dashboard/admin/roles")
    revalidatePath(`/dashboard/admin/roles/${id}`)
    return { success: true }
  } catch (e: any) {
    if (e.code === "P2002") {
      return { error: "Role with this name already exists" }
    }
    console.error(e)
    return { error: "Failed to update role" }
  }
}

/**
 * Delete a role
 */
export async function deleteRole(id: number) {
  const session = await getServerSession(authOptions)
  if (!session) return { error: "Unauthorized" }

  const hasPermission = await import("@/lib/rbac").then(m => 
    m.hasPermission(parseInt(session.user.id), PERMISSIONS.ROLE.DELETE)
  ).catch(() => false)

  if (!hasPermission && session.user.role !== "admin") {
    return { error: "Permission denied" }
  }

  // Check if role is system role
  const role = await prisma.role.findUnique({
    where: { id },
    select: { isSystemRole: true, name: true },
  })

  if (role?.isSystemRole) {
    return { error: "Cannot delete system role" }
  }

  // Check if any users have this role
  const userCount = await prisma.userRole.count({
    where: { roleId: id },
  })

  if (userCount > 0) {
    return { error: `Cannot delete role: ${userCount} user(s) have this role assigned` }
  }

  try {
    await prisma.role.delete({
      where: { id },
    })

    // Log activity
    await logActivity({
      actionType: "role_deleted",
      actionCategory: "settings",
      actionSummary: `Role "${role?.name}" deleted`,
      actionDetails: {
        roleId: id,
        roleName: role?.name,
      },
      performedById: parseInt(session.user.id),
      entityType: "role",
      entityId: id,
    })

    revalidatePath("/dashboard/admin/roles")
    return { success: true }
  } catch (e) {
    console.error(e)
    return { error: "Failed to delete role" }
  }
}

/**
 * Get all permissions
 */
export async function getPermissions() {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error("Unauthorized")

  const permissions = await prisma.permission.findMany({
    orderBy: [{ module: "asc" }, { name: "asc" }],
  })

  // Group by module
  const grouped: Record<string, typeof permissions> = {}
  for (const perm of permissions) {
    if (!grouped[perm.module]) {
      grouped[perm.module] = []
    }
    grouped[perm.module].push(perm)
  }

  return { permissions, grouped }
}

/**
 * Assign role to user
 */
export async function assignRoleToUser(
  userId: number,
  roleId: number,
  scopeType?: "global" | "project",
  scopeId?: number
) {
  const session = await getServerSession(authOptions)
  if (!session) return { error: "Unauthorized" }

  const hasPermission = await import("@/lib/rbac").then(m => 
    m.hasPermission(parseInt(session.user.id), PERMISSIONS.ROLE.ASSIGN)
  ).catch(() => false)

  if (!hasPermission && session.user.role !== "admin") {
    return { error: "Permission denied" }
  }

  try {
    await prisma.userRole.create({
      data: {
        userId,
        roleId,
        scopeType: scopeType || null,
        scopeId: scopeId || null,
        assignedBy: parseInt(session.user.id),
      },
    })

    // Clear permission cache
    clearPermissionCache(userId, scopeId)

    // Log activity
    await logActivity({
      actionType: "role_assigned",
      actionCategory: "settings",
      actionSummary: `Role assigned to user`,
      actionDetails: {
        userId,
        roleId,
        scopeType,
        scopeId,
      },
      performedById: parseInt(session.user.id),
      affectedUserId: userId,
      entityType: "role",
      entityId: roleId,
    })

    revalidatePath("/dashboard/admin/users")
    return { success: true }
  } catch (e: any) {
    if (e.code === "P2002") {
      return { error: "User already has this role" }
    }
    console.error(e)
    return { error: "Failed to assign role" }
  }
}

/**
 * Remove role from user
 */
export async function removeRoleFromUser(
  userId: number,
  roleId: number,
  scopeType?: "global" | "project",
  scopeId?: number
) {
  const session = await getServerSession(authOptions)
  if (!session) return { error: "Unauthorized" }

  const hasPermission = await import("@/lib/rbac").then(m => 
    m.hasPermission(parseInt(session.user.id), PERMISSIONS.ROLE.ASSIGN)
  ).catch(() => false)

  if (!hasPermission && session.user.role !== "admin") {
    return { error: "Permission denied" }
  }

  try {
    await prisma.userRole.deleteMany({
      where: {
        userId,
        roleId,
        scopeType: scopeType || null,
        scopeId: scopeId || null,
      },
    })

    // Clear permission cache
    clearPermissionCache(userId, scopeId)

    // Log activity
    await logActivity({
      actionType: "role_removed",
      actionCategory: "settings",
      actionSummary: `Role removed from user`,
      actionDetails: {
        userId,
        roleId,
        scopeType,
        scopeId,
      },
      performedById: parseInt(session.user.id),
      affectedUserId: userId,
      entityType: "role",
      entityId: roleId,
    })

    revalidatePath("/dashboard/admin/users")
    return { success: true }
  } catch (e) {
    console.error(e)
    return { error: "Failed to remove role" }
  }
}

/**
 * Initialize default roles and permissions
 */
export async function initializeRBAC() {
  try {
    console.log("Initializing RBAC system...")

    // Create all permissions
    const allPermissionKeys = getAllPermissions()
    const permissionMap = new Map<string, number>()

    for (const key of allPermissionKeys) {
      const [module, ...actionParts] = key.split(".")
      const action = actionParts.join(".")
      const name = action.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())
      const category = actionParts.length > 1 ? actionParts[0] : null

      const permission = await prisma.permission.upsert({
        where: { key },
        update: {},
        create: {
          key,
          name,
          description: `Permission to ${action.replace(/_/g, " ")}`,
          module,
          category,
        },
      })

      permissionMap.set(key, permission.id)
    }

    console.log(`✅ Created/updated ${permissionMap.size} permissions`)

    // Create default roles
    for (const [roleKey, roleData] of Object.entries(DEFAULT_ROLES)) {
      const role = await prisma.role.upsert({
        where: { name: roleData.name },
        update: {
          description: roleData.description,
        },
        create: {
          name: roleData.name,
          description: roleData.description,
          isSystemRole: roleData.isSystemRole,
        },
      })

      // Assign permissions to role
      const permissionIds = roleData.permissions
        .map(key => permissionMap.get(key))
        .filter((id): id is number => id !== undefined)

      // Remove existing permissions
      await prisma.rolePermission.deleteMany({
        where: { roleId: role.id },
      })

      // Add new permissions (SQLite doesn't support createMany with unique constraints)
      if (permissionIds.length > 0) {
        for (const permissionId of permissionIds) {
          try {
            await prisma.rolePermission.create({
              data: {
                roleId: role.id,
                permissionId,
              },
            })
          } catch (e: any) {
            // Skip if already exists
            if (e.code !== 'P2002') {
              throw e
            }
          }
        }
      }

      console.log(`✅ Created/updated role: ${role.name} with ${permissionIds.length} permissions`)
    }

    console.log("✅ RBAC initialization completed!")
    return { success: true }
  } catch (error: any) {
    console.error("❌ RBAC initialization failed:", error)
    return { error: error.message }
  }
}

