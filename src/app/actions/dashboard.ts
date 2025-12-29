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

        // Projects Statistics
        const projectsWhere = isAdmin ? {} : {
            OR: [
                { projectManagerId: userId },
                { createdById: userId },
                { projectUsers: { some: { userId } } }
            ]
        }

        const [
            totalProjects,
            activeProjects,
            onHoldProjects,
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

            // Active Projects
            prisma.project.count({
                where: {
                    ...projectsWhere,
                    status: "active"
                }
            }),

            // On Hold Projects
            prisma.project.count({
                where: {
                    ...projectsWhere,
                    status: "on_hold"
                }
            }),

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

            // Blocked Tasks
            prisma.task.count({
                where: {
                    status: "waiting",
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

            // Overdue Tasks
            prisma.task.count({
                where: {
                    dueDate: { lt: new Date() },
                    status: { not: "completed" },
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

            // Today's Tasks
            prisma.task.count({
                where: {
                    assignees: { some: { id: userId } },
                    plannedDate: {
                        gte: todayStart,
                        lte: todayEnd
                    },
                    status: { not: "completed" }
                }
            }),

            // Completed Today
            prisma.task.count({
                where: {
                    assignees: { some: { id: userId } },
                    updatedAt: {
                        gte: todayStart,
                        lte: todayEnd
                    },
                    status: "completed"
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
                active: activeProjects,
                onHold: onHoldProjects
            },
            tasks: {
                total: totalTasks,
                myTasks: myTasks,
                blocked: blockedTasks,
                overdue: overdueTasks
            },
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

