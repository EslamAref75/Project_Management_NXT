"use server"

import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { logActivity } from "@/lib/activity-logger"
import { createProjectNotification } from "./project-notifications"
import { z } from "zod"

const markUrgentSchema = z.object({
    projectId: z.coerce.number(),
    reason: z.string().min(10, "Reason must be at least 10 characters"),
})

export async function markProjectUrgent(formData: FormData) {
    const session = await getServerSession(authOptions)
    if (!session) return { error: "Unauthorized" }

    const projectId = formData.get("projectId")
    const reason = formData.get("reason")

    const validated = markUrgentSchema.safeParse({ projectId, reason })

    if (!validated.success) {
        return { error: "Validation failed", details: validated.error.format() }
    }

    try {
        // Check permissions
        const project = await prisma.project.findUnique({
            where: { id: validated.data.projectId },
            include: {
                projectManager: true,
                projectUsers: true,
                projectTeams: {
                    include: {
                        team: {
                            include: {
                                teamLead: true,
                                members: true
                            }
                        }
                    }
                }
            }
        })

        if (!project) {
            return { error: "Project not found" }
        }

        const userId = parseInt(session.user.id)
        const userRole = session.user.role || "developer"
        const isAdmin = userRole === "admin"
        const isPM = project.projectManagerId === userId || project.createdById === userId
        const isTeamLead = project.projectTeams.some(pt => 
            pt.team.teamLeadId === userId
        )

        // Check if user has permission to mark urgent
        if (!isAdmin && !isPM && !isTeamLead) {
            return { error: "Unauthorized: Only admins, project managers, and team leads can mark projects as urgent" }
        }

        // Update project priority
        const updatedProject = await prisma.project.update({
            where: { id: validated.data.projectId },
            data: {
                priority: "urgent",
                urgentReason: validated.data.reason,
                urgentMarkedAt: new Date(),
                urgentMarkedById: userId,
            },
            include: {
                projectManager: true,
                projectUsers: {
                    select: {
                        userId: true
                    }
                },
                projectTeams: {
                    include: {
                        team: {
                            select: {
                                teamLeadId: true,
                                members: {
                                    select: {
                                        userId: true
                                    }
                                }
                            }
                        }
                    }
                }
            }
        })

        // Collect users to notify
        const usersToNotify = new Set<number>()
        
        // Add project manager
        if (updatedProject.projectManagerId) {
            usersToNotify.add(updatedProject.projectManagerId)
        }

        // Add project users
        updatedProject.projectUsers.forEach(pu => {
            usersToNotify.add(pu.userId)
        })

        // Add team leads
        updatedProject.projectTeams.forEach(pt => {
            if (pt.team.teamLeadId) {
                usersToNotify.add(pt.team.teamLeadId)
            }
            // Add team members
            pt.team.members.forEach(member => {
                usersToNotify.add(member.userId)
            })
        })

        // Add all admins
        const admins = await prisma.user.findMany({
            where: { role: "admin" },
            select: { id: true }
        })
        admins.forEach(admin => usersToNotify.add(admin.id))

        // Send urgent notifications to all relevant users
        const notificationPromises = Array.from(usersToNotify).map(userId => 
            createProjectNotification(
                validated.data.projectId,
                userId,
                {
                    type: "project_urgent",
                    entityType: "project",
                    entityId: validated.data.projectId,
                    title: `🚨 URGENT: ${updatedProject.name}`,
                    message: `This project has been marked as URGENT. Reason: ${validated.data.reason}`,
                    soundRequired: true,
                    isUrgent: true,
                    requiresAcknowledgment: true,
                }
            )
        )

        await Promise.all(notificationPromises)

        // Log activity
        await logActivity({
            actionType: "project_marked_urgent",
            actionCategory: "project",
            actionSummary: `Project "${updatedProject.name}" marked as URGENT`,
            actionDetails: {
                projectId: updatedProject.id,
                projectName: updatedProject.name,
                reason: validated.data.reason,
                notifiedUsers: Array.from(usersToNotify).length,
            },
            performedById: userId,
            projectId: validated.data.projectId,
            entityType: "project",
            entityId: validated.data.projectId,
        })

        revalidatePath(`/dashboard/projects/${validated.data.projectId}`)
        revalidatePath("/dashboard")
        revalidatePath("/dashboard/projects")

        return { success: true, project: updatedProject }
    } catch (error: any) {
        console.error("Error marking project as urgent:", error)
        return { error: "Failed to mark project as urgent", details: error.message }
    }
}

export async function acknowledgeUrgentProject(projectId: number) {
    const session = await getServerSession(authOptions)
    if (!session) return { error: "Unauthorized" }

    const userId = parseInt(session.user.id)

    try {
        const project = await prisma.project.findUnique({
            where: { id: projectId }
        })

        if (!project) {
            return { error: "Project not found" }
        }

        if (project.priority !== "urgent") {
            return { error: "Project is not marked as urgent" }
        }

        // Create or update acknowledgment
        await prisma.urgentProjectAcknowledgement.upsert({
            where: {
                projectId_userId: {
                    projectId: projectId,
                    userId: userId
                }
            },
            create: {
                projectId: projectId,
                userId: userId,
            },
            update: {
                acknowledgedAt: new Date()
            }
        })

        // Mark urgent notifications as acknowledged for this user
        await prisma.projectNotification.updateMany({
            where: {
                projectId: projectId,
                userId: userId,
                isUrgent: true,
                requiresAcknowledgment: true,
            },
            data: {
                acknowledgedAt: new Date(),
                isRead: true,
            }
        })

        // Log activity
        await logActivity({
            actionType: "project_urgent_acknowledged",
            actionCategory: "project",
            actionSummary: `Acknowledged urgent project "${project.name}"`,
            actionDetails: {
                projectId: project.id,
                projectName: project.name,
            },
            performedById: userId,
            projectId: projectId,
            entityType: "project",
            entityId: projectId,
        })

        revalidatePath(`/dashboard/projects/${projectId}`)
        revalidatePath("/dashboard")

        return { success: true }
    } catch (error: any) {
        console.error("Error acknowledging urgent project:", error)
        return { error: "Failed to acknowledge urgent project", details: error.message }
    }
}

export async function removeUrgentPriority(projectId: number) {
    const session = await getServerSession(authOptions)
    if (!session) return { error: "Unauthorized" }

    const userId = parseInt(session.user.id)
    const userRole = session.user.role || "developer"
    const isAdmin = userRole === "admin"

    try {
        const project = await prisma.project.findUnique({
            where: { id: projectId }
        })

        if (!project) {
            return { error: "Project not found" }
        }

        // Only admin or project manager can remove urgent priority
        if (!isAdmin && project.projectManagerId !== userId && project.createdById !== userId) {
            return { error: "Unauthorized: Only admins and project managers can remove urgent priority" }
        }

        // Update project
        await prisma.project.update({
            where: { id: projectId },
            data: {
                priority: "normal",
                urgentReason: null,
                urgentMarkedAt: null,
                urgentMarkedById: null,
            }
        })

        // Mark all urgent notifications as read (no longer urgent)
        await prisma.projectNotification.updateMany({
            where: {
                projectId: projectId,
                isUrgent: true,
            },
            data: {
                isRead: true,
                acknowledgedAt: new Date(),
            }
        })

        // Log activity
        await logActivity({
            actionType: "project_urgent_removed",
            actionCategory: "project",
            actionSummary: `Removed urgent priority from project "${project.name}"`,
            actionDetails: {
                projectId: project.id,
                projectName: project.name,
            },
            performedById: userId,
            projectId: projectId,
            entityType: "project",
            entityId: projectId,
        })

        revalidatePath(`/dashboard/projects/${projectId}`)
        revalidatePath("/dashboard")
        revalidatePath("/dashboard/projects")

        return { success: true }
    } catch (error: any) {
        console.error("Error removing urgent priority:", error)
        return { error: "Failed to remove urgent priority", details: error.message }
    }
}

export async function getUrgentProjects() {
    const session = await getServerSession(authOptions)
    if (!session) return { error: "Unauthorized" }

    const userId = parseInt(session.user.id)
    const userRole = session.user.role || "developer"
    const isAdmin = userRole === "admin"

    try {
        const where: any = {
            priority: "urgent"
        }

        // Filter by user's projects if not admin
        if (!isAdmin) {
            where.OR = [
                { projectManagerId: userId },
                { createdById: userId },
                { projectUsers: { some: { userId } } },
                { projectTeams: { some: { team: { teamLeadId: userId } } } },
                { projectTeams: { some: { team: { members: { some: { userId } } } } } }
            ]
        }

        const projects = await prisma.project.findMany({
            where,
            include: {
                projectManager: {
                    select: {
                        id: true,
                        username: true,
                        avatarUrl: true
                    }
                },
                urgentMarkedBy: {
                    select: {
                        id: true,
                        username: true
                    }
                },
                urgentAcknowledgments: {
                    where: { userId },
                    select: {
                        acknowledgedAt: true
                    }
                }
            },
            orderBy: { urgentMarkedAt: "desc" }
        })

        return { success: true, projects }
    } catch (error: any) {
        console.error("Error fetching urgent projects:", error)
        return { error: "Failed to fetch urgent projects", details: error.message }
    }
}

export async function hasAcknowledgedUrgent(projectId: number) {
    const session = await getServerSession(authOptions)
    if (!session) return false

    const userId = parseInt(session.user.id)

    try {
        const acknowledgment = await prisma.urgentProjectAcknowledgement.findUnique({
            where: {
                projectId_userId: {
                    projectId,
                    userId
                }
            }
        })

        return !!acknowledgment
    } catch (error) {
        console.error("Error checking acknowledgment:", error)
        return false
    }
}

