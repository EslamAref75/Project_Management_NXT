"use client"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { 
    CheckCircle2, 
    Clock,
    Users,
    Building2,
    Link2
} from "lucide-react"
import { cn } from "@/lib/utils"

interface Dependent {
    task: {
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

interface DependentsListProps {
    dependents: Dependent[]
}

export function DependentsList({ dependents }: DependentsListProps) {
    if (dependents.length === 0) {
        return (
            <div className="text-sm text-muted-foreground">
                No tasks depend on this task.
            </div>
        )
    }

    const getStatusBadge = (status: string) => {
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

    return (
        <div className="space-y-3">
            {dependents.map((dependent) => {
                const isWaiting = dependent.task.status === "waiting"

                return (
                    <Card 
                        key={dependent.task.id}
                        className={cn(
                            "transition-colors",
                            isWaiting && "border-orange-500/50 bg-orange-500/5"
                        )}
                    >
                        <CardHeader className="pb-3">
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        {isWaiting && (
                                            <Clock className="w-4 h-4 text-orange-500" />
                                        )}
                                        <CardTitle className="text-sm font-medium">
                                            {dependent.task.title}
                                        </CardTitle>
                                    </div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        {getStatusBadge(dependent.task.status)}
                                        {isWaiting && (
                                            <Badge variant="outline" className="bg-orange-500/10 text-orange-500 border-orange-500/20">
                                                Waiting for this task
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                            <div className="space-y-2 text-sm">
                                {/* Assignees */}
                                {dependent.task.assignees && dependent.task.assignees.length > 0 && (
                                    <div className="flex items-center gap-2">
                                        <Users className="w-4 h-4 text-muted-foreground" />
                                        <span className="text-muted-foreground">Assigned to:</span>
                                        <div className="flex flex-wrap gap-1">
                                            {dependent.task.assignees.map((assignee) => (
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
                                {dependent.task.team && (
                                    <div className="flex items-center gap-2">
                                        <Building2 className="w-4 h-4 text-muted-foreground" />
                                        <span className="text-muted-foreground">Team:</span>
                                        <Badge variant="outline" className="text-xs">
                                            {dependent.task.team.name}
                                        </Badge>
                                    </div>
                                )}

                                {/* Dependency Type */}
                                <div className="flex items-center gap-2">
                                    <Link2 className="w-4 h-4 text-muted-foreground" />
                                    <span className="text-muted-foreground">Type:</span>
                                    <span className="text-xs">
                                        {dependent.dependencyType === "finish_to_start" 
                                            ? "Finish-to-Start" 
                                            : dependent.dependencyType}
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

