import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { AlertCircle } from "lucide-react"

interface ProjectBlockedTasksProps {
    project: any
    blockedTasks: any[]
}

export function ProjectBlockedTasks({ project, blockedTasks }: ProjectBlockedTasksProps) {
    if (blockedTasks.length === 0) {
        return <p className="text-sm text-muted-foreground">No blocked tasks</p>
    }

    return (
        <div className="space-y-3">
            {blockedTasks.slice(0, 5).map((task: any) => {
                const incompleteDeps = task.dependencies?.filter(
                    (dep: any) => dep.dependsOnTask.status !== "completed"
                ) || []

                return (
                    <Link
                        key={task.id}
                        href={`/dashboard/projects/${project.id}/tasks/${task.id}`}
                        className="block p-3 border rounded-lg hover:bg-muted transition-colors"
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                                    <span className="font-medium">{task.title}</span>
                                </div>
                                {incompleteDeps.length > 0 && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Waiting for: {incompleteDeps.map((dep: any) => dep.dependsOnTask.title).join(", ")}
                                    </p>
                                )}
                            </div>
                            <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                                Blocked
                            </Badge>
                        </div>
                    </Link>
                )
            })}
            {blockedTasks.length > 5 && (
                <p className="text-xs text-muted-foreground text-center">
                    +{blockedTasks.length - 5} more blocked tasks
                </p>
            )}
        </div>
    )
}

