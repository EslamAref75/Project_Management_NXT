"use server"

import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { revalidatePath } from "next/cache"

// Check if user can manage settings (self or admin)
async function checkUserSettingsAccess(targetUserId: number) {
    const session = await getServerSession(authOptions)
    if (!session) return { authorized: false, session: null, isAdmin: false }

    const userId = parseInt(session.user.id)
    const isAdmin = session.user.role === "admin"
    const isSelf = userId === targetUserId

    // User can edit their own settings, admin can edit any user's settings
    const authorized = isSelf || isAdmin

    return { authorized, session, isAdmin, isSelf }
}

// Get all user settings
export async function getUserSettings(userId: number) {
    const { authorized, session } = await checkUserSettingsAccess(userId)
    if (!authorized || !session) {
        return { error: "Unauthorized: You can only view your own settings" }
    }

    try {
        // Check if UserSetting model exists in Prisma client
        if (!prisma.userSetting) {
            // Prisma client not regenerated yet - return empty settings
            return { success: true, settings: {} }
        }

        const userSettings = await prisma.userSetting.findMany({
            where: { userId },
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
        userSettings.forEach(setting => {
            if (!grouped[setting.category]) {
                grouped[setting.category] = []
            }
            grouped[setting.category].push({
                id: setting.id,
                key: setting.key,
                value: JSON.parse(setting.value),
                category: setting.category,
                updatedAt: setting.updatedAt,
                updatedBy: setting.updater
            })
        })

        return { success: true, settings: grouped }
    } catch (e: any) {
        console.error("getUserSettings Error:", e)
        return { error: "Failed to fetch user settings", details: e.message }
    }
}

// Get resolved settings (user → project → global)
export async function getResolvedUserSettings(userId: number, projectId?: number) {
    const session = await getServerSession(authOptions)
    if (!session) {
        return { error: "Unauthorized" }
    }

    try {
        // Check if UserSetting model exists in Prisma client
        if (!prisma.userSetting) {
            // Prisma client not regenerated yet - return system defaults
            const resolved: Record<string, any> = {}
            const categories = ["preferences", "taskView", "todayTasks", "notifications", "workflow"]
            for (const category of categories) {
                resolved[category] = {
                    value: getSystemDefault(category),
                    source: "system",
                    enabled: false
                }
            }
            return { success: true, settings: resolved }
        }

        // Get user settings
        const userSettings = await prisma.userSetting.findMany({
            where: { userId }
        })

        // Get project settings if projectId provided
        let projectSettings: any[] = []
        if (projectId) {
            projectSettings = await prisma.projectSetting.findMany({
                where: { projectId, enabled: true }
            })
        }

        // Get global settings
        const globalSettings = await prisma.systemSetting.findMany()

        // Create a map of resolved settings
        const resolved: Record<string, any> = {}

        // Categories that always allow user override
        const alwaysUserOverride = ["preferences", "notifications", "workflow"]

        // Process each category
        const categories = ["preferences", "taskView", "todayTasks", "notifications", "workflow"]

        for (const category of categories) {
            const userSetting = userSettings.find(s => s.category === category && s.key === category)
            const projectSetting = projectSettings.find(s => s.category === category && s.key === category)
            const globalSetting = globalSettings.find(s => s.category === category && s.key === category)

            // Resolution priority: User (if allowed) → Project → Global → System Default
            if (userSetting && alwaysUserOverride.includes(category)) {
                // User override always allowed for these categories
                resolved[category] = {
                    value: JSON.parse(userSetting.value),
                    source: "user",
                    enabled: true
                }
            } else if (projectSetting && projectSetting.enabled) {
                // Project override
                resolved[category] = {
                    value: JSON.parse(projectSetting.value),
                    source: "project",
                    enabled: true
                }
            } else if (userSetting) {
                // User setting (for categories that don't always override)
                resolved[category] = {
                    value: JSON.parse(userSetting.value),
                    source: "user",
                    enabled: true
                }
            } else if (globalSetting) {
                // Global default
                resolved[category] = {
                    value: JSON.parse(globalSetting.value),
                    source: "global",
                    enabled: false
                }
            } else {
                // System default (would need to be defined)
                resolved[category] = {
                    value: getSystemDefault(category),
                    source: "system",
                    enabled: false
                }
            }
        }

        return { success: true, settings: resolved }
    } catch (e: any) {
        console.error("getResolvedUserSettings Error:", e)
        return { error: "Failed to fetch resolved settings", details: e.message }
    }
}

// Get system defaults
function getSystemDefault(category: string): any {
    const defaults: Record<string, any> = {
        preferences: {
            timezone: "Africa/Cairo",
            workingHours: { start: "09:00", end: "17:00" }
        },
        taskView: {
            defaultView: "list",
            defaultSort: { field: "priority", order: "desc" },
            showCompleted: true,
            showBlocked: true,
            defaultProjectFilter: null
        },
        todayTasks: {
            autoOpenOnLogin: false,
            defaultView: "compact",
            highlightBlocked: true,
            showDependencyDetails: false
        },
        notifications: {
            channels: { inApp: true, email: true },
            grouping: "realtime",
            priorityFilter: ["low", "normal", "high", "urgent"],
            soundEnabled: true
        },
        workflow: {
            defaultLandingPage: "dashboard",
            defaultProjectContext: null,
            standupSummaryDisplay: { enabled: false, format: "compact" }
        }
    }
    return defaults[category] || null
}

// Get a specific user setting
export async function getUserSetting(userId: number, key: string) {
    const { authorized, session } = await checkUserSettingsAccess(userId)
    if (!authorized || !session) {
        return { error: "Unauthorized" }
    }

    try {
        if (!prisma.userSetting) {
            return { error: "User settings not available. Please restart the development server." }
        }

        const setting = await prisma.userSetting.findUnique({
            where: {
                userId_key: {
                    userId,
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
                updatedAt: setting.updatedAt,
                updatedBy: setting.updater
            }
        }
    } catch (e: any) {
        console.error("getUserSetting Error:", e)
        return { error: "Failed to fetch setting", details: e.message }
    }
}

// Update a user setting
export async function updateUserSetting(
    userId: number,
    key: string,
    value: any,
    reason?: string
) {
    const { authorized, session, isAdmin } = await checkUserSettingsAccess(userId)
    if (!authorized || !session) {
        return { error: "Unauthorized" }
    }

    try {
        if (!prisma.userSetting || !prisma.userSettingsChangeLog) {
            return { error: "User settings not available. Please restart the development server." }
        }

        // Validate setting value based on category
        const category = getCategoryFromKey(key)
        if (!validateSettingValue(category, value)) {
            return { error: `Invalid value for setting ${key}` }
        }

        // Get existing setting
        const existing = await prisma.userSetting.findUnique({
            where: {
                userId_key: {
                    userId,
                    key
                }
            }
        })

        const oldValue = existing?.value || null
        const newValue = JSON.stringify(value)

        // Update or create setting
        const updated = await prisma.userSetting.upsert({
            where: {
                userId_key: {
                    userId,
                    key
                }
            },
            create: {
                userId,
                key,
                category,
                value: newValue,
                updatedBy: parseInt(session.user.id)
            },
            update: {
                value: newValue,
                updatedBy: parseInt(session.user.id)
            }
        })

        // Log the change
        await prisma.userSettingsChangeLog.create({
            data: {
                userId,
                settingKey: key,
                category,
                oldValue: oldValue,
                newValue: newValue,
                reason: reason || null,
                changedBy: parseInt(session.user.id),
                settingId: updated.id
            }
        })

        revalidatePath(`/dashboard/settings`)
        revalidatePath(`/dashboard`)

        return { success: true }
    } catch (e: any) {
        console.error("updateUserSetting Error:", e)
        return { error: "Failed to update setting", details: e.message }
    }
}

// Create a new user setting
export async function createUserSetting(
    userId: number,
    key: string,
    category: string,
    value: any,
    description?: string
) {
    const { authorized, session } = await checkUserSettingsAccess(userId)
    if (!authorized || !session) {
        return { error: "Unauthorized" }
    }

    try {
        if (!prisma.userSetting) {
            return { error: "User settings not available. Please restart the development server." }
        }

        if (!validateSettingValue(category, value)) {
            return { error: `Invalid value for setting ${key}` }
        }

        const setting = await prisma.userSetting.create({
            data: {
                userId,
                key,
                category,
                value: JSON.stringify(value),
                updatedBy: parseInt(session.user.id)
            }
        })

        revalidatePath(`/dashboard/settings`)

        return { success: true, setting }
    } catch (e: any) {
        console.error("createUserSetting Error:", e)
        return { error: "Failed to create setting", details: e.message }
    }
}

// Reset a user setting to default
export async function resetUserSetting(userId: number, key: string) {
    const { authorized, session } = await checkUserSettingsAccess(userId)
    if (!authorized || !session) {
        return { error: "Unauthorized" }
    }

    try {
        if (!prisma.userSetting) {
            return { error: "User settings not available. Please restart the development server." }
        }

        const category = getCategoryFromKey(key)
        const defaultValue = getSystemDefault(category)

        if (!defaultValue) {
            return { error: "No default value found for this setting" }
        }

        // Delete the setting (will use system default)
        await prisma.userSetting.delete({
            where: {
                userId_key: {
                    userId,
                    key
                }
            }
        })

        revalidatePath(`/dashboard/settings`)

        return { success: true }
    } catch (e: any) {
        console.error("resetUserSetting Error:", e)
        return { error: "Failed to reset setting", details: e.message }
    }
}

// Get change history
export async function getUserSettingsChangeLog(
    userId: number,
    settingKey?: string,
    limit: number = 50,
    offset: number = 0
) {
    const { authorized, session } = await checkUserSettingsAccess(userId)
    if (!authorized || !session) {
        return { error: "Unauthorized" }
    }

    try {
        if (!prisma.userSettingsChangeLog) {
            return { error: "User settings not available. Please restart the development server." }
        }

        const where: any = { userId }
        if (settingKey) {
            where.settingKey = settingKey
        }

        const logs = await prisma.userSettingsChangeLog.findMany({
            where,
            orderBy: { createdAt: "desc" },
            take: limit,
            skip: offset,
            include: {
                changer: {
                    select: {
                        id: true,
                        username: true,
                        email: true
                    }
                }
            }
        })

        return { success: true, logs }
    } catch (e: any) {
        console.error("getUserSettingsChangeLog Error:", e)
        return { error: "Failed to fetch change log", details: e.message }
    }
}

// Helper functions
function getCategoryFromKey(key: string): string {
    // Map key to category
    if (key.startsWith("preferences")) return "preferences"
    if (key.startsWith("taskView")) return "taskView"
    if (key.startsWith("todayTasks")) return "todayTasks"
    if (key.startsWith("notifications")) return "notifications"
    if (key.startsWith("workflow")) return "workflow"
    return key
}

function validateSettingValue(category: string, value: any): boolean {
    // Basic validation - can be extended
    try {
        switch (category) {
            case "preferences":
                if (value.timezone && typeof value.timezone !== "string") return false
                if (value.workingHours) {
                    if (!value.workingHours.start || !value.workingHours.end) return false
                }
                return true
            case "taskView":
                if (value.defaultView && !["list", "kanban"].includes(value.defaultView)) return false
                if (value.defaultSort) {
                    if (!["priority", "dueDate", "createdAt", "title"].includes(value.defaultSort.field)) return false
                    if (!["asc", "desc"].includes(value.defaultSort.order)) return false
                }
                return true
            case "todayTasks":
                if (value.defaultView && !["compact", "detailed"].includes(value.defaultView)) return false
                return true
            case "notifications":
                if (value.channels) {
                    if (typeof value.channels.inApp !== "boolean") return false
                    if (typeof value.channels.email !== "boolean") return false
                }
                if (value.grouping && !["realtime", "dailyDigest"].includes(value.grouping)) return false
                return true
            case "workflow":
                if (value.defaultLandingPage && !["dashboard", "todayFocus", "projects", "tasks"].includes(value.defaultLandingPage)) return false
                return true
            default:
                return true
        }
    } catch {
        return false
    }
}

