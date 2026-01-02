import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getDashboardSummary, getTodaysFocusTasks } from "@/app/actions/dashboard"
import { StatCard } from "@/components/dashboard/stat-card"
import { TodaysFocusSection } from "@/components/dashboard/todays-focus-section"
import { ActivitySnapshot } from "@/components/dashboard/activity-snapshot"
import { UrgentProjectsSection } from "@/components/dashboard/urgent-projects-section"
import { format } from "date-fns"
import { Badge } from "@/components/ui/badge"

export default async function DashboardPage() {
    const session = await getServerSession(authOptions)
    if (!session) {
        return <div>Unauthorized</div>
    }

    const summary = await getDashboardSummary()
    const todaysFocus = await getTodaysFocusTasks()

    if (summary.error) {
        return (
            <div className="p-8 text-center text-red-500">
                <h3 className="text-lg font-bold">Error Loading Dashboard</h3>
                <p>Please try refreshing the page. ({summary.error})</p>
            </div>
        )
    }

    const userRole = session.user.role || "developer"
    const isAdmin = userRole === "admin"
    const isPM = userRole === "project_manager" || isAdmin

    const today = format(new Date(), "EEEE, MMMM d, yyyy")

    return (
        <div className="space-y-6">
            {/* Header Section */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                    <p className="text-muted-foreground mt-1">{today}</p>
                </div>
                <Badge variant="secondary" className="text-sm">
                    {userRole === "admin" ? "Admin" : userRole === "project_manager" ? "Project Manager" : "Developer"}
                </Badge>
            </div>

            {/* Quick Statistics Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {/* Projects Statistics */}
                {isPM && (
                    <>
                        <StatCard
                            title="Total Projects"
                            value={summary.projects?.total || 0}
                            icon="FolderKanban"
                            href="/dashboard/projects"
                            variant="info"
                        />
                        {/* Dynamic Project Status Cards */}
                        {summary.projectStatuses && summary.projectStatuses.length > 0 ? (
                            summary.projectStatuses.map((status: any) => {
                                const count = summary.projects?.statusCounts?.[status.id] || 0
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
                                {(summary.projects?.legacyActive || 0) > 0 && (
                                    <StatCard
                                        title="Active Projects"
                                        value={summary.projects?.legacyActive || 0}
                                        icon="FolderOpen"
                                        href="/dashboard/projects?status=active"
                                        variant="success"
                                    />
                                )}
                                {(summary.projects?.legacyOnHold || 0) > 0 && (
                                    <StatCard
                                        title="On Hold Projects"
                                        value={summary.projects?.legacyOnHold || 0}
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
                        value={summary.tasks?.total || 0}
                        icon="CheckSquare"
                        href="/dashboard/tasks"
                        variant="info"
                    />
                )}
                
                <StatCard
                    title="My Tasks"
                    value={summary.tasks?.myTasks || 0}
                    icon="UserCheck"
                    href="/dashboard/tasks?assignee=me"
                    variant="default"
                />

                <StatCard
                    title="Blocked Tasks"
                    value={summary.tasks?.blocked || 0}
                    icon="AlertTriangle"
                    href="/dashboard/tasks?dependencyState=blocked"
                    variant="danger"
                />

                <StatCard
                    title="Overdue Tasks"
                    value={summary.tasks?.overdue || 0}
                    icon="Clock"
                    href="/dashboard/tasks?overdue=true"
                    variant="danger"
                />
            </div>

            {/* Task Status Cards */}
            {summary.taskStatuses && summary.taskStatuses.length > 0 && (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <h2 className="col-span-full text-lg font-semibold">Task Statuses</h2>
                    {summary.taskStatuses.map((status: any) => {
                        const count = summary.tasks?.statusCounts?.[status.id] || 0
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
                    value={summary.todayTasks?.total || 0}
                    icon="Calendar"
                    href="/dashboard/tasks?today=true"
                    variant="info"
                />
                <StatCard
                    title="Completed Today"
                    value={summary.todayTasks?.completed || 0}
                    icon="CheckCircle2"
                    href="/dashboard/reports?tab=today"
                    variant="success"
                />
            </div>

            {/* Urgent Projects Section */}
            <UrgentProjectsSection />

            {/* Main Content Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {/* Today's Focus Section */}
                <div className={isPM ? "lg:col-span-2" : "lg:col-span-3"}>
                    {todaysFocus.success ? (
                        <TodaysFocusSection 
                            tasks={todaysFocus.tasks || []} 
                            isAdmin={isAdmin}
                        />
                    ) : (
                        <div className="p-4 border rounded-lg">
                            <p className="text-sm text-muted-foreground">Loading today's tasks...</p>
                        </div>
                    )}
                </div>

                {/* Activity Snapshot - Only for PM/Admin */}
                {isPM && (
                    <div className={isPM ? "lg:col-span-1" : "hidden"}>
                        <ActivitySnapshot activities={summary.recentActivities || []} isAdmin={isAdmin} />
                    </div>
                )}
            </div>
        </div>
    )
}
