"use server"

import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { logActivity } from "@/lib/activity-logger"
import { hasPermissionWithoutRoleBypass } from "@/lib/rbac-helpers"
import { PERMISSIONS } from "@/lib/permissions"

// Helper function to check task status management permission (no role-based bypass)
async function checkTaskStatusPermission(userId: number): Promise<boolean> {
    return hasPermissionWithoutRoleBypass(
        userId,
        PERMISSIONS.SETTINGS.TASK_STATUS_MANAGE
    )
}

const taskStatusSchema = z.object({
    name: z.string().min(1, "Name is required"),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Color must be a valid hex color"),
    isDefault: z.boolean(),
    isFinal: z.boolean(),
    isBlocking: z.boolean(),
    orderIndex: z.number().int().min(0),
    isActive: z.boolean(),
})

export async function getTaskStatuses(includeInactive = false) {
    const session = await getServerSession(authOptions)
    if (!session) return { error: "Unauthorized" }

    try {
        // Check if TaskStatus model exists in Prisma client
        if (!prisma.taskStatus) {
            return { 
                error: "TaskStatus model not found. Please stop the dev server, run 'npx prisma generate', and restart the server.",
                details: "Prisma client needs to be regenerated after adding the TaskStatus model"
            }
        }

        const where = includeInactive ? {} : { isActive: true }
        
        const taskStatuses = await prisma.taskStatus.findMany({
            where,
            orderBy: [
                { orderIndex: "asc" },
                { name: "asc" }
            ],
        })

        return { success: true, taskStatuses }
    } catch (error: any) {
        console.error("Error fetching task statuses:", error)
        
        // Check if it's a model not found error
        if (error.message?.includes("taskStatus") || error.message?.includes("does not exist")) {
            return { 
                error: "TaskStatus model not found. Please stop the dev server, run 'npx prisma generate', and restart the server.",
                details: error.message
            }
        }
        
        return { error: "Failed to fetch task statuses", details: error.message }
    }
}

export async function createTaskStatus(formData: FormData) {
    const session = await getServerSession(authOptions)
    if (!session) return { error: "Unauthorized" }

    const hasPermission = await checkTaskStatusPermission(parseInt(session.user.id))
    if (!hasPermission) {
        return { error: "Permission denied: You don't have permission to manage task statuses" }
    }

    // Check if TaskStatus model exists in Prisma client
    if (!prisma.taskStatus) {
        return { 
            error: "TaskStatus model not found. Please stop the dev server, run 'npx prisma generate', and restart the server.",
            details: "Prisma client needs to be regenerated after adding the TaskStatus model"
        }
    }

    const name = formData.get("name")
    const color = formData.get("color") || "#6b7280"
    const isDefaultValue = formData.get("isDefault")
    const isFinalValue = formData.get("isFinal")
    const isBlockingValue = formData.get("isBlocking")
    const orderIndex = formData.get("orderIndex")
    const isActiveValue = formData.get("isActive")
    
    // Handle boolean values - FormData returns strings, so convert properly
    const isDefault = String(isDefaultValue) === "true"
    const isFinal = String(isFinalValue) === "true"
    const isBlocking = String(isBlockingValue) === "true"
    const isActive = String(isActiveValue) === "true"
    
    console.log("Creating task status with values:", {
        name,
        color,
        isDefault,
        isFinal,
        isBlocking,
        orderIndex: orderIndex ? parseInt(orderIndex as string) : 0,
        isActive,
    })

    // If setting as default, unset other defaults
    if (isDefault) {
        try {
            await prisma.taskStatus.updateMany({
                where: { isDefault: true },
                data: { isDefault: false },
            })
        } catch (error: any) {
            if (error.message?.includes("taskStatus") || error.message?.includes("does not exist")) {
                console.warn("TaskStatus model not available, skipping default status update")
            } else {
                throw error
            }
        }
    }

    const validated = taskStatusSchema.safeParse({
        name,
        color,
        isDefault,
        isFinal,
        isBlocking,
        orderIndex: orderIndex ? parseInt(orderIndex as string) : 0,
        isActive,
    })

    if (!validated.success) {
        console.error("Validation failed:", validated.error.format())
        return { error: "Validation failed", details: validated.error.format() }
    }

    try {
        console.log("Creating task status with validated data:", validated.data)
        const taskStatus = await prisma.taskStatus.create({
            data: validated.data,
        })
        console.log("Task status created successfully:", taskStatus)

        // Log activity
        try {
            await logActivity({
                actionType: "task_status_created",
                actionCategory: "settings",
                actionSummary: `Task status "${taskStatus.name}" created`,
                actionDetails: {
                    statusId: taskStatus.id,
                    statusName: taskStatus.name,
                    color: taskStatus.color,
                    isDefault: taskStatus.isDefault,
                    isFinal: taskStatus.isFinal,
                    isBlocking: taskStatus.isBlocking,
                },
                performedById: parseInt(session.user.id),
                entityType: "task_status",
                entityId: taskStatus.id,
            })
        } catch (logError) {
            console.error("Failed to log activity:", logError)
            // Don't fail the creation if logging fails
        }

        revalidatePath("/dashboard/settings/projects")
        revalidatePath("/dashboard/tasks")
        
        return { success: true, taskStatus }
    } catch (error: any) {
        console.error("Error creating task status:", error)
        console.error("Error details:", {
            code: error.code,
            meta: error.meta,
            message: error.message,
        })
        
        // Check if table doesn't exist
        if (error.code === "P2021" || error.message?.includes("does not exist") || error.message?.includes("no such table")) {
            return { 
                error: "Database table not found. Please run the migration: npx prisma db execute --file prisma/migrations/manual_add_task_statuses.sql --schema prisma/schema.prisma",
                details: error.message 
            }
        }
        
        if (error.code === "P2002") {
            return { error: "A task status with this name already exists" }
        }
        
        return { error: "Failed to create task status", details: error.message }
    }
}

export async function updateTaskStatus(id: number, formData: FormData) {
    const session = await getServerSession(authOptions)
    if (!session) return { error: "Unauthorized" }

    if (session.user.role !== "admin") {
        return { error: "Only admins can update task statuses" }
    }

    const existingStatus = await prisma.taskStatus.findUnique({
        where: { id },
    })

    if (!existingStatus) {
        return { error: "Task status not found" }
    }

    const name = formData.get("name")
    const color = formData.get("color") || "#6b7280"
    const isDefaultValue = formData.get("isDefault")
    const isFinalValue = formData.get("isFinal")
    const isBlockingValue = formData.get("isBlocking")
    const isActiveValue = formData.get("isActive")
    const orderIndex = formData.get("orderIndex")
    
    // Handle boolean values - FormData returns strings, so convert properly
    const isDefault = String(isDefaultValue) === "true"
    const isFinal = String(isFinalValue) === "true"
    const isBlocking = String(isBlockingValue) === "true"
    const isActive = String(isActiveValue) === "true"
    
    console.log("Update - Parsed form values:", {
        name,
        color,
        isDefaultValue,
        isDefault,
        isFinalValue,
        isFinal,
        isBlockingValue,
        isBlocking,
        isActiveValue,
        isActive,
        orderIndex
    })

    // If setting as default, unset other defaults
    if (isDefault && !existingStatus.isDefault) {
        try {
            await prisma.taskStatus.updateMany({
                where: { isDefault: true },
                data: { isDefault: false },
            })
        } catch (error: any) {
            console.error("Error unsetting other defaults:", error)
        }
    }

    const validated = taskStatusSchema.safeParse({
        name,
        color,
        isDefault,
        isFinal,
        isBlocking,
        orderIndex: orderIndex ? parseInt(orderIndex as string) : existingStatus.orderIndex,
        isActive,
    })

    if (!validated.success) {
        console.error("Validation failed:", validated.error.format())
        return { error: "Validation failed", details: validated.error.format() }
    }

    try {
        const oldValues = {
            name: existingStatus.name,
            color: existingStatus.color,
            isDefault: existingStatus.isDefault,
            isFinal: existingStatus.isFinal,
            isBlocking: existingStatus.isBlocking,
            isActive: existingStatus.isActive,
            orderIndex: existingStatus.orderIndex,
        }

        const taskStatus = await prisma.taskStatus.update({
            where: { id },
            data: validated.data,
        })

        // Log activity
        try {
            await logActivity({
                actionType: "task_status_updated",
                actionCategory: "settings",
                actionSummary: `Task status "${taskStatus.name}" updated`,
                actionDetails: {
                    statusId: taskStatus.id,
                    oldValues,
                    newValues: {
                        name: taskStatus.name,
                        color: taskStatus.color,
                        isDefault: taskStatus.isDefault,
                        isFinal: taskStatus.isFinal,
                        isBlocking: taskStatus.isBlocking,
                        isActive: taskStatus.isActive,
                        orderIndex: taskStatus.orderIndex,
                    },
                },
                performedById: parseInt(session.user.id),
                entityType: "task_status",
                entityId: taskStatus.id,
            })
        } catch (logError) {
            console.error("Failed to log activity:", logError)
        }

        revalidatePath("/dashboard/settings/projects")
        revalidatePath("/dashboard/tasks")

        return { success: true, taskStatus }
    } catch (error: any) {
        console.error("Error updating task status:", error)
        
        if (error.code === "P2002") {
            return { error: "A task status with this name already exists" }
        }
        
        return { error: "Failed to update task status", details: error.message }
    }
}

export async function deleteTaskStatus(id: number) {
    const session = await getServerSession(authOptions)
    if (!session) return { error: "Unauthorized" }

    if (session.user.role !== "admin") {
        return { error: "Only admins can delete task statuses" }
    }

    const status = await prisma.taskStatus.findUnique({
        where: { id },
        include: {
            tasks: {
                take: 1,
            },
        },
    })

    if (!status) {
        return { error: "Task status not found" }
    }

    if (status.tasks.length > 0) {
        return { 
            error: "Cannot delete task status. It is assigned to existing tasks. Please deactivate it instead.",
            details: `${status.tasks.length} task(s) are using this status`
        }
    }

    try {
        await prisma.taskStatus.delete({
            where: { id },
        })

        // Log activity
        try {
            await logActivity({
                actionType: "task_status_deleted",
                actionCategory: "settings",
                actionSummary: `Task status "${status.name}" deleted`,
                actionDetails: {
                    statusId: status.id,
                    statusName: status.name,
                },
                performedById: parseInt(session.user.id),
                entityType: "task_status",
                entityId: status.id,
            })
        } catch (logError) {
            console.error("Failed to log activity:", logError)
        }

        revalidatePath("/dashboard/settings/projects")
        revalidatePath("/dashboard/tasks")

        return { success: true }
    } catch (error: any) {
        console.error("Error deleting task status:", error)
        return { error: "Failed to delete task status", details: error.message }
    }
}

export async function toggleTaskStatusActive(id: number) {
    const session = await getServerSession(authOptions)
    if (!session) return { error: "Unauthorized" }

    if (session.user.role !== "admin") {
        return { error: "Only admins can toggle task statuses" }
    }

    const status = await prisma.taskStatus.findUnique({
        where: { id },
    })

    if (!status) {
        return { error: "Task status not found" }
    }

    try {
        const newActiveState = !status.isActive
        const updatedStatus = await prisma.taskStatus.update({
            where: { id },
            data: { isActive: newActiveState },
        })

        // Log activity
        try {
            await logActivity({
                actionType: "task_status_toggled",
                actionCategory: "settings",
                actionSummary: `Task status "${status.name}" ${newActiveState ? "activated" : "deactivated"}`,
                actionDetails: {
                    statusId: status.id,
                    statusName: status.name,
                    oldValue: status.isActive,
                    newValue: newActiveState,
                },
                performedById: parseInt(session.user.id),
                entityType: "task_status",
                entityId: status.id,
            })
        } catch (logError) {
            console.error("Failed to log activity:", logError)
        }

        revalidatePath("/dashboard/settings/projects")
        revalidatePath("/dashboard/tasks")

        return { success: true, taskStatus: updatedStatus }
    } catch (error: any) {
        console.error("Error toggling task status:", error)
        return { error: "Failed to toggle task status", details: error.message }
    }
}

export async function reorderTaskStatuses(ids: number[]) {
    const session = await getServerSession(authOptions)
    if (!session) return { error: "Unauthorized" }

    if (session.user.role !== "admin") {
        return { error: "Only admins can reorder task statuses" }
    }

    try {
        // Update order index for each status
        const updates = ids.map((id, index) =>
            prisma.taskStatus.update({
                where: { id },
                data: { orderIndex: index },
            })
        )

        await Promise.all(updates)

        // Log activity
        try {
            await logActivity({
                actionType: "task_statuses_reordered",
                actionCategory: "settings",
                actionSummary: "Task statuses reordered",
                actionDetails: {
                    newOrder: ids,
                },
                performedById: parseInt(session.user.id),
                entityType: "task_status",
                entityId: ids[0] || 0,
            })
        } catch (logError) {
            console.error("Failed to log activity:", logError)
        }

        revalidatePath("/dashboard/settings/projects")
        revalidatePath("/dashboard/tasks")

        return { success: true }
    } catch (error: any) {
        console.error("Error reordering task statuses:", error)
        return { error: "Failed to reorder task statuses", details: error.message }
    }
}

