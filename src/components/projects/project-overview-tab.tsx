import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { 
    CheckCircle2, 
    Clock, 
    AlertCircle, 
    Calendar,
    Users,
    TrendingUp
} from "lucide-react"
import { format } from "date-fns"
import Link from "next/link"
import { ProjectRecentActivity } from "./project-recent-activity"
import { ProjectBlockedTasks } from "./project-blocked-tasks"

interface ProjectOverviewTabProps {
    project: any
    stats: any
    users: any[]
}

export function ProjectOverviewTab({ project, stats, users }: ProjectOverviewTabProps) {
    const blockedTasks = project.tasks?.filter((task: any) => {
        if (task.status === "waiting") return true
        if (task.dependencies && task.dependencies.length > 0) {
            return task.dependencies.some((dep: any) => dep.dependsOnTask.status !== "completed")
        }
        return false
    }) || []

    const upcomingDeadlines = project.tasks
        ?.filter((task: any) => task.dueDate && task.status !== "completed")
        .sort((a: any, b: any) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
        .slice(0, 5) || []

    // Get unique assignees
    const assignees = new Map()
    project.tasks?.forEach((task: any) => {
        task.assignees?.forEach((assignee: any) => {
            if (!assignees.has(assignee.id)) {
                assignees.set(assignee.id, assignee)
            }
        })
    })

    return (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {/* Project Summary */}
                <Card key="overview-project-summary" className="md:col-span-2 lg:col-span-3">
                    <CardHeader>
                        <CardTitle>Project Summary</CardTitle>
                        <CardDescription>Overview of project status and progress</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                                <div className="text-2xl font-bold">{stats.total}</div>
                                <div className="text-sm text-muted-foreground">Total Tasks</div>
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-green-600">{stats.totalComp}</div>
                                <div className="text-sm text-muted-foreground">Completed</div>
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-blue-600">{stats.totalInProgress}</div>
                                <div className="text-sm text-muted-foreground">In Progress</div>
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-yellow-600">{blockedTasks.length}</div>
                                <div className="text-sm text-muted-foreground">Blocked</div>
                            </div>
                        </div>
                        {stats.total > 0 && (
                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">Overall Progress</span>
                                    <span className="font-medium">{stats.percentage}%</span>
                                </div>
                                <Progress value={stats.percentage} className="h-2" />
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Task Stats */}
                <Card key="overview-task-stats">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="h-5 w-5" />
                            Task Statistics
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                                    <span className="text-sm">Completed</span>
                                </div>
                                <span className="font-semibold">{stats.totalComp}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-blue-600" />
                                    <span className="text-sm">In Progress</span>
                                </div>
                                <span className="font-semibold">{stats.totalInProgress}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                                    <span className="text-sm">Blocked</span>
                                </div>
                                <span className="font-semibold">{blockedTasks.length}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-gray-600" />
                                    <span className="text-sm">Pending</span>
                                </div>
                                <span className="font-semibold">{stats.totalPending}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Upcoming Deadlines */}
                <Card key="overview-upcoming-deadlines">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Calendar className="h-5 w-5" />
                            Upcoming Deadlines
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {upcomingDeadlines.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No upcoming deadlines</p>
                        ) : (
                            <div className="space-y-3">
                                {upcomingDeadlines.map((task: any, index: number) => (
                                    <Link
                                        key={`deadline-${task.id}-${index}`}
                                        href={`/dashboard/projects/${project.id}/tasks/${task.id}`}
                                        className="block p-2 border rounded hover:bg-muted transition-colors"
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium truncate">{task.title}</span>
                                            <span className="text-xs text-muted-foreground">
                                                {format(new Date(task.dueDate), "MMM d")}
                                            </span>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Assigned Members */}
                <Card key="overview-assigned-members">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Users className="h-5 w-5" />
                            Team Members
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {assignees.size === 0 ? (
                            <p className="text-sm text-muted-foreground">No members assigned</p>
                        ) : (
                            <div className="flex flex-wrap gap-2">
                                {Array.from(assignees.values()).map((assignee: any, index: number) => (
                                    <div
                                        key={`assignee-${assignee.id}-${index}`}
                                        className="flex items-center gap-2 p-2 border rounded"
                                    >
                                        <Avatar className="h-8 w-8">
                                            <AvatarImage src={assignee.avatarUrl || undefined} />
                                            <AvatarFallback>
                                                {assignee.username.substring(0, 2).toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                        <span className="text-sm">{assignee.username}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Blocked Tasks */}
                <Card key="overview-blocked-tasks" className="md:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <AlertCircle className="h-5 w-5 text-yellow-600" />
                            Blocked Tasks
                        </CardTitle>
                        <CardDescription>Tasks waiting for dependencies</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ProjectBlockedTasks project={project} blockedTasks={blockedTasks} />
                    </CardContent>
                </Card>

                {/* Recent Activity */}
                <Card key="overview-recent-activity" className="md:col-span-2 lg:col-span-3">
                    <CardHeader>
                        <CardTitle>Recent Activity</CardTitle>
                        <CardDescription>Last 10 actions in this project</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ProjectRecentActivity projectId={project.id} />
                    </CardContent>
                </Card>
        </div>
    )
}

