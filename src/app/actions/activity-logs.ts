"use server"

import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

type ActionCategory = 
  | "auth" 
  | "project" 
  | "task" 
  | "dependency" 
  | "settings" 
  | "notification" 
  | "today_task"

interface GetActivityLogsParams {
  limit?: number
  offset?: number
  startDate?: Date
  endDate?: Date
  userId?: number
  projectId?: number
  category?: ActionCategory
  entityType?: string
  search?: string
}

/**
 * Get activity logs (Admin only)
 */
export async function getActivityLogs(params: GetActivityLogsParams = {}) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" }
    }

    // Only admins can view activity logs
    if (session.user.role !== "admin") {
      return { success: false, error: "Access denied. Admin only." }
    }

    const {
      limit = 50,
      offset = 0,
      startDate,
      endDate,
      userId,
      projectId,
      category,
      entityType,
      search,
    } = params

    const where: any = {}

    // Date range filter
    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) {
        where.createdAt.gte = startDate
      }
      if (endDate) {
        where.createdAt.lte = endDate
      }
    }

    // User filter
    if (userId) {
      where.performedById = userId
    }

    // Project filter
    if (projectId) {
      where.projectId = projectId
    }

    // Category filter
    if (category) {
      where.actionCategory = category
    }

    // Entity type filter
    if (entityType) {
      where.entityType = entityType
    }

    // Search filter (searches in actionSummary and actionDetails)
    // Note: SQLite doesn't support case-insensitive mode, so we use contains
    if (search && search.trim()) {
      where.OR = [
        { actionSummary: { contains: search.trim() } },
        { actionDetails: { contains: search.trim() } },
        { actionType: { contains: search.trim() } },
      ]
    }

    // Try to fetch with new schema first, fall back to old schema if needed
    let logs: any[] = []
    let total = 0

    try {
      const [logsResult, totalResult] = await Promise.all([
        prisma.activityLog.findMany({
          where,
          include: {
            performedBy: {
              select: {
                id: true,
                username: true,
                email: true,
                role: true,
              },
            },
            affectedUser: {
              select: {
                id: true,
                username: true,
                email: true,
              },
            },
            project: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
          take: limit,
          skip: offset,
        }),
        prisma.activityLog.count({ where }),
      ])
      logs = logsResult
      total = totalResult
    } catch (error: any) {
      // If relations don't exist, try with basic query
      if (error.message?.includes('Unknown arg') || error.code === 'P2009') {
        console.warn("[ActivityLogs] Relations not available, using basic query")
        const [logsResult, totalResult] = await Promise.all([
          prisma.activityLog.findMany({
            where,
            orderBy: { createdAt: "desc" },
            take: limit,
            skip: offset,
          }),
          prisma.activityLog.count({ where }),
        ])
        logs = logsResult.map((log: any) => ({
          ...log,
          performedBy: log.userId ? { id: log.userId, username: "Unknown", email: "", role: "" } : null,
          affectedUser: null,
          project: null,
        }))
        total = totalResult
      } else {
        throw error
      }
    }

    return {
      success: true,
      logs,
      total,
      limit,
      offset,
    }
  } catch (error: any) {
    console.error("Error fetching activity logs:", error)
    return {
      success: false,
      error: error?.message || "Failed to fetch activity logs",
    }
  }
}

/**
 * Get a single activity log by ID (Admin only)
 */
export async function getActivityLogById(id: number) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" }
    }

    // Only admins can view activity logs
    if (session.user.role !== "admin") {
      return { success: false, error: "Access denied. Admin only." }
    }

    const log = await prisma.activityLog.findUnique({
      where: { id },
      include: {
        performedBy: {
          select: {
            id: true,
            username: true,
            email: true,
            role: true,
          },
        },
        affectedUser: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    if (!log) {
      return { success: false, error: "Activity log not found" }
    }

    return {
      success: true,
      log,
    }
  } catch (error: any) {
    console.error("Error fetching activity log:", error)
    return {
      success: false,
      error: error?.message || "Failed to fetch activity log",
    }
  }
}

/**
 * Get activity log statistics (Admin only)
 */
export async function getActivityLogStats(startDate?: Date, endDate?: Date) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" }
    }

    // Only admins can view activity logs
    if (session.user.role !== "admin") {
      return { success: false, error: "Access denied. Admin only." }
    }

    const where: any = {}
    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) {
        where.createdAt.gte = startDate
      }
      if (endDate) {
        where.createdAt.lte = endDate
      }
    }

    const [totalLogs, byCategory, byUser, recentActivity] = await Promise.all([
      prisma.activityLog.count({ where }),
      prisma.activityLog.groupBy({
        by: ["actionCategory"],
        where,
        _count: true,
      }),
      prisma.activityLog.groupBy({
        by: ["performedById"],
        where,
        _count: true,
        orderBy: { _count: { performedById: "desc" } },
        take: 10,
      }),
      prisma.activityLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          actionType: true,
          actionSummary: true,
          createdAt: true,
          performedBy: {
            select: {
              username: true,
            },
          },
        },
      }),
    ])

    return {
      success: true,
      stats: {
        totalLogs,
        byCategory: byCategory.map((item) => ({
          category: item.actionCategory,
          count: item._count,
        })),
        byUser: byUser.map((item) => ({
          userId: item.performedById,
          count: item._count,
        })),
        recentActivity,
      },
    }
  } catch (error: any) {
    console.error("Error fetching activity log stats:", error)
    return {
      success: false,
      error: error?.message || "Failed to fetch activity log stats",
    }
  }
}

