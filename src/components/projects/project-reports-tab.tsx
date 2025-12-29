import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart3, TrendingUp, Clock, AlertCircle } from "lucide-react"

interface ProjectReportsTabProps {
    project: any
    stats: any
}

export function ProjectReportsTab({ project, stats }: ProjectReportsTabProps) {
    const tasks = project.tasks || []
    const blockedTasks = tasks.filter((task: any) => {
        if (task.status === "waiting") return true
        if (task.dependencies && task.dependencies.length > 0) {
            return task.dependencies.some((dep: any) => dep.dependsOnTask.status !== "completed")
        }
        return false
    })

    const completionRate = stats.total > 0 ? (stats.totalComp / stats.total) * 100 : 0

    return (
        <div className="grid gap-6 md:grid-cols-2">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5" />
                        Task Completion Rate
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div>
                            <div className="text-3xl font-bold">{completionRate.toFixed(1)}%</div>
                            <p className="text-sm text-muted-foreground">
                                {stats.totalComp} of {stats.total} tasks completed
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Clock className="h-5 w-5" />
                        Blocked Time Analysis
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div>
                            <div className="text-3xl font-bold">{blockedTasks.length}</div>
                            <p className="text-sm text-muted-foreground">
                                Tasks currently blocked by dependencies
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="md:col-span-2">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5" />
                        Project Reports
                    </CardTitle>
                    <CardDescription>
                        Detailed analytics and insights
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-12 border border-dashed rounded-lg">
                        <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">
                            Advanced reports coming soon
                        </p>
                        <p className="text-sm text-muted-foreground mt-2">
                            Burn-down charts, user productivity, and dependency impact analysis
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

