"use server"

import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { z } from "zod"
import { revalidatePath } from "next/cache"
import { logActivity } from "@/lib/activity-logger"
import {
    requirePermission,
    handleAuthorizationError,
    ForbiddenError,
} from "@/lib/rbac-helpers"
import { PERMISSIONS } from "@/lib/permissions"

const teamSchema = z.object({
    name: z.string().min(1, "Name is required"),
    description: z.string().optional(),
    teamLeadId: z.coerce.number().optional(),
    status: z.enum(["active", "inactive"]).default("active"),
    memberIds: z.array(z.number()).optional(),
})

export async function getTeams() {
    const session = await getServerSession(authOptions)
    if (!session) throw new Error("Unauthorized")

    const teams = await prisma.team.findMany({
        include: {
            _count: {
                select: { 
                    users: true, 
                    tasks: true,
                    members: true,
                    projectTeams: true 
                }
            },
            teamLead: {
                select: { id: true, username: true, email: true, avatarUrl: true }
            },
            users: {
                take: 5,
                select: { username: true, email: true, avatarUrl: true }
            },
            members: {
                take: 5,
                include: {
                    user: {
                        select: { id: true, username: true, email: true, avatarUrl: true }
                    }
                }
            }
        },
        orderBy: { createdAt: "desc" }
    })

    return teams
}

export async function getTeam(id: number) {
    const session = await getServerSession(authOptions)
    if (!session) throw new Error("Unauthorized")

    const team = await prisma.team.findUnique({
        where: { id },
        include: {
            teamLead: {
                select: { id: true, username: true, email: true, avatarUrl: true, role: true }
            },
            members: {
                include: {
                    user: {
                        select: { id: true, username: true, email: true, avatarUrl: true, role: true }
                    }
                },
                orderBy: { joinedAt: "desc" }
            },
            projectTeams: {
                include: {
                    project: {
                        select: {
                            id: true,
                            name: true,
                            status: true,
                            startDate: true,
                            endDate: true,
                            projectManager: {
                                select: { id: true, username: true, email: true }
                            }
                        }
                    }
                },
                orderBy: { assignedAt: "desc" }
            },
            _count: {
                select: { tasks: true, members: true, projectTeams: true }
            }
        }
    })

    return team
}

export async function getTeamProjects(teamId: number) {
    const session = await getServerSession(authOptions)
    if (!session) throw new Error("Unauthorized")

    const projectTeams = await prisma.projectTeam.findMany({
        where: { teamId },
        include: {
            project: {
                select: {
                    id: true,
                    name: true,
                    status: true,
                    startDate: true,
                    endDate: true,
                    projectManager: {
                        select: { id: true, username: true, email: true }
                    }
                }
            }
        },
        orderBy: { assignedAt: "desc" }
    })

    return projectTeams.map(pt => pt.project)
}

export async function createTeam(formData: FormData) {
    const session = await getServerSession(authOptions)
    if (!session) return { error: "Unauthorized" }

    try {
        await requirePermission(parseInt(session.user.id), "team.create")
    } catch (error: any) {
        return handleAuthorizationError(error)
    }

    const name = formData.get("name") as string
    const description = formData.get("description") as string
    const teamLeadId = formData.get("teamLeadId")
    const status = formData.get("status") as string || "active"
    const memberIdsStr = formData.get("memberIds") as string

    let memberIds: number[] = []
    if (memberIdsStr) {
        try {
            memberIds = JSON.parse(memberIdsStr)
        } catch {
            // Ignore parse errors
        }
    }

    const validated = teamSchema.safeParse({ 
        name, 
        description, 
        teamLeadId: teamLeadId ? parseInt(teamLeadId as string) : undefined,
        status: status as "active" | "inactive",
        memberIds
    })

    if (!validated.success) {
        return { error: "Validation failed" }
    }

    try {
        const team = await prisma.team.create({
            data: {
                name: validated.data.name,
                description: validated.data.description,
                teamLeadId: validated.data.teamLeadId || null,
                status: validated.data.status,
                members: validated.data.memberIds && validated.data.memberIds.length > 0 ? {
                    create: validated.data.memberIds.map(userId => ({
                        userId,
                        role: userId === validated.data.teamLeadId ? "lead" : "member"
                    }))
                } : undefined
            },
            include: {
                teamLead: true,
                members: {
                    include: { user: true }
                }
            }
        })

        // Log activity
        await logActivity({
            actionType: "team_created",
            actionCategory: "project",
            actionSummary: `Team "${team.name}" created`,
            actionDetails: {
                teamId: team.id,
                teamName: team.name,
                status: team.status,
                teamLeadId: team.teamLeadId,
                memberCount: team.members.length,
            },
            performedById: parseInt(session.user.id),
            entityType: "team",
            entityId: team.id,
        })

        revalidatePath("/dashboard/teams")
        return { success: true, team }
    } catch (e) {
        console.error(e)
        return { error: "Failed to create team" }
    }
}

export async function updateTeam(id: number, formData: FormData) {
    const session = await getServerSession(authOptions)
    if (!session) return { error: "Unauthorized" }

    try {
        await requirePermission(parseInt(session.user.id), "team.update")
    } catch (error: any) {
        return handleAuthorizationError(error)
    }

    const name = formData.get("name") as string
    const description = formData.get("description") as string
    const teamLeadId = formData.get("teamLeadId")
    const status = formData.get("status") as string

    const validated = teamSchema.partial().safeParse({ 
        name, 
        description, 
        teamLeadId: teamLeadId ? parseInt(teamLeadId as string) : undefined,
        status: status as "active" | "inactive" | undefined
    })

    if (!validated.success) {
        return { error: "Validation failed" }
    }

    try {
        const team = await prisma.team.update({
            where: { id },
            data: {
                name: validated.data.name,
                description: validated.data.description,
                teamLeadId: validated.data.teamLeadId !== undefined ? validated.data.teamLeadId : undefined,
                status: validated.data.status,
            }
        })

        // Log activity
        await logActivity({
            actionType: "team_updated",
            actionCategory: "project",
            actionSummary: `Team "${team.name}" updated`,
            actionDetails: {
                teamId: team.id,
                teamName: team.name,
            },
            performedById: parseInt(session.user.id),
            entityType: "team",
            entityId: team.id,
        })

        revalidatePath("/dashboard/teams")
        revalidatePath(`/dashboard/teams/${id}`)
        return { success: true }
    } catch (e) {
        console.error(e)
        return { error: "Failed to update team" }
    }
}

export async function deleteTeam(id: number) {
    const session = await getServerSession(authOptions)
    if (!session) return { error: "Unauthorized" }

    try {
        await requirePermission(parseInt(session.user.id), PERMISSIONS.TEAM.DELETE)
    } catch (error: any) {
        return handleAuthorizationError(error)
    }

    try {
        const team = await prisma.team.findUnique({
            where: { id },
            select: { name: true }
        })

        await prisma.team.delete({
            where: { id }
        })

        // Log activity
        if (team) {
            await logActivity({
                actionType: "team_deleted",
                actionCategory: "project",
                actionSummary: `Team "${team.name}" deleted`,
                actionDetails: {
                    teamId: id,
                    teamName: team.name,
                },
                performedById: parseInt(session.user.id),
                entityType: "team",
                entityId: id,
            })
        }

        revalidatePath("/dashboard/teams")
        return { success: true }
    } catch (e) {
        return { error: "Failed to delete team" }
    }
}

export async function addProjectToTeam(teamId: number, projectId: number) {
    const session = await getServerSession(authOptions)
    if (!session) return { error: "Unauthorized" }

    try {
        await requirePermission(parseInt(session.user.id), PERMISSIONS.TEAM.ASSIGN_PROJECT)
    } catch (error: any) {
        return handleAuthorizationError(error)
    }

    try {
        // Check if team is active
        const team = await prisma.team.findUnique({
            where: { id: teamId },
            select: { status: true, name: true }
        })

        if (!team) {
            return { error: "Team not found" }
        }

        if (team.status !== "active") {
            return { error: "Cannot assign projects to inactive teams" }
        }

        await prisma.projectTeam.create({
            data: {
                teamId,
                projectId
            }
        })

        // Log activity
        await logActivity({
            actionType: "project_assigned_to_team",
            actionCategory: "project",
            actionSummary: `Project assigned to team "${team.name}"`,
            actionDetails: {
                teamId,
                projectId,
            },
            performedById: parseInt(session.user.id),
            projectId,
            entityType: "team",
            entityId: teamId,
        })

        revalidatePath(`/dashboard/teams/${teamId}`)
        return { success: true }
    } catch (e: any) {
        if (e.code === "P2002") {
            return { error: "Project is already assigned to this team" }
        }
        console.error(e)
        return { error: "Failed to assign project to team" }
    }
}

export async function removeProjectFromTeam(teamId: number, projectId: number) {
    const session = await getServerSession(authOptions)
    if (!session) return { error: "Unauthorized" }

    try {
        await requirePermission(parseInt(session.user.id), PERMISSIONS.TEAM.REMOVE_PROJECT)
    } catch (error: any) {
        return handleAuthorizationError(error)
    }

    try {
        const team = await prisma.team.findUnique({
            where: { id: teamId },
            select: { name: true }
        })

        await prisma.projectTeam.delete({
            where: {
                projectId_teamId: {
                    projectId,
                    teamId
                }
            }
        })

        // Log activity
        if (team) {
            await logActivity({
                actionType: "project_removed_from_team",
                actionCategory: "project",
                actionSummary: `Project removed from team "${team.name}"`,
                actionDetails: {
                    teamId,
                    projectId,
                },
                performedById: parseInt(session.user.id),
                projectId,
                entityType: "team",
                entityId: teamId,
            })
        }

        revalidatePath(`/dashboard/teams/${teamId}`)
        return { success: true }
    } catch (e) {
        console.error(e)
        return { error: "Failed to remove project from team" }
    }
}

export async function addMemberToTeam(teamId: number, userId: number, role: string = "member") {
    const session = await getServerSession(authOptions)
    if (!session) return { error: "Unauthorized" }

    try {
        await requirePermission(parseInt(session.user.id), PERMISSIONS.TEAM.ADD_MEMBER)
    } catch (error: any) {
        return handleAuthorizationError(error)
    }

    try {
        await prisma.teamMember.create({
            data: {
                teamId,
                userId,
                role
            }
        })

        revalidatePath(`/dashboard/teams/${teamId}`)
        return { success: true }
    } catch (e: any) {
        if (e.code === "P2002") {
            return { error: "User is already a member of this team" }
        }
        console.error(e)
        return { error: "Failed to add member to team" }
    }
}

export async function removeMemberFromTeam(teamId: number, userId: number) {
    const session = await getServerSession(authOptions)
    if (!session) return { error: "Unauthorized" }

    try {
        await requirePermission(parseInt(session.user.id), PERMISSIONS.TEAM.REMOVE_MEMBER)
    } catch (error: any) {
        return handleAuthorizationError(error)
    }

    try {
        await prisma.teamMember.delete({
            where: {
                teamId_userId: {
                    teamId,
                    userId
                }
            }
        })

        revalidatePath(`/dashboard/teams/${teamId}`)
        return { success: true }
    } catch (e) {
        console.error(e)
        return { error: "Failed to remove member from team" }
    }
}

export async function getAvailableProjects(teamId: number) {
    const session = await getServerSession(authOptions)
    if (!session) throw new Error("Unauthorized")

    // ✅ OPTIMIZED: Single query instead of N+1 pattern
    // Get all projects NOT assigned to this team using relation filter
    const projects = await prisma.project.findMany({
        where: {
            projectTeams: {
                none: { teamId } // No team assignment with this teamId
            }
        },
        select: {
            id: true,
            name: true,
            status: true,
            projectManager: {
                select: { id: true, username: true, email: true }
            }
        },
        orderBy: { name: "asc" }
    })

    return projects
}
