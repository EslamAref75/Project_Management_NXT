import { Suspense } from "react"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getDashboardSummary, getTodaysFocusTasks } from "@/app/actions/dashboard"
import { StatCard } from "@/components/dashboard/stat-card"
import { TodaysFocusSection } from "@/components/dashboard/todays-focus-section"
import { ActivitySnapshot } from "@/components/dashboard/activity-snapshot"
import { UrgentProjectsSection } from "@/components/dashboard/urgent-projects-section"
import { format } from "date-fns"
import { Badge } from "@/components/ui/badge"
import { DashboardExportButton } from "@/components/dashboard/dashboard-export-button"
import { StatCardGridSkeleton } from "@/components/ui/stat-card-skeleton"
import { CardListSkeleton } from "@/components/ui/card-list-skeleton"

// Section Components
async function DashboardStatsSection() {
    const summary = await getDashboardSummary()
    const session = await getServerSession(authOptions)

    if (!session) return null
    if (!summary.success) {
        return (
            <div className="p-8 text-center text-red-500">
                <h3 className="text-lg font-bold">Error Loading Dashboard</h3>
                <p>Please try refreshing the page. ({(summary as any).error})</p>
            </div>
        )
    }

    // Type assertion to help TypeScript narrow the union type
    const data = summary as any

    const userRole = session.user.role || "developer"
    const isAdmin = userRole === "admin"
    const isPM = userRole === "project_manager" || isAdmin

    return (
        <>
            {/* Quick Statistics Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {/* Projects Statistics */}
                {isPM && (
                    <>
                        <StatCard
                            title="Total Projects"
                            value={data.projects?.total || 0}
                            icon="FolderKanban"
                            href="/dashboard/projects"
                            variant="info"
                            trend={data.projects?.trend ? {
                                direction: data.projects.trend.direction,
                                value: `${data.projects.trend.percentage}%`,
                                label: "vs yesterday"
                            } : undefined}
                        />
                        {/* Dynamic Project Status Cards */}
                        {data.projectstatuses && data.projectstatuses.length > 0 ? (
                            data.projectstatuses.map((status: any) => {
                                const count = data.projects?.statusCounts?.[status.id] || 0
                                // Only show statuses with projects or if it's a default status
                                if (count === 0) return null
                                return (
                                    <StatCard
                                        key={status.id}
                                        title={status.name}
                                        value={count}
                                        icon="FolderOpen"
                                        href={`/dashboard/projects?status=${status.id}`}
                                        variant="default"
                                    />
                                )
                            })
                        ) : (
                            // Fallback to legacy statuses if no dynamic statuses exist
                            <>
                                {(data.projects?.legacyActive || 0) > 0 && (
                                    <StatCard
                                        title="Active Projects"
                                        value={data.projects?.legacyActive || 0}
                                        icon="FolderOpen"
                                        href="/dashboard/projects?status=active"
                                        variant="success"
                                    />
                                )}
                                {(data.projects?.legacyOnHold || 0) > 0 && (
                                    <StatCard
                                        title="On Hold Projects"
                                        value={data.projects?.legacyOnHold || 0}
                                        icon="FolderX"
                                        href="/dashboard/projects?status=on_hold"
                                        variant="warning"
                                    />
                                )}
                            </>
                        )}
                    </>
                )}

                {/* Tasks Statistics */}
                {isPM && (
                    <StatCard
                        title="Total Tasks"
                        value={data.tasks?.total || 0}
                        icon="CheckSquare"
                        href="/dashboard/tasks"
                        variant="info"
                        trend={data.tasks?.trend ? {
                            direction: data.tasks.trend.direction,
                            value: `${data.tasks.trend.percentage}%`,
                            label: "vs yesterday"
                        } : undefined}
                    />
                )}

                <StatCard
                    title="My Tasks"
                    value={data.tasks?.myTasks || 0}
                    icon="UserCheck"
                    href="/dashboard/tasks?assignee=me"
                    variant="default"
                    trend={data.tasks?.myTasksTrend ? {
                        direction: data.tasks.myTasksTrend.direction,
                        value: `${data.tasks.myTasksTrend.percentage}%`,
                        label: "vs yesterday"
                    } : undefined}
                />

                <StatCard
                    title="Blocked Tasks"
                    value={data.tasks?.blocked || 0}
                    icon="AlertTriangle"
                    href="/dashboard/tasks?dependencyState=blocked"
                    variant="danger"
                    trend={data.tasks?.blockedTrend ? {
                        direction: data.tasks.blockedTrend.direction,
                        value: `${data.tasks.blockedTrend.percentage}%`,
                        label: "vs yesterday"
                    } : undefined}
                />

                <StatCard
                    title="Overdue Tasks"
                    value={data.tasks?.overdue || 0}
                    icon="Clock"
                    href="/dashboard/tasks?overdue=true"
                    variant="danger"
                    trend={data.tasks?.overdueTrend ? {
                        direction: data.tasks.overdueTrend.direction,
                        value: `${data.tasks.overdueTrend.percentage}%`,
                        label: "vs yesterday"
                    } : undefined}
                />
            </div>

            {/* Task Status Cards */}
            {data.taskstatuses && data.taskstatuses.length > 0 && (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <h2 className="col-span-full text-lg font-semibold">Task Statuses</h2>
                    {data.taskstatuses.map((status: any) => {
                        const count = data.tasks?.statusCounts?.[status.id] || 0
                        // Only show statuses with tasks
                        if (count === 0) return null
                        return (
                            <StatCard
                                key={status.id}
                                title={status.name}
                                value={count}
                                icon="CheckSquare"
                                href={`/dashboard/tasks?status=${status.id}`}
                                variant="default"
                            />
                        )
                    })}
                </div>
            )}

            {/* Today's Tasks Statistics */}
            <div className="grid gap-4 md:grid-cols-2">
                <StatCard
                    title="Today's Tasks"
                    value={data.todayTasks?.total || 0}
                    icon="Calendar"
                    href="/dashboard/tasks?today=true"
                    variant="info"
                    trend={data.todayTasks?.totalTrend ? {
                        direction: data.todayTasks.totalTrend.direction,
                        value: `${data.todayTasks.totalTrend.percentage}%`,
                        label: "vs yesterday"
                    } : undefined}
                />
                <StatCard
                    title="Completed Today"
                    value={data.todayTasks?.completed || 0}
                    icon="CheckCircle2"
                    href="/dashboard/reports?tab=today"
                    variant="success"
                    trend={data.todayTasks?.completedTrend ? {
                        direction: data.todayTasks.completedTrend.direction,
                        value: `${data.todayTasks.completedTrend.percentage}%`,
                        label: "vs yesterday"
                    } : undefined}
                />
            </div>
        </>
    )
}

async function DashboardFocusSection() {
    const session = await getServerSession(authOptions)
    const todaysFocus = await getTodaysFocusTasks()

    if (!session) return null
    const userRole = session.user.role || "developer"
    const isAdmin = userRole === "admin"
    const isPM = userRole === "project_manager" || isAdmin

    return (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <div className={isPM ? "lg:col-span-2" : "lg:col-span-3"}>
                {todaysFocus.success ? (
                    <TodaysFocusSection
                        tasks={(todaysFocus as any).tasks || []}
                        isAdmin={isAdmin}
                    />
                ) : (
                    <div className="p-4 border rounded-lg">
                        <p className="text-sm text-muted-foreground">Failed to load tasks</p>
                    </div>
                )}
            </div>

            {isPM && (
                <div className={isPM ? "lg:col-span-1" : "hidden"}>
                    <ActivitySnapshot activities={[]} isAdmin={isAdmin} />
                </div>
            )}
        </div>
    )
}

export default async function DashboardPage() {
    const session = await getServerSession(authOptions)
    if (!session) {
        return <div>Unauthorized</div>
    }

    const userRole = session.user.role || "developer"
    const today = format(new Date(), "EEEE, MMMM d, yyyy")

    return (
        <div className="space-y-6">
            {/* Header Section */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                    <p className="text-muted-foreground mt-1">{today}</p>
                </div>
                <div className="flex items-center space-x-2">
                    <DashboardExportButton />
                    <Badge variant="secondary" className="text-sm">
                        {userRole === "admin" ? "Admin" : userRole === "project_manager" ? "Project Manager" : "Developer"}
                    </Badge>
                </div>
            </div>

            {/* Statistics with Suspense */}
            <Suspense fallback={<StatCardGridSkeleton count={5} />}>
                <DashboardStatsSection />
            </Suspense>

            {/* Urgent Projects Section */}
            <Suspense fallback={<CardListSkeleton count={2} />}>
                <UrgentProjectsSection />
            </Suspense>

            {/* Focus Section with Suspense */}
            <Suspense fallback={<CardListSkeleton count={3} />}>
                <DashboardFocusSection />
            </Suspense>
        </div>
    )
}

