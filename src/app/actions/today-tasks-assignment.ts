"use server"

import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { startOfDay, endOfDay } from "date-fns"
import { createProjectNotification } from "./project-notifications"
import { hasPermissionWithoutRoleBypass } from "@/lib/rbac-helpers"

// Check if user has assignment privileges
async function checkAdminOrManager() {
    const session = await getServerSession(authOptions)
    if (!session) return { authorized: false, session: null }
    
    const hasPermission = await hasPermissionWithoutRoleBypass(
        parseInt(session.user.id),
        "task.assign"
    )
    return { authorized: hasPermission, session }
}

// Get all users with their project counts for the assignment panel
export async function getUsersForAssignment() {
    const { authorized, session } = await checkAdminOrManager()
    if (!authorized || !session) {
        return { error: "Unauthorized: Only admins and project managers can access this panel" }
    }

    try {
        const users = await prisma.user.findMany({
            where: { isActive: true },
            include: {
                team: {
                    select: { id: true, name: true }
                },
                assignedTasks: {
                    select: { projectId: true },
                    distinct: ["projectId"]
                }
            },
            orderBy: { username: "asc" }
        })

        const usersWithProjectCount = users.map(user => ({
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            avatarUrl: user.avatarUrl,
            team: user.team,
            activeProjectsCount: user.assignedTasks.length
        }))

        return { success: true, users: usersWithProjectCount }
    } catch (e: any) {
        console.error("getUsersForAssignment Error:", e)
        return { error: "Failed to fetch users", details: e.message }
    }
}

// Get all tasks for a user in a specific project (available for assignment)
export async function getUserProjectTasks(userId: number, projectId: number, date?: Date) {
    const { authorized, session } = await checkAdminOrManager()
    if (!authorized || !session) {
        return { error: "Unauthorized" }
    }

    try {
        const targetDate = date || new Date()
        const dateStart = startOfDay(targetDate)
        const dateEnd = endOfDay(targetDate)

        // Get all tasks assigned to user in this project
        const tasks = await prisma.task.findMany({
            where: {
                projectId,
                assignees: { some: { id: userId } },
                status: { not: "completed" }
            },
            include: {
                project: { select: { id: true, name: true } },
                dependencies: {
                    include: {
                        dependsOnTask: {
                            select: {
                                id: true,
                                title: true,
                                status: true
                            }
                        }
                    }
                },
                assignees: {
                    select: { id: true, username: true }
                }
            },
            orderBy: { updatedAt: "desc" }
        })

        // Separate tasks into available and today's tasks
        const availableTasks = tasks.filter(task => {
            if (!task.plannedDate) return true // Tasks without plannedDate are available
            const taskDate = new Date(task.plannedDate)
            const isTodayTask = taskDate >= dateStart && taskDate <= dateEnd
            return !isTodayTask
        })

        const todayTasks = tasks.filter(task => {
            if (!task.plannedDate) return false // Tasks without plannedDate are not today's tasks
            const taskDate = new Date(task.plannedDate)
            const isTodayTask = taskDate >= dateStart && taskDate <= dateEnd
            return isTodayTask
        })

        // Check dependencies for each task
        const tasksWithDependencyStatus = tasks.map(task => {
            const incompleteDependencies = task.dependencies.filter(
                dep => dep.dependsOnTask.status !== "completed"
            )
            return {
                ...task,
                isBlocked: incompleteDependencies.length > 0,
                blockingDependencies: incompleteDependencies.map(dep => ({
                    id: dep.dependsOnTask.id,
                    title: dep.dependsOnTask.title,
                    status: dep.dependsOnTask.status
                }))
            }
        })

        return {
            success: true,
            availableTasks: tasksWithDependencyStatus.filter(t => 
                availableTasks.some(at => at.id === t.id)
            ),
            todayTasks: tasksWithDependencyStatus.filter(t => 
                todayTasks.some(tt => tt.id === t.id)
            )
        }
    } catch (e: any) {
        console.error("getUserProjectTasks Error:", e)
        return { error: "Failed to fetch tasks", details: e.message }
    }
}

// Assign a task to today's focus for a user
export async function assignTodayTask(userId: number, taskId: number, date?: Date) {
    const { authorized, session } = await checkAdminOrManager()
    if (!authorized || !session) {
        return { error: "Unauthorized" }
    }

    try {
        // Verify task is assigned to the user
        const task = await prisma.task.findFirst({
            where: {
                id: taskId,
                assignees: { some: { id: userId } }
            }
        })

        if (!task) {
            return { error: "Task not found or not assigned to this user" }
        }

        const targetDate = date || new Date()
        const dateStart = startOfDay(targetDate)
        const dateEnd = endOfDay(targetDate)

        // Check if task is already in today's tasks for the selected date
        const existingTodayTask = await prisma.task.findFirst({
            where: {
                id: taskId,
                plannedDate: {
                    gte: dateStart,
                    lte: dateEnd
                }
            }
        })

        if (existingTodayTask) {
            return { error: "Task is already assigned to this date's focus" }
        }

        // Get task with project info
        const taskWithProject = await prisma.task.findUnique({
            where: { id: taskId },
            include: {
                project: {
                    select: { id: true }
                }
            }
        })

        // Set plannedDate to the selected date
        await prisma.task.update({
            where: { id: taskId },
            data: { plannedDate: targetDate }
        })

        // Create project notification for Today's Task assignment
        if (taskWithProject) {
            await createProjectNotification(
                taskWithProject.project.id,
                userId,
                {
                    type: "today_task",
                    entityType: "task",
                    entityId: taskId,
                    title: "Today's Task Assigned",
                    message: `Task "${task.title}" has been added to your Today's Tasks`,
                    soundRequired: false
                }
            )
        }

        // Log activity
        try {
            await prisma.activityLog.create({
                data: {
                    userId: parseInt(session.user.id),
                    action: "assign_today_task",
                    description: `Assigned task "${task.title}" to user ${userId} for today`,
                    entityType: "task",
                    entityId: taskId
                }
            })
        } catch (logError) {
            console.error("Failed to log activity:", logError)
            // Don't fail the operation if logging fails
        }

        revalidatePath("/dashboard/today-tasks-assignment")
        revalidatePath(`/dashboard/focus`)
        return { success: true }
    } catch (e: any) {
        console.error("assignTodayTask Error:", e)
        return { error: "Failed to assign task", details: e.message }
    }
}

// Remove a task from today's focus for a user
export async function removeTodayTask(userId: number, taskId: number) {
    const { authorized, session } = await checkAdminOrManager()
    if (!authorized || !session) {
        return { error: "Unauthorized" }
    }

    try {
        // Verify task is assigned to the user
        const task = await prisma.task.findFirst({
            where: {
                id: taskId,
                assignees: { some: { id: userId } }
            }
        })

        if (!task) {
            return { error: "Task not found or not assigned to this user" }
        }

        // Get task with project info
        const taskWithProject = await prisma.task.findUnique({
            where: { id: taskId },
            include: {
                project: {
                    select: { id: true }
                }
            }
        })

        // Clear plannedDate
        await prisma.task.update({
            where: { id: taskId },
            data: { plannedDate: null }
        })

        // Create project notification for Today's Task removal
        if (taskWithProject) {
            await createProjectNotification(
                taskWithProject.project.id,
                userId,
                {
                    type: "today_task",
                    entityType: "task",
                    entityId: taskId,
                    title: "Today's Task Removed",
                    message: `Task "${task.title}" has been removed from your Today's Tasks`,
                    soundRequired: false
                }
            )
        }

        // Log activity
        try {
            await prisma.activityLog.create({
                data: {
                    userId: parseInt(session.user.id),
                    action: "remove_today_task",
                    description: `Removed task "${task.title}" from user ${userId}'s today's focus`,
                    entityType: "task",
                    entityId: taskId
                }
            })
        } catch (logError) {
            console.error("Failed to log activity:", logError)
            // Don't fail the operation if logging fails
        }

        revalidatePath("/dashboard/today-tasks-assignment")
        revalidatePath(`/dashboard/focus`)
        return { success: true }
    } catch (e: any) {
        console.error("removeTodayTask Error:", e)
        return { error: "Failed to remove task", details: e.message }
    }
}

// Get projects for a user (for the project filter)
export async function getUserProjects(userId: number) {
    const { authorized, session } = await checkAdminOrManager()
    if (!authorized || !session) {
        return { error: "Unauthorized" }
    }

    try {
        const projects = await prisma.project.findMany({
            where: {
                tasks: {
                    some: {
                        assignees: { some: { id: userId } }
                    }
                }
            },
            select: {
                id: true,
                name: true
            },
            orderBy: { name: "asc" }
        })

        return { success: true, projects }
    } catch (e: any) {
        console.error("getUserProjects Error:", e)
        return { error: "Failed to fetch projects", details: e.message }
    }
}

// Get task counts for all users (for the management page)
export async function getUsersTaskCounts(date?: Date) {
    const { authorized, session } = await checkAdminOrManager()
    if (!authorized || !session) {
        return { error: "Unauthorized" }
    }

    try {
        const targetDate = date || new Date()
        const dateStart = startOfDay(targetDate)
        const dateEnd = endOfDay(targetDate)

        const users = await prisma.user.findMany({
            where: { isActive: true },
            select: {
                id: true,
                assignedTasks: {
                    select: {
                        id: true,
                        projectId: true,
                        plannedDate: true,
                        status: true
                    }
                }
            }
        })

        const counts: Record<number, { today: number; total: number }> = {}

        users.forEach(user => {
            const todayTasks = user.assignedTasks.filter(task => {
                if (!task.plannedDate) return false
                const taskDate = new Date(task.plannedDate)
                return taskDate >= dateStart && taskDate <= dateEnd && task.status !== "completed"
            })

            const totalTasks = user.assignedTasks.filter(task => task.status !== "completed")

            counts[user.id] = {
                today: todayTasks.length,
                total: totalTasks.length
            }
        })

        return { success: true, counts }
    } catch (e: any) {
        console.error("getUsersTaskCounts Error:", e)
        return { error: "Failed to fetch task counts", details: e.message }
    }
}

// Get projects with tasks assigned to users for a specific date
export async function getProjectsWithUserTasks(date?: Date) {
    const { authorized, session } = await checkAdminOrManager()
    if (!authorized || !session) {
        return { error: "Unauthorized" }
    }

    try {
        const targetDate = date || new Date()
        const dateStart = startOfDay(targetDate)
        const dateEnd = endOfDay(targetDate)

        const projects = await prisma.project.findMany({
            where: {
                tasks: {
                    some: {
                        assignees: { some: { id: { not: undefined } } },
                        status: { not: "completed" }
                    }
                }
            },
            include: {
                tasks: {
                    where: {
                        assignees: { some: { id: { not: undefined } } },
                        status: { not: "completed" }
                    },
                    include: {
                        assignees: {
                            select: {
                                id: true,
                                username: true,
                                email: true
                            }
                        },
                        dependencies: {
                            include: {
                                dependsOnTask: {
                                    select: {
                                        id: true,
                                        title: true,
                                        status: true
                                    }
                                }
                            }
                        }
                    },
                    orderBy: { updatedAt: "desc" }
                }
            },
            orderBy: { name: "asc" }
        })

        // Process projects and tasks
        const projectsWithTasks = projects.map(project => {
            const todayTasks = project.tasks.filter(task => {
                if (!task.plannedDate) return false
                const taskDate = new Date(task.plannedDate)
                return taskDate >= dateStart && taskDate <= dateEnd
            })

            const allTasks = project.tasks.map(task => {
                const incompleteDependencies = task.dependencies.filter(
                    dep => dep.dependsOnTask.status !== "completed"
                )
                return {
                    ...task,
                    isBlocked: incompleteDependencies.length > 0,
                    blockingDependencies: incompleteDependencies.map(dep => ({
                        id: dep.dependsOnTask.id,
                        title: dep.dependsOnTask.title,
                        status: dep.dependsOnTask.status
                    }))
                }
            })

            return {
                id: project.id,
                name: project.name,
                status: project.status,
                todayTasks: todayTasks.map(t => {
                    const taskData = allTasks.find(at => at.id === t.id)
                    return {
                        id: t.id,
                        title: t.title,
                        status: t.status,
                        priority: t.priority,
                        assignees: t.assignees,
                        isBlocked: taskData?.isBlocked || false,
                        blockingDependencies: taskData?.blockingDependencies || []
                    }
                }),
                allTasks: allTasks
            }
        })

        return { success: true, projects: projectsWithTasks }
    } catch (e: any) {
        console.error("getProjectsWithUserTasks Error:", e)
        return { error: "Failed to fetch projects", details: e.message }
    }
}
