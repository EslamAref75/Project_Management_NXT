"use server"

import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { logActivity } from "@/lib/activity-logger"

const projectTypeSchema = z.object({
    name: z.string().min(1, "Name is required").max(100),
    description: z.string().optional(),
    isActive: z.boolean().default(true),
    displayOrder: z.number().int().default(0),
    color: z.string().optional(),
    icon: z.string().optional(),
})

export async function getProjectTypes(includeInactive = false, includeUsageCount = false) {
    const session = await getServerSession(authOptions)
    if (!session) return { error: "Unauthorized" }

    try {
        const where = includeInactive ? {} : { isActive: true }
        
        const projectTypes = await prisma.projectType.findMany({
            where,
            orderBy: [
                { displayOrder: "asc" },
                { name: "asc" }
            ],
            include: includeUsageCount ? {
                _count: {
                    select: { projects: true }
                }
            } : undefined,
        })

        // Format the result to include usage count
        const formattedTypes = includeUsageCount
            ? projectTypes.map(type => ({
                ...type,
                usageCount: (type as any)._count?.projects || 0
            }))
            : projectTypes

        return { success: true, projectTypes: formattedTypes }
    } catch (error: any) {
        console.error("Error fetching project types:", error)
        return { error: "Failed to fetch project types", details: error.message }
    }
}

export async function createProjectType(formData: FormData) {
    const session = await getServerSession(authOptions)
    if (!session) return { error: "Unauthorized" }

    if (session.user.role !== "admin") {
        return { error: "Only admins can create project types" }
    }

    const name = formData.get("name")
    const description = formData.get("description")
    const isActive = formData.get("isActive") === "true"
    const displayOrder = formData.get("displayOrder")
    const color = formData.get("color")
    const icon = formData.get("icon")

    const validated = projectTypeSchema.safeParse({
        name,
        description: description || undefined,
        isActive,
        displayOrder: displayOrder ? parseInt(displayOrder as string) : 0,
        color: color || undefined,
        icon: icon || undefined,
    })

    if (!validated.success) {
        return { error: "Validation failed", details: validated.error.format() }
    }

    try {
        const projectType = await prisma.projectType.create({
            data: validated.data,
        })

        // Log activity
        await logActivity({
            actionType: "project_type_created",
            actionCategory: "settings",
            actionSummary: `Project type "${projectType.name}" created`,
            actionDetails: {
                typeId: projectType.id,
                typeName: projectType.name,
                description: projectType.description,
                isActive: projectType.isActive,
            },
            performedById: parseInt(session.user.id),
            entityType: "project_type",
            entityId: projectType.id,
        })

        revalidatePath("/dashboard/settings")
        revalidatePath("/dashboard/projects")
        
        return { success: true, projectType }
    } catch (error: any) {
        console.error("Error creating project type:", error)
        console.error("Error details:", {
            code: error.code,
            meta: error.meta,
            message: error.message,
        })
        
        // Check if table doesn't exist
        if (error.code === "P2021" || error.message?.includes("does not exist")) {
            return { 
                error: "Database table not found. Please run the migration: npx prisma db execute --file prisma/migrations/20250103000001_add_project_types/migration.sql",
                details: error.message 
            }
        }
        
        return { error: "Failed to create project type", details: error.message }
    }
}

export async function updateProjectType(id: number, formData: FormData) {
    const session = await getServerSession(authOptions)
    if (!session) return { error: "Unauthorized" }

    if (session.user.role !== "admin") {
        return { error: "Only admins can update project types" }
    }

    const name = formData.get("name")
    const description = formData.get("description")
    const isActive = formData.get("isActive") === "true"
    const displayOrder = formData.get("displayOrder")
    const color = formData.get("color")
    const icon = formData.get("icon")

    const validated = projectTypeSchema.safeParse({
        name,
        description: description || undefined,
        isActive,
        displayOrder: displayOrder ? parseInt(displayOrder as string) : 0,
        color: color || undefined,
        icon: icon || undefined,
    })

    if (!validated.success) {
        return { error: "Validation failed", details: validated.error.format() }
    }

    try {
        const existing = await prisma.projectType.findUnique({
            where: { id },
        })

        if (!existing) {
            return { error: "Project type not found" }
        }

        const projectType = await prisma.projectType.update({
            where: { id },
            data: validated.data,
        })

        // Log activity
        await logActivity({
            actionType: "project_type_updated",
            actionCategory: "settings",
            actionSummary: `Project type "${projectType.name}" updated`,
            actionDetails: {
                typeId: projectType.id,
                oldValues: {
                    name: existing.name,
                    description: existing.description,
                    isActive: existing.isActive,
                },
                newValues: {
                    name: projectType.name,
                    description: projectType.description,
                    isActive: projectType.isActive,
                },
            },
            performedById: parseInt(session.user.id),
            entityType: "project_type",
            entityId: projectType.id,
        })

        revalidatePath("/dashboard/settings")
        revalidatePath("/dashboard/projects")
        
        return { success: true, projectType }
    } catch (error: any) {
        console.error("Error updating project type:", error)
        return { error: "Failed to update project type", details: error.message }
    }
}

export async function deleteProjectType(id: number) {
    const session = await getServerSession(authOptions)
    if (!session) return { error: "Unauthorized" }

    if (session.user.role !== "admin") {
        return { error: "Only admins can delete project types" }
    }

    try {
        // Check if any projects are using this type
        const projectsCount = await prisma.project.count({
            where: { projectTypeId: id },
        })

        if (projectsCount > 0) {
            return { 
                error: `Cannot delete project type. ${projectsCount} project(s) are using it.` 
            }
        }

        const type = await prisma.projectType.findUnique({
            where: { id },
        })

        if (!type) {
            return { error: "Project type not found" }
        }

        await prisma.projectType.delete({
            where: { id },
        })

        // Log activity
        await logActivity({
            actionType: "project_type_deleted",
            actionCategory: "settings",
            actionSummary: `Project type "${type.name}" deleted`,
            actionDetails: {
                typeId: type.id,
                typeName: type.name,
            },
            performedById: parseInt(session.user.id),
            entityType: "project_type",
            entityId: type.id,
        })

        revalidatePath("/dashboard/settings")
        revalidatePath("/dashboard/projects")
        
        return { success: true }
    } catch (error: any) {
        console.error("Error deleting project type:", error)
        return { error: "Failed to delete project type", details: error.message }
    }
}

export async function toggleProjectTypeStatus(id: number) {
    const session = await getServerSession(authOptions)
    if (!session) return { error: "Unauthorized" }

    if (session.user.role !== "admin") {
        return { error: "Only admins can toggle project type status" }
    }

    try {
        const current = await prisma.projectType.findUnique({
            where: { id },
            select: { isActive: true },
        })

        if (!current) {
            return { error: "Project type not found" }
        }

        const projectType = await prisma.projectType.update({
            where: { id },
            data: { isActive: !current.isActive },
        })

        // Log activity
        await logActivity({
            actionType: "project_type_toggled",
            actionCategory: "settings",
            actionSummary: `Project type "${projectType.name}" ${projectType.isActive ? "activated" : "deactivated"}`,
            actionDetails: {
                typeId: projectType.id,
                typeName: projectType.name,
                isActive: projectType.isActive,
            },
            performedById: parseInt(session.user.id),
            entityType: "project_type",
            entityId: projectType.id,
        })

        revalidatePath("/dashboard/settings")
        revalidatePath("/dashboard/projects")
        
        return { success: true, projectType }
    } catch (error: any) {
        console.error("Error toggling project type status:", error)
        return { error: "Failed to toggle project type status", details: error.message }
    }
}

export async function reorderProjectTypes(ids: number[]) {
    const session = await getServerSession(authOptions)
    if (!session) return { error: "Unauthorized" }

    if (session.user.role !== "admin") {
        return { error: "Only admins can reorder project types" }
    }

    try {
        // Update display order for each project type
        const updates = ids.map((id, index) =>
            prisma.projectType.update({
                where: { id },
                data: { displayOrder: index },
            })
        )

        await Promise.all(updates)

        revalidatePath("/dashboard/settings")
        revalidatePath("/dashboard/projects")
        
        return { success: true }
    } catch (error: any) {
        console.error("Error reordering project types:", error)
        return { error: "Failed to reorder project types", details: error.message }
    }
}

