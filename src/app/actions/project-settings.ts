"use server"

import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { hasPermissionWithoutRoleBypass } from "@/lib/rbac-helpers"

// Check if user can manage project settings
async function checkProjectSettingsAccess(projectId: number) {
    const session = await getServerSession(authOptions)
    if (!session) return { authorized: false, session: null, hasAdminPermission: false }

    const userId = parseInt(session.user.id)
    const hasAdminPermission = await hasPermissionWithoutRoleBypass(userId, "admin.access")

    // Check if user is project manager
    const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: {
            id: true,
            projectManagerId: true,
            createdById: true
        }
    })

    if (!project) {
        return { authorized: false, session: null, hasAdminPermission: false, error: "Project not found" }
    }

    const isProjectManager = project.projectManagerId === userId || project.createdById === userId

    const authorized = hasAdminPermission || isProjectManager

    return { authorized, session, hasAdminPermission, isProjectManager }
}

// Get all project settings with override resolution
export async function getProjectSettings(projectId: number) {
    const { authorized, session } = await checkProjectSettingsAccess(projectId)
    if (!authorized || !session) {
        return { error: "Unauthorized: Only project managers and admins can access project settings" }
    }

    try {
        const projectSettings = await prisma.projectSetting.findMany({
            where: { projectId },
            orderBy: [
                { category: "asc" },
                { key: "asc" }
            ],
            include: {
                updater: {
                    select: {
                        id: true,
                        username: true,
                        email: true
                    }
                }
            }
        })

        // Group settings by category
        const grouped: Record<string, any[]> = {}
        projectSettings.forEach(setting => {
            if (!grouped[setting.category]) {
                grouped[setting.category] = []
            }
            grouped[setting.category].push({
                id: setting.id,
                key: setting.key,
                value: JSON.parse(setting.value),
                category: setting.category,
                enabled: setting.enabled,
                updatedAt: setting.updatedAt,
                updatedBy: setting.updater
            })
        })

        return { success: true, settings: grouped }
    } catch (e: any) {
        console.error("getProjectSettings Error:", e)
        return { error: "Failed to fetch project settings", details: e.message }
    }
}

// Get resolved settings (project override + global default)
export async function getResolvedProjectSettings(projectId: number) {
    const session = await getServerSession(authOptions)
    if (!session) {
        return { error: "Unauthorized" }
    }

    try {
        // Get all project settings
        const projectSettings = await prisma.projectSetting.findMany({
            where: { projectId, enabled: true }
        })

        // Get all global settings
        const globalSettings = await prisma.systemSetting.findMany()

        // Create a map of resolved settings
        const resolved: Record<string, any> = {}

        // Process each category
        const categories = ["general", "tasks", "dependencies", "today_tasks", "workflow", "permissions", "notifications"]

        for (const category of categories) {
            const projectSetting = projectSettings.find(s => s.category === category && s.key === category)
            const globalSetting = globalSettings.find(s => s.category === category && s.key === category)

            if (projectSetting && projectSetting.enabled) {
                resolved[category] = {
                    value: JSON.parse(projectSetting.value),
                    source: "project",
                    enabled: true
                }
            } else if (globalSetting) {
                resolved[category] = {
                    value: JSON.parse(globalSetting.value),
                    source: "global",
                    enabled: false
                }
            } else {
                // System default (would need to be defined)
                resolved[category] = {
                    value: null,
                    source: "system",
                    enabled: false
                }
            }
        }

        return { success: true, settings: resolved }
    } catch (e: any) {
        console.error("getResolvedProjectSettings Error:", e)
        return { error: "Failed to fetch resolved settings", details: e.message }
    }
}

// Get a specific project setting
export async function getProjectSetting(projectId: number, key: string) {
    const { authorized, session } = await checkProjectSettingsAccess(projectId)
    if (!authorized || !session) {
        return { error: "Unauthorized" }
    }

    try {
        const setting = await prisma.projectSetting.findUnique({
            where: {
                projectId_key: {
                    projectId,
                    key
                }
            },
            include: {
                updater: {
                    select: {
                        id: true,
                        username: true,
                        email: true
                    }
                }
            }
        })

        if (!setting) {
            return { error: "Setting not found" }
        }

        return {
            success: true,
            setting: {
                id: setting.id,
                key: setting.key,
                value: JSON.parse(setting.value),
                category: setting.category,
                enabled: setting.enabled,
                updatedAt: setting.updatedAt,
                updatedBy: setting.updater
            }
        }
    } catch (e: any) {
        console.error("getProjectSetting Error:", e)
        return { error: "Failed to fetch setting", details: e.message }
    }
}

// Update a project setting
export async function updateProjectSetting(
    projectId: number,
    key: string,
    value: any,
    enabled: boolean = true,
    reason?: string
) {
    const { authorized, session, hasAdminPermission } = await checkProjectSettingsAccess(projectId)
    if (!authorized || !session) {
        return { error: "Unauthorized" }
    }

    try {
        // Get existing setting
        const existing = await prisma.projectSetting.findUnique({
            where: {
                projectId_key: {
                    projectId,
                    key
                }
            }
        })

        const oldValue = existing?.value || null
        const newValue = JSON.stringify(value)

        // Update or create setting
        const updated = await prisma.projectSetting.upsert({
            where: {
                projectId_key: {
                    projectId,
                    key
                }
            },
            create: {
                projectId,
                key,
                category: key, // Assuming key matches category for now
                value: newValue,
                enabled,
                updatedBy: parseInt(session.user.id)
            },
            update: {
                value: newValue,
                enabled,
                updatedBy: parseInt(session.user.id)
            }
        })

        // Log the change
        await prisma.projectSettingsChangeLog.create({
            data: {
                projectId,
                settingKey: key,
                category: updated.category,
                oldValue: oldValue,
                newValue: newValue,
                reason: reason || null,
                changedBy: parseInt(session.user.id),
                settingId: updated.id
            }
        })

        revalidatePath(`/dashboard/projects/${projectId}`)
        revalidatePath(`/dashboard/projects/${projectId}/settings`)
        return { success: true, setting: updated }
    } catch (e: any) {
        console.error("updateProjectSetting Error:", e)
        return { error: "Failed to update setting", details: e.message }
    }
}

// Create a new project setting
export async function createProjectSetting(
    projectId: number,
    key: string,
    category: string,
    value: any,
    enabled: boolean = true
) {
    const { authorized, session } = await checkProjectSettingsAccess(projectId)
    if (!authorized || !session) {
        return { error: "Unauthorized" }
    }

    try {
        // Check if setting already exists
        const existing = await prisma.projectSetting.findUnique({
            where: {
                projectId_key: {
                    projectId,
                    key
                }
            }
        })

        if (existing) {
            return { error: "Setting with this key already exists" }
        }

        const newSetting = await prisma.projectSetting.create({
            data: {
                projectId,
                key,
                category,
                value: JSON.stringify(value),
                enabled,
                updatedBy: parseInt(session.user.id)
            }
        })

        // Log the creation
        await prisma.projectSettingsChangeLog.create({
            data: {
                projectId,
                settingKey: key,
                category: category,
                oldValue: null,
                newValue: JSON.stringify(value),
                reason: "Setting created",
                changedBy: parseInt(session.user.id),
                settingId: newSetting.id
            }
        })

        revalidatePath(`/dashboard/projects/${projectId}/settings`)
        return { success: true, setting: newSetting }
    } catch (e: any) {
        console.error("createProjectSetting Error:", e)
        return { error: "Failed to create setting", details: e.message }
    }
}

// Get project settings change log
export async function getProjectSettingsChangeLog(
    projectId: number,
    settingKey?: string,
    limit: number = 50,
    offset: number = 0
) {
    const { authorized, session } = await checkProjectSettingsAccess(projectId)
    if (!authorized || !session) {
        return { error: "Unauthorized" }
    }

    try {
        const where: any = { projectId }
        if (settingKey) {
            where.settingKey = settingKey
        }

        const logs = await prisma.projectSettingsChangeLog.findMany({
            where,
            include: {
                changer: {
                    select: {
                        id: true,
                        username: true,
                        email: true
                    }
                },
                setting: {
                    select: {
                        key: true,
                        category: true
                    }
                }
            },
            orderBy: { createdAt: "desc" },
            take: limit,
            skip: offset
        })

        const total = await prisma.projectSettingsChangeLog.count({ where })

        return {
            success: true,
            logs: logs.map(log => ({
                id: log.id,
                settingKey: log.settingKey,
                category: log.setting?.category,
                oldValue: log.oldValue ? JSON.parse(log.oldValue) : null,
                newValue: JSON.parse(log.newValue),
                reason: log.reason,
                changedBy: log.changer,
                createdAt: log.createdAt
            })),
            total,
            limit,
            offset
        }
    } catch (e: any) {
        console.error("getProjectSettingsChangeLog Error:", e)
        return { error: "Failed to fetch change log", details: e.message }
    }
}

// Reset project setting to global default
export async function resetProjectSetting(projectId: number, key: string) {
    const { authorized, session } = await checkProjectSettingsAccess(projectId)
    if (!authorized || !session) {
        return { error: "Unauthorized" }
    }

    try {
        // Disable the override (don't delete, just disable)
        const setting = await prisma.projectSetting.update({
            where: {
                projectId_key: {
                    projectId,
                    key
                }
            },
            data: {
                enabled: false
            }
        })

        // Log the reset
        await prisma.projectSettingsChangeLog.create({
            data: {
                projectId,
                settingKey: key,
                category: setting.category,
                oldValue: setting.value,
                newValue: JSON.stringify({ enabled: false }),
                reason: "Reset to global default",
                changedBy: parseInt(session.user.id),
                settingId: setting.id
            }
        })

        revalidatePath(`/dashboard/projects/${projectId}/settings`)
        return { success: true, message: "Setting reset to global default" }
    } catch (e: any) {
        console.error("resetProjectSetting Error:", e)
        return { error: "Failed to reset setting", details: e.message }
    }
}

