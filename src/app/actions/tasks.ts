"use server"

import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { z } from "zod"
import { revalidatePath } from "next/cache"
import { createProjectNotification } from "./project-notifications"
import { logActivity } from "@/lib/activity-logger"
import { hasPermissionWithoutRoleBypass, handleAuthorizationError } from "@/lib/rbac-helpers"
import { PERMISSIONS } from "@/lib/permissions"
import { isTaskBlocked } from "./dependencies"

const createTaskSchema = z.object({
    title: z.string().min(1, "Title is required"),
    description: z.string().optional(),
    priority: z.string().default("normal"),
    projectId: z.coerce.number(),
    assigneeIds: z.string().optional().transform((str, ctx) => {
        if (!str || str === '' || str === '[]') return []
        try {
            const parsed = JSON.parse(str)
            return Array.isArray(parsed) ? parsed as number[] : []
        } catch (e) {
            return []
        }
    }),
    dueDate: z.string().optional()
})

export async function getTasksWithFilters(params: {
    search?: string
    projectId?: string[]
    status?: string[]
    priority?: string[]
    assigneeId?: string
    dependencyState?: string
    startDate?: string
    endDate?: string
    dateFilterType?: "dueDate" | "createdDate"
    page?: number
    limit?: number
}) {
    const session = await getServerSession(authOptions)
    if (!session) return { error: "Unauthorized" }

    const {
        search = "",
        projectId = [],
        status = [],
        priority = [],
        assigneeId,
        dependencyState,
        startDate,
        endDate,
        dateFilterType = "dueDate",
        page = 1,
        limit = 20,
    } = params

    try {
        const where: any = {}

        // Search filter
        const searchConditions: any[] = []
        if (search) {
            // SQLite doesn't support mode: "insensitive", but LIKE is case-insensitive by default
            searchConditions.push(
                { title: { contains: search } },
                { project: { name: { contains: search } } },
                { assignees: { some: { username: { contains: search } } } }
            )
        }

        // Project filter
        if (projectId.length > 0) {
            where.projectId = { in: projectId.map((id) => parseInt(id)) }
        }

        // Status filter - support both status IDs (for dynamic statuses) and legacy status names
        const statusConditions: any[] = []
        if (status.length > 0) {
            const statusIds: number[] = []
            const statusNames: string[] = []

            status.forEach(s => {
                const id = parseInt(s)
                if (!isNaN(id)) {
                    statusIds.push(id)
                } else {
                    statusNames.push(s)
                }
            })

            if (statusIds.length > 0) {
                statusConditions.push({ taskStatusId: { in: statusIds } })
            }
            if (statusNames.length > 0) {
                statusConditions.push({ status: { in: statusNames }, taskStatusId: null })
            }
        }

        // Combine search and status filters properly
        if (searchConditions.length > 0 && statusConditions.length > 0) {
            // Both search and status: AND them together
            where.AND = [
                { OR: searchConditions },
                { OR: statusConditions }
            ]
        } else if (searchConditions.length > 0) {
            // Only search
            where.OR = searchConditions
        } else if (statusConditions.length > 0) {
            // Only status
            where.OR = statusConditions
        }

        // Priority filter
        if (priority.length > 0) {
            where.priority = { in: priority }
        }

        // Assignee filter
        if (assigneeId) {
            if (assigneeId === "me") {
                where.assignees = { some: { id: parseInt(session.user.id) } }
            } else {
                where.assignees = { some: { id: parseInt(assigneeId) } }
            }
        }

        // Date range filter
        if (startDate || endDate) {
            const dateField = dateFilterType === "createdDate" ? "createdAt" : "dueDate"
            const dateConditions: any[] = []
            if (startDate) {
                dateConditions.push({ [dateField]: { gte: new Date(startDate) } })
            }
            if (endDate) {
                dateConditions.push({ [dateField]: { lte: new Date(endDate) } })
            }
            if (dateConditions.length > 0) {
                where.AND = [...(where.AND || []), ...dateConditions]
            }
        }

        // Dependency state filter
        if (dependencyState && dependencyState !== "all") {
            if (dependencyState === "blocked") {
                where.OR = [
                    ...(where.OR || []),
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

        // Role-based filtering
        if (session.user.role !== "admin") {
            // For non-admins, show only tasks they're assigned to or created
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

        const skip = (page - 1) * limit

        const [tasks, total] = await Promise.all([
            prisma.task.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: "desc" },
                include: {
                    assignees: {
                        select: {
                            id: true,
                            username: true,
                            email: true,
                            avatarUrl: true,
                        },
                    },
                    project: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                    dependencies: {
                        include: {
                            dependsOnTask: {
                                select: {
                                    id: true,
                                    status: true,
                                    title: true,
                                },
                            },
                        },
                    },
                    dependents: {
                        include: {
                            task: {
                                select: {
                                    id: true,
                                    status: true,
                                },
                            },
                        },
                    },
                    // plannedDate is a direct field and will be included automatically
                },
            }),
            prisma.task.count({ where }),
        ])

        return {
            success: true,
            tasks,
            total,
            page,
            limit,
        }
    } catch (error: any) {
        console.error("Error fetching tasks with filters:", error)
        return {
            error: error.message || "Failed to fetch tasks",
        }
    }
}

export async function createTask(formData: FormData) {
    const session = await getServerSession(authOptions)
    if (!session) return { error: "Unauthorized" }

    const projectId = formData.get("projectId")
    const projectIdNum = projectId ? parseInt(projectId as string) : undefined

    // Check permission using RBAC (no role-based bypass)
    const hasPermission = await hasPermissionWithoutRoleBypass(
        parseInt(session.user.id),
        PERMISSIONS.TASK.CREATE,
        projectIdNum // projectId for project-scoped permissions
    )

    if (!hasPermission) {
        return { error: "Permission denied: You don't have permission to create tasks" }
    }

    const title = formData.get("title")
    const description = formData.get("description")
    const priority = formData.get("priority")
    const assigneeIds = formData.get("assigneeIds")
    const dueDate = formData.get("dueDate")

    const validated = createTaskSchema.safeParse({
        title, description, priority, projectId, assigneeIds, dueDate
    })

    if (!validated.success) {
        console.error("Validation errors:", validated.error.format())
        return { error: "Validation failed" }
    }

    try {
        const assigneeIds = validated.data.assigneeIds && validated.data.assigneeIds.length > 0
            ? validated.data.assigneeIds
            : []

        const task = await prisma.task.create({
            data: {
                title: validated.data.title,
                description: validated.data.description,
                priority: validated.data.priority,
                projectId: validated.data.projectId,
                createdById: parseInt(session.user.id),
                dueDate: validated.data.dueDate ? new Date(validated.data.dueDate) : null,
                ...(assigneeIds.length > 0 && {
                    assignees: {
                        connect: assigneeIds.map(id => ({ id }))
                    }
                })
            },
            include: {
                assignees: true,
                project: true
            }
        })

        // Create notifications for assigned users
        if (assigneeIds.length > 0) {
            for (const userId of assigneeIds) {
                await createProjectNotification(
                    validated.data.projectId,
                    userId,
                    {
                        type: "task",
                        entityType: "task",
                        entityId: task.id,
                        title: "Task Assigned",
                        message: `You have been assigned to task "${task.title}"`,
                        soundRequired: true
                    }
                )
            }
        }

        // Log activity
        await logActivity({
            actionType: "task_created",
            actionCategory: "task",
            actionSummary: `Task "${task.title}" created`,
            actionDetails: {
                taskId: task.id,
                taskTitle: task.title,
                projectId: validated.data.projectId,
            },
            performedById: parseInt(session.user.id),
            projectId: validated.data.projectId,
            entityType: "task",
            entityId: task.id,
        })

        revalidatePath(`/dashboard/projects/${validated.data.projectId}`)
        revalidatePath("/dashboard/tasks")
        return { success: true }
    } catch (e: any) {
        console.error(e)
        return { error: "Failed to create task", details: e.message }
    }
}

export async function getTask(id: number) {
    const session = await getServerSession(authOptions)
    if (!session) throw new Error("Unauthorized")

    const task = await prisma.task.findUnique({
        where: { id },
        include: {
            assignees: { select: { username: true, email: true, avatarUrl: true } },
            comments: {
                orderBy: { createdAt: "desc" },
                include: {
                    author: { select: { username: true, email: true, avatarUrl: true } }
                }
            },
            project: { select: { id: true, name: true } },
            attachments: true,
            team: { select: { id: true, name: true } },
            creator: { select: { id: true, username: true, email: true, avatarUrl: true } },
            taskStatus: { select: { id: true, name: true, color: true } },
            subtasks: {
                include: {
                    assignedTo: { select: { id: true, username: true, avatarUrl: true } }
                },
                orderBy: { createdAt: 'asc' }
            },
            dependencies: {
                include: {
                    dependsOnTask: {
                        select: {
                            id: true,
                            title: true,
                            status: true,
                            assignees: {
                                select: {
                                    id: true,
                                    username: true,
                                    avatarUrl: true,
                                    team: {
                                        select: {
                                            id: true,
                                            name: true
                                        }
                                    }
                                }
                            },
                            team: {
                                select: {
                                    id: true,
                                    name: true
                                }
                            }
                        }
                    }
                },
                orderBy: {
                    createdAt: "desc"
                }
            },
            dependents: {
                include: {
                    task: {
                        select: {
                            id: true,
                            title: true,
                            status: true,
                            assignees: {
                                select: {
                                    id: true,
                                    username: true,
                                    avatarUrl: true,
                                    team: {
                                        select: {
                                            id: true,
                                            name: true
                                        }
                                    }
                                }
                            },
                            team: {
                                select: {
                                    id: true,
                                    name: true
                                }
                            }
                        }
                    }
                }
            }
        }
    })

    return task
}

export async function getAllTasks() {
    const session = await getServerSession(authOptions)
    if (!session) throw new Error("Unauthorized")

    const tasks = await prisma.task.findMany({
        select: {
            id: true,
            title: true,
            description: true,
            priority: true,
            status: true,
            dueDate: true,
            projectId: true,
            createdAt: true,
            createdById: true,
            assignees: {
                select: {
                    id: true,
                    username: true,
                    email: true,
                    avatarUrl: true
                }
            },
            project: {
                select: {
                    id: true,
                    name: true,
                    status: true
                }
            },
            _count: {
                select: {
                    subtasks: true,
                    dependencies: true
                }
            }
        },
        orderBy: { dueDate: "asc" }
    })

    return tasks
}

export async function getMyTasks() {
    const session = await getServerSession(authOptions)
    if (!session) throw new Error("Unauthorized")
    const userId = parseInt(session.user.id)

    const tasks = await prisma.task.findMany({
        where: {
            assignees: {
                some: {
                    id: userId
                }
            }
        },
        select: {
            id: true,
            title: true,
            description: true,
            priority: true,
            status: true,
            dueDate: true,
            projectId: true,
            createdAt: true,
            assignees: {
                select: {
                    id: true,
                    username: true,
                    email: true,
                    avatarUrl: true
                }
            },
            project: {
                select: {
                    id: true,
                    name: true
                }
            },
            _count: {
                select: {
                    dependencies: true
                }
            }
        },
        orderBy: { dueDate: "asc" }
    })

    return tasks
}

const updateTaskSchema = z.object({
    title: z.string().min(1, "Title is required").optional().or(z.literal("")),
    description: z.string().optional().nullable(),
    priority: z.enum(["normal", "urgent", "high", "low"]).optional(),
    status: z.enum(["pending", "waiting", "in_progress", "review", "completed"]).optional(),
    dueDate: z.string().optional().or(z.literal("")),
    assigneeIds: z.string().transform((str, ctx) => {
        try {
            const parsed = JSON.parse(str)
            return Array.isArray(parsed) ? parsed as number[] : []
        } catch (e) {
            return []
        }
    }).optional(),
})

export async function updateTask(taskId: number, formData: FormData) {
    const session = await getServerSession(authOptions)
    if (!session) return { error: "Unauthorized" }

    const existingTask = await prisma.task.findUnique({
        where: { id: taskId },
        select: { id: true, createdById: true, projectId: true, assignees: { select: { id: true } } }
    })

    if (!existingTask) {
        return { error: "Task not found" }
    }

    // Check permission using RBAC (no role-based bypass)
    const hasPermission = await hasPermissionWithoutRoleBypass(
        parseInt(session.user.id),
        PERMISSIONS.TASK.UPDATE,
        existingTask.projectId // projectId for project-scoped permissions
    )

    // Also allow creator or assignee to update
    const isCreator = existingTask.createdById === parseInt(session.user.id)
    const isAssignee = existingTask.assignees.some(a => a.id === parseInt(session.user.id))

    if (!hasPermission && !isCreator && !isAssignee) {
        return { error: "Permission denied: You don't have permission to update this task" }
    }

    // Extract form data
    const title = formData.get("title") as string | null
    const description = formData.get("description") as string | null
    const priority = formData.get("priority") as string | null
    const status = formData.get("status") as string | null
    const dueDate = formData.get("dueDate") as string | null
    const assigneeIds = formData.get("assigneeIds") as string | null

    // Check specific permissions for priority and status changes
    if (priority) {
        const hasPriorityPermission = await hasPermissionWithoutRoleBypass(
            parseInt(session.user.id),
            PERMISSIONS.TASK.CHANGE_PRIORITY,
            existingTask.projectId
        )
        if (!hasPriorityPermission && !isCreator) {
            return { error: "Permission denied: You don't have permission to change task priority" }
        }
    }

    if (status) {
        const hasStatusPermission = await hasPermissionWithoutRoleBypass(
            parseInt(session.user.id),
            PERMISSIONS.TASK.CHANGE_STATUS,
            existingTask.projectId
        )
        if (!hasStatusPermission && !isCreator && !isAssignee) {
            return { error: "Permission denied: You don't have permission to change task status" }
        }
    }

    const validated = updateTaskSchema.safeParse({
        title: title || undefined,
        description: description || undefined,
        priority: priority || undefined,
        status: status || undefined,
        dueDate: dueDate || undefined,
        assigneeIds: assigneeIds || undefined
    })

    if (!validated.success) {
        console.error("Validation errors:", validated.error.format())
        return { error: "Validation failed", details: JSON.stringify(validated.error.format(), null, 2) }
    }

    try {
        const currentTask = await prisma.task.findUnique({
            where: { id: taskId },
            select: {
                id: true,
                title: true,
                description: true,
                priority: true,
                status: true,
                dueDate: true,
                assignees: { select: { id: true } },
                project: { select: { id: true } }
            }
        })

        if (!currentTask) {
            return { error: "Task not found" }
        }

        const updateData: any = {}

        if (validated.data.title !== undefined && validated.data.title.trim() !== "") {
            updateData.title = validated.data.title.trim()
        }
        if (validated.data.description !== undefined) {
            updateData.description = validated.data.description || null
        }
        if (validated.data.priority !== undefined) {
            updateData.priority = validated.data.priority
        }
        if (validated.data.status !== undefined) {
            updateData.status = validated.data.status
        }
        if (validated.data.dueDate !== undefined) {
            if (validated.data.dueDate && validated.data.dueDate.trim() !== "") {
                updateData.dueDate = new Date(validated.data.dueDate)
            } else {
                updateData.dueDate = null
            }
        }

        if (validated.data.assigneeIds !== undefined) {
            // Check permission for task assignment (no role-based bypass)
            const hasAssignPermission = await hasPermissionWithoutRoleBypass(
                parseInt(session.user.id),
                PERMISSIONS.TASK.ASSIGN,
                existingTask.projectId
            )

            if (!hasAssignPermission && !isCreator) {
                return { error: "Permission denied: You don't have permission to assign tasks" }
            }

            const newAssigneeIds = validated.data.assigneeIds
            const currentAssigneeIds = currentTask.assignees.map(a => a.id)

            const hasChanged =
                newAssigneeIds.length !== currentAssigneeIds.length ||
                !newAssigneeIds.every(id => currentAssigneeIds.includes(id)) ||
                !currentAssigneeIds.every(id => newAssigneeIds.includes(id))

            if (hasChanged) {
                updateData.assignees = {
                    set: newAssigneeIds.map(id => ({ id }))
                }

                const newlyAssigned = newAssigneeIds.filter(
                    id => !currentAssigneeIds.includes(id)
                )

                const removedAssignees = currentAssigneeIds.filter(
                    id => !newAssigneeIds.includes(id)
                )

                for (const userId of newlyAssigned) {
                    await createProjectNotification(
                        existingTask.projectId,
                        userId,
                        {
                            type: "task",
                            entityType: "task",
                            entityId: taskId,
                            title: "Task Assigned",
                            message: `You have been assigned to task "${currentTask.title || 'this task'}"`,
                            soundRequired: true
                        }
                    )
                }

                for (const userId of removedAssignees) {
                    await createProjectNotification(
                        existingTask.projectId,
                        userId,
                        {
                            type: "task",
                            entityType: "task",
                            entityId: taskId,
                            title: "Task Assignment Removed",
                            message: `You have been removed from task "${currentTask.title || 'this task'}"`,
                            soundRequired: false
                        }
                    )
                }
            }
        }

        if (Object.keys(updateData).length === 0) {
            return { error: "No changes to update" }
        }

        const updatedTask = await prisma.task.update({
            where: { id: taskId },
            data: updateData,
            include: { assignees: true }
        })

        await logActivity({
            actionType: "task_updated",
            actionCategory: "task",
            actionSummary: `Task "${updatedTask.title || currentTask.title}" updated`,
            actionDetails: {
                taskId,
            },
            performedById: parseInt(session.user.id),
            projectId: existingTask.projectId,
            entityType: "task",
            entityId: taskId,
        })

        revalidatePath(`/dashboard/projects/${existingTask.projectId}`)
        revalidatePath(`/dashboard/projects/${existingTask.projectId}/tasks/${taskId}`)
        revalidatePath("/dashboard/tasks")
        return { success: true }
    } catch (e: any) {
        console.error("Task update error:", e)
        return {
            error: "Failed to update task",
            details: e.message || "Unknown error occurred. Check console for details."
        }
    }
}

export async function updateTaskStatus(taskId: number, status: string | number, projectId: number) {
    const session = await getServerSession(authOptions)
    if (!session) return { error: "Unauthorized" }

    // Check permission using RBAC (no role-based bypass)
    const hasPermission = await hasPermissionWithoutRoleBypass(
        parseInt(session.user.id),
        PERMISSIONS.TASK.CHANGE_STATUS,
        projectId // projectId for project-scoped permissions
    )

    try {
        const task = await prisma.task.findUnique({
            where: { id: taskId },
            include: { assignees: true, taskStatus: true }
        })

        if (!task) {
            return { error: "Task not found" }
        }

        // Also allow creator or assignee to change status
        const isCreator = task.createdById === parseInt(session.user.id)
        const isAssignee = task.assignees.some(a => a.id === parseInt(session.user.id))

        if (!hasPermission && !isCreator && !isAssignee) {
            return { error: "Permission denied: You don't have permission to change task status" }
        }

        if (!task) {
            return { error: "Task not found" }
        }

        // Check if status is a number (taskStatusId) or string (legacy status)
        const taskStatusId = typeof status === "number" ? status : parseInt(status as string)
        const isTaskStatusId = !isNaN(taskStatusId) && taskStatusId > 0

        let statusName = status as string
        let updateData: any = {}

        if (isTaskStatusId) {
            // Fetch the task status to get its name
            const taskStatus = await prisma.taskStatus.findUnique({
                where: { id: taskStatusId },
                select: { name: true, isActive: true, isFinal: true, isBlocking: true } // Added isBlocking
            })

            if (!taskStatus) {
                return { error: "Task status not found" }
            }

            if (!taskStatus.isActive) {
                return { error: "Cannot assign inactive task status" }
            }

            // Check if attempting to complete a blocked task
            if (taskStatus.isFinal) {
                const blocked = await isTaskBlocked(taskId)
                if (blocked) {
                    return { error: "Cannot complete task: This task is blocked by incomplete dependencies." }
                }
            }

            // Logic for startedAt and completedAt
            if (taskStatus.isFinal) {
                updateData.completedAt = new Date();
                updateData.status = "completed"; // Sync legacy field
            } else {
                // If moving out of final, clear completedAt
                if (task.completedAt) {
                    updateData.completedAt = null;
                    updateData.status = "in_progress"; // Default fallback
                }

                // If starting (isBlocking usually implies in-progress/working) or explicitly "in_progress"
                if ((taskStatus.name === 'in_progress' || taskStatus.isBlocking) && !task.startedAt) {
                    updateData.startedAt = new Date();
                }
            }

            updateData.taskStatusId = taskStatusId
            // Sync legacy status field for compatibility
            if (taskStatus.name === "pending" || taskStatus.name === "waiting" || taskStatus.name === "in_progress" || taskStatus.name === "review" || taskStatus.name === "completed") {
                statusName = taskStatus.name
                updateData.status = statusName
            }
        } else {
            // Check if attempting to complete a blocked task (legacy status)
            if (statusName === "completed") {
                const blocked = await isTaskBlocked(taskId)
                if (blocked) {
                    return { error: "Cannot complete task: This task is blocked by incomplete dependencies." }
                }
            }

            // Legacy string status
            updateData = { status: statusName }
        }

        await prisma.task.update({
            where: { id: taskId },
            data: updateData
        })

        // Create notifications for status changes
        for (const assignee of task.assignees) {
            await createProjectNotification(
                projectId,
                assignee.id,
                {
                    type: "task",
                    entityType: "task",
                    entityId: taskId,
                    title: "Task Status Updated",
                    message: `Task "${task.title}" status changed to ${status}`,
                    soundRequired: status === "completed" || status === "waiting"
                }
            )
        }

        await logActivity({
            actionType: "task_status_updated",
            actionCategory: "task",
            actionSummary: `Task "${task.title}" status updated to ${status}`,
            actionDetails: {
                taskId,
                status,
            },
            performedById: parseInt(session.user.id),
            projectId,
            entityType: "task",
            entityId: taskId,
        })

        revalidatePath(`/dashboard/projects/${projectId}`)
        revalidatePath(`/dashboard/projects/${projectId}/tasks/${taskId}`)
        revalidatePath("/dashboard/tasks")
        return { success: true }
    } catch (e: any) {
        console.error(e)
        return { error: "Failed to update task status", details: e.message }
    }
}

export async function deleteTask(taskId: number) {
    const session = await getServerSession(authOptions)
    if (!session) return { error: "Unauthorized" }

    const task = await prisma.task.findUnique({
        where: { id: taskId },
        select: { id: true, createdById: true, projectId: true, title: true }
    })

    if (!task) {
        return { error: "Task not found" }
    }

    // Check permission using RBAC (no role-based bypass)
    const hasPermission = await hasPermissionWithoutRoleBypass(
        parseInt(session.user.id),
        PERMISSIONS.TASK.DELETE,
        task.projectId // projectId for project-scoped permissions
    )

    // Also allow creator to delete their own tasks
    const isCreator = task.createdById === parseInt(session.user.id)

    if (!hasPermission && !isCreator) {
        return { error: "Permission denied: You don't have permission to delete this task" }
    }

    try {
        await prisma.task.delete({
            where: { id: taskId }
        })

        await logActivity({
            actionType: "task_deleted",
            actionCategory: "task",
            actionSummary: `Task "${task.title}" deleted`,
            actionDetails: {
                taskId,
                taskTitle: task.title,
            },
            performedById: parseInt(session.user.id),
            projectId: task.projectId,
            entityType: "task",
            entityId: taskId,
        })

        revalidatePath(`/dashboard/projects/${task.projectId}`)
        revalidatePath("/dashboard/tasks")
        return { success: true }
    } catch (e: any) {
        console.error(e)
        return { error: "Failed to delete task", details: e.message }
    }
}
