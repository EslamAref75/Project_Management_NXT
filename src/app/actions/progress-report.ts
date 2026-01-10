"use server"

import { prisma as db } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { addDays, subDays, differenceInDays } from "date-fns"

// --- Types ---

export type EntityType = 'project' | 'team' | 'user' | 'global'

export interface Period {
    start: Date
    end: Date
}

export interface ReportParams {
    entityType: EntityType
    entityId?: number
    periodA: Period
}

export interface KpiData {
    value: number
    unit: string
    trend: 'up' | 'down' | 'neutral'
    delta: number
    percentChange: number | null
}

export interface CauseIndicator {
    name: string
    description: string
    severity: 'low' | 'medium' | 'high'
    impactedKpis: string[]
    count: number
}

export type RiskLevel = 'low' | 'medium' | 'high'

export interface ForecastData {
    predictedCompletionDate: Date | null
    weeksRemaining: number | null
    riskLevel: RiskLevel
    confidenceScore: number
    riskFactors: string[]
}

export interface Recommendation {
    title: string
    description: string
    actionType: 'reassign' | 'resolve_dep' | 'reduce_wip' | 'escalate' | 'generic'
    confidence: 'low' | 'medium' | 'high'
    priority: 'normal' | 'high' | 'urgent'
}

export interface ProgressReportData {
    summary: {
        velocity: KpiData
        completionRate: KpiData
        blockedRatio: KpiData
        overdueTasks: KpiData
        overallRisk: RiskLevel
    }
    causes: CauseIndicator[]
    forecast: ForecastData
    actions: Recommendation[]
}

// --- Main Action ---

export async function getProgressReport(params: ReportParams): Promise<ProgressReportData | { error: string }> {
    try {
        const session = await getServerSession(authOptions)
        if (!session || !session.user || !session.user.id) {
            return { error: "Unauthorized" }
        }
        const userId = parseInt(session.user.id)
        const userRole = session.user.role

        // 1. Auth & Permission Check
        if (params.entityType === 'project') {
            if (!params.entityId) return { error: "Project ID required" }

            const project = await db.project.findUnique({
                where: { id: params.entityId },
                select: { projectManagerId: true }
            })

            if (!project) return { error: "Project not found" }

            const isPm = project.projectManagerId === userId
            const isAdmin = userRole === 'admin' || userRole === 'system_admin'

            if (!isPm && !isAdmin) {
                // Check membership
                const member = await db.projectUser.findFirst({
                    where: { projectId: params.entityId, userId: userId }
                })
                if (!member) {
                    return { error: "Forbidden: You do not have access to this project" }
                }
            }
        }

        // 2. Period Calculation
        const { periodA } = params
        // Ensure we have Date objects (Server Actions serialization handling)
        const startA = new Date(periodA.start)
        const endA = new Date(periodA.end)

        const durationDays = differenceInDays(endA, startA) + 1
        const periodB: Period = {
            start: subDays(startA, durationDays),
            end: subDays(startA, 1)
        }

        // 3. Data Fetching
        let whereClause: any = {}
        if (params.entityType === 'project') whereClause.projectId = params.entityId
        if (params.entityType === 'team') whereClause.teamId = params.entityId
        if (params.entityType === 'user') whereClause.assignees = { some: { id: params.entityId } }

        const fetchTasks = async (period: Period) => {
            return db.task.findMany({
                where: {
                    ...whereClause,
                    createdAt: { lte: period.end }
                },
                include: {
                    dependencies: { include: { dependsOnTask: true } },
                    assignees: true
                }
            })
        }

        const [tasksA, tasksB] = await Promise.all([
            fetchTasks({ start: startA, end: endA }),
            fetchTasks(periodB)
        ])

        // 4. KPI Calculation Helper
        // eslint-disable-next-line no-unused-vars
        const calculateMetrics = (tasks: typeof tasksA, period: Period) => {
            // Velocity: Sum of estimatedHours for tasks completed within the period
            const completedInPeriod = tasks.filter(t =>
                t.status === 'completed' &&
                t.completedAt &&
                t.completedAt >= period.start &&
                t.completedAt <= period.end
            )
            const velocity = completedInPeriod.reduce((sum, t) => sum + t.estimatedHours, 0)

            // Completion Rate: Tasks scheduled (due) in period vs completed
            const scheduledInPeriod = tasks.filter(t =>
                t.dueDate &&
                t.dueDate >= period.start &&
                t.dueDate <= period.end
            )
            const scheduledCount = scheduledInPeriod.length

            // Count how many of those scheduled were actually completed (at any time? or within period? Plan says "Efficiency of closing tasks within period")
            // Logic: (Tasks Completed in Period / Tasks Scheduled for Period)
            const completionRate = scheduledCount > 0 ? (completedInPeriod.length / scheduledCount) * 100 : 0

            // Blocked Ratio: Active tasks with unmet dependencies
            const activeTasks = tasks.filter(t => t.status !== 'completed' && t.status !== 'cancelled')
            const blockedTasks = activeTasks.filter(t => {
                return t.dependencies.some(d => d.dependsOnTask && d.dependsOnTask.status !== 'completed')
            })
            const blockedRatio = activeTasks.length > 0 ? (blockedTasks.length / activeTasks.length) * 100 : 0

            // Overdue Count (At end of period snapshot approximation)
            const overdueCount = tasks.filter(t =>
                t.dueDate &&
                t.dueDate < period.end &&
                (!t.completedAt || t.completedAt > period.end)
            ).length

            return { velocity, completionRate, blockedRatio, overdueCount, activeTasks }
        }

        const metricsA = calculateMetrics(tasksA, { start: startA, end: endA })
        const metricsB = calculateMetrics(tasksB, periodB)

        // 5. Comparison Helper
        const compare = (valA: number, valB: number, unit: string): KpiData => {
            const delta = valA - valB
            let percentChange = 0
            if (valB !== 0) {
                percentChange = Math.round(((valA - valB) / Math.abs(valB)) * 100)
            } else if (valA !== 0) {
                percentChange = 100
            }

            let trend: 'up' | 'down' | 'neutral' = 'neutral'
            if (delta > 0.1) trend = 'up'
            if (delta < -0.1) trend = 'down'

            return {
                value: Math.round(valA * 10) / 10,
                unit,
                trend,
                delta: Math.round(delta * 10) / 10,
                percentChange
            }
        }

        // 6. Cause Analysis
        const causes: CauseIndicator[] = []

        // Dependency Delay
        const delayCount = tasksA.filter(t => {
            return t.dependencies.some(d => {
                const dep = d.dependsOnTask
                return dep && dep.completedAt && t.plannedDate && dep.completedAt > t.plannedDate
            })
        }).length

        if (delayCount > 0) {
            causes.push({
                name: "Dependency Delay",
                description: `${delayCount} tasks were delayed by upstream dependencies.`,
                severity: delayCount > 3 ? 'high' : 'medium',
                impactedKpis: ['velocity', 'blockedRatio'],
                count: delayCount
            })
        }

        // Urgent Load
        // Count tasks with priority 'urgent' created in period A
        const urgentTasks = tasksA.filter(t =>
            t.priority === 'urgent' &&
            t.createdAt >= periodA.start &&
            t.createdAt <= periodA.end
        )
        if (urgentTasks.length > 0) {
            causes.push({
                name: "Urgent Task Load",
                description: `${urgentTasks.length} urgent tasks disrupted the flow.`,
                severity: urgentTasks.length > 2 ? 'high' : 'medium',
                impactedKpis: ['velocity', 'completionRate'],
                count: urgentTasks.length
            })
        }


        // 7. Forecast
        const activeTasksCount = metricsA.activeTasks.length
        const remainingHours = metricsA.activeTasks.reduce((sum, t) => sum + t.estimatedHours, 0)
        const avgVelocity = (metricsA.velocity + metricsB.velocity) / 2

        let weeksRemaining = null
        let predictedDate = null
        const riskFactors: string[] = []
        let riskScore = 0

        if (remainingHours > 0) {
            if (avgVelocity > 0) {
                weeksRemaining = remainingHours / avgVelocity
                predictedDate = addDays(new Date(), Math.ceil(weeksRemaining * 7))
            } else {
                riskFactors.push("Zero velocity - cannot predict completion")
                riskScore += 5
            }
        }

        if (metricsA.blockedRatio > 10) {
            riskFactors.push("High blocked ratio (>10%)")
            riskScore += 3
        }
        if (metricsA.overdueCount > metricsB.overdueCount) {
            riskFactors.push("Growing overdue backlog")
            riskScore += 2
        }

        let riskLevel: RiskLevel = 'low'
        if (riskScore >= 3) riskLevel = 'medium'
        if (riskScore >= 6) riskLevel = 'high'


        const finalSummary = {
            velocity: compare(metricsA.velocity, metricsB.velocity, 'hrs'),
            completionRate: compare(metricsA.completionRate, metricsB.completionRate, '%'),
            blockedRatio: compare(metricsA.blockedRatio, metricsB.blockedRatio, '%'),
            overdueTasks: compare(metricsA.overdueCount, metricsB.overdueCount, 'tasks'),
            overallRisk: riskLevel
        }

        return {
            summary: finalSummary,
            causes,
            forecast: {
                predictedCompletionDate: predictedDate,
                weeksRemaining: weeksRemaining ? Math.round(weeksRemaining * 10) / 10 : null,
                riskLevel,
                confidenceScore: avgVelocity > 0 ? 80 : 0,
                riskFactors
            },
            actions: [] // TODO: Recommendations in next iteration if needed
        }

    } catch (error: any) {
        console.error("Error generating progress report:", error)
        return { error: error.message || "Failed to generate report" }
    }
}
