"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"

interface Task {
    id: number
    title: string
    status: string
    priority: string
    assignees: Array<{ id: number; username: string; email: string }>
    isBlocked: boolean
    blockingDependencies: Array<{ id: number; title: string; status: string }>
}

interface ProjectTaskCardProps {
    project: {
        id: number
        name: string
        code: string
        status: string
        todayTasks: Task[]
    }
}

export function ProjectTaskCard({ project }: ProjectTaskCardProps) {
    const getStatusBadge = (status: string) => {
        const statusColors: Record<string, string> = {
            active: "bg-green-500/10 text-green-500 border-green-500/20",
            on_hold: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
            completed: "bg-blue-500/10 text-blue-500 border-blue-500/20",
            archived: "bg-gray-500/10 text-gray-500 border-gray-500/20",
        }
        return statusColors[status] || "bg-gray-500/10 text-gray-500"
    }

    return (
        <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg">{project.name}</h3>
                        <Badge
                            variant="outline"
                            className={cn("text-xs", getStatusBadge(project.status))}
                        >
                            {project.status.replace("_", " ")}
                        </Badge>
                    </div>
                </div>

                {project.todayTasks.length === 0 ? (
                    <div className="text-center py-4">
                        <p className="text-sm text-muted-foreground">
                            No tasks assigned for today
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {project.todayTasks.map((task) => (
                            <Card
                                key={task.id}
                                className={cn(
                                    "p-3 border-l-4",
                                    task.isBlocked && "border-l-orange-500 bg-orange-50/50 dark:bg-orange-950/20"
                                )}
                            >
                                <div className="flex items-start justify-between mb-2">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h4 className="font-medium text-sm">{task.title}</h4>
                                            <Badge
                                                variant="outline"
                                                className={cn(
                                                    "text-xs",
                                                    getStatusBadge(task.status)
                                                )}
                                            >
                                                {task.status.replace("_", " ")}
                                            </Badge>
                                            {task.isBlocked && (
                                                <Badge
                                                    variant="outline"
                                                    className="text-xs border-orange-500 text-orange-600 bg-orange-50"
                                                >
                                                    <AlertTriangle className="h-3 w-3 mr-1" />
                                                    Blocked
                                                </Badge>
                                            )}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            Assigned to: {task.assignees.map(a => a.username).join(", ")}
                                        </div>
                                    </div>
                                </div>
                                {task.isBlocked && task.blockingDependencies.length > 0 && (
                                    <div className="mt-2 text-xs text-orange-600 dark:text-orange-400">
                                        <p className="font-medium">Blocked by:</p>
                                        <ul className="list-disc list-inside mt-1">
                                            {task.blockingDependencies.map((dep) => (
                                                <li key={dep.id}>{dep.title}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </Card>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

