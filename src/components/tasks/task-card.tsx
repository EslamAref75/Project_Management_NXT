"use client"

import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MoreHorizontal, AlertCircle } from "lucide-react"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuLabel,
    DropdownMenuSeparator
} from "@/components/ui/dropdown-menu"
import { updateTaskStatus } from "@/app/actions/tasks"
import { cn } from "@/lib/utils"

interface Task {
    id: number
    title: string
    description?: string | null
    status: string
    priority: string
    projectId: number
    assignees?: { username: string; avatarUrl?: string }[]
    dependencies?: Array<{
        dependsOnTask: {
            id: number
            status: string
        }
    }>
}

const statusColors: Record<string, string> = {
    pending: "bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20",
    in_progress: "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20",
    completed: "bg-green-500/10 text-green-500 hover:bg-green-500/20",
    review: "bg-purple-500/10 text-purple-500 hover:bg-purple-500/20",
    waiting: "bg-orange-500/10 text-orange-500 hover:bg-orange-500/20",
}

export function TaskCard({ task }: { task: Task }) {
    async function onStatusChange(newStatus: string) {
        const result = await updateTaskStatus(task.id, newStatus, task.projectId)
        if (result.error) {
            alert(result.error + (result.details ? `: ${result.details}` : ""))
        }
    }

    const isBlocked = task.dependencies?.some(
        dep => dep.dependsOnTask.status !== "completed"
    ) || task.status === "waiting"

    return (
        <Link href={`/dashboard/projects/${task.projectId}/tasks/${task.id}`}>
            <Card className={cn(
                "mb-3 cursor-pointer transition-shadow hover:shadow-md",
                isBlocked && "border-orange-500/50"
            )}>
                <CardHeader className="flex flex-row items-start justify-between space-y-0 p-4 pb-2">
                    <div className="space-y-1 w-full">
                        <div className="flex items-center gap-2">
                            <CardTitle className="text-base font-semibold leading-none hover:underline">
                                {task.title}
                            </CardTitle>
                            {isBlocked && (
                                <AlertCircle className="w-4 h-4 text-orange-500 shrink-0" />
                            )}
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1">
                            {task.assignees && task.assignees.length > 0 ? (
                                <div className="text-xs text-muted-foreground flex flex-wrap gap-1 items-center">
                                    <span>Assigned to:</span>
                                    {task.assignees.map((user: any) => (
                                        <Badge key={user.username} variant="outline" className="text-[10px] px-1 py-0 h-5">
                                            {user.username}
                                        </Badge>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-xs text-muted-foreground">Unassigned</p>
                            )}
                        </div>
                    </div>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="-mr-2 h-8 w-8 shrink-0"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Change Status</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {Object.keys(statusColors).map((status) => (
                                <DropdownMenuItem key={status} onClick={() => onStatusChange(status)}>
                                    {status.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase())}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </CardHeader>
                <CardContent className="p-4 pt-2">
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                        {task.description || "No description"}
                    </p>
                    <div className="flex items-center gap-2">
                        <Badge variant="secondary" className={cn("capitalize", statusColors[task.status])}>
                            {task.status.replace("_", " ")}
                        </Badge>
                        <Badge variant={task.priority === "high" || task.priority === "urgent" ? "destructive" : task.priority === "medium" ? "default" : "outline"} className="capitalize">
                            {task.priority || "normal"}
                        </Badge>
                    </div>
                </CardContent>
            </Card>
        </Link>
    )
}
