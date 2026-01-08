"use client"

import Link from "next/link"
import { useState } from "react"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { format } from "date-fns"
import { ArrowUpDown, ArrowUp, ArrowDown, Lock, Target, AlertCircle } from "lucide-react"
import { ForecastBadge, ForecastData } from "@/components/productivity/forecast-badge"
import { Button } from "@/components/ui/button"
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

type SortField = "title" | "project" | "status" | "priority" | "dueDate" | "assignee"
type SortDirection = "asc" | "desc"

interface TasksTableViewProps {
    tasks: any[]
    total: number
    page: number
    limit: number
    onPageChange: (page: number) => void
    forecasts?: Record<number, ForecastData>
}

export function TasksTableView({
    tasks,
    total,
    page,
    limit,
    onPageChange,
    forecasts,
}: TasksTableViewProps) {
    const [sortField, setSortField] = useState<SortField | null>(null)
    const [sortDirection, setSortDirection] = useState<SortDirection>("asc")

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDirection(sortDirection === "asc" ? "desc" : "asc")
        } else {
            setSortField(field)
            setSortDirection("asc")
        }
    }

    const sortedTasks = [...tasks].sort((a, b) => {
        if (!sortField) return 0

        let aValue: any
        let bValue: any

        switch (sortField) {
            case "title":
                aValue = a.title.toLowerCase()
                bValue = b.title.toLowerCase()
                break
            case "project":
                aValue = a.project?.name?.toLowerCase() || ""
                bValue = b.project?.name?.toLowerCase() || ""
                break
            case "status":
                aValue = a.status
                bValue = b.status
                break
            case "priority":
                const priorityOrder: Record<string, number> = {
                    urgent: 4,
                    high: 3,
                    normal: 2,
                    low: 1,
                }
                aValue = priorityOrder[a.priority] || 0
                bValue = priorityOrder[b.priority] || 0
                break
            case "dueDate":
                aValue = a.dueDate ? new Date(a.dueDate).getTime() : 0
                bValue = b.dueDate ? new Date(b.dueDate).getTime() : 0
                break
            case "assignee":
                aValue = a.assignees?.[0]?.username?.toLowerCase() || ""
                bValue = b.assignees?.[0]?.username?.toLowerCase() || ""
                break
            default:
                return 0
        }

        if (aValue < bValue) return sortDirection === "asc" ? -1 : 1
        if (aValue > bValue) return sortDirection === "asc" ? 1 : -1
        return 0
    })

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
        // Check if task is in Today's Tasks (plannedDate matches today)
        if (!task.plannedDate) return false
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const taskDate = new Date(task.plannedDate)
        taskDate.setHours(0, 0, 0, 0)
        return (
            taskDate.getTime() === today.getTime() &&
            task.status !== "completed"
        )
    }

    const totalPages = Math.ceil(total / limit)

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

    const SortButton = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
        <Button
            variant="ghost"
            size="sm"
            className="h-8 data-[state=open]:bg-accent"
            onClick={() => handleSort(field)}
        >
            {children}
            {sortField === field ? (
                sortDirection === "asc" ? (
                    <ArrowUp className="ml-2 h-4 w-4" />
                ) : (
                    <ArrowDown className="ml-2 h-4 w-4" />
                )
            ) : (
                <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />
            )}
        </Button>
    )

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
        <div className="space-y-4">
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>
                                <SortButton field="title">Task Name</SortButton>
                            </TableHead>
                            <TableHead>
                                <SortButton field="project">Project</SortButton>
                            </TableHead>
                            <TableHead>
                                <SortButton field="assignee">Assignee</SortButton>
                            </TableHead>
                            <TableHead>
                                <SortButton field="status">Status</SortButton>
                            </TableHead>
                            <TableHead>
                                <SortButton field="priority">Priority</SortButton>
                            </TableHead>
                            <TableHead>
                                <SortButton field="dueDate">Due Date</SortButton>
                            </TableHead>
                            <TableHead>Dependencies</TableHead>
                            <TableHead>Forecast</TableHead>
                            <TableHead>Today Task</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {sortedTasks.map((task) => {
                            const blocked = isBlocked(task)
                            const overdue = isOverdue(task)
                            const todaysTask = isTodaysTask(task)

                            return (
                                <TableRow
                                    key={task.id}
                                    className={cn(
                                        "cursor-pointer hover:bg-muted/50",
                                        blocked && "bg-orange-50/50",
                                        overdue && "bg-red-50/50",
                                        todaysTask && "bg-blue-50/50"
                                    )}
                                >
                                    <TableCell>
                                        <Link
                                            href={`/dashboard/projects/${task.projectId}/tasks/${task.id}`}
                                            className="font-medium hover:underline flex items-center gap-2"
                                        >
                                            {task.title}
                                            {blocked && (
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger>
                                                            <Lock className="h-4 w-4 text-orange-500" />
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            <p>Waiting on dependency</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            )}
                                            {overdue && (
                                                <AlertCircle className="h-4 w-4 text-red-500" />
                                            )}
                                        </Link>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="text-xs">
                                            {task.project?.name || "Unknown"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        {task.assignees && task.assignees.length > 0 ? (
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
                                        ) : (
                                            <span className="text-muted-foreground text-sm">—</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Badge
                                            className={cn(
                                                "text-xs",
                                                statusColors[task.status] ||
                                                "bg-gray-500/10 text-gray-500 border-gray-500/20"
                                            )}
                                        >
                                            {task.status.replace("_", " ")}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge
                                            className={cn(
                                                "text-xs",
                                                priorityColors[task.priority] ||
                                                "bg-gray-500/10 text-gray-500 border-gray-500/20"
                                            )}
                                        >
                                            {task.priority}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        {task.dueDate ? (
                                            <span
                                                className={cn(
                                                    "text-sm",
                                                    overdue && "text-red-600 font-medium"
                                                )}
                                            >
                                                {format(new Date(task.dueDate), "MMM d, yyyy")}
                                            </span>
                                        ) : (
                                            <span className="text-muted-foreground">—</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {blocked ? (
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger>
                                                        <Lock className="h-4 w-4 text-orange-500" />
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p>Blocked by dependency</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        ) : (
                                            <span className="text-muted-foreground">—</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {forecasts && forecasts[task.id] ? (
                                            <ForecastBadge
                                                forecast={forecasts[task.id]}
                                                dueDate={task.dueDate}
                                                compact
                                            />
                                        ) : (
                                            <span className="text-muted-foreground">—</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {todaysTask ? (
                                            <Badge variant="secondary" className="text-xs">
                                                <Target className="h-3 w-3 mr-1" />
                                                Today
                                            </Badge>
                                        ) : (
                                            <span className="text-muted-foreground">—</span>
                                        )}
                                    </TableCell>
                                </TableRow>
                            )
                        })}
                    </TableBody>
                </Table>
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

