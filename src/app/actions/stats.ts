"use server"

import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { startOfDay, endOfDay } from "date-fns"

export type ProjectStats = {
    totalTasks: number
    completedTasks: number
    inProgressTasks: number
    blockedTasks: number
    overdueTasks: number
    urgentTasks: number // Optional as per requirements, but good to have
}

export type TaskStats = {
    totalTasks: number
    myTasks: number
    todayTasks: number
    blockedTasks: number
    overdueTasks: number
    completedToday: number
    totalCompletedTasks: number
}

// Helper to get formatted date for debugging
const formatDate = (date: Date) => date.toISOString().split('T')[0]

export async function getProjectStats(projectId: number): Promise<{ success: boolean; data?: ProjectStats; error?: string }> {
    const session = await getServerSession(authOptions)
    if (!session) return { success: false, error: "Unauthorized" }

    // No strict permission check for *stats* beyond what the page likely already does, 
    // but implies the user can access this project.

    try {
        const [
            totalTasks,
            completedTasks,
            inProgressTasks,
            blockedTasks,
            overdueTasks,
            urgentTasks
        ] = await Promise.all([
            // Total Tasks
            prisma.task.count({ where: { projectId } }),

            // Completed Tasks (Final Status or legacy "completed")
            prisma.task.count({
                where: {
                    projectId,
                    OR: [
                        { taskStatus: { isFinal: true } },
                        { status: "completed", taskStatusId: null }
                    ]
                }
            }),

            // In Progress Tasks (Not pending, not completed/final)
            prisma.task.count({
                where: {
                    projectId,
                    OR: [
                        // Logic: Active tasks that are not blocking or final
                        {
                            taskStatus: {
                                isFinal: false,
                                // Assuming "In Progress" implies it's started. 
                                // Alternatively, anything not final is "active". 
                                // Let's simplify: Anything NOT final and NOT legacy pending/completed
                            }
                        },
                        { status: "in_progress", taskStatusId: null }
                    ]
                }
            }),

            // Blocked Tasks (Blocking Status or legacy "waiting")
            prisma.task.count({
                where: {
                    projectId,
                    OR: [
                        { taskStatus: { isBlocking: true } },
                        { status: "waiting", taskStatusId: null }
                    ]
                }
            }),

            // Overdue Tasks (Due date passed, not final)
            prisma.task.count({
                where: {
                    projectId,
                    dueDate: { lt: new Date() },
                    OR: [
                        { taskStatus: { isFinal: false } },
                        { status: { not: "completed" }, taskStatusId: null }
                    ]
                }
            }),

            // Urgent Tasks (Priority is urgent or high)
            prisma.task.count({
                where: {
                    projectId,
                    priority: { in: ["high", "urgent"] },
                    // Only active tasks
                    OR: [
                        { taskStatus: { isFinal: false } },
                        { status: { not: "completed" }, taskStatusId: null }
                    ]
                }
            }),
        ])

        return {
            success: true,
            data: {
                totalTasks,
                completedTasks,
                inProgressTasks,
                blockedTasks,
                overdueTasks,
                urgentTasks
            }
        }

    } catch (error: any) {
        console.error("Error fetching project stats:", error)
        return { success: false, error: error.message }
    }
}
export async function getAllProjectsStats(): Promise<{ success: boolean; data?: { total: number; active: number; completed: number; urgent: number }; error?: string }> {
    const session = await getServerSession(authOptions)
    if (!session) return { success: false, error: "Unauthorized" }

    const userId = parseInt(session.user.id)
    const isAdmin = session.user.role === "admin"

    try {
        const where: any = {}

        // Permission Scope
        if (!isAdmin) {
            where.OR = [
                { projectManagerId: userId },
                { createdById: userId },
                { projectUsers: { some: { userId } } }
            ]
        }

        const [total, active, completed, urgent] = await Promise.all([
            prisma.project.count({ where }),
            prisma.project.count({
                where: {
                    ...where,
                    OR: [
                        { status: "active" },
                        { projectStatus: { isActive: true } }
                    ]
                }
            }),
            prisma.project.count({
                where: {
                    ...where,
                    OR: [
                        { status: "completed" },
                        { projectStatus: { isFinal: true } }
                    ]
                }
            }),
            prisma.project.count({
                where: {
                    ...where,
                    priority: "urgent"
                }
            })
        ])

        return {
            success: true,
            data: { total, active, completed, urgent }
        }

    } catch (error: any) {
        console.error("Error fetching all projects stats:", error)
        return { success: false, error: error.message }
    }
}

export type TaskFilters = {
    projectId?: string | number | string[] | number[]
    statusId?: string | number | string[] | number[]
    priority?: string | string[]
    dateRange?: { from: Date; to: Date }
    assigneeId?: string | number // For "My Tasks" context if needed explicitly
    search?: string
}

export async function getTaskStats(filters: TaskFilters = {}): Promise<{ success: boolean; data?: TaskStats; error?: string }> {
    const session = await getServerSession(authOptions)
    if (!session) return { success: false, error: "Unauthorized" }

    const userId = parseInt(session.user.id)
    const userRole = session.user.role || "developer"
    const isAdmin = userRole === "admin"

    try {
        const todayStart = startOfDay(new Date())
        const todayEnd = endOfDay(new Date())

        // Build generic where clause based on filters & permissions
        const where: any = {}

        // Permission Scope
        if (!isAdmin) {
            where.project = {
                OR: [
                    { projectManagerId: userId },
                    { createdById: userId },
                    { projectUsers: { some: { userId } } }
                ]
            }
        }

        // Apply Filters

        // Project Filter
        if (filters.projectId && filters.projectId !== "all") {
            const projectIds = Array.isArray(filters.projectId)
                ? filters.projectId.map(id => parseInt(id.toString()))
                : [parseInt(filters.projectId.toString())]

            if (projectIds.length > 0) {
                where.projectId = { in: projectIds }
            }
        }

        // Status Filter
        if (filters.statusId && filters.statusId !== "all") {
            const statuses = Array.isArray(filters.statusId) ? filters.statusId : [filters.statusId]
            const statusIds: number[] = []
            const legacyStatuses: string[] = []

            statuses.forEach(s => {
                if (s === "legacy_active") legacyStatuses.push("active")
                else if (s === "legacy_on_hold") legacyStatuses.push("on_hold")
                else if (typeof s === 'string' && isNaN(parseInt(s))) legacyStatuses.push(s)
                else statusIds.push(parseInt(s.toString()))
            })

            const statusConditions: any[] = []
            if (statusIds.length > 0) statusConditions.push({ taskStatusId: { in: statusIds } })
            if (legacyStatuses.length > 0) statusConditions.push({ status: { in: legacyStatuses }, taskStatusId: null })

            if (statusConditions.length > 0) {
                if (where.OR) {
                    where.AND = [
                        ...(where.AND || []),
                        { OR: statusConditions }
                    ]
                } else {
                    where.OR = statusConditions
                }
            }
        }

        // Priority Filter
        if (filters.priority && filters.priority.length > 0) {
            const priorities = Array.isArray(filters.priority) ? filters.priority : [filters.priority]
            if (priorities.length > 0) {
                where.priority = { in: priorities }
            }
        }

        if (filters.search) {
            const searchConditions = [
                { title: { contains: filters.search } },
                { description: { contains: filters.search } }
            ]
            if (where.OR) {
                where.AND = [
                    ...(where.AND || []),
                    { OR: searchConditions }
                ]
                // Don't overwrite existing OR if it was status. Ideally AND the groups.
                // Complex query construction: if we have multiple OR groups (status + search), we need AND(OR, OR).
                // My logic above for status uses where.OR directly if empty, or appends to AND.
                // Let's refine: Always push disjoint OR-groups to AND if we have potential conflicts.

                // Simpler approach:
                // If we successfully added generic 'where.projectId', that's fine (AND).
                // Search is an OR group. Status is an OR group.
                // We should likely restructure `where` to just use AND for top level groups.
            } else {
                where.OR = searchConditions
            }
        }

        // Refined Logic for mix of ORs:
        // Let's restart generic `where` construction to be safe if multiple ORs exist.
        // Actually, Prisma `where` with top-level properties are ANDed.
        // `where.OR` is a single list of conditions where at least one must be true.
        // If we want (A or B) AND (C or D), we must use `where.AND = [{ OR: [A,B] }, { OR: [C,D] }]`.

        // Let's fix the Status logic above to use AND if needed. 
        // Re-writing the status/search block below in the replace content to be safe.
        // See replacement content for final logic.

        if (filters.dateRange) {
            if (filters.dateRange.from || filters.dateRange.to) {
                where.dueDate = {}
                // Filter applies to Due Date usually
                if (filters.dateRange.from) where.dueDate.gte = filters.dateRange.from
                if (filters.dateRange.to) where.dueDate.lte = filters.dateRange.to
            }
        }

        // RE-COMPUTING WHERE PROPERLY TO HANDLE MULTIPLE OR GROUPS (Status, Search)
        // Resetting the dynamic parts
        const baseWhere: any = { ...where }
        delete baseWhere.OR
        delete baseWhere.AND

        const andConditions: any[] = []
        if (where.project) andConditions.push({ project: where.project }) // Permissions
        if (where.projectId) andConditions.push({ projectId: where.projectId })
        if (where.priority) andConditions.push({ priority: where.priority })
        if (where.dueDate) andConditions.push({ dueDate: where.dueDate })

        // Status Group
        if (filters.statusId && filters.statusId !== "all") {
            const statuses = Array.isArray(filters.statusId) ? filters.statusId : [filters.statusId]
            const statusIds: number[] = []
            const legacyStatuses: string[] = []

            statuses.forEach(s => {
                if (s === "legacy_active") legacyStatuses.push("active")
                else if (s === "legacy_on_hold") legacyStatuses.push("on_hold")
                else if (typeof s === 'string' && isNaN(parseInt(s))) legacyStatuses.push(s)
                else statusIds.push(parseInt(s.toString()))
            })

            const statusConditions: any[] = []
            if (statusIds.length > 0) statusConditions.push({ taskStatusId: { in: statusIds } })
            if (legacyStatuses.length > 0) statusConditions.push({ status: { in: legacyStatuses }, taskStatusId: null })

            if (statusConditions.length > 0) {
                andConditions.push({ OR: statusConditions })
            }
        }

        // Search Group
        if (filters.search) {
            andConditions.push({
                OR: [
                    { title: { contains: filters.search } },
                    { description: { contains: filters.search } }
                ]
            })
        }

        const finalWhere = {
            AND: andConditions
        }

        const [
            totalTasks,
            myTasks,
            todayTasks,
            blockedTasks,
            overdueTasks,
            completedToday,
            totalCompletedTasks
        ] = await Promise.all([
            // Total (Filtered)
            prisma.task.count({ where: finalWhere }),

            // My Tasks (Filtered + Assigned to Me)
            prisma.task.count({
                where: {
                    AND: [
                        ...andConditions,
                        { assignees: { some: { id: userId } } }
                    ]
                }
            }),

            // Today's Tasks (Filtered + Planned for Today + Active)
            prisma.task.count({
                where: {
                    AND: [
                        ...andConditions,
                        {
                            plannedDate: {
                                gte: todayStart,
                                lte: todayEnd
                            }
                        },
                        {
                            OR: [
                                { taskStatus: { isFinal: false } },
                                { status: { not: "completed" }, taskStatusId: null }
                            ]
                        }
                    ]
                }
            }),

            // Blocked Tasks (Filtered + Blocking status)
            prisma.task.count({
                where: {
                    AND: [
                        ...andConditions,
                        {
                            OR: [
                                { taskStatus: { isBlocking: true } },
                                { status: "waiting", taskStatusId: null }
                            ]
                        }
                    ]
                }
            }),

            // Overdue Tasks (Filtered + Overdue + Active)
            prisma.task.count({
                where: {
                    AND: [
                        ...andConditions,
                        { dueDate: { lt: new Date() } },
                        {
                            OR: [
                                { taskStatus: { isFinal: false } },
                                { status: { not: "completed" }, taskStatusId: null }
                            ]
                        }
                    ]
                }
            }),

            // Completed Today (Filtered + Updated/Completed Today)
            prisma.task.count({
                where: {
                    AND: [
                        ...andConditions,
                        {
                            updatedAt: {
                                gte: todayStart,
                                lte: todayEnd
                            }
                        },
                        {
                            OR: [
                                { taskStatus: { isFinal: true } },
                                { status: "completed", taskStatusId: null }
                            ]
                        }
                    ]
                }
            }),

            // Total Completed Tasks (Filtered + Completed Status)
            prisma.task.count({
                where: {
                    AND: [
                        ...andConditions,
                        {
                            OR: [
                                { taskStatus: { isFinal: true } },
                                { status: "completed", taskStatusId: null }
                            ]
                        }
                    ]
                }
            })
        ])

        return {
            success: true,
            data: {
                totalTasks,
                myTasks,
                todayTasks,
                blockedTasks,
                overdueTasks,
                completedToday,
                totalCompletedTasks
            }
        }

    } catch (error: any) {
        console.error("Error fetching task stats:", error)
        return { success: false, error: error.message }
    }
}

import { getStatTrend, StatWithTrend } from "@/lib/stats"

export async function getSummaryStatsWithTrends(
    filters: TaskFilters = {},
    period: "daily" | "weekly" = "daily"
): Promise<{ success: boolean; data?: Record<string, StatWithTrend>; error?: string }> {
    const session = await getServerSession(authOptions)
    if (!session) return { success: false, error: "Unauthorized" }

    try {
        const [projectStatsResult, taskStatsResult] = await Promise.all([
            getAllProjectsStats(),
            getTaskStats(filters)
        ])

        if (!projectStatsResult.success || !taskStatsResult.success) {
            throw new Error(projectStatsResult.error || taskStatsResult.error || "Failed to fetch stats")
        }

        const projectData = projectStatsResult.data!
        const taskData = taskStatsResult.data!

        // Determine Entity Context for Snapshots
        let entityType = "global"
        let entityId: number | null = null

        // Simple logic: if projectId filter is set, use it.
        // Note: filters.projectId can be array or 'all'.
        if (filters.projectId && filters.projectId !== "all" && !Array.isArray(filters.projectId)) {
            // Check if it's a single ID
            const pid = parseInt(filters.projectId.toString())
            if (!isNaN(pid)) {
                entityType = "project"
                entityId = pid
            }
        }

        // Metrics to track
        const metrics = {
            total_projects: projectData.total,
            active_projects: projectData.active,
            total_tasks: taskData.totalTasks,
            completed_tasks: taskData.totalCompletedTasks,
            overdue_tasks: taskData.overdueTasks,
            blocked_tasks: taskData.blockedTasks
        }

        const trends: Record<string, StatWithTrend> = {}

        for (const [key, value] of Object.entries(metrics)) {
            // Only fetch trends if we have a valid context (Global or Single Project)
            // If complex filters are applied (e.g. search, multiple projects), trends might be misleading if snapshots are not filtered similarly.
            // For now, allow trends if entityType is explicitly defined.

            // Note: If filters.statusId etc are set, 'value' is filtered, but 'snapshot' is likely global/project level.
            // Comparison might be invalid: Filtered Value vs Unfiltered Snapshot.
            // Constraint: Only show trends if filters are empty OR (only projectId is set).

            const hasComplexFilters =
                (filters.statusId && filters.statusId !== 'all') ||
                filters.search ||
                filters.priority ||
                filters.dateRange;

            let trend = null
            if (!hasComplexFilters) {
                trend = await getStatTrend(entityType, entityId, key, value, period)
            }

            trends[key] = {
                value,
                trend
            }
        }

        return { success: true, data: trends }

    } catch (error: any) {
        console.error("Error fetching summary stats with trends:", error)
        return { success: false, error: error.message }
    }
}
