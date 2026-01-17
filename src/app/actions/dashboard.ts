"use server"

import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { startOfDay, endOfDay } from "date-fns"
import { getStatTrend, StatTrend } from "@/lib/stats"

export async function getDashboardSummary() {
    const session = await getServerSession(authOptions)
    if (!session) return { error: "Unauthorized" }

    const userId = parseInt(session.user.id)
    const userRole = session.user.role || "developer"
    const isAdmin = userRole === "admin"
    const isPM = userRole === "project_manager" || userRole === "admin"

    try {
        const todayStart = startOfDay(new Date())
        const todayEnd = endOfDay(new Date())

        // Fetch active project statuses and task statuses
        const [projectStatusesResult, taskStatusesResult] = await Promise.all([
            prisma.projectStatus?.findMany({
                where: { isActive: true },
                orderBy: { orderIndex: "asc" },
                select: { id: true, name: true, color: true }
            }).catch(() => []),
            prisma.taskStatus?.findMany({
                where: { isActive: true },
                orderBy: { orderIndex: "asc" },
                select: { id: true, name: true, color: true, isBlocking: true, isFinal: true }
            }).catch(() => [])
        ])

        const projectStatuses = projectStatusesResult || []
        const taskStatuses = taskStatusesResult || []

        // Find blocking task status (for blocked tasks count)
        const blockingTaskStatus = taskStatuses.find(ts => ts.isBlocking)
        const blockingTaskStatusId = blockingTaskStatus?.id

        // Find final task status (for completed tasks)
        const finalTaskStatus = taskStatuses.find(ts => ts.isFinal)
        const finalTaskStatusId = finalTaskStatus?.id

        // Projects Statistics
        const projectsWhere = isAdmin ? {} : {
            OR: [
                { projectManagerId: userId },
                { createdById: userId },
                { projectUsers: { some: { userId } } }
            ]
        }

        // Count projects by status - OPTIMIZED: Use aggregation instead of N+1 queries
        const projectStatusCounts: Record<number, number> = {}
        if (projectStatuses.length > 0) {
            const projectCounts = await prisma.project.groupBy({
                by: ['projectStatusId'],
                where: {
                    ...projectsWhere,
                    projectStatusId: { in: projectStatuses.map(s => s.id) }
                },
                _count: {
                    id: true
                }
            })
            
            for (const result of projectCounts) {
                if (result.projectStatusId) {
                    projectStatusCounts[result.projectStatusId] = result._count.id
                }
            }
        }

        // Also count by legacy status for backward compatibility
        const legacyActiveCount = await prisma.project.count({
            where: {
                ...projectsWhere,
                status: "active",
                projectStatusId: null
            }
        })
        const legacyOnHoldCount = await prisma.project.count({
            where: {
                ...projectsWhere,
                status: "on_hold",
                projectStatusId: null
            }
        })

        // Count tasks by status - OPTIMIZED: Use aggregation instead of N+1 queries
        const tasksWhere = isAdmin ? {} : {
            project: {
                OR: [
                    { projectManagerId: userId },
                    { createdById: userId },
                    { projectUsers: { some: { userId } } }
                ]
            }
        }
        
        const taskStatusCounts: Record<number, number> = {}
        if (taskStatuses.length > 0) {
            const taskCounts = await prisma.task.groupBy({
                by: ['taskStatusId'],
                where: {
                    ...tasksWhere,
                    taskStatusId: { in: taskStatuses.map(s => s.id) }
                },
                _count: {
                    id: true
                }
            })
            
            for (const result of taskCounts) {
                if (result.taskStatusId) {
                    taskStatusCounts[result.taskStatusId] = result._count.id
                }
            }
        }

        const [
            totalProjects,
            totalTasks,
            myTasks,
            blockedTasks,
            overdueTasks,
            todaysTasks,
            completedToday,
            recentActivities
        ] = await Promise.all([
            // Total Projects
            prisma.project.count({ where: projectsWhere }),

            // Total Tasks
            prisma.task.count({
                where: isAdmin ? {} : {
                    project: {
                        OR: [
                            { projectManagerId: userId },
                            { createdById: userId },
                            { projectUsers: { some: { userId } } }
                        ]
                    }
                }
            }),

            // My Tasks
            prisma.task.count({
                where: {
                    assignees: { some: { id: userId } }
                }
            }),

            // Blocked Tasks (using blocking status or legacy "waiting")
            prisma.task.count({
                where: {
                    OR: (() => {
                        const conditions: any[] = []
                        if (blockingTaskStatusId) {
                            conditions.push({ taskStatusId: blockingTaskStatusId })
                        }
                        conditions.push({ status: "waiting", taskStatusId: null })
                        return conditions
                    })(),
                    ...(isAdmin ? {} : {
                        project: {
                            OR: [
                                { projectManagerId: userId },
                                { createdById: userId },
                                { projectUsers: { some: { userId } } }
                            ]
                        }
                    })
                }
            }),

            // Overdue Tasks (not in final status)
            prisma.task.count({
                where: {
                    dueDate: { lt: new Date() },
                    OR: (() => {
                        const conditions: any[] = []
                        if (finalTaskStatusId) {
                            conditions.push({ taskStatusId: { not: finalTaskStatusId } })
                        }
                        conditions.push({ status: { not: "completed" }, taskStatusId: null })
                        return conditions
                    })(),
                    ...(isAdmin ? {} : {
                        OR: [
                            { assignees: { some: { id: userId } } },
                            {
                                project: {
                                    OR: [
                                        { projectManagerId: userId },
                                        { createdById: userId }
                                    ]
                                }
                            }
                        ]
                    })
                }
            }),

            // Today's Tasks (not in final status)
            prisma.task.count({
                where: {
                    assignees: { some: { id: userId } },
                    plannedDate: {
                        gte: todayStart,
                        lte: todayEnd
                    },
                    OR: (() => {
                        const conditions: any[] = []
                        if (finalTaskStatusId) {
                            conditions.push({ taskStatusId: { not: finalTaskStatusId } })
                        }
                        conditions.push({ status: { not: "completed" }, taskStatusId: null })
                        return conditions
                    })()
                }
            }),

            // Completed Today (using final status or legacy "completed")
            prisma.task.count({
                where: {
                    assignees: { some: { id: userId } },
                    updatedAt: {
                        gte: todayStart,
                        lte: todayEnd
                    },
                    OR: (() => {
                        const conditions: any[] = []
                        if (finalTaskStatusId) {
                            conditions.push({ taskStatusId: finalTaskStatusId })
                        }
                        conditions.push({ status: "completed", taskStatusId: null })
                        return conditions
                    })()
                }
            }),

            // Recent Activities (last 10)
            prisma.activityLog.findMany({
                where: isAdmin ? {} : {
                    OR: [
                        { performedById: userId },
                        { affectedUserId: userId },
                        {
                            project: {
                                OR: [
                                    { projectManagerId: userId },
                                    { createdById: userId },
                                    { projectUsers: { some: { userId } } }
                                ]
                            }
                        }
                    ]
                },
                select: {
                    id: true,
                    actionType: true,
                    actionSummary: true,
                    actionDetails: true,
                    createdAt: true,
                    performedById: true,
                    projectId: true,
                    performedBy: {
                        select: {
                            id: true,
                            username: true,
                            avatarUrl: true
                        }
                    },
                    project: {
                        select: {
                            id: true,
                            name: true
                        }
                    }
                },
                orderBy: { createdAt: "desc" },
                take: 10
            })
        ])

        // Calculate Trends
        // Admin gets global trends, Users get their dashboard trends
        const entityType = isAdmin ? "global" : "user_dashboard"
        const entityId = isAdmin ? null : userId

        // For negative metrics (overdue, blocked), Up is Red. This logic is handled in UI usually,
        // but the trend calculation itself (Up/Down) is agnostic.
        // We just return direction.

        const [
            totalProjectsTrend,
            totalTasksTrend,
            myTasksTrend,
            blockedTasksTrend,
            overdueTasksTrend,
            todaysTasksTrend,
            completedTodayTrend
        ] = await Promise.all([
            getStatTrend(entityType, entityId, "total_projects", totalProjects),
            getStatTrend(entityType, entityId, "total_tasks", totalTasks),
            getStatTrend("user_dashboard", userId, "my_tasks", myTasks), // My Tasks is always user scoped
            getStatTrend(entityType, entityId, "blocked_tasks", blockedTasks),
            getStatTrend(entityType, entityId, "overdue_tasks", overdueTasks),
            getStatTrend("user_dashboard", userId, "todays_tasks_total", todaysTasks),
            getStatTrend("user_dashboard", userId, "todays_tasks_completed", completedToday)
        ])

        return {
            success: true,
            projects: {
                total: totalProjects,
                trend: totalProjectsTrend,
                statusCounts: projectStatusCounts,
                legacyActive: legacyActiveCount,
                legacyOnHold: legacyOnHoldCount
            },
            projectStatuses: projectStatuses.map(ps => ({
                id: ps.id,
                name: ps.name,
                color: ps.color
            })),
            tasks: {
                total: totalTasks,
                trend: totalTasksTrend,
                myTasks: myTasks,
                myTasksTrend: myTasksTrend,
                blocked: blockedTasks,
                blockedTrend: blockedTasksTrend,
                overdue: overdueTasks,
                overdueTrend: overdueTasksTrend,
                statusCounts: taskStatusCounts
            },
            taskStatuses: taskStatuses.map(ts => ({
                id: ts.id,
                name: ts.name,
                color: ts.color,
                isBlocking: ts.isBlocking,
                isFinal: ts.isFinal
            })),
            todayTasks: {
                total: todaysTasks,
                totalTrend: todaysTasksTrend,
                completed: completedToday,
                completedTrend: completedTodayTrend
            },
            recentActivities
        }
    } catch (error: any) {
        console.error("Error fetching dashboard summary:", error)
        return { error: "Failed to fetch dashboard data", details: error.message }
    }
}

export async function getTodaysFocusTasks() {
    const session = await getServerSession(authOptions)
    if (!session) return { error: "Unauthorized" }

    const userId = parseInt(session.user.id)
    const todayStart = startOfDay(new Date())
    const todayEnd = endOfDay(new Date())

    try {
        const tasks = await prisma.task.findMany({
            where: {
                assignees: { some: { id: userId } },
                plannedDate: {
                    gte: todayStart,
                    lte: todayEnd
                }
            },
            include: {
                project: {
                    select: {
                        id: true,
                        name: true
                    }
                },
                assignees: {
                    select: {
                        id: true,
                        username: true,
                        avatarUrl: true
                    }
                },
                dependencies: {
                    include: {
                        dependsOnTask: {
                            select: {
                                id: true,
                                status: true,
                                title: true
                            }
                        }
                    }
                }
            },
            orderBy: [
                { priority: "desc" },
                { createdAt: "asc" }
            ]
        })

        return { success: true, tasks }
    } catch (error: any) {
        console.error("Error fetching today's focus tasks:", error)
        return { error: "Failed to fetch today's tasks", details: error.message }
    }
}

