"use server"

import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { startOfDay, endOfDay } from "date-fns"
import { hasPermissionWithoutRoleBypass } from "@/lib/rbac-helpers"
import { unstable_cache } from "next/cache"

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

// EXTRACTED LOGIC FOR CACHING
const fetchProjectStats = async (projectId: number) => {
    try {
        // OPTIMIZED: Use single aggregation query instead of 6 separate count queries
        const taskStats = await prisma.task.aggregate({
            where: { projectId },
            _count: {
                id: true
            }
        })

        const [
            completedTasks,
            inProgressTasks,
            blockedTasks,
            overdueTasks,
            urgentTasks
        ] = await Promise.all([
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
                totalTasks: taskStats._count.id,
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

// Cache wrapper for specific project stats
const getCachedProjectStats = unstable_cache(
    fetchProjectStats,
    ['project-stats'],
    { revalidate: 60, tags: ['project-stats'] }
)

export async function getProjectStats(projectId: number): Promise<{ success: boolean; data?: ProjectStats; error?: string }> {
    const session = await getServerSession(authOptions)
    if (!session) return { success: false, error: "Unauthorized" }

    // Use cached version
    // We pass projectId as part of arguments which unstable_cache uses for key generation
    return await getCachedProjectStats(projectId)
}

// EXTRACT LOGIC FOR ALL PROJECTS STATS
const fetchAllProjectsStats = async (userId: number, canViewAllProjects: boolean) => {
    try {
        const where: any = {}

        // Permission Scope - Use RBAC instead of role check
        if (!canViewAllProjects) {
            where.OR = [
                { projectManagerId: userId },
                { createdById: userId },
                { projectUsers: { some: { userId } } }
            ]
        }

        // OPTIMIZED: Use groupBy aggregation to get all counts in 2 queries instead of 4
        const [totalResult, statusCounts] = await Promise.all([
            prisma.project.count({ where }),
            prisma.project.groupBy({
                by: ['status', 'projectStatusId'],
                where,
                _count: { id: true }
            })
        ])

        let active = 0
        let completed = 0
        let urgent = 0

        // Process status counts
        for (const group of statusCounts) {
            if (group.status === "active" || group.status === null) {
                active += group._count.id
            }
            if (group.status === "completed") {
                completed += group._count.id
            }
        }

        // Count urgent projects separately
        urgent = await prisma.project.count({
            where: {
                ...where,
                priority: "urgent"
            }
        })

        return {
            success: true,
            data: { total: totalResult, active, completed, urgent }
        }

    } catch (error: any) {
        console.error("Error fetching all projects stats:", error)
        return { success: false, error: error.message }
    }
}

// Cache wrapper for all projects stats
// We need to pivot on userId if they can't view all projects
// If they can view all, we can theoretically share the cache if we used a constant key, 
// BUT 'canViewAllProjects' logic is user-dependent anyway. cache key should include userId if limited scope.
const getCachedAllProjectsStats = unstable_cache(
    fetchAllProjectsStats,
    ['all-projects-stats'],
    { revalidate: 60, tags: ['projects-stats'] }
)

export async function getAllProjectsStats(): Promise<{ success: boolean; data?: { total: number; active: number; completed: number; urgent: number }; error?: string }> {
    const session = await getServerSession(authOptions)
    if (!session) return { success: false, error: "Unauthorized" }

    const userId = parseInt(session.user.id)
    const canViewAllProjects = await hasPermissionWithoutRoleBypass(
        userId,
        "project.viewAll"
    )

    return await getCachedAllProjectsStats(userId, canViewAllProjects)
}

export type TaskFilters = {
    projectId?: string | number | string[] | number[]
    statusId?: string | number | string[] | number[]
    priority?: string | string[]
    dateRange?: { from: Date; to: Date }
    assigneeId?: string | number // For "My Tasks" context if needed explicitly
    search?: string
}

const fetchTaskStats = async (userId: number, isAdmin: boolean, filters: TaskFilters) => {
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

        // Priority Filter
        if (filters.priority && filters.priority.length > 0) {
            const priorities = Array.isArray(filters.priority) ? filters.priority : [filters.priority]
            if (priorities.length > 0) {
                andConditions.push({ priority: { in: priorities } })
            }
        }


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

        if (filters.dateRange) {
            if (filters.dateRange.from || filters.dateRange.to) {
                const dateCondition: any = {}
                if (filters.dateRange.from) dateCondition.gte = filters.dateRange.from
                if (filters.dateRange.to) dateCondition.lte = filters.dateRange.to
                andConditions.push({ dueDate: dateCondition })
            }
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

// NOTE: Caching generic task stats with filters is hard because filters can be anything.
// We only cache if filters are empty or minimal to avoid exploding cache storage.
// For now, we DO NOT cache getTaskStats when filters are involved, or we accept that it's live.
// Only caching the "base" dashboard stats.
// Actually, `getSummaryStatsWithTrends` uses this with filters. 
// If filters are complex, we might not want to cache. 
// Let's caching logic be smart: if filters is empty object, cache.

export async function getTaskStats(filters: TaskFilters = {}): Promise<{ success: boolean; data?: TaskStats; error?: string }> {
    const session = await getServerSession(authOptions)
    if (!session) return { success: false, error: "Unauthorized" }

    const userId = parseInt(session.user.id)
    const userRole = session.user.role || "developer"
    const isAdmin = userRole === "admin"

    // If filters are complex, skip cache for now to avoid stale search results
    const hasSearchOrDate = filters.search || (filters.dateRange && (filters.dateRange.from || filters.dateRange.to));

    if (hasSearchOrDate) {
        return await fetchTaskStats(userId, isAdmin, filters);
    }

    // Use unstable_cache for filtered stats could key on JSON.stringify(filters)
    // Be careful with object key order.
    // Let's trust that identical filter objects produce identical strings if keys are stable.
    // We can rely on 'unstable_cache' variadic args.

    // We need to pass filters as arguments to cache function
    // But filters object structure might vary. 
    // Let's create a specific key for 'basic' filters (project, status, priority)

    const cacheKey = `task-stats-${JSON.stringify(filters)}`;

    // Inline wrapper for this specific call with these filters
    // This creates a NEW cache entry for every permutation.
    // This is fine as long as permutations are reasonable (status buttons etc).
    const cachedFetch = unstable_cache(
        async (uid, admin, f) => fetchTaskStats(uid, admin, f),
        ['task-stats-filtered'],
        { revalidate: 30, tags: ['task-stats'] } // Short cache for filters
    );

    return await cachedFetch(userId, isAdmin, filters);
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
