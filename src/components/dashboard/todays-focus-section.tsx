"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CheckCircle2, Clock, AlertCircle, ExternalLink, Loader2 } from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"
import { updateTaskStatus } from "@/app/actions/tasks"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

interface TodaysFocusSectionProps {
    tasks: any[]
    isAdmin?: boolean
}

export function TodaysFocusSection({ tasks, isAdmin = false }: TodaysFocusSectionProps) {
    const router = useRouter()
    const [updating, setUpdating] = useState<number | null>(null)

    const handleComplete = async (task: any) => {
        setUpdating(task.id)
        try {
            await updateTaskStatus(task.id, "completed", task.project.id)
            router.refresh()
        } catch (error) {
            console.error("Failed to update task:", error)
        } finally {
            setUpdating(null)
        }
    }

    const getStatusIcon = (status: string) => {
        switch (status) {
            case "completed":
                return <CheckCircle2 className="h-4 w-4 text-green-600" />
            case "in_progress":
            case "review":
                return <Clock className="h-4 w-4 text-blue-600" />
            case "waiting":
                return <AlertCircle className="h-4 w-4 text-yellow-600" />
            default:
                return <Clock className="h-4 w-4 text-gray-600" />
        }
    }

    const getPriorityBadge = (priority: string) => {
        const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
            urgent: "destructive",
            high: "destructive",
            normal: "default",
            low: "secondary"
        }
        return variants[priority] || "default"
    }

    const isBlocked = (task: any) => {
        if (task.status === "waiting") return true
        if (task.dependencies && task.dependencies.length > 0) {
            return task.dependencies.some((dep: any) => dep.dependsOnTask.status !== "completed")
        }
        return false
    }

    if (tasks.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Today's Focus</CardTitle>
                    <CardDescription>Your tasks scheduled for today</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-8 text-muted-foreground">
                        <p>No tasks scheduled for today</p>
                        <Link href="/dashboard/focus" className="text-sm text-primary hover:underline mt-2 inline-block">
                            Plan your day →
                        </Link>
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Today's Focus</CardTitle>
                        <CardDescription>
                            {tasks.length} task{tasks.length !== 1 ? "s" : ""} scheduled for today
                        </CardDescription>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                        <Link href="/dashboard/focus">
                            View All
                            <ExternalLink className="h-4 w-4 ml-2" />
                        </Link>
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    {tasks.slice(0, 5).map((task) => {
                        const blocked = isBlocked(task)
                        return (
                            <div
                                key={task.id}
                                className={cn(
                                    "flex items-start gap-3 p-3 border rounded-lg transition-colors",
                                    blocked && "bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800"
                                )}
                            >
                                <div className="flex-shrink-0 mt-0.5">
                                    {getStatusIcon(task.status)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2 mb-1">
                                        <Link
                                            href={`/dashboard/projects/${task.project.id}/tasks/${task.id}`}
                                            className="font-medium hover:underline text-sm"
                                        >
                                            {task.title}
                                        </Link>
                                        <Badge variant={getPriorityBadge(task.priority)} className="text-xs">
                                            {task.priority}
                                        </Badge>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <span>{task.project.name}</span>
                                        {blocked && (
                                            <>
                                                <span>•</span>
                                                <span className="text-yellow-600 dark:text-yellow-400 flex items-center gap-1">
                                                    <AlertCircle className="h-3 w-3" />
                                                    Blocked
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </div>
                                {task.status !== "completed" && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleComplete(task)}
                                        disabled={updating === task.id || blocked}
                                        className="flex-shrink-0"
                                    >
                                        {updating === task.id ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <CheckCircle2 className="h-4 w-4" />
                                        )}
                                    </Button>
                                )}
                            </div>
                        )
                    })}
                    {tasks.length > 5 && (
                        <div className="text-center pt-2">
                            <Link
                                href="/dashboard/focus"
                                className="text-sm text-primary hover:underline"
                            >
                                +{tasks.length - 5} more tasks
                            </Link>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}

