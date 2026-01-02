"use server"

import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { logActivity } from "@/lib/activity-logger"
import { hasPermissionOrRole } from "@/lib/rbac"
import { PERMISSIONS } from "@/lib/permissions"

// Helper function to check project status management permission
async function checkProjectStatusPermission(userId: number): Promise<boolean> {
    return hasPermissionOrRole(
        userId,
        PERMISSIONS.SETTINGS.PROJECT_STATUS_MANAGE,
        ["admin", "project_manager"]
    )
}

const projectStatusSchema = z.object({
    name: z.string().min(1, "Name is required").max(100),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Color must be a valid hex color"),
    isDefault: z.boolean().default(false),
    isFinal: z.boolean().default(false),
    isUrgent: z.boolean().default(false),
    orderIndex: z.number().int().default(0),
    isActive: z.boolean().default(true),
})

export async function getProjectStatuses(includeInactive = false) {
    const session = await getServerSession(authOptions)
    if (!session) return { error: "Unauthorized" }

    try {
        // Check if ProjectStatus model exists in Prisma client
        if (!prisma.projectStatus) {
            return { 
                error: "ProjectStatus model not found. Please stop the dev server, run 'npx prisma generate', and restart the server.",
                details: "Prisma client needs to be regenerated after adding the ProjectStatus model"
            }
        }

        const where = includeInactive ? {} : { isActive: true }
        
        const projectStatuses = await prisma.projectStatus.findMany({
            where,
            orderBy: [
                { orderIndex: "asc" },
                { name: "asc" }
            ],
        })

        return { success: true, projectStatuses }
    } catch (error: any) {
        console.error("Error fetching project statuses:", error)
        
        // Check if it's a model not found error
        if (error.message?.includes("projectStatus") || error.message?.includes("does not exist")) {
            return { 
                error: "ProjectStatus model not found. Please stop the dev server, run 'npx prisma generate', and restart the server.",
                details: error.message
            }
        }
        
        return { error: "Failed to fetch project statuses", details: error.message }
    }
}

export async function createProjectStatus(formData: FormData) {
    const session = await getServerSession(authOptions)
    if (!session) return { error: "Unauthorized" }

    const hasPermission = await checkProjectStatusPermission(parseInt(session.user.id))
    if (!hasPermission) {
        return { error: "Permission denied: You don't have permission to manage project statuses" }
    }

    // Check if ProjectStatus model exists in Prisma client
    if (!prisma.projectStatus) {
        return { 
            error: "ProjectStatus model not found. Please stop the dev server, run 'npx prisma generate', and restart the server.",
            details: "Prisma client needs to be regenerated after adding the ProjectStatus model"
        }
    }

    const name = formData.get("name")
    const color = formData.get("color") || "#6b7280"
    const isDefaultValue = formData.get("isDefault")
    const isFinalValue = formData.get("isFinal")
    const isUrgentValue = formData.get("isUrgent")
    const isActiveValue = formData.get("isActive")
    const orderIndex = formData.get("orderIndex")
    
    // Handle boolean values
    const isDefault = isDefaultValue === "true" || isDefaultValue === true
    const isFinal = isFinalValue === "true" || isFinalValue === true
    const isUrgent = isUrgentValue === "true" || isUrgentValue === true
    const isActive = isActiveValue === "true" || isActiveValue === true

    // If setting as default, unset other defaults
    if (isDefault) {
        try {
            await prisma.projectStatus.updateMany({
                where: { isDefault: true },
                data: { isDefault: false },
            })
        } catch (error: any) {
            // If projectStatus model doesn't exist yet, skip this step
            // This can happen if Prisma client hasn't been regenerated
            if (error.message?.includes("projectStatus") || error.message?.includes("does not exist")) {
                console.warn("ProjectStatus model not available, skipping default status update")
            } else {
                throw error
            }
        }
    }

    // Debug: Log the values being parsed
    console.log("Creating project status with values:", {
        name,
        color,
        isDefault,
        isFinal,
        isUrgent,
        orderIndex: orderIndex ? parseInt(orderIndex as string) : 0,
        isActive,
    })

    const validated = projectStatusSchema.safeParse({
        name,
        color,
        isDefault,
        isFinal,
        isUrgent,
        orderIndex: orderIndex ? parseInt(orderIndex as string) : 0,
        isActive,
    })

    if (!validated.success) {
        console.error("Validation failed:", validated.error.format())
        return { error: "Validation failed", details: validated.error.format() }
    }

    try {
        const projectStatus = await prisma.projectStatus.create({
            data: validated.data,
        })

        // Log activity
        try {
            await logActivity({
                actionType: "project_status_created",
                actionCategory: "settings",
                actionSummary: `Project status "${projectStatus.name}" created`,
                actionDetails: {
                    statusId: projectStatus.id,
                    statusName: projectStatus.name,
                    color: projectStatus.color,
                    isDefault: projectStatus.isDefault,
                    isFinal: projectStatus.isFinal,
                    isUrgent: projectStatus.isUrgent,
                },
                performedById: parseInt(session.user.id),
                entityType: "project_status",
                entityId: projectStatus.id,
            })
        } catch (logError) {
            console.error("Failed to log activity:", logError)
            // Don't fail the creation if logging fails
        }

        revalidatePath("/dashboard/settings/projects")
        revalidatePath("/dashboard/projects")
        
        return { success: true, projectStatus }
    } catch (error: any) {
        console.error("Error creating project status:", error)
        console.error("Error details:", {
            code: error.code,
            meta: error.meta,
            message: error.message,
        })
        
        // Check if table doesn't exist
        if (error.code === "P2021" || error.message?.includes("does not exist") || error.message?.includes("no such table")) {
            return { 
                error: "Database table not found. Please run the migration: npx prisma db execute --file prisma/migrations/manual_add_project_statuses.sql --schema prisma/schema.prisma",
                details: error.message 
            }
        }
        
        if (error.code === "P2002") {
            return { error: "A project status with this name already exists" }
        }
        
        return { error: "Failed to create project status", details: error.message }
    }
}

export async function updateProjectStatus(id: number, formData: FormData) {
    const session = await getServerSession(authOptions)
    if (!session) return { error: "Unauthorized" }

    if (session.user.role !== "admin") {
        return { error: "Only admins can update project statuses" }
    }

    const existingStatus = await prisma.projectStatus.findUnique({
        where: { id },
    })

    if (!existingStatus) {
        return { error: "Project status not found" }
    }

    const name = formData.get("name")
    const color = formData.get("color") || "#6b7280"
    const isDefaultValue = formData.get("isDefault")
    const isFinalValue = formData.get("isFinal")
    const isUrgentValue = formData.get("isUrgent")
    const isActiveValue = formData.get("isActive")
    const orderIndex = formData.get("orderIndex")
    
    // Handle boolean values - can be "true"/"false" string or boolean
    const isDefault = isDefaultValue === "true" || isDefaultValue === true
    const isFinal = isFinalValue === "true" || isFinalValue === true
    const isUrgent = isUrgentValue === "true" || isUrgentValue === true
    const isActive = isActiveValue === "true" || isActiveValue === true
    
    console.log("Update - Parsed form values:", {
        name,
        color,
        isDefaultValue,
        isDefault,
        isFinalValue,
        isFinal,
        isUrgentValue,
        isUrgent,
        isActiveValue,
        isActive,
        orderIndex
    })

    // If setting as default, unset other defaults
    if (isDefault && !existingStatus.isDefault) {
        try {
            await prisma.projectStatus.updateMany({
                where: { isDefault: true },
                data: { isDefault: false },
            })
        } catch (error: any) {
            console.error("Error unsetting other defaults:", error)
        }
    }

    const validated = projectStatusSchema.safeParse({
        name,
        color,
        isDefault,
        isFinal,
        isUrgent,
        orderIndex: orderIndex ? parseInt(orderIndex as string) : existingStatus.orderIndex,
        isActive,
    })

    if (!validated.success) {
        return { error: "Validation failed", details: validated.error.format() }
    }

    try {
        const projectStatus = await prisma.projectStatus.update({
            where: { id },
            data: validated.data,
        })

        // Log activity
        await logActivity({
            actionType: "project_status_updated",
            actionCategory: "settings",
            actionSummary: `Project status "${projectStatus.name}" updated`,
            actionDetails: {
                statusId: projectStatus.id,
                statusName: projectStatus.name,
                oldValues: {
                    name: existingStatus.name,
                    color: existingStatus.color,
                    isDefault: existingStatus.isDefault,
                    isFinal: existingStatus.isFinal,
                    isUrgent: existingStatus.isUrgent,
                },
                newValues: {
                    name: projectStatus.name,
                    color: projectStatus.color,
                    isDefault: projectStatus.isDefault,
                    isFinal: projectStatus.isFinal,
                    isUrgent: projectStatus.isUrgent,
                },
            },
            performedById: parseInt(session.user.id),
            entityType: "project_status",
            entityId: projectStatus.id,
        })

        revalidatePath("/dashboard/settings/projects")
        revalidatePath("/dashboard/projects")
        
        return { success: true, projectStatus }
    } catch (error: any) {
        console.error("Error updating project status:", error)
        
        if (error.code === "P2002") {
            return { error: "A project status with this name already exists" }
        }
        
        return { error: "Failed to update project status", details: error.message }
    }
}

export async function deleteProjectStatus(id: number) {
    const session = await getServerSession(authOptions)
    if (!session) return { error: "Unauthorized" }

    if (session.user.role !== "admin") {
        return { error: "Only admins can delete project statuses" }
    }

    try {
        // Check if any projects are using this status
        const projectsCount = await prisma.project.count({
            where: { projectStatusId: id },
        })

        if (projectsCount > 0) {
            return { 
                error: `Cannot delete project status. ${projectsCount} project(s) are using it. Deactivate it instead.` 
            }
        }

        const status = await prisma.projectStatus.findUnique({
            where: { id },
        })

        if (!status) {
            return { error: "Project status not found" }
        }

        await prisma.projectStatus.delete({
            where: { id },
        })

        // Log activity
        await logActivity({
            actionType: "project_status_deleted",
            actionCategory: "settings",
            actionSummary: `Project status "${status.name}" deleted`,
            actionDetails: {
                statusId: status.id,
                statusName: status.name,
            },
            performedById: parseInt(session.user.id),
            entityType: "project_status",
            entityId: status.id,
        })

        revalidatePath("/dashboard/settings/projects")
        revalidatePath("/dashboard/projects")
        
        return { success: true }
    } catch (error: any) {
        console.error("Error deleting project status:", error)
        return { error: "Failed to delete project status", details: error.message }
    }
}

export async function toggleProjectStatusActive(id: number) {
    const session = await getServerSession(authOptions)
    if (!session) return { error: "Unauthorized" }

    if (session.user.role !== "admin") {
        return { error: "Only admins can toggle project status" }
    }

    try {
        const current = await prisma.projectStatus.findUnique({
            where: { id },
            select: { isActive: true, name: true },
        })

        if (!current) {
            return { error: "Project status not found" }
        }

        const projectStatus = await prisma.projectStatus.update({
            where: { id },
            data: { isActive: !current.isActive },
        })

        // Log activity
        await logActivity({
            actionType: "project_status_toggled",
            actionCategory: "settings",
            actionSummary: `Project status "${projectStatus.name}" ${projectStatus.isActive ? "activated" : "deactivated"}`,
            actionDetails: {
                statusId: projectStatus.id,
                statusName: projectStatus.name,
                isActive: projectStatus.isActive,
            },
            performedById: parseInt(session.user.id),
            entityType: "project_status",
            entityId: projectStatus.id,
        })

        revalidatePath("/dashboard/settings/projects")
        revalidatePath("/dashboard/projects")
        
        return { success: true, projectStatus }
    } catch (error: any) {
        console.error("Error toggling project status:", error)
        return { error: "Failed to toggle project status", details: error.message }
    }
}

export async function reorderProjectStatuses(ids: number[]) {
    const session = await getServerSession(authOptions)
    if (!session) return { error: "Unauthorized" }

    if (session.user.role !== "admin") {
        return { error: "Only admins can reorder project statuses" }
    }

    try {
        // Update order index for each project status
        const updates = ids.map((id, index) =>
            prisma.projectStatus.update({
                where: { id },
                data: { orderIndex: index },
            })
        )

        await Promise.all(updates)

        // Log activity
        await logActivity({
            actionType: "project_statuses_reordered",
            actionCategory: "settings",
            actionSummary: "Project statuses reordered",
            actionDetails: {
                statusIds: ids,
            },
            performedById: parseInt(session.user.id),
        })

        revalidatePath("/dashboard/settings/projects")
        revalidatePath("/dashboard/projects")
        
        return { success: true }
    } catch (error: any) {
        console.error("Error reordering project statuses:", error)
        return { error: "Failed to reorder project statuses", details: error.message }
    }
}

