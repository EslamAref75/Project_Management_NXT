"use server"

import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { unstable_noStore as noStore } from "next/cache"
import bcrypt from "bcryptjs"
import { hasPermissionWithoutRoleBypass } from "@/lib/rbac-helpers"

// Check if user is system administrator
async function checkAdmin() {
    const session = await getServerSession(authOptions)
    if (!session) return { authorized: false, session: null }

    const isAuthorized = await hasPermissionWithoutRoleBypass(
        parseInt(session.user.id),
        "admin.access"
    )
    return { authorized: isAuthorized, session }
}

// Get all system settings
export async function getAllSettings() {
    const { authorized, session } = await checkAdmin()
    if (!authorized || !session) {
        return { error: "Unauthorized: Only system administrators can access settings" }
    }

    try {
        const settings = await prisma.systemSetting.findMany({
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
        settings.forEach(setting => {
            if (!grouped[setting.category]) {
                grouped[setting.category] = []
            }
            grouped[setting.category].push({
                id: setting.id,
                key: setting.key,
                value: JSON.parse(setting.value),
                category: setting.category,
                description: setting.description,
                updatedAt: setting.updatedAt,
                updatedBy: setting.updater
            })
        })

        return { success: true, settings: grouped }
    } catch (e: any) {
        console.error("getAllSettings Error:", e)
        return { error: "Failed to fetch settings", details: e.message }
    }

}


// Get public system settings (branding) - No auth required
export async function getPublicSystemSettings() {
    noStore()
    try {
        const setting = await prisma.systemSetting.findUnique({
            where: { key: "general" }
        })

        if (!setting) {
            return {
                success: true,
                settings: {
                    systemName: "Qeema PMS",
                    systemLogo: "/assets/logo.png",
                    allowRegistration: true
                }
            }
        }

        const value = JSON.parse(setting.value)
        return {
            success: true,
            settings: {
                systemName: value.systemName || "Qeema PMS",
                systemLogo: value.systemLogo || "/assets/logo.png",
                allowRegistration: value.allowRegistration !== undefined ? value.allowRegistration : true
            }
        }
    } catch (e: any) {
        console.error("getPublicSystemSettings Error:", e)
        // Return defaults on error to avoid breaking UI
        return {
            success: true,
            settings: {
                systemName: "Qeema PMS",
                systemLogo: "/assets/logo.png",
                allowRegistration: true
            }
        }
    }
}

// Get a specific setting by key
export async function getSetting(key: string) {
    const { authorized, session } = await checkAdmin()
    if (!authorized || !session) {
        return { error: "Unauthorized" }
    }

    try {
        const setting = await prisma.systemSetting.findUnique({
            where: { key },
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
                description: setting.description,
                updatedAt: setting.updatedAt,
                updatedBy: setting.updater
            }
        }
    } catch (e: any) {
        console.error("getSetting Error:", e)
        return { error: "Failed to fetch setting", details: e.message }
    }
}

// Update a system setting
export async function updateSetting(
    key: string,
    value: any,
    reason?: string,
    category?: string // Optional category for auto-creation
) {
    const { authorized, session } = await checkAdmin()
    if (!authorized || !session) {
        return { error: "Unauthorized" }
    }

    try {
        // Get existing setting
        const existing = await prisma.systemSetting.findUnique({
            where: { key }
        })

        if (!existing) {
            if (category) {
                // Auto-create if category is provided
                return await createSetting(key, category, value, "Auto-created via update")
            }
            return { error: "Setting not found" }
        }

        const oldValue = existing.value
        const newValue = JSON.stringify(value)

        // Update setting
        const updated = await prisma.systemSetting.update({
            where: { key },
            data: {
                value: newValue,
                updatedBy: parseInt(session.user.id)
            }
        })

        // Log the change
        await prisma.settingsChangeLog.create({
            data: {
                settingKey: key,
                oldValue: oldValue,
                newValue: newValue,
                reason: reason || null,
                userId: parseInt(session.user.id),
                settingId: updated.id
            }
        })

        revalidatePath("/", "layout")
        return { success: true, setting: updated }
    } catch (e: any) {
        console.error("updateSetting Error:", e)
        return { error: "Failed to update setting", details: e.message }
    }
}

// Create a new system setting
export async function createSetting(
    key: string,
    category: string,
    value: any,
    description?: string
) {
    const { authorized, session } = await checkAdmin()
    if (!authorized || !session) {
        return { error: "Unauthorized" }
    }

    try {
        // Check if setting already exists
        const existing = await prisma.systemSetting.findUnique({
            where: { key }
        })

        if (existing) {
            return { error: "Setting with this key already exists" }
        }

        const newSetting = await prisma.systemSetting.create({
            data: {
                key,
                category,
                value: JSON.stringify(value),
                description: description || null,
                updatedBy: parseInt(session.user.id)
            }
        })

        // Log the creation
        await prisma.settingsChangeLog.create({
            data: {
                settingKey: key,
                oldValue: null,
                newValue: JSON.stringify(value),
                reason: "Setting created",
                userId: parseInt(session.user.id),
                settingId: newSetting.id
            }
        })

        revalidatePath("/dashboard/settings")
        return { success: true, setting: newSetting }
    } catch (e: any) {
        console.error("createSetting Error:", e)
        return { error: "Failed to create setting", details: e.message }
    }
}

// Get settings change log
export async function getSettingsChangeLog(
    settingKey?: string,
    limit: number = 50,
    offset: number = 0
) {
    const { authorized, session } = await checkAdmin()
    if (!authorized || !session) {
        return { error: "Unauthorized" }
    }

    try {
        const where = settingKey ? { settingKey } : {}

        const logs = await prisma.settingsChangeLog.findMany({
            where,
            include: {
                user: {
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

        const total = await prisma.settingsChangeLog.count({ where })

        return {
            success: true,
            logs: logs.map(log => ({
                id: log.id,
                settingKey: log.settingKey,
                category: log.setting?.category,
                oldValue: log.oldValue ? JSON.parse(log.oldValue) : null,
                newValue: JSON.parse(log.newValue),
                reason: log.reason,
                changedBy: log.user,
                createdAt: log.createdAt
            })),
            total,
            limit,
            offset
        }
    } catch (e: any) {
        console.error("getSettingsChangeLog Error:", e)
        return { error: "Failed to fetch change log", details: e.message }
    }
}

// Initialize default settings (run once on system setup)
export async function initializeDefaultSettings() {
    const { authorized, session } = await checkAdmin()
    if (!authorized || !session) {
        return { error: "Unauthorized" }
    }

    try {
        const defaultSettings = [
            {
                key: "general",
                category: "general",
                value: {
                    systemName: "Project Management System",
                    systemLogo: "/assets/logo.png",
                    defaultLanguage: "en",
                    defaultTimezone: "UTC",
                    workingDays: [1, 2, 3, 4, 5], // Monday to Friday
                    defaultWorkingHours: {
                        start: "09:00",
                        end: "17:00"
                    }
                },
                description: "General system settings"
            },
            {
                key: "tasks",
                category: "tasks",
                value: {
                    statuses: [
                        {
                            id: 1,
                            name: "Pending",
                            key: "pending",
                            order: 1,
                            color: "#fbbf24",
                            isFinal: false,
                            isDefault: true
                        },
                        {
                            id: 2,
                            name: "Waiting",
                            key: "waiting",
                            order: 2,
                            color: "#f97316",
                            isFinal: false,
                            isDefault: false
                        },
                        {
                            id: 3,
                            name: "In Progress",
                            key: "in_progress",
                            order: 3,
                            color: "#3b82f6",
                            isFinal: false,
                            isDefault: false
                        },
                        {
                            id: 4,
                            name: "Review",
                            key: "review",
                            order: 4,
                            color: "#a855f7",
                            isFinal: false,
                            isDefault: false
                        },
                        {
                            id: 5,
                            name: "Completed",
                            key: "completed",
                            order: 5,
                            color: "#10b981",
                            isFinal: true,
                            isDefault: false
                        }
                    ],
                    priorities: [
                        {
                            id: 1,
                            name: "Low",
                            key: "low",
                            weight: 1,
                            color: "#6b7280",
                            isDefault: false
                        },
                        {
                            id: 2,
                            name: "Normal",
                            key: "normal",
                            weight: 2,
                            color: "#3b82f6",
                            isDefault: true
                        },
                        {
                            id: 3,
                            name: "High",
                            key: "high",
                            weight: 3,
                            color: "#f59e0b",
                            isDefault: false
                        },
                        {
                            id: 4,
                            name: "Urgent",
                            key: "urgent",
                            weight: 4,
                            color: "#ef4444",
                            isDefault: false
                        }
                    ]
                },
                description: "Task statuses and priority levels"
            },
            {
                key: "today_tasks",
                category: "today_tasks",
                value: {
                    dailyResetTime: "00:00",
                    resetTimezoneSource: "system",
                    autoCarryOver: true,
                    carryOverRules: {
                        excludeBlocked: true,
                        incompleteOnly: true,
                        maxDays: 7
                    },
                    adminOverridePermissions: true
                },
                description: "Today's Tasks configuration"
            },
            {
                key: "dependencies",
                category: "dependencies",
                value: {
                    allowMultipleDependencies: true,
                    allowCrossTeamDependencies: true,
                    allowCrossProjectDependencies: false,
                    autoBlockTasks: true,
                    allowAdminManualUnblock: true
                },
                description: "Task dependency rules"
            },
            {
                key: "permissions",
                category: "permissions",
                value: {
                    admin: {
                        taskCreation: true,
                        taskAssignment: true,
                        todayTasksManagement: true,
                        dependencyManagement: true,
                        projectCreation: true,
                        userManagement: true
                    },
                    team_lead: {
                        taskCreation: true,
                        taskAssignment: true,
                        todayTasksManagement: true,
                        dependencyManagement: true,
                        projectCreation: false,
                        userManagement: false
                    },
                    developer: {
                        taskCreation: false,
                        taskAssignment: false,
                        todayTasksManagement: false,
                        dependencyManagement: false,
                        projectCreation: false,
                        userManagement: false
                    }
                },
                description: "Default permissions by role"
            },
            {
                key: "notifications",
                category: "notifications",
                value: {
                    notifyOnTodayTaskAssignment: true,
                    notifyOnTaskBlocked: true,
                    notifyOnDependencyCompleted: true,
                    notifyOnTaskOverdue: true,
                    notifyOnStatusChange: false
                },
                description: "System-wide notification preferences"
            },
            {
                key: "audit",
                category: "audit",
                value: {
                    enableSettingsChangeLogs: true,
                    enableOverrideLogs: true,
                    logRetentionPolicy: {
                        retentionDays: 365,
                        archiveAfterDays: 90,
                        maxLogSizeMB: 100
                    }
                },
                description: "Audit and logging configuration"
            }
        ]

        const created = []
        for (const setting of defaultSettings) {
            const existing = await prisma.systemSetting.findUnique({
                where: { key: setting.key }
            })

            if (!existing) {
                const newSetting = await prisma.systemSetting.create({
                    data: {
                        key: setting.key,
                        category: setting.category,
                        value: JSON.stringify(setting.value),
                        description: setting.description,
                        updatedBy: parseInt(session.user.id)
                    }
                })
                created.push(newSetting)
            }
        }

        return { success: true, created: created.length, message: `Initialized ${created.length} default settings` }
    } catch (e: any) {
        console.error("initializeDefaultSettings Error:", e)
        return { error: "Failed to initialize settings", details: e.message }
    }
}

// Update user profile
export async function updateProfile(formData: FormData) {
    const session = await getServerSession(authOptions)
    if (!session) {
        return { error: "Unauthorized" }
    }

    try {
        const username = formData.get("username") as string
        const email = formData.get("email") as string

        if (!username || !email) {
            return { error: "Username and email are required" }
        }

        const userId = parseInt(session.user.id)

        // Check if username or email is already taken by another user
        const existingUser = await prisma.user.findFirst({
            where: {
                AND: [
                    { id: { not: userId } },
                    {
                        OR: [
                            { username },
                            { email }
                        ]
                    }
                ]
            }
        })

        if (existingUser) {
            return { error: "Username or email already taken" }
        }

        // Update user profile
        await prisma.user.update({
            where: { id: userId },
            data: {
                username,
                email
            }
        })

        // Log activity
        try {
            await prisma.activityLog.create({
                data: {
                    userId: userId,
                    action: "update_profile",
                    description: "User updated their profile",
                    entityType: "user",
                    entityId: userId
                }
            })
        } catch (logError) {
            console.error("Failed to log activity:", logError)
            // Don't fail the operation if logging fails
        }

        revalidatePath("/dashboard/settings")
        return { success: true, message: "Profile updated successfully" }
    } catch (e: any) {
        console.error("updateProfile Error:", e)
        return { error: "Failed to update profile", details: e.message }
    }
}

// Change user password
export async function changePassword(formData: FormData) {
    const session = await getServerSession(authOptions)
    if (!session) {
        return { error: "Unauthorized" }
    }

    try {
        const currentPassword = formData.get("currentPassword") as string
        const newPassword = formData.get("newPassword") as string

        if (!currentPassword || !newPassword) {
            return { error: "Current password and new password are required" }
        }

        if (newPassword.length < 6) {
            return { error: "New password must be at least 6 characters long" }
        }

        const userId = parseInt(session.user.id)

        // Get user with password hash
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, passwordHash: true }
        })

        if (!user) {
            return { error: "User not found" }
        }

        // Verify current password
        const isValidPassword = await bcrypt.compare(currentPassword, user.passwordHash)
        if (!isValidPassword) {
            return { error: "Current password is incorrect" }
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10)

        // Update password
        await prisma.user.update({
            where: { id: userId },
            data: { passwordHash: hashedPassword }
        })

        // Log activity
        try {
            await prisma.activityLog.create({
                data: {
                    userId: userId,
                    action: "change_password",
                    description: "User changed their password",
                    entityType: "user",
                    entityId: userId
                }
            })
        } catch (logError) {
            console.error("Failed to log activity:", logError)
            // Don't fail the operation if logging fails
        }

        return { success: true, message: "Password changed successfully" }
    } catch (e: any) {
        console.error("changePassword Error:", e)
        return { error: "Failed to change password", details: e.message }
    }
}
