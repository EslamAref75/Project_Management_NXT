"use server"

import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { revalidatePath } from "next/cache"

// Get all notifications for a project (paginated)
export async function getProjectNotifications(
  projectId: number,
  filters?: {
    type?: string
    isRead?: boolean
    limit?: number
    offset?: number
  }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" }
    }

    const userId = parseInt(session.user.id)

    // Verify user has access to the project
    const projectUser = await prisma.projectUser.findFirst({
      where: {
        projectId,
        userId,
        leftAt: null, // User is still active in the project
      },
    })

    if (!projectUser) {
      return { success: false, error: "Access denied to this project" }
    }

    const limit = filters?.limit || 20
    const offset = filters?.offset || 0

    const where: any = {
      projectId,
      userId,
    }

    if (filters?.type) {
      where.type = filters.type
    }

    if (filters?.isRead !== undefined) {
      where.isRead = filters.isRead
    }

    const [notifications, total] = await Promise.all([
      prisma.projectNotification.findMany({
        where,
        orderBy: [
          { isUrgent: "desc" },
          { requiresAcknowledgment: "desc" },
          { createdAt: "desc" }
        ],
        take: limit,
        skip: offset,
      }),
      prisma.projectNotification.count({ where }),
    ])

    return {
      success: true,
      notifications,
      total,
    }
  } catch (error) {
    console.error("Error fetching project notifications:", error)
    return { success: false, error: "Failed to fetch notifications" }
  }
}

// Get total unread notification count across all projects for a user
export async function getAllProjectsUnreadNotificationCount() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" }
    }

    const userId = parseInt(session.user.id)

    // Get all projects the user is part of OR has tasks assigned to
    const projectUsers = await prisma.projectUser.findMany({
      where: {
        userId,
        leftAt: null,
      },
      select: { projectId: true },
    })

    // Also get projects where user has assigned tasks
    let tasksWithProjects: { projectId: number }[] = []
    try {
      tasksWithProjects = await prisma.task.findMany({
        where: {
          assignees: {
            some: { id: userId }
          }
        },
        select: {
          projectId: true
        }
      })
    } catch (error: any) {
      // If task model is not available, just use projectUsers
      console.warn("[Notifications] Could not fetch tasks, using only ProjectUser:", error?.message)
      tasksWithProjects = []
    }

    const projectIdsFromUsers = projectUsers.map((pu) => pu.projectId)
    const projectIdsFromTasks = tasksWithProjects.map(t => t.projectId)
    // Remove duplicates using Set
    const allProjectIds = [...new Set([...projectIdsFromUsers, ...projectIdsFromTasks])]

    if (allProjectIds.length === 0) {
      return { success: true, count: 0 }
    }

    let count = 0
    try {
      count = await prisma.projectNotification.count({
        where: {
          projectId: { in: allProjectIds },
          userId,
          isRead: false,
        },
      })
    } catch (error: any) {
      // If ProjectNotification model is not available, return 0
      console.error("[Notifications] ProjectNotification model not available. Please run 'npx prisma generate':", error?.message)
      return { success: true, count: 0 }
    }

    return {
      success: true,
      count,
    }
  } catch (error: any) {
    console.error("Error fetching all projects unread count:", error)
    console.error("Error details:", {
      message: error?.message,
      stack: error?.stack,
      name: error?.name
    })
    return {
      success: false,
      error: error?.message || "Failed to fetch unread count",
      details: error?.stack
    }
  }
}

// Get recent notifications across all projects for a user
export async function getAllProjectsNotifications(limit: number = 15) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" }
    }

    const userId = parseInt(session.user.id)

    // Get all projects the user is part of OR has tasks assigned to
    const projectUsers = await prisma.projectUser.findMany({
      where: {
        userId,
        leftAt: null,
      },
      select: { projectId: true },
    })

    // Also get projects where user has assigned tasks
    let tasksWithProjects: { projectId: number }[] = []
    try {
      tasksWithProjects = await prisma.task.findMany({
        where: {
          assignees: {
            some: { id: userId }
          }
        },
        select: {
          projectId: true
        }
      })
    } catch (error: any) {
      // If task model is not available, just use projectUsers
      console.warn("[Notifications] Could not fetch tasks, using only ProjectUser:", error?.message)
      tasksWithProjects = []
    }

    const projectIdsFromUsers = projectUsers.map((pu) => pu.projectId)
    const projectIdsFromTasks = tasksWithProjects.map(t => t.projectId)
    // Remove duplicates using Set
    const allProjectIds = [...new Set([...projectIdsFromUsers, ...projectIdsFromTasks])]

    console.log(`[Notifications] User ${userId} has access to projects:`, allProjectIds)

    if (allProjectIds.length === 0) {
      console.log(`[Notifications] No projects found for user ${userId}`)
      return { success: true, notifications: [] }
    }

    // Check if ProjectNotification model exists
    if (!prisma.projectNotification) {
      console.error("[Notifications] ProjectNotification model not found. Please run 'npx prisma generate'")
      return { success: true, notifications: [] }
    }

    let notifications: any[] = []
    try {
      notifications = await prisma.projectNotification.findMany({
        where: {
          projectId: { in: allProjectIds },
          userId,
        },
        include: {
          project: {
            select: { id: true, name: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
      })
    } catch (error: any) {
      // If ProjectNotification model is not available, return empty array
      console.error("[Notifications] Error accessing ProjectNotification model. Please run 'npx prisma generate':", error?.message)
      return { success: true, notifications: [] }
    }

    console.log(`[Notifications] Found ${notifications.length} notifications for user ${userId}`)

    return {
      success: true,
      notifications,
    }
  } catch (error: any) {
    console.error("Error fetching all projects notifications:", error)
    console.error("Error details:", {
      message: error?.message,
      stack: error?.stack,
      name: error?.name
    })
    return {
      success: false,
      error: error?.message || "Failed to fetch notifications",
      details: error?.stack
    }
  }
}

// Get unread notification count for a project
export async function getProjectUnreadNotificationCount(projectId: number) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" }
    }

    const userId = parseInt(session.user.id)

    // Verify user has access to the project
    const projectUser = await prisma.projectUser.findFirst({
      where: {
        projectId,
        userId,
        leftAt: null,
      },
    })

    if (!projectUser) {
      return { success: false, error: "Access denied to this project" }
    }

    const count = await prisma.projectNotification.count({
      where: {
        projectId,
        userId,
        isRead: false,
      },
    })

    return {
      success: true,
      count,
    }
  } catch (error) {
    console.error("Error fetching unread count:", error)
    return { success: false, error: "Failed to fetch unread count" }
  }
}

// Mark a notification as read
export async function markProjectNotificationAsRead(
  projectId: number,
  notificationId: number
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" }
    }

    const userId = parseInt(session.user.id)

    // Verify notification belongs to user and project
    const notification = await prisma.projectNotification.findFirst({
      where: {
        id: notificationId,
        projectId,
        userId,
      },
    })

    if (!notification) {
      return { success: false, error: "Notification not found" }
    }

    // Prevent marking urgent notifications that require acknowledgment as read
    // They can only be marked as read after acknowledgment
    if (notification.isUrgent && notification.requiresAcknowledgment && !notification.acknowledgedAt) {
      return {
        success: false,
        error: "Urgent notifications cannot be marked as read until acknowledged. Please acknowledge the urgent project first."
      }
    }

    await prisma.projectNotification.update({
      where: { id: notificationId },
      data: { isRead: true },
    })

    revalidatePath(`/dashboard/projects/${projectId}`)
    revalidatePath(`/dashboard/projects/${projectId}/notifications`)

    return { success: true }
  } catch (error) {
    console.error("Error marking notification as read:", error)
    return { success: false, error: "Failed to mark notification as read" }
  }
}

// Mark all project notifications as read
export async function markAllProjectNotificationsAsRead(projectId: number) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" }
    }

    const userId = parseInt(session.user.id)

    // Verify user has access to the project
    const projectUser = await prisma.projectUser.findFirst({
      where: {
        projectId,
        userId,
        leftAt: null,
      },
    })

    if (!projectUser) {
      return { success: false, error: "Access denied to this project" }
    }

    // Don't mark urgent notifications that require acknowledgment as read
    await prisma.projectNotification.updateMany({
      where: {
        projectId,
        userId,
        isRead: false,
        OR: [
          { isUrgent: false },
          { requiresAcknowledgment: false },
          { acknowledgedAt: { not: null } }
        ]
      },
      data: {
        isRead: true,
      },
    })

    revalidatePath(`/dashboard/projects/${projectId}`)
    revalidatePath(`/dashboard/projects/${projectId}/notifications`)

    return { success: true }
  } catch (error) {
    console.error("Error marking all notifications as read:", error)
    return { success: false, error: "Failed to mark all notifications as read" }
  }
}

// Get user's notification preferences for a project
export async function getProjectNotificationPreferences(projectId: number) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" }
    }

    const userId = parseInt(session.user.id)

    // Verify user has access to the project
    const projectUser = await prisma.projectUser.findFirst({
      where: {
        projectId,
        userId,
        leftAt: null,
      },
    })

    if (!projectUser) {
      return { success: false, error: "Access denied to this project" }
    }

    let preferences = await prisma.projectNotificationPreference.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId,
        },
      },
    })

    // Create default preferences if they don't exist
    if (!preferences) {
      preferences = await prisma.projectNotificationPreference.create({
        data: {
          projectId,
          userId,
          soundEnabled: true,
          taskNotifications: true,
          dependencyNotifications: true,
          todayTaskNotifications: true,
          projectAdminNotifications: true,
        },
      })
    }

    return {
      success: true,
      preferences,
    }
  } catch (error) {
    console.error("Error fetching notification preferences:", error)
    return { success: false, error: "Failed to fetch preferences" }
  }
}

// Update user's notification preferences for a project
export async function updateProjectNotificationPreferences(
  projectId: number,
  preferences: {
    soundEnabled?: boolean
    taskNotifications?: boolean
    dependencyNotifications?: boolean
    todayTaskNotifications?: boolean
    projectAdminNotifications?: boolean
  }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" }
    }

    const userId = parseInt(session.user.id)

    // Verify user has access to the project
    const projectUser = await prisma.projectUser.findFirst({
      where: {
        projectId,
        userId,
        leftAt: null,
      },
    })

    if (!projectUser) {
      return { success: false, error: "Access denied to this project" }
    }

    await prisma.projectNotificationPreference.upsert({
      where: {
        projectId_userId: {
          projectId,
          userId,
        },
      },
      create: {
        projectId,
        userId,
        soundEnabled: preferences.soundEnabled ?? true,
        taskNotifications: preferences.taskNotifications ?? true,
        dependencyNotifications: preferences.dependencyNotifications ?? true,
        todayTaskNotifications: preferences.todayTaskNotifications ?? true,
        projectAdminNotifications: preferences.projectAdminNotifications ?? true,
      },
      update: preferences,
    })

    revalidatePath(`/dashboard/projects/${projectId}/notifications`)

    return { success: true }
  } catch (error) {
    console.error("Error updating notification preferences:", error)
    return { success: false, error: "Failed to update preferences" }
  }
}

// Create a project notification (internal use)
export async function createProjectNotification(
  projectId: number,
  userId: number,
  options: {
    type: string
    entityType: string
    entityId: number | null
    title: string
    message: string
    soundRequired?: boolean
    isUrgent?: boolean
    requiresAcknowledgment?: boolean
  }
) {
  const {
    type,
    entityType,
    entityId,
    title,
    message,
    soundRequired = false,
    isUrgent = false,
    requiresAcknowledgment = false
  } = options
  try {
    // Verify user is part of the project OR assigned to a task in the project
    let projectUser = await prisma.projectUser.findFirst({
      where: {
        projectId,
        userId,
        leftAt: null,
      },
    })

    // If user is not in ProjectUser, check if they're assigned to a task in this project
    if (!projectUser && (entityType === "task" || entityType === "comment_mention") && entityId) {
      const task = await prisma.task.findFirst({
        where: {
          id: entityId,
          projectId,
          assignees: {
            some: { id: userId }
          }
        }
      })

      if (task) {
        // User is assigned to a task in this project, so they should receive notifications
        // Optionally, we could auto-add them to ProjectUser here, but for now we'll just allow the notification
        projectUser = null // We'll allow notification even without ProjectUser entry
      } else {
        // User is not assigned to this task and not in project
        return { success: false, error: "User not in project or assigned to task" }
      }
    } else if (!projectUser && entityType === "comment" && entityId) {
      // For comments, check if user is assigned to the task the comment is on
      const comment = await prisma.comment.findUnique({
        where: { id: entityId },
        select: { taskId: true }
      })

      if (comment && comment.taskId) {
        const task = await prisma.task.findFirst({
          where: {
            id: comment.taskId,
            projectId,
            assignees: {
              some: { id: userId }
            }
          }
        })

        if (task) {
          projectUser = null // Allow notification
        } else {
          return { success: false, error: "User not assigned to the task related to this comment" }
        }
      } else {
        return { success: false, error: "Comment or related task not found" }
      }
    } else if (!projectUser) {
      // For non-task/non-comment notifications, user must be in ProjectUser
      return { success: false, error: "User not in project" }
    }

    // Check user's notification preferences
    const preferences = await prisma.projectNotificationPreference.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId,
        },
      },
    })

    // Determine if notification should be created based on preferences
    let shouldNotify = true

    if (!soundRequired) {
      // Non-critical notifications respect user preferences
      switch (type) {
        case "task":
          if (preferences && !preferences.taskNotifications) {
            shouldNotify = false
          }
          break
        case "dependency":
          if (preferences && !preferences.dependencyNotifications) {
            shouldNotify = false
          }
          break
        case "today_task":
          if (preferences && !preferences.todayTaskNotifications) {
            shouldNotify = false
          }
          break
        case "project_admin":
          if (preferences && !preferences.projectAdminNotifications) {
            shouldNotify = false
          }
          break
      }
    }
    // Critical notifications (soundRequired = true) always notify

    if (!shouldNotify) {
      return { success: true, skipped: true }
    }

    const notification = await prisma.projectNotification.create({
      data: {
        projectId,
        userId,
        type,
        entityType,
        entityId,
        title,
        message,
        soundRequired,
        isUrgent,
        requiresAcknowledgment,
      },
    })

    console.log(`[Notifications] Created notification for user ${userId} in project ${projectId}:`, {
      id: notification.id,
      type,
      title,
      soundRequired
    })

    // Revalidate project pages
    revalidatePath(`/dashboard/projects/${projectId}`)
    revalidatePath(`/dashboard/projects/${projectId}/notifications`)

    return {
      success: true,
      notification,
    }
  } catch (error) {
    console.error("Error creating project notification:", error)
    return { success: false, error: "Failed to create notification" }
  }
}

