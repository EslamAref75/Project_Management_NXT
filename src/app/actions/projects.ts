"use server"

import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { z } from "zod"
import { revalidatePath } from "next/cache"
import { logActivity } from "@/lib/activity-logger"

const projectSchema = z.object({
    name: z.string().min(1, "Name is required"),
    type: z.string().optional(), // Legacy field, kept for backward compatibility
    projectTypeId: z.coerce.number().optional().nullable(),
    projectStatusId: z.coerce.number().optional().nullable(),
    description: z.string().optional(),
    scope: z.string().optional(),
    status: z.string().optional(), // Legacy field, kept for backward compatibility
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    projectManagerId: z.coerce.number().optional(),
})

export async function getProjects() {
    const session = await getServerSession(authOptions)
    if (!session) throw new Error("Unauthorized")

    // For now, fetch all projects. Later we can filter by user/team.
    const projects = await prisma.project.findMany({
        orderBy: { createdAt: "desc" },
        include: {
            tasks: {
                select: { id: true, status: true }
            }
        }
    })

    return projects
}

export async function getProjectsWithFilters(params: {
    search?: string
    category?: string[]
    status?: string[]
    startDate?: string
    endDate?: string
    projectManager?: string
    page?: number
    limit?: number
}) {
    const session = await getServerSession(authOptions)
    if (!session) return { error: "Unauthorized" }

    const {
        search = "",
        category = [],
        status = [],
        startDate,
        endDate,
        projectManager,
        page = 1,
        limit = 12,
    } = params

    try {
        const where: any = {}

        // Search filter
        if (search) {
            where.OR = [
                { name: { contains: search } }, // Removed mode: "insensitive" for SQLite compatibility
            ]
        }

        // Category filter
        if (category.length > 0) {
            where.type = { in: category }
        }

        // Status filter
        if (status.length > 0) {
            where.status = { in: status }
        }

        // Date range filter
        if (startDate || endDate) {
            const dateConditions: any[] = []
            if (startDate) {
                dateConditions.push({ startDate: { gte: new Date(startDate) } })
            }
            if (endDate) {
                dateConditions.push({ endDate: { lte: new Date(endDate) } })
            }
            if (dateConditions.length > 0) {
                where.AND = [...(where.AND || []), ...dateConditions]
            }
        }

        // Project Manager filter
        if (projectManager) {
            where.projectManagerId = parseInt(projectManager)
        }

        // Role-based filtering
        if (session.user.role !== "admin") {
            // For non-admins, show only projects they're assigned to
            const userConditions = [
                { projectManagerId: parseInt(session.user.id) },
                { createdById: parseInt(session.user.id) },
            ]
            
            if (where.OR) {
                where.AND = [
                    ...(where.AND || []),
                    { OR: [...where.OR, ...userConditions] }
                ]
                delete where.OR
            } else {
                where.OR = userConditions
            }
        }

        const skip = (page - 1) * limit

        const [projects, total] = await Promise.all([
            prisma.project.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: "desc" },
                include: {
                    tasks: {
                        select: { id: true, status: true },
                    },
                    projectManager: {
                        select: {
                            id: true,
                            username: true,
                            email: true,
                            avatarUrl: true,
                        },
                    },
                },
            }),
            prisma.project.count({ where }),
        ])

        return {
            success: true,
            projects,
            total,
            page,
            limit,
        }
    } catch (error: any) {
        console.error("Error fetching projects with filters:", error)
        return {
            error: error.message || "Failed to fetch projects",
        }
    }
}

export async function createProject(formData: FormData) {
    const session = await getServerSession(authOptions)
    if (!session) return { error: "Unauthorized" }

    const name = formData.get("name") as string
    const type = formData.get("type") as string
    const projectTypeId = formData.get("projectTypeId")
    const description = formData.get("description") as string
    const scope = formData.get("scope") as string
    const startDate = formData.get("startDate") as string
    const endDate = formData.get("endDate") as string
    const projectManagerId = formData.get("projectManagerId")

    // If projectTypeId is provided, get the type name from the ProjectType
    let typeName = type || ""
    if (projectTypeId) {
        try {
            const projectType = await prisma.projectType.findUnique({
                where: { id: parseInt(projectTypeId as string) },
                select: { name: true }
            })
            if (projectType) {
                typeName = projectType.name
            }
        } catch (error) {
            console.error("Error fetching project type:", error)
        }
    }

    const validated = projectSchema.safeParse({
        name,
        type: typeName || undefined,
        projectTypeId: projectTypeId ? parseInt(projectTypeId as string) : null,
        description,
        scope,
        startDate,
        endDate,
        projectManagerId
    })

    if (!validated.success) {
        console.error(validated.error)
        return { error: "Validation failed", details: validated.error.format() }
    }

    try {
        const project = await prisma.project.create({
            data: {
                name: validated.data.name,
                type: validated.data.type || "",
                projectTypeId: validated.data.projectTypeId,
                description: validated.data.description,
                scope: validated.data.scope,
                status: validated.data.status,
                startDate: validated.data.startDate ? new Date(validated.data.startDate) : null,
                endDate: validated.data.endDate ? new Date(validated.data.endDate) : null,
                projectManagerId: (validated.data.projectManagerId && validated.data.projectManagerId > 0) ? validated.data.projectManagerId : null,
                createdById: parseInt(session.user.id),
            }
        })

        // Log activity
        try {
            await logActivity({
                actionType: "project_created",
                actionCategory: "project",
                actionSummary: `Project "${project.name}" created`,
                actionDetails: {
                    projectId: project.id,
                    projectName: project.name,
                    projectType: project.type,
                    status: project.status,
                },
                performedById: parseInt(session.user.id),
                projectId: project.id,
                entityType: "project",
                entityId: project.id,
            })
            console.log("[Project Creation] Activity logging completed")
        } catch (logError) {
            console.error("[Project Creation] Failed to log activity:", logError)
            // Don't fail the project creation if logging fails
        }

        revalidatePath("/dashboard/projects")
        revalidatePath("/dashboard")
        return { success: true }
    } catch (e) {
        console.error(e)
        return { error: "Failed to create project" }
    }
}

export async function getProject(id: number) {
    const session = await getServerSession(authOptions)
    if (!session) throw new Error("Unauthorized")

    const project = await prisma.project.findUnique({
        where: { id },
        include: {
            projectType: {
                select: {
                    id: true,
                    name: true
                }
            },
            projectStatus: {
                select: {
                    id: true,
                    name: true
                }
            },
            tasks: {
                orderBy: { createdAt: "desc" },
                include: {
                    assignees: { select: { username: true, email: true, avatarUrl: true } },
                    attachments: true,
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
                }
            },
            projectManager: {
                select: {
                    id: true,
                    username: true,
                    email: true,
                    avatarUrl: true
                }
            },
            urgentMarkedBy: {
                select: {
                    id: true,
                    username: true
                }
            },
            projectTeams: {
                include: {
                    team: {
                        include: {
                            teamLead: {
                                select: { id: true, username: true, email: true, avatarUrl: true }
                            },
                            members: {
                                include: {
                                    user: {
                                        select: { id: true, username: true, email: true, avatarUrl: true }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    })

    return project
}

export async function updateProject(id: number, formData: FormData) {
    const session = await getServerSession(authOptions)
    if (!session) return { error: "Unauthorized" }

    // Verify project exists and user has permission
    const existingProject = await prisma.project.findUnique({
        where: { id },
        select: { id: true, createdById: true }
    })

    if (!existingProject) {
        return { error: "Project not found" }
    }

    // Only creator or admin can update
    const isAdmin = session.user.role === "admin"
    const isCreator = existingProject.createdById === parseInt(session.user.id)
    
    if (!isAdmin && !isCreator) {
        return { error: "Unauthorized: You can only edit projects you created" }
    }

    const name = formData.get("name") as string
    const type = formData.get("type") as string
    const projectTypeId = formData.get("projectTypeId")
    const projectStatusId = formData.get("projectStatusId")
    const description = formData.get("description") as string
    const scope = formData.get("scope") as string
    const status = formData.get("status") as string
    const startDate = formData.get("startDate") as string
    const endDate = formData.get("endDate") as string
    const projectManagerId = formData.get("projectManagerId")

    // If projectTypeId is provided, get the type name from the ProjectType
    let typeName = type || ""
    if (projectTypeId) {
        try {
            const projectType = await prisma.projectType.findUnique({
                where: { id: parseInt(projectTypeId as string) },
                select: { name: true }
            })
            if (projectType) {
                typeName = projectType.name
            }
        } catch (error) {
            console.error("Error fetching project type:", error)
        }
    }

    // If projectStatusId is provided, get the status name from the ProjectStatus
    let statusName = status || ""
    if (projectStatusId && prisma.projectStatus) {
        try {
            const projectStatus = await prisma.projectStatus.findUnique({
                where: { id: parseInt(projectStatusId as string) },
                select: { name: true }
            })
            if (projectStatus) {
                statusName = projectStatus.name
            }
        } catch (error) {
            console.error("Error fetching project status:", error)
        }
    }

    const validated = projectSchema.safeParse({
        name,
        type: typeName || undefined,
        projectTypeId: projectTypeId ? parseInt(projectTypeId as string) : null,
        projectStatusId: projectStatusId ? parseInt(projectStatusId as string) : null,
        description,
        scope,
        status: statusName || undefined,
        startDate,
        endDate,
        projectManagerId
    })

    if (!validated.success) {
        console.error(validated.error)
        return { error: "Validation failed", details: validated.error.format() }
    }

    try {
        await prisma.project.update({
            where: { id },
            data: {
                name: validated.data.name,
                type: validated.data.type || "",
                projectTypeId: validated.data.projectTypeId,
                projectStatusId: validated.data.projectStatusId,
                description: validated.data.description,
                scope: validated.data.scope,
                status: statusName || validated.data.status || "",
                startDate: validated.data.startDate ? new Date(validated.data.startDate) : null,
                endDate: validated.data.endDate ? new Date(validated.data.endDate) : null,
                projectManagerId: (validated.data.projectManagerId && validated.data.projectManagerId > 0) ? validated.data.projectManagerId : null,
            }
        })
        revalidatePath("/dashboard/projects")
        revalidatePath(`/dashboard/projects/${id}`)
        revalidatePath("/dashboard")
        return { success: true }
    } catch (e: any) {
        console.error(e)
        return { error: "Failed to update project", details: e.message }
    }
}

export async function deleteProject(id: number) {
    const session = await getServerSession(authOptions)
    if (!session) return { error: "Unauthorized" }

    // Verify project exists and user has permission
    const project = await prisma.project.findUnique({
        where: { id },
        select: { id: true, createdById: true, name: true }
    })

    if (!project) {
        return { error: "Project not found" }
    }

    // Only creator or admin can delete (you can add role check here)
    if (project.createdById !== parseInt(session.user.id)) {
        return { error: "Unauthorized: You can only delete projects you created" }
    }

    // Get task count for logging/notification purposes
    const taskCount = await prisma.task.count({
        where: { projectId: id }
    })

    try {
        // Delete project - tasks will be automatically deleted due to cascade delete
        await prisma.project.delete({
            where: { id }
        })
        
        console.log(`Project ${id} deleted successfully${taskCount > 0 ? ` along with ${taskCount} task(s)` : ""}`)
        revalidatePath("/dashboard/projects")
        revalidatePath("/dashboard")
        return { success: true }
    } catch (e: any) {
        console.error(e)
        return { error: "Failed to delete project", details: e.message }
    }
}
