import { getProjectServer } from "@/lib/api/projects-server"
import { getUsers } from "@/app/actions/users"
import { getProjectStats } from "@/app/actions/stats"
import { notFound } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { startOfWeek, endOfWeek } from "date-fns"
import { calculateProjectProductivity } from "@/lib/productivity"
import { getForecastsForTasks } from "@/app/actions/forecasting"
import { ProductivityScoreCard } from "@/components/productivity/productivity-score-card"
import { ForecastingTimeline } from "@/components/productivity/forecasting-timeline"
import { ProjectHeader } from "@/components/projects/project-header"
import { ProjectTabs } from "@/components/projects/project-tabs"
import { UrgentProjectBanner } from "@/components/projects/urgent-project-banner"
import { SummaryStatsCards, StatCardData } from "@/components/dashboard/summary-stats-cards"
import {
    ListTodo,
    CheckCircle2,
    Clock,
    Ban,
    AlertCircle,
    Flame,
    Loader2,
    AlertTriangle
} from "lucide-react"

type Params = Promise<{ id: string }>

export default async function ProjectDetailsPage({
    params
}: {
    params: Params
}) {
    const { id } = await params
    const projectId = parseInt(id)

    if (isNaN(projectId)) notFound()

    const session = await getServerSession(authOptions)

    // Parallel data fetching (project from backend when configured)
    const [project, users, statsResult, productivityData] = await Promise.all([
        getProjectServer(projectId),
        getUsers(),
        getProjectStats(projectId),
        calculateProjectProductivity(projectId, {
            start: startOfWeek(new Date(), { weekStartsOn: 1 }),
            end: endOfWeek(new Date(), { weekStartsOn: 1 })
        }).catch(e => {
            console.error("Failed to calc productivity", e);
            return null;
        })
    ])

    if (!project) {
        notFound()
    }

    type ProjectShape = {
        id: number
        name: string
        projectManagerId?: number | null
        createdById?: number | null
        projectTeams?: Array<{ team?: { teamLeadId?: number } }>
        tasks?: Array<{ id?: number; status?: string }>
        priority: string
        urgentReason?: string | null
        urgentMarkedAt?: Date | null
        urgentMarkedBy?: { id: number; username: string } | null
        [key: string]: unknown
    }
    const p = project as ProjectShape

    // Check permissions
    const isAdmin = session?.user.role === "admin"
    const isProjectManager = p.projectManagerId === parseInt(session?.user.id || "0") ||
        p.createdById === parseInt(session?.user.id || "0")
    const isTeamLead = p.projectTeams?.some((pt: any) =>
        pt.team?.teamLeadId === parseInt(session?.user.id || "0")
    ) || false
    const canEdit = isAdmin || isProjectManager
    const canMarkUrgent = isAdmin || isProjectManager || isTeamLead

    // Legacy Stats for Header (keep for now to ensure compatibility)
    // Ideally refactor ProjectHeader to take new stats object later
    const total = p.tasks?.length || 0
    const totalComp = p.tasks?.filter((t: any) => t.status === "completed").length || 0
    const totalPending = p.tasks?.filter((t: any) => t.status === "pending").length || 0
    const totalInProgress = p.tasks?.filter((t: any) => ["in_progress", "review"].includes(t.status)).length || 0
    const percentage = total > 0 ? Math.round((totalComp / total) * 100) : 0

    const legacyStats = {
        total,
        totalComp,
        totalPending,
        totalInProgress,
        percentage
    }

    // Prepare Summary Cards
    const projectStats = statsResult.success && statsResult.data ? statsResult.data : {
        totalTasks: 0,
        completedTasks: 0,
        inProgressTasks: 0,
        blockedTasks: 0,
        overdueTasks: 0,
        urgentTasks: 0
    }

    // Fetch Forecasts for active tasks
    const taskIds = p.tasks?.filter((t: any) => t.status !== 'completed').map((t: any) => t.id) || [];
    let forecasts = {};
    if (taskIds.length > 0) {
        const forecastsResult = await getForecastsForTasks(taskIds);
        if (forecastsResult.success && forecastsResult.data) {
            forecasts = forecastsResult.data;
        }
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-background/95 backdrop-blur-sm border-b shadow-sm -mx-6 px-6 -mt-6 pt-6 pb-4 mb-6">
                <ProjectHeader
                    project={p}
                    stats={legacyStats}
                    canEdit={canEdit}
                    canMarkUrgent={canMarkUrgent}
                />
            </div>

            {/* Quick Stats Cards & Productivity Score */}
            <div className="grid gap-6 grid-cols-1 xl:grid-cols-3 px-1">
                {/* Productivity Score - Takes 1 column on large screens */}
                <div className="xl:col-span-1">
                    <ProductivityScoreCard
                        data={productivityData}
                        periodLabel="Project Health (Week)"
                    />
                </div>

                {/* Stats Cards - Takes 2 columns on large screens */}
                <div className="xl:col-span-2">
                    <SummaryStatsCards
                        cards={[
                            {
                                label: "Total Tasks",
                                value: projectStats.totalTasks,
                                icon: <ListTodo />,
                                color: "default",
                                href: "?tab=tasks"
                            },
                            {
                                label: "Completed",
                                value: projectStats.completedTasks,
                                icon: <CheckCircle2 />,
                                color: "green",
                                href: "?tab=tasks&status=completed"
                            },
                            {
                                label: "In Progress",
                                value: projectStats.inProgressTasks,
                                icon: <Loader2 />,
                                color: "blue",
                                href: "?tab=tasks&status=in_progress"
                            },
                            {
                                label: "Blocked",
                                value: projectStats.blockedTasks,
                                icon: <Ban />,
                                color: "red",
                                href: "?tab=tasks&status=waiting"
                            },
                            {
                                label: "Overdue",
                                value: projectStats.overdueTasks,
                                icon: <AlertCircle />,
                                color: "orange",
                                href: "?tab=tasks" // No overdue filter yet
                            },
                            {
                                label: "Urgent",
                                value: projectStats.urgentTasks,
                                icon: <AlertTriangle />,
                                color: "red",
                                href: "?tab=tasks&priority=urgent"
                            }
                        ]}
                    />
                </div>
            </div>

            {/* Forecasting Timeline */}
            <div className="px-1">
                <ForecastingTimeline tasks={p.tasks || []} forecasts={forecasts} />
            </div>

            {/* Urgent Project Banner */}
            {p.priority === "urgent" && session?.user?.id && (
                <UrgentProjectBanner
                    project={p}
                    userId={parseInt(session.user.id)}
                />
            )}

            {/* Navigation Tabs */}
            <ProjectTabs
                project={p}
                users={users}
                stats={legacyStats}
            />
        </div>
    )
}
