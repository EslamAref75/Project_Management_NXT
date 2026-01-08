"use client"

import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { format } from "date-fns"
import { Calendar, Lock, Target, AlertCircle } from "lucide-react"
import { ForecastBadge, ForecastData } from "@/components/productivity/forecast-badge"
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination"
import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface TasksCardViewProps {
    tasks: any[]
    total: number
    page: number
    limit: number
    onPageChange: (page: number) => void
    forecasts?: Record<number, ForecastData>
}

export function TasksCardView({
    tasks,
    total,
    page,
    limit,
    onPageChange,
    forecasts,
}: TasksCardViewProps) {
    const totalPages = Math.ceil(total / limit)

    const isBlocked = (task: any) => {
        if (task.status === "waiting") return true
        if (task.dependencies && task.dependencies.length > 0) {
            return task.dependencies.some(
                (dep: any) => dep.dependsOnTask.status !== "completed"
            )
        }
        return false
    }

    const isOverdue = (task: any) => {
        if (!task.dueDate) return false
        return new Date(task.dueDate) < new Date() && task.status !== "completed"
    }

    const isTodaysTask = (task: any) => {
        if (!task.plannedDate) return false
        const today = new Date()
        const taskDate = new Date(task.plannedDate)
        return (
            taskDate.toDateString() === today.toDateString() &&
            task.status !== "completed"
        )
    }

    const statusColors: Record<string, string> = {
        pending: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
        in_progress: "bg-blue-500/10 text-blue-500 border-blue-500/20",
        review: "bg-purple-500/10 text-purple-500 border-purple-500/20",
        completed: "bg-green-500/10 text-green-500 border-green-500/20",
        waiting: "bg-orange-500/10 text-orange-500 border-orange-500/20",
    }

    const priorityColors: Record<string, string> = {
        urgent: "bg-red-500/10 text-red-500 border-red-500/20",
        high: "bg-orange-500/10 text-orange-500 border-orange-500/20",
        normal: "bg-blue-500/10 text-blue-500 border-blue-500/20",
        low: "bg-gray-500/10 text-gray-500 border-gray-500/20",
    }

    if (tasks.length === 0) {
        return (
            <div className="flex min-h-[400px] flex-col items-center justify-center rounded-md border border-dashed p-8 text-center">
                <h3 className="mt-4 text-lg font-semibold">No tasks found</h3>
                <p className="mb-4 mt-2 text-sm text-muted-foreground max-w-sm">
                    Try adjusting your filters or create a new task.
                </p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {tasks.map((task) => {
                    const blocked = isBlocked(task)
                    const overdue = isOverdue(task)
                    const todaysTask = isTodaysTask(task)

                    return (
                        <Link
                            key={task.id}
                            href={`/dashboard/projects/${task.projectId}/tasks/${task.id}`}
                        >
                            <Card
                                className={cn(
                                    "transition-shadow hover:shadow-md h-full cursor-pointer",
                                    blocked && "border-orange-500/50",
                                    overdue && "border-red-500/50",
                                    todaysTask && "border-blue-500/50 bg-blue-50/50"
                                )}
                            >
                                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                                    <div className="space-y-1 flex-1">
                                        <div className="flex items-center gap-2">
                                            <CardTitle className="text-base font-semibold leading-none line-clamp-2">
                                                {task.title}
                                            </CardTitle>
                                            {blocked && (
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger>
                                                            <Lock className="h-4 w-4 text-orange-500 shrink-0" />
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            <p>Waiting on dependency</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline" className="text-xs">
                                                {task.project?.name || "Unknown Project"}
                                            </Badge>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-1">
                                        <Badge
                                            className={cn(
                                                "text-xs",
                                                statusColors[task.status] ||
                                                "bg-gray-500/10 text-gray-500 border-gray-500/20"
                                            )}
                                        >
                                            {task.status.replace("_", " ")}
                                        </Badge>
                                        {todaysTask && (
                                            <Badge variant="secondary" className="text-xs">
                                                <Target className="h-3 w-3 mr-1" />
                                                Today
                                            </Badge>
                                        )}
                                        {forecasts && forecasts[task.id] && (
                                            <div className="mt-1">
                                                <ForecastBadge
                                                    forecast={forecasts[task.id]}
                                                    dueDate={task.dueDate}
                                                    compact
                                                />
                                            </div>
                                        )}
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {/* Priority */}
                                    <div className="flex items-center gap-2">
                                        <Badge
                                            className={cn(
                                                "text-xs",
                                                priorityColors[task.priority] ||
                                                "bg-gray-500/10 text-gray-500 border-gray-500/20"
                                            )}
                                        >
                                            {task.priority}
                                        </Badge>
                                        {overdue && (
                                            <Badge variant="destructive" className="text-xs">
                                                <AlertCircle className="h-3 w-3 mr-1" />
                                                Overdue
                                            </Badge>
                                        )}
                                    </div>

                                    {/* Assignees */}
                                    {task.assignees && task.assignees.length > 0 ? (
                                        <div className="flex items-center gap-2">
                                            <div className="flex -space-x-2">
                                                {task.assignees.slice(0, 3).map((assignee: any) => (
                                                    <Avatar key={assignee.id} className="h-6 w-6 border-2 border-background">
                                                        <AvatarImage src={assignee.avatarUrl || undefined} />
                                                        <AvatarFallback className="text-xs">
                                                            {assignee.username.substring(0, 2).toUpperCase()}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                ))}
                                            </div>
                                            {task.assignees.length > 3 && (
                                                <span className="text-xs text-muted-foreground">
                                                    +{task.assignees.length - 3}
                                                </span>
                                            )}
                                        </div>
                                    ) : (
                                        <p className="text-xs text-muted-foreground">Unassigned</p>
                                    )}

                                    {/* Due Date */}
                                    {task.dueDate && (
                                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                            <Calendar className="h-3 w-3" />
                                            <span
                                                className={cn(
                                                    overdue && "text-red-600 font-medium"
                                                )}
                                            >
                                                Due: {format(new Date(task.dueDate), "MMM d, yyyy")}
                                            </span>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </Link>
                    )
                })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <Pagination>
                    <PaginationContent>
                        <PaginationItem>
                            <PaginationPrevious
                                onClick={() => page > 1 && onPageChange(page - 1)}
                                className={page === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                            />
                        </PaginationItem>
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                            <PaginationItem key={p}>
                                <PaginationLink
                                    onClick={() => onPageChange(p)}
                                    isActive={p === page}
                                    className="cursor-pointer"
                                >
                                    {p}
                                </PaginationLink>
                            </PaginationItem>
                        ))}
                        <PaginationItem>
                            <PaginationNext
                                onClick={() => page < totalPages && onPageChange(page + 1)}
                                className={
                                    page === totalPages
                                        ? "pointer-events-none opacity-50"
                                        : "cursor-pointer"
                                }
                            />
                        </PaginationItem>
                    </PaginationContent>
                </Pagination>
            )}
        </div>
    )
}

