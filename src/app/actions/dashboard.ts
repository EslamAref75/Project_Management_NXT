"use server"

import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { startOfDay, endOfDay } from "date-fns"

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

        // Count projects by status
        const projectStatusCounts: Record<number, number> = {}
        if (projectStatuses.length > 0) {
            for (const status of projectStatuses) {
                const count = await prisma.project.count({
                    where: {
                        ...projectsWhere,
                        projectStatusId: status.id
                    }
                })
                projectStatusCounts[status.id] = count
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

        // Count tasks by status
        const taskStatusCounts: Record<number, number> = {}
        const tasksWhere = isAdmin ? {} : {
            project: {
                OR: [
                    { projectManagerId: userId },
                    { createdById: userId },
                    { projectUsers: { some: { userId } } }
                ]
            }
        }
        
        if (taskStatuses.length > 0) {
            for (const status of taskStatuses) {
                const count = await prisma.task.count({
                    where: {
                        ...tasksWhere,
                        taskStatusId: status.id
                    }
                })
                taskStatusCounts[status.id] = count
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
                include: {
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

        return {
            success: true,
            projects: {
                total: totalProjects,
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
                myTasks: myTasks,
                blocked: blockedTasks,
                overdue: overdueTasks,
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
                completed: completedToday
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

