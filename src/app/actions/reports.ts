"use server"

import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { startOfDay, endOfDay, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns"

// Helper to get projects (for filters)
export async function getProjects() {
    const session = await getServerSession(authOptions)
    if (!session) return []

    try {
        const where: any = {}

        if (session.user.role !== "admin") {
            where.OR = [
                { projectManagerId: parseInt(session.user.id) },
                { createdById: parseInt(session.user.id) },
            ]
        }

        const projects = await prisma.project.findMany({
            where,
            select: {
                id: true,
                name: true,
            },
            orderBy: { name: "asc" },
        })

        return projects
    } catch (error: any) {
        console.error("Error fetching projects:", error)
        return []
    }
}

// Overview Reports
export async function getOverviewReports(params: {
    dateRange?: { start?: Date; end?: Date }
}) {
    const session = await getServerSession(authOptions)
    if (!session) return { error: "Unauthorized" }

    const { dateRange } = params
    const startDate = dateRange?.start || startOfMonth(new Date())
    const endDate = dateRange?.end || endOfMonth(new Date())

    try {
        const where: any = {
            createdAt: {
                gte: startDate,
                lte: endDate,
            },
        }

        // Role-based filtering
        if (session.user.role !== "admin") {
            where.OR = [
                { projectManagerId: parseInt(session.user.id) },
                { createdById: parseInt(session.user.id) },
            ]
        }

        // Projects stats
        const [totalProjects, activeProjects, completedProjects, onHoldProjects] = await Promise.all([
            prisma.project.count({ where }),
            prisma.project.count({ where: { ...where, status: "active" } }),
            prisma.project.count({ where: { ...where, status: "completed" } }),
            prisma.project.count({ where: { ...where, status: "on_hold" } }),
        ])

        // Tasks stats
        const projectIds = session.user.role === "admin"
            ? undefined
            : await prisma.project.findMany({
                  where: {
                      OR: [
                          { projectManagerId: parseInt(session.user.id) },
                          { createdById: parseInt(session.user.id) },
                      ],
                  },
                  select: { id: true },
              }).then((projects) => projects.map((p) => p.id))

        const taskWhere: any = {
            createdAt: {
                gte: startDate,
                lte: endDate,
            },
        }

        if (projectIds !== undefined) {
            taskWhere.projectId = { in: projectIds }
        }

        const [
            totalTasks,
            openTasks,
            completedTasks,
            blockedTasks,
            overdueTasks,
        ] = await Promise.all([
            prisma.task.count({ where: taskWhere }),
            prisma.task.count({
                where: {
                    ...taskWhere,
                    status: { in: ["pending", "in_progress", "review"] },
                },
            }),
            prisma.task.count({ where: { ...taskWhere, status: "completed" } }),
            prisma.task.count({
                where: {
                    ...taskWhere,
                    OR: [
                        { status: "waiting" },
                        {
                            dependencies: {
                                some: {
                                    dependsOnTask: {
                                        status: { not: "completed" },
                                    },
                                },
                            },
                        },
                    ],
                },
            }),
            prisma.task.count({
                where: {
                    ...taskWhere,
                    dueDate: { lt: new Date() },
                    status: { not: "completed" },
                },
            }),
        ])

        // Today's Tasks stats
        const todayStart = startOfDay(new Date())
        const todayEnd = endOfDay(new Date())
        const todaysTasksWhere: any = {
            plannedDate: {
                gte: todayStart,
                lte: todayEnd,
            },
        }

        if (projectIds !== undefined) {
            todaysTasksWhere.projectId = { in: projectIds }
        }

        const [todaysTasksTotal, todaysTasksCompleted] = await Promise.all([
            prisma.task.count({ where: todaysTasksWhere }),
            prisma.task.count({
                where: {
                    ...todaysTasksWhere,
                    status: "completed",
                },
            }),
        ])

        const todaysCompletionRate =
            todaysTasksTotal > 0
                ? Math.round((todaysTasksCompleted / todaysTasksTotal) * 100)
                : 0

        // Weekly trend (last 7 days)
        const weeklyData = []
        for (let i = 6; i >= 0; i--) {
            const date = subDays(new Date(), i)
            const dayStart = startOfDay(date)
            const dayEnd = endOfDay(date)

            const dayTaskWhere: any = {
                createdAt: {
                    gte: dayStart,
                    lte: dayEnd,
                },
            }

            if (projectIds !== undefined) {
                dayTaskWhere.projectId = { in: projectIds }
            }

            const [created, completed] = await Promise.all([
                prisma.task.count({ where: dayTaskWhere }),
                prisma.task.count({
                    where: {
                        ...dayTaskWhere,
                        status: "completed",
                    },
                }),
            ])

            weeklyData.push({
                date: date.toISOString().split("T")[0],
                created,
                completed,
            })
        }

        // Project status distribution
        const projectStatusData = await prisma.project.groupBy({
            by: ["status"],
            where,
            _count: {
                id: true,
            },
        })

        // Task status distribution
        const taskStatusData = await prisma.task.groupBy({
            by: ["status"],
            where: taskWhere,
            _count: {
                id: true,
            },
        })

        return {
            success: true,
            data: {
                projects: {
                    total: totalProjects,
                    active: activeProjects,
                    completed: completedProjects,
                    onHold: onHoldProjects,
                    statusDistribution: projectStatusData.map((item) => ({
                        status: item.status,
                        count: item._count.id,
                    })),
                },
                tasks: {
                    total: totalTasks,
                    open: openTasks,
                    completed: completedTasks,
                    blocked: blockedTasks,
                    overdue: overdueTasks,
                    statusDistribution: taskStatusData.map((item) => ({
                        status: item.status,
                        count: item._count.id,
                    })),
                },
                todaysTasks: {
                    total: todaysTasksTotal,
                    completed: todaysTasksCompleted,
                    completionRate: todaysCompletionRate,
                },
                weeklyTrend: weeklyData,
            },
        }
    } catch (error: any) {
        console.error("Error fetching overview reports:", error)
        return {
            error: error.message || "Failed to fetch overview reports",
        }
    }
}

// Project Reports
export async function getProjectReports(params: {
    projectId?: number
    category?: string[]
    status?: string[]
    startDate?: Date
    endDate?: Date
    projectManagerId?: number
}) {
    const session = await getServerSession(authOptions)
    if (!session) return { error: "Unauthorized" }

    const { projectId, category, status, startDate, endDate, projectManagerId } = params

    try {
        const where: any = {}

        if (projectId) {
            where.id = projectId
        }

        if (category && category.length > 0) {
            where.type = { in: category }
        }

        if (status && status.length > 0) {
            where.status = { in: status }
        }

        if (startDate || endDate) {
            where.createdAt = {}
            if (startDate) where.createdAt.gte = startDate
            if (endDate) where.createdAt.lte = endDate
        }

        if (projectManagerId) {
            where.projectManagerId = projectManagerId
        }

        // Role-based filtering
        if (session.user.role !== "admin") {
            where.OR = [
                { projectManagerId: parseInt(session.user.id) },
                { createdById: parseInt(session.user.id) },
            ]
        }

        const projects = await prisma.project.findMany({
            where,
            include: {
                tasks: {
                    select: {
                        id: true,
                        status: true,
                        dueDate: true,
                        dependencies: {
                            select: {
                                dependsOnTask: {
                                    select: {
                                        status: true,
                                    },
                                },
                            },
                        },
                    },
                },
                projectManager: {
                    select: {
                        id: true,
                        username: true,
                    },
                },
            },
        })

        const reports = projects.map((project) => {
            const tasks = project.tasks || []
            const total = tasks.length
            const completed = tasks.filter((t) => t.status === "completed").length
            const progress = total > 0 ? Math.round((completed / total) * 100) : 0

            // Blocked time calculation
            const blockedTasks = tasks.filter((task) => {
                if (task.status === "waiting") return true
                return task.dependencies.some(
                    (dep) => dep.dependsOnTask.status !== "completed"
                )
            })

            // Overdue tasks
            const overdue = tasks.filter(
                (task) =>
                    task.dueDate &&
                    new Date(task.dueDate) < new Date() &&
                    task.status !== "completed"
            )

            return {
                id: project.id,
                name: project.name,
                status: project.status,
                type: project.type,
                progress,
                totalTasks: total,
                completedTasks: completed,
                blockedTasks: blockedTasks.length,
                overdueTasks: overdue.length,
                projectManager: project.projectManager?.username || "Unassigned",
                startDate: project.startDate,
                endDate: project.endDate,
            }
        })

        return {
            success: true,
            data: reports,
        }
    } catch (error: any) {
        console.error("Error fetching project reports:", error)
        return {
            error: error.message || "Failed to fetch project reports",
        }
    }
}

// Task Reports
export async function getTaskReports(params: {
    projectId?: number[]
    assigneeId?: number
    status?: string[]
    priority?: string[]
    dependencyState?: string
    startDate?: Date
    endDate?: Date
}) {
    const session = await getServerSession(authOptions)
    if (!session) return { error: "Unauthorized" }

    const {
        projectId,
        assigneeId,
        status,
        priority,
        dependencyState,
        startDate,
        endDate,
    } = params

    try {
        const where: any = {}

        if (projectId && projectId.length > 0) {
            where.projectId = { in: projectId }
        }

        if (assigneeId) {
            where.assignees = { some: { id: assigneeId } }
        }

        if (status && status.length > 0) {
            where.status = { in: status }
        }

        if (priority && priority.length > 0) {
            where.priority = { in: priority }
        }

        if (dependencyState && dependencyState !== "all") {
            if (dependencyState === "blocked") {
                where.OR = [
                    { status: "waiting" },
                    {
                        dependencies: {
                            some: {
                                dependsOnTask: {
                                    status: { not: "completed" },
                                },
                            },
                        },
                    },
                ]
            } else if (dependencyState === "free") {
                where.dependencies = { none: {} }
                where.status = { not: "waiting" }
            } else if (dependencyState === "blocking") {
                where.dependents = { some: {} }
            }
        }

        if (startDate || endDate) {
            where.createdAt = {}
            if (startDate) where.createdAt.gte = startDate
            if (endDate) where.createdAt.lte = endDate
        }

        // Role-based filtering
        if (session.user.role !== "admin") {
            const userConditions = [
                { assignees: { some: { id: parseInt(session.user.id) } } },
                { createdById: parseInt(session.user.id) },
            ]

            if (where.OR) {
                where.AND = [...(where.AND || []), { OR: [...where.OR, ...userConditions] }]
                delete where.OR
            } else {
                where.OR = userConditions
            }
        }

        const tasks = await prisma.task.findMany({
            where,
            include: {
                project: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                assignees: {
                    select: {
                        id: true,
                        username: true,
                    },
                },
                dependencies: {
                    include: {
                        dependsOnTask: {
                            select: {
                                status: true,
                            },
                        },
                    },
                },
            },
        })

        // Analytics
        const total = tasks.length
        const byStatus = tasks.reduce((acc: any, task) => {
            acc[task.status] = (acc[task.status] || 0) + 1
            return acc
        }, {})

        const byPriority = tasks.reduce((acc: any, task) => {
            acc[task.priority] = (acc[task.priority] || 0) + 1
            return acc
        }, {})

        const completed = tasks.filter((t) => t.status === "completed").length
        const overdue = tasks.filter(
            (t) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "completed"
        ).length

        // Average completion time (for completed tasks)
        const completedTasks = tasks.filter((t) => t.status === "completed" && t.updatedAt)
        const avgCompletionTime =
            completedTasks.length > 0
                ? completedTasks.reduce((sum, task) => {
                      const created = new Date(task.createdAt).getTime()
                      const updated = new Date(task.updatedAt).getTime()
                      return sum + (updated - created)
                  }, 0) / completedTasks.length
                : 0

        // Dependency impact
        const blockedByDependencies = tasks.filter((task) => {
            if (task.status === "waiting") return true
            return task.dependencies.some(
                (dep) => dep.dependsOnTask.status !== "completed"
            )
        }).length

        return {
            success: true,
            data: {
                total,
                completed,
                overdue,
                blockedByDependencies,
                averageCompletionTime: avgCompletionTime,
                byStatus: Object.entries(byStatus).map(([status, count]) => ({
                    status,
                    count,
                })),
                byPriority: Object.entries(byPriority).map(([priority, count]) => ({
                    priority,
                    count,
                })),
                tasks: tasks.slice(0, 100), // Limit for performance
            },
        }
    } catch (error: any) {
        console.error("Error fetching task reports:", error)
        return {
            error: error.message || "Failed to fetch task reports",
        }
    }
}

// Today's Reports
export async function getTodaysReports(params: {
    date?: Date
    userId?: number
    projectId?: number
}) {
    const session = await getServerSession(authOptions)
    if (!session) return { error: "Unauthorized" }

    const { date = new Date(), userId, projectId } = params
    const dayStart = startOfDay(date)
    const dayEnd = endOfDay(date)

    try {
        const where: any = {
            plannedDate: {
                gte: dayStart,
                lte: dayEnd,
            },
        }

        if (userId) {
            where.assignees = { some: { id: userId } }
        } else if (session.user.role !== "admin") {
            where.assignees = { some: { id: parseInt(session.user.id) } }
        }

        if (projectId) {
            where.projectId = projectId
        }

        const tasks = await prisma.task.findMany({
            where,
            include: {
                project: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                assignees: {
                    select: {
                        id: true,
                        username: true,
                    },
                },
            },
        })

        const total = tasks.length
        const completed = tasks.filter((t) => t.status === "completed").length
        const incomplete = total - completed
        const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0

        // Group by user
        const byUser = tasks.reduce((acc: any, task) => {
            task.assignees.forEach((assignee) => {
                if (!acc[assignee.id]) {
                    acc[assignee.id] = {
                        userId: assignee.id,
                        username: assignee.username,
                        total: 0,
                        completed: 0,
                    }
                }
                acc[assignee.id].total++
                if (task.status === "completed") {
                    acc[assignee.id].completed++
                }
            })
            return acc
        }, {})

        return {
            success: true,
            data: {
                date: date.toISOString().split("T")[0],
                total,
                completed,
                incomplete,
                completionRate,
                byUser: Object.values(byUser),
                tasks: tasks.map((task) => ({
                    id: task.id,
                    title: task.title,
                    status: task.status,
                    priority: task.priority,
                    project: task.project.name,
                    assignees: task.assignees.map((a) => a.username),
                })),
            },
        }
    } catch (error: any) {
        console.error("Error fetching today's reports:", error)
        return {
            error: error.message || "Failed to fetch today's reports",
        }
    }
}

// Team & User Reports
export async function getTeamUserReports(params: {
    teamId?: number
    userId?: number
    projectId?: number
    startDate?: Date
    endDate?: Date
}) {
    const session = await getServerSession(authOptions)
    if (!session) return { error: "Unauthorized" }

    if (session.user.role !== "admin") {
        return { error: "Unauthorized: Admin access required" }
    }

    const { teamId, userId, projectId, startDate, endDate } = params

    try {
        const taskWhere: any = {}

        if (projectId) {
            taskWhere.projectId = projectId
        }

        if (startDate || endDate) {
            taskWhere.createdAt = {}
            if (startDate) taskWhere.createdAt.gte = startDate
            if (endDate) taskWhere.createdAt.lte = endDate
        }

        if (userId) {
            taskWhere.assignees = { some: { id: userId } }
        } else if (teamId) {
            taskWhere.teamId = teamId
        }

        const tasks = await prisma.task.findMany({
            where: taskWhere,
            include: {
                assignees: {
                    select: {
                        id: true,
                        username: true,
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

        // Group by user
        const userStats: Record<
            number,
            {
                userId: number
                username: string
                total: number
                completed: number
                overdue: number
                blocked: number
            }
        > = {}

        tasks.forEach((task) => {
            task.assignees.forEach((assignee) => {
                if (!userStats[assignee.id]) {
                    userStats[assignee.id] = {
                        userId: assignee.id,
                        username: assignee.username,
                        total: 0,
                        completed: 0,
                        overdue: 0,
                        blocked: 0,
                    }
                }

                userStats[assignee.id].total++
                if (task.status === "completed") {
                    userStats[assignee.id].completed++
                }
                if (
                    task.dueDate &&
                    new Date(task.dueDate) < new Date() &&
                    task.status !== "completed"
                ) {
                    userStats[assignee.id].overdue++
                }
                if (task.status === "waiting") {
                    userStats[assignee.id].blocked++
                }
            })
        })

        return {
            success: true,
            data: {
                users: Object.values(userStats).map((user) => ({
                    ...user,
                    completionRate:
                        user.total > 0 ? Math.round((user.completed / user.total) * 100) : 0,
                    overdueRate:
                        user.total > 0 ? Math.round((user.overdue / user.total) * 100) : 0,
                })),
            },
        }
    } catch (error: any) {
        console.error("Error fetching team/user reports:", error)
        return {
            error: error.message || "Failed to fetch team/user reports",
        }
    }
}

// Activity Reports
export async function getActivityReports(params: {
    userId?: number
    actionType?: string
    entityType?: string
    startDate?: Date
    endDate?: Date
    page?: number
    limit?: number
}) {
    const session = await getServerSession(authOptions)
    if (!session) return { error: "Unauthorized" }

    if (session.user.role !== "admin") {
        return { error: "Unauthorized: Admin access required" }
    }

    const {
        userId,
        actionType,
        entityType,
        startDate,
        endDate,
        page = 1,
        limit = 50,
    } = params

    try {
        const where: any = {}

        if (userId) {
            where.performedById = userId
        }

        if (actionType) {
            where.actionType = actionType
        }

        if (entityType) {
            where.entityType = entityType
        }

        if (startDate || endDate) {
            where.createdAt = {}
            if (startDate) where.createdAt.gte = startDate
            if (endDate) where.createdAt.lte = endDate
        }

        const skip = (page - 1) * limit

        const [logs, total] = await Promise.all([
            prisma.activityLog.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: "desc" },
                include: {
                    performedBy: {
                        select: {
                            id: true,
                            username: true,
                            email: true,
                        },
                    },
                },
            }),
            prisma.activityLog.count({ where }),
        ])

        // Group by action type
        const byActionType = await prisma.activityLog.groupBy({
            by: ["actionType"],
            where,
            _count: {
                id: true,
            },
        })

        return {
            success: true,
            data: {
                logs,
                total,
                page,
                limit,
                byActionType: byActionType.map((item) => ({
                    actionType: item.actionType,
                    count: item._count.id,
                })),
            },
        }
    } catch (error: any) {
        console.error("Error fetching activity reports:", error)
        return {
            error: error.message || "Failed to fetch activity reports",
        }
    }
}

