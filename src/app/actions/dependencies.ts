"use server"

import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { z } from "zod"
import { revalidatePath } from "next/cache"
import { createProjectNotification } from "./project-notifications"
import { logActivity } from "@/lib/activity-logger"

const createDependencySchema = z.object({
    taskId: z.coerce.number(),
    dependsOnTaskId: z.coerce.number(),
    dependencyType: z.enum(["finish_to_start"]).default("finish_to_start")
})

/**
 * Check if creating a dependency would create a circular dependency
 */
async function checkCircularDependency(
    taskId: number,
    dependsOnTaskId: number
): Promise<boolean> {
    // Self-dependency check
    if (taskId === dependsOnTaskId) {
        return true
    }

    // Check if dependsOnTaskId depends on taskId (direct circular)
    const directCircular = await prisma.taskDependency.findUnique({
        where: {
            taskId_dependsOnTaskId: {
                taskId: dependsOnTaskId,
                dependsOnTaskId: taskId
            }
        }
    })

    if (directCircular) {
        return true
    }

    // Check transitive circular dependencies using DFS
    const visited = new Set<number>()
    const stack: number[] = [dependsOnTaskId]

    while (stack.length > 0) {
        const currentTaskId = stack.pop()!

        if (currentTaskId === taskId) {
            return true // Circular dependency found
        }

        if (visited.has(currentTaskId)) {
            continue
        }

        visited.add(currentTaskId)

        // Get all tasks that currentTaskId depends on
        const dependencies = await prisma.taskDependency.findMany({
            where: { taskId: currentTaskId },
            select: { dependsOnTaskId: true }
        })

        for (const dep of dependencies) {
            if (!visited.has(dep.dependsOnTaskId)) {
                stack.push(dep.dependsOnTaskId)
            }
        }
    }

    return false
}

/**
 * Check if all prerequisite tasks are completed
 */
async function areAllPrerequisitesCompleted(taskId: number): Promise<boolean> {
    const dependencies = await prisma.taskDependency.findMany({
        where: { taskId },
        include: {
            dependsOnTask: {
                select: { status: true }
            }
        }
    })

    if (dependencies.length === 0) {
        return true // No dependencies, so all are "completed"
    }

    return dependencies.every(
        dep => dep.dependsOnTask.status === "completed"
    )
}

/**
 * Update task blocking status based on dependencies
 */
async function updateTaskBlockingStatus(taskId: number) {
    const task = await prisma.task.findUnique({
        where: { id: taskId },
        include: {
            dependencies: {
                include: {
                    dependsOnTask: {
                        select: { status: true, id: true, title: true }
                    }
                }
            },
            project: {
                select: { id: true }
            }
        }
    })

    if (!task) return

    // ... logic ...
    const allCompleted = await areAllPrerequisitesCompleted(taskId)
    const hasDependencies = task.dependencies.length > 0

    console.log(`Checking blocking status for task ${taskId}:`, {
        hasDependencies,
        allCompleted,
        currentStatus: task.status
    })

    // If task has dependencies and not all are completed, block it
    if (hasDependencies && !allCompleted) {
        // Only set to "waiting" if it's not already in a valid state
        if (task.status !== "waiting" && task.status !== "completed") {
            const updated = await prisma.task.update({
                where: { id: taskId },
                data: { status: "waiting" },
                include: { assignees: true }
            })
            console.log("Updated task to WAITING:", updated.id)

            // Notify assignees that task is blocked
            for (const assignee of updated.assignees) {
                await createProjectNotification(
                    task.project.id,
                    assignee.id,
                    {
                        type: "dependency",
                        entityType: "task",
                        entityId: taskId,
                        title: "Task Blocked",
                        message: `Task "${task.title}" is now blocked by incomplete dependencies`,
                        soundRequired: true // Critical notification
                    }
                )
            }
        }
    } else if (hasDependencies && allCompleted) {
        // All prerequisites completed, unblock if it was waiting
        if (task.status === "waiting") {
            const updated = await prisma.task.update({
                where: { id: taskId },
                data: { status: "pending" },
                include: { assignees: true }
            })
            console.log("Updated task to PENDING (unblocked):", updated.id)

            // Notify assignees that task is unblocked
            for (const assignee of updated.assignees) {
                await createProjectNotification(
                    task.project.id,
                    assignee.id,
                    {
                        type: "dependency",
                        entityType: "task",
                        entityId: taskId,
                        title: "Task Unblocked",
                        message: `Task "${task.title}" is no longer blocked. All prerequisites are completed.`,
                        soundRequired: true // Critical notification
                    }
                )
            }
        }
    }
}

/**
 * Create a task dependency
 */
export async function createTaskDependency(formData: FormData) {
    const session = await getServerSession(authOptions)
    if (!session) return { error: "Unauthorized" }

    const taskId = formData.get("taskId")
    const dependsOnTaskId = formData.get("dependsOnTaskId")
    const dependencyType = formData.get("dependencyType") || "finish_to_start"

    const validated = createDependencySchema.safeParse({
        taskId,
        dependsOnTaskId,
        dependencyType
    })

    if (!validated.success) {
        return { error: "Validation failed", details: validated.error.format() }
    }

    try {
        // Verify both tasks exist and belong to the same project
        const [task, dependsOnTask] = await Promise.all([
            prisma.task.findUnique({
                where: { id: validated.data.taskId },
                select: { projectId: true, id: true, title: true }
            }),
            prisma.task.findUnique({
                where: { id: validated.data.dependsOnTaskId },
                select: { projectId: true, id: true, title: true, assignees: true }
            })
        ])

        if (!task || !dependsOnTask) {
            return { error: "One or both tasks not found" }
        }

        if (task.projectId !== dependsOnTask.projectId) {
            return { error: "Tasks must belong to the same project" }
        }

        // Self-dependency check
        if (validated.data.taskId === validated.data.dependsOnTaskId) {
            return { error: "A task cannot depend on itself." }
        }

        // Check for circular dependencies
        const isCircular = await checkCircularDependency(
            validated.data.taskId,
            validated.data.dependsOnTaskId
        )

        if (isCircular) {
            return { error: "Circular dependency detected. Cannot create this dependency." }
        }

        // Check if dependency already exists
        const existing = await prisma.taskDependency.findUnique({
            where: {
                taskId_dependsOnTaskId: {
                    taskId: validated.data.taskId,
                    dependsOnTaskId: validated.data.dependsOnTaskId
                }
            }
        })

        if (existing) {
            // Revalidate paths even if dependency exists, to ensure UI is up to date
            revalidatePath(`/dashboard/projects/${task.projectId}`)
            revalidatePath(`/dashboard/projects/${task.projectId}/tasks/${validated.data.taskId}`)
            return {
                error: "Dependency already exists",
                success: true // Indicate it exists, so UI can refresh
            }
        }

        // Create the dependency
        const createdDependency = await prisma.taskDependency.create({
            data: {
                taskId: validated.data.taskId,
                dependsOnTaskId: validated.data.dependsOnTaskId,
                dependencyType: validated.data.dependencyType,
                createdById: parseInt(session.user.id)
            },
            include: {
                dependsOnTask: {
                    select: {
                        id: true,
                        title: true,
                        status: true
                    }
                }
            }
        })

        console.log("✅ Dependency created successfully:", {
            taskId: createdDependency.taskId,
            dependsOnTaskId: createdDependency.dependsOnTaskId,
            dependsOnTaskTitle: createdDependency.dependsOnTask.title
        })

        // Update blocking status
        await updateTaskBlockingStatus(validated.data.taskId)

        // Create project notifications
        const dependentTask = await prisma.task.findUnique({
            where: { id: validated.data.taskId },
            include: { assignees: true }
        })

        // Notify prerequisite task assignees that another task depends on them
        for (const assignee of dependsOnTask.assignees) {
            await createProjectNotification(
                task.projectId,
                assignee.id,
                {
                    type: "dependency",
                    entityType: "task",
                    entityId: dependsOnTask.id,
                    title: "Task Dependency Added",
                    message: `Task "${task.title}" now depends on your task "${dependsOnTask.title}"`,
                    soundRequired: false
                }
            )
        }

        // Notify dependent task assignees about the dependency (critical - task is blocked)
        if (dependentTask) {
            for (const assignee of dependentTask.assignees) {
                await createProjectNotification(
                    task.projectId,
                    assignee.id,
                    {
                        type: "dependency",
                        entityType: "task",
                        entityId: validated.data.taskId,
                        title: "Task Blocked by Dependency",
                        message: `Your task "${task.title}" is now waiting for "${dependsOnTask.title}" to be completed`,
                        soundRequired: true // Critical notification - task is blocked
                    }
                )
            }

            // Log task blocked activity
            await logActivity({
                actionType: "task_blocked",
                actionCategory: "dependency",
                actionSummary: `Task "${task.title}" blocked by dependency`,
                actionDetails: {
                    taskId: task.id,
                    taskTitle: task.title,
                    dependsOnTaskId: dependsOnTask.id,
                    dependsOnTaskTitle: dependsOnTask.title,
                },
                performedById: parseInt(session.user.id),
                affectedUserId: dependentTask.assignees.map(a => a.id)[0] || undefined,
                projectId: task.projectId,
                entityType: "task",
                entityId: validated.data.taskId,
            })
        }

        // Log activity
        await logActivity({
            actionType: "dependency_added",
            actionCategory: "dependency",
            actionSummary: `Dependency added: Task "${task.title}" depends on "${dependsOnTask.title}"`,
            actionDetails: {
                taskId: task.id,
                taskTitle: task.title,
                dependsOnTaskId: dependsOnTask.id,
                dependsOnTaskTitle: dependsOnTask.title,
            },
            performedById: parseInt(session.user.id),
            projectId: task.projectId,
            entityType: "task_dependency",
            entityId: validated.data.taskId,
        })

        // Verify the dependency was created by querying it back
        const verifyDependency = await prisma.taskDependency.findUnique({
            where: {
                taskId_dependsOnTaskId: {
                    taskId: validated.data.taskId,
                    dependsOnTaskId: validated.data.dependsOnTaskId
                }
            },
            include: {
                dependsOnTask: {
                    select: {
                        id: true,
                        title: true
                    }
                }
            }
        })

        if (!verifyDependency) {
            console.error("❌ Dependency creation verification failed!")
            return { error: "Dependency was not created successfully" }
        }

        console.log("✅ Dependency verified:", {
            taskId: verifyDependency.taskId,
            dependsOnTaskId: verifyDependency.dependsOnTaskId,
            dependsOnTaskTitle: verifyDependency.dependsOnTask.title
        })

        // Revalidate both project page and task detail page
        revalidatePath(`/dashboard/projects/${task.projectId}`)
        revalidatePath(`/dashboard/projects/${task.projectId}/tasks/${validated.data.taskId}`)
        return { success: true }
    } catch (e: any) {
        console.error("Dependency Creation Error:", e)
        return { error: "Failed to create dependency", details: e.message }
    }
}

/**
 * Remove a task dependency
 */
export async function removeTaskDependency(
    taskId: number | string,
    dependsOnTaskId: number | string
) {
    const session = await getServerSession(authOptions)
    if (!session) return { error: "Unauthorized" }

    const tId = Number(taskId)
    const dId = Number(dependsOnTaskId)

    console.log(`Attempting to remove dependency: Task ${tId} depends on ${dId}`)

    try {
        const dependency = await prisma.taskDependency.findUnique({
            where: {
                taskId_dependsOnTaskId: {
                    taskId: tId,
                    dependsOnTaskId: dId
                }
            },
            include: {
                task: { select: { projectId: true, id: true, title: true } },
                dependsOnTask: { select: { id: true, title: true } }
            }
        })

        if (!dependency) {
            console.error(`Dependency not found: Task ${tId} -> ${dId}`)
            // Check if it exists in reverse? No.
            return { error: "Dependency not found" }
        }

        await prisma.taskDependency.delete({
            where: {
                taskId_dependsOnTaskId: {
                    taskId: tId,
                    dependsOnTaskId: dId
                }
            }
        })
        console.log(`Successfully removed dependency: Task ${tId} -> ${dId}`)

        // Recalculate blocking status
        await updateTaskBlockingStatus(tId)

        // Log activity
        await logActivity({
            actionType: "dependency_removed",
            actionCategory: "dependency",
            actionSummary: `Dependency removed: Task "${dependency.task.title}" no longer depends on "${dependency.dependsOnTask.title}"`,
            actionDetails: {
                taskId: dependency.task.id,
                taskTitle: dependency.task.title,
                dependsOnTaskId: dependency.dependsOnTask.id,
                dependsOnTaskTitle: dependency.dependsOnTask.title,
            },
            performedById: parseInt(session.user.id),
            projectId: dependency.task.projectId,
            entityType: "task_dependency",
            entityId: tId,
        })

        revalidatePath(`/dashboard/projects/${dependency.task.projectId}`)
        revalidatePath(`/dashboard/projects/${dependency.task.projectId}/tasks/${tId}`)

        return { success: true }
    } catch (e: any) {
        console.error("Dependency Removal Error:", e)
        return { error: "Failed to remove dependency", details: e.message }
    }
}

/**
 * Get all dependencies for a task
 */
export async function getTaskDependencies(taskId: number) {
    const session = await getServerSession(authOptions)
    if (!session) throw new Error("Unauthorized")

    const dependencies = await prisma.taskDependency.findMany({
        where: { taskId },
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
        orderBy: { createdAt: "desc" }
    })

    return dependencies
}

/**
 * Get all tasks that depend on a given task
 */
export async function getTaskDependents(taskId: number) {
    const session = await getServerSession(authOptions)
    if (!session) throw new Error("Unauthorized")

    const dependents = await prisma.taskDependency.findMany({
        where: { dependsOnTaskId: taskId },
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
        },
        orderBy: { createdAt: "desc" }
    })

    return dependents
}

/**
 * Get available tasks for dependency creation (same project, not self, not creating circular)
 */
export async function getAvailableDependencyTasks(taskId: number) {
    const session = await getServerSession(authOptions)
    if (!session) throw new Error("Unauthorized")

    const task = await prisma.task.findUnique({
        where: { id: taskId },
        select: { projectId: true }
    })

    if (!task) {
        throw new Error("Task not found")
    }

    // Get all tasks in the same project, excluding the current task
    // Include completed tasks for reference (as per requirements)
    // Show ALL tasks - circular dependency check will be done on submit
    const availableTasks = await prisma.task.findMany({
        where: {
            projectId: task.projectId,
            id: { not: taskId }
        },
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
        },
        orderBy: { createdAt: "desc" }
    })

    // Return all tasks - circular dependency validation happens on creation
    console.log(`Found ${availableTasks.length} tasks in project ${task.projectId} for task ${taskId}`)
    return availableTasks
}

/**
 * Check if a task is blocked by dependencies
 */
export async function isTaskBlocked(taskId: number): Promise<boolean> {
    const session = await getServerSession(authOptions)
    if (!session) throw new Error("Unauthorized")

    const allCompleted = await areAllPrerequisitesCompleted(taskId)
    const hasDependencies = await prisma.taskDependency.count({
        where: { taskId }
    }) > 0

    return hasDependencies && !allCompleted
}

