"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
    AlertCircle,
    CheckCircle2,
    Clock,
    X,
    Link2,
    Users,
    Building2
} from "lucide-react"
import { removeTaskDependency } from "@/app/actions/dependencies"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { cn } from "@/lib/utils"

interface Dependency {
    dependsOnTask: {
        id: number
        title: string
        status: string
        assignees: Array<{
            id: number
            username: string
            avatarUrl?: string | null
            team?: {
                id: number
                name: string
            } | null
        }>
        team?: {
            id: number
            name: string
        } | null
    }
    dependencyType: string
    createdAt: string
}

interface DependencyListProps {
    dependencies: Dependency[]
    taskId: number
    projectId: number
    canEdit?: boolean
}

export function DependencyList({
    dependencies,
    taskId,
    projectId,
    canEdit = true
}: DependencyListProps) {
    const router = useRouter()
    const [removing, setRemoving] = useState<number | null>(null)

    const handleRemove = async (dependsOnTaskId: number) => {
        if (!confirm("Are you sure you want to remove this dependency?")) {
            return
        }

        setRemoving(dependsOnTaskId)
        try {
            const result = await removeTaskDependency(taskId, dependsOnTaskId)
            if (result.error) {
                alert(result.error)
            } else {
                // Force a reload to ensure strict state sync
                router.refresh()
                window.location.reload()
            }
        } catch (e) {
            console.error("Removal error:", e)
            alert("Failed to remove dependency")
        } finally {
            setRemoving(null)
        }
    }

    const getStatusBadge = (status: string, isCompleted: boolean) => {
        if (isCompleted) {
            return (
                <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Completed
                </Badge>
            )
        }

        const statusColors: Record<string, string> = {
            pending: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
            in_progress: "bg-blue-500/10 text-blue-500 border-blue-500/20",
            waiting: "bg-orange-500/10 text-orange-500 border-orange-500/20",
            review: "bg-purple-500/10 text-purple-500 border-purple-500/20",
            completed: "bg-green-500/10 text-green-500 border-green-500/20",
        }

        return (
            <Badge variant="outline" className={cn("capitalize", statusColors[status] || "bg-gray-500/10 text-gray-500")}>
                {status.replace("_", " ")}
            </Badge>
        )
    }

    if (dependencies.length === 0) {
        return (
            <div className="text-sm text-muted-foreground">
                No dependencies. This task can be started immediately.
            </div>
        )
    }

    return (
        <div className="space-y-3">
            {dependencies.map((dep) => {
                const isCompleted = dep.dependsOnTask.status === "completed"
                const isBlocking = !isCompleted

                return (
                    <Card
                        key={dep.dependsOnTask.id}
                        className={cn(
                            "transition-colors",
                            isBlocking && "border-orange-500/50 bg-orange-500/5"
                        )}
                    >
                        <CardHeader className="pb-3">
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        {isBlocking ? (
                                            <AlertCircle className="w-4 h-4 text-orange-500" />
                                        ) : (
                                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                                        )}
                                        <CardTitle className="text-sm font-medium">
                                            {dep.dependsOnTask.title}
                                        </CardTitle>
                                    </div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        {getStatusBadge(dep.dependsOnTask.status, isCompleted)}
                                        {isBlocking && (
                                            <Badge variant="outline" className="bg-orange-500/10 text-orange-500 border-orange-500/20">
                                                <Clock className="w-3 h-3 mr-1" />
                                                Blocking
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                                {canEdit && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 shrink-0"
                                        onClick={() => handleRemove(dep.dependsOnTask.id)}
                                        disabled={removing === dep.dependsOnTask.id}
                                    >
                                        <X className="w-4 h-4" />
                                    </Button>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                            <div className="space-y-2 text-sm">
                                {/* Assignees */}
                                {dep.dependsOnTask.assignees && dep.dependsOnTask.assignees.length > 0 && (
                                    <div className="flex items-center gap-2">
                                        <Users className="w-4 h-4 text-muted-foreground" />
                                        <span className="text-muted-foreground">Assigned to:</span>
                                        <div className="flex flex-wrap gap-1">
                                            {dep.dependsOnTask.assignees.map((assignee) => (
                                                <Badge
                                                    key={assignee.id}
                                                    variant="secondary"
                                                    className="text-xs"
                                                >
                                                    {assignee.username}
                                                    {assignee.team && (
                                                        <span className="ml-1 text-muted-foreground">
                                                            ({assignee.team.name})
                                                        </span>
                                                    )}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Team Assignment */}
                                {dep.dependsOnTask.team && (
                                    <div className="flex items-center gap-2">
                                        <Building2 className="w-4 h-4 text-muted-foreground" />
                                        <span className="text-muted-foreground">Team:</span>
                                        <Badge variant="outline" className="text-xs">
                                            {dep.dependsOnTask.team.name}
                                        </Badge>
                                    </div>
                                )}

                                {/* Dependency Type */}
                                <div className="flex items-center gap-2">
                                    <Link2 className="w-4 h-4 text-muted-foreground" />
                                    <span className="text-muted-foreground">Type:</span>
                                    <span className="text-xs">
                                        {dep.dependencyType === "finish_to_start"
                                            ? "Finish-to-Start"
                                            : dep.dependencyType}
                                    </span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )
            })}
        </div>
    )
}

