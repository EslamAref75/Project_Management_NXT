"use server"

import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { z } from "zod"
import { revalidatePath, unstable_cache } from "next/cache"
import bcrypt from "bcryptjs"
import {
  requirePermission,
  handleAuthorizationError,
  ForbiddenError,
} from "@/lib/rbac-helpers"


const createUserSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.string().default("developer"),
  teamId: z.coerce.number().optional()
})

// EXTRACT LOGIC FOR USERS LIST
const fetchUsers = async () => {
  return await prisma.user.findMany({
    include: {
      team: { select: { id: true, name: true } }
    },
    orderBy: { username: "asc" }
  })
}

// Cache the user list - it's relatively static
const getCachedUsers = unstable_cache(
  fetchUsers,
  ['all-users'],
  { revalidate: 300, tags: ['users'] } // 5 minutes cache
)

export async function getUsers() {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error("Unauthorized")

  return await getCachedUsers()
}

export async function getUser(id: number) {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error("Unauthorized")

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      team: { select: { id: true, name: true } },
      roles: {
        include: {
          role: true
        }
      }
    }
  })

  return user
}

export async function createUser(formData: FormData) {
  const session = await getServerSession(authOptions)
  if (!session) return { error: "Unauthorized", code: "UNAUTHORIZED" }

  try {
    // Use RBAC permission check (not role-based bypass)
    await requirePermission(parseInt(session.user.id), "user.create")
  } catch (error: any) {
    return handleAuthorizationError(error)
  }

  const username = formData.get("username")
  const email = formData.get("email")
  const password = formData.get("password")
  const roleName = formData.get("role")
  const teamId = formData.get("teamId")

  const validated = createUserSchema.safeParse({
    username,
    email,
    password,
    role: roleName,
    teamId: teamId ? parseInt(teamId as string) : undefined,
  })

  if (!validated.success) {
    return { error: "Validation failed", code: "VALIDATION_FAILED" }
  }

  try {
    const hashedPassword = await bcrypt.hash(validated.data.password, 10)

    // 1. Check if the role exists in the roles table
    const rbacRole = await prisma.role.findUnique({
      where: { name: validated.data.role },
    })

    // 2. Create the user
    const newUser = await prisma.user.create({
      data: {
        username: validated.data.username,
        email: validated.data.email,
        role: validated.data.role, // Keep legacy field in sync for now
        passwordHash: hashedPassword,
        teamId: validated.data.teamId,
      },
    })

    // 3. If RBAC role exists, assign it to the user
    if (rbacRole) {
      await prisma.userRole.create({
        data: {
          userId: newUser.id,
          roleId: rbacRole.id,
          scopeType: "global", // Defaulting to global scope for dashboard creation
          scopeId: 0,
        },
      })
    }

    // Log activity
    console.log(
      `[RBAC] User ${session.user.name || session.user.email} created user ${newUser.username}`
    )

    // Pass cache tag to revalidate cache if using tag-based revalidation (unstable_cache support tags)
    // Note: manual revalidateTag is available in next/cache
    revalidatePath("/dashboard/users")
    revalidatePath("/dashboard/teams")

    // Ideally we also invalidate specific cache tags but Path revalidation might not clear unstable_cache depending on nextjs version
    // For now we rely on time-based expiration (5 mins) or explicit path revalidation if it works.

    return { success: true, code: "USER_CREATED" }
  } catch (e) {
    console.error("Create User Error:", e)
    return {
      error: "Failed to create user (Email/Username might be taken)",
      code: "CREATE_FAILED",
    }
  }
}


export async function updateUser(id: number, formData: FormData) {
  const session = await getServerSession(authOptions)
  if (!session) return { error: "Unauthorized", code: "UNAUTHORIZED" }

  try {
    // Check permission to update users (RBAC, not role)
    await requirePermission(parseInt(session.user.id), "user.update")
  } catch (error: any) {
    return handleAuthorizationError(error)
  }

  // Logic to update user (excluding password for now unless requested)
  const role = formData.get("role") as string
  const teamId = formData.get("teamId") ? parseInt(formData.get("teamId") as string) : null

  try {
    await prisma.user.update({
      where: { id },
      data: { role, teamId },
    })

    console.log(`[RBAC] User ${session.user.name || session.user.email} updated user ${id}`)

    revalidatePath("/dashboard/users")
    return { success: true, code: "USER_UPDATED" }
  } catch (e) {
    return { error: "Failed to update user", code: "UPDATE_FAILED" }
  }
}


export async function deleteUser(id: number) {
  const session = await getServerSession(authOptions)
  if (!session) return { error: "Unauthorized", code: "UNAUTHORIZED" }

  try {
    // Check permission to delete users (RBAC, not role)
    await requirePermission(parseInt(session.user.id), "user.delete")
  } catch (error: any) {
    return handleAuthorizationError(error)
  }

  // Prevent self-deletion
  if (parseInt(session.user.id) === id) {
    return { error: "Cannot delete your own account", code: "SELF_DELETE" }
  }

  try {
    // Check for blocking dependencies
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        projectsManaged: {
          where: {
            NOT: { status: "completed" }
          },
          select: { id: true, name: true }
        },
        teamsLed: {
          select: { id: true, name: true }
        },
      }
    })

    if (!user) {
      return { error: "User not found", code: "NOT_FOUND" }
    }

    // Check if user is managing active projects
    if (user.projectsManaged.length > 0) {
      const projectNames = user.projectsManaged.map(p => p.name).join(", ")
      return {
        error: `Cannot delete: User is managing ${user.projectsManaged.length} active project(s) (${projectNames}). Please reassign the project manager first.`,
        code: "HAS_ACTIVE_PROJECTS"
      }
    }

    // Check if user is leading teams
    if (user.teamsLed.length > 0) {
      const teamNames = user.teamsLed.map(t => t.name).join(", ")
      return {
        error: `Cannot delete: User is leading ${user.teamsLed.length} team(s) (${teamNames}). Please reassign the team lead first.`,
        code: "IS_TEAM_LEAD"
      }
    }

    // Perform deletion with cleanup in a transaction
    await prisma.$transaction(async (tx) => {
      // Nullify creator references for projects
      await tx.project.updateMany({
        where: { createdById: id },
        data: { createdById: null }
      })

      // Nullify creator references for tasks
      await tx.task.updateMany({
        where: { createdById: id },
        data: { createdById: null }
      })

      // Disconnect user from assigned tasks (many-to-many relationship)
      const assignedTasks = await tx.task.findMany({
        where: {
          assignees: {
            some: { id }
          }
        },
        select: { id: true }
      })

      for (const task of assignedTasks) {
        await tx.task.update({
          where: { id: task.id },
          data: {
            assignees: {
              disconnect: { id }
            }
          }
        })
      }

      // Delete the user (cascade will handle related records like comments, notifications, etc.)
      await tx.user.delete({ where: { id } })
    })

    console.log(`[RBAC] User ${id} deleted by ${session.user.name || session.user.email}`)

    revalidatePath("/dashboard/users")
    revalidatePath("/dashboard/teams")

    return { success: true, code: "USER_DELETED" }
  } catch (e: any) {
    console.error("Delete user error:", e)
    return {
      error: `Failed to delete user: ${e.message || "Unknown error"}`,
      code: "DELETE_FAILED"
    }
  }
}


export async function updateUserTeam(userId: number, teamId: number | null) {
  const session = await getServerSession(authOptions)
  if (!session) return { error: "Unauthorized" }

  try {
    await prisma.user.update({
      where: { id: userId },
      data: { teamId: teamId }
    })
    revalidatePath("/dashboard/users")
    return { success: true }
  } catch (e) {
    return { error: "Failed to update user team" }
  }
}
