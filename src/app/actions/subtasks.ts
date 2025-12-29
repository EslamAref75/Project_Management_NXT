"use server"

import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { z } from "zod"

const createSubtaskSchema = z.object({
    parentTaskId: z.number(),
    title: z.string().min(1, "Title is required"),
    description: z.string().optional(),
    priority: z.enum(["low", "medium", "high", "critical", "normal"]).default("normal"),
    startDate: z.string().optional().nullable(), // ISO string from form
    dueDate: z.string().optional().nullable(),
    estimatedHours: z.number().min(0).default(0),
    assignedToId: z.number().optional().nullable(),
    teamId: z.number().optional().nullable(),
})

export async function createSubtask(formData: z.input<typeof createSubtaskSchema>) {
    const session = await getServerSession(authOptions)
    if (!session) return { error: "Unauthorized" }

    const result = createSubtaskSchema.safeParse(formData)
    if (!result.success) {
        console.error("Validation failed object:", JSON.stringify(result, null, 2))
        const formatted = result.error.flatten()
        console.error("Flattened errors:", formatted)

        const firstFieldError = Object.values(formatted.fieldErrors)[0]?.[0]
        const firstFormError = formatted.formErrors[0]

        return { error: firstFieldError || firstFormError || "Invalid input" }
    }

    const { parentTaskId, title, description, priority, startDate, dueDate, estimatedHours, assignedToId, teamId } = result.data
    const userId = parseInt(session.user.id)

    try {
        // Verify parent task exists
        const parentTask = await prisma.task.findUnique({
            where: { id: parentTaskId }
        })

        if (!parentTask) {
            return { error: "Parent task not found" }
        }

        const subtask = await prisma.subtask.create({
            data: {
                title,
                description,
                priority,
                startDate: startDate ? new Date(startDate) : null,
                dueDate: dueDate ? new Date(dueDate) : null,
                estimatedHours,
                parentTaskId,
                createdById: userId,
                assignedToId,
                teamId,
            }
        })

        revalidatePath(`/dashboard/projects/${parentTask.projectId}/tasks/${parentTaskId}`)
        revalidatePath(`/dashboard/tasks/${parentTaskId}`)
        revalidatePath(`/dashboard/tasks`)
        return { success: true, subtask }
    } catch (e: any) {
        console.error("Create Subtask Error:", e)
        return { error: "Failed to create subtask" }
    }
}

export async function getSubtasks(parentTaskId: number) {
    const session = await getServerSession(authOptions)
    if (!session) return { error: "Unauthorized" }

    try {
        const subtasks = await prisma.subtask.findMany({
            where: { parentTaskId },
            include: {
                assignedTo: {
                    select: {
                        id: true,
                        username: true,
                        avatarUrl: true
                    }
                },
                creator: {
                    select: {
                        username: true
                    }
                }
            },
            orderBy: { createdAt: 'asc' }
        })
        return { subtasks }
    } catch (e) {
        return { error: "Failed to fetch subtasks" }
    }
}


export async function updateSubtask(subtaskId: number, data: Partial<z.infer<typeof createSubtaskSchema>> & { status?: string }) {
    const session = await getServerSession(authOptions)
    if (!session) return { error: "Unauthorized" }

    try {
        const subtask = await prisma.subtask.update({
            where: { id: subtaskId },
            data: {
                ...data,
                // Cast start/due dates if present because Zod schema might differ slightly from Prisma expect
                startDate: data.startDate === null ? null : (data.startDate ? new Date(data.startDate) : undefined),
                dueDate: data.dueDate === null ? null : (data.dueDate ? new Date(data.dueDate) : undefined),
            },
            include: { parentTask: true }
        })

        if (subtask.parentTask) {
            revalidatePath(`/dashboard/projects/${subtask.parentTask.projectId}/tasks/${subtask.parentTaskId}`)
        }

        revalidatePath(`/dashboard/tasks/${subtask.parentTaskId}`)
        revalidatePath(`/dashboard/tasks`)
        return { success: true, subtask }
    } catch (e) {
        console.error("Update Subtask Error:", e)
        return { error: "Failed to update subtask" }
    }
}

export async function deleteSubtask(subtaskId: number) {
    const session = await getServerSession(authOptions)
    if (!session) return { error: "Unauthorized" }

    try {
        const subtask = await prisma.subtask.delete({
            where: { id: subtaskId },
            include: { parentTask: true }
        })

        if (subtask.parentTask) {
            revalidatePath(`/dashboard/projects/${subtask.parentTask.projectId}/tasks/${subtask.parentTaskId}`)
        }

        revalidatePath(`/dashboard/tasks/${subtask.parentTaskId}`)
        revalidatePath(`/dashboard/tasks`)
        return { success: true }
    } catch (e) {
        return { error: "Failed to delete subtask" }
    }
}
