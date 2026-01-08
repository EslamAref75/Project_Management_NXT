"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Plus, Search, AlertCircle, Calendar } from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { TaskDialog } from "@/components/tasks/task-dialog"

interface ProjectTasksTabProps {
    project: any
    users: any[]
}

export function ProjectTasksTab({ project, users }: ProjectTasksTabProps) {
    const searchParams = useSearchParams()
    const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "")
    const [statusFilter, setStatusFilter] = useState<string>(searchParams.get("status") || "all")
    const [priorityFilter, setPriorityFilter] = useState<string>(searchParams.get("priority") || "all")
    const [userFilter, setUserFilter] = useState<string>(searchParams.get("assignee") || searchParams.get("user") || "all")

    // Update state when search params change (e.g. from tab navigation)
    useEffect(() => {
        const status = searchParams.get("status")
        const priority = searchParams.get("priority")
        const assignee = searchParams.get("assignee") || searchParams.get("user")

        if (status) setStatusFilter(status)
        if (priority) setPriorityFilter(priority)
        if (assignee) setUserFilter(assignee)
    }, [searchParams])

    const tasks = project.tasks || []

    // Filter tasks
    let filteredTasks = tasks.filter((task: any) => {
        if (searchQuery && !task.title.toLowerCase().includes(searchQuery.toLowerCase())) {
            return false
        }
        if (statusFilter !== "all" && task.status !== statusFilter) {
            return false
        }
        if (priorityFilter !== "all" && task.priority !== priorityFilter) {
            return false
        }
        if (userFilter !== "all") {
            const hasUser = task.assignees?.some((a: any) => a.id === parseInt(userFilter))
            if (!hasUser) return false
        }
        return true
    })

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

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Tasks</CardTitle>
                        <CardDescription>
                            {filteredTasks.length} of {tasks.length} tasks
                        </CardDescription>
                    </div>
                    <TaskDialog projectId={project.id} users={users} />
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Filters */}
                <div className="flex flex-wrap gap-4">
                    <div className="flex-1 min-w-[200px]">
                        <div className="relative">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search tasks..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-8"
                            />
                        </div>
                    </div>
                    <div>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-[150px]">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Status</SelectItem>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="in_progress">In Progress</SelectItem>
                                <SelectItem value="review">Review</SelectItem>
                                <SelectItem value="completed">Completed</SelectItem>
                                <SelectItem value="waiting">Waiting</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                            <SelectTrigger className="w-[150px]">
                                <SelectValue placeholder="Priority" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Priorities</SelectItem>
                                <SelectItem value="urgent">Urgent</SelectItem>
                                <SelectItem value="high">High</SelectItem>
                                <SelectItem value="normal">Normal</SelectItem>
                                <SelectItem value="low">Low</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Select value={userFilter} onValueChange={setUserFilter}>
                            <SelectTrigger className="w-[150px]">
                                <SelectValue placeholder="Assignee" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Users</SelectItem>
                                {users.map((user) => (
                                    <SelectItem key={user.id} value={user.id.toString()}>
                                        {user.username}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Tasks Table */}
                <div className="border rounded-lg">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Task</TableHead>
                                <TableHead>Assignee</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Priority</TableHead>
                                <TableHead>Due Date</TableHead>
                                <TableHead>Dependencies</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredTasks.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                        No tasks found
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredTasks.map((task: any) => {
                                    const isBlocked = task.status === "waiting" ||
                                        (task.dependencies && task.dependencies.some(
                                            (dep: any) => dep.dependsOnTask.status !== "completed"
                                        ))

                                    return (
                                        <TableRow key={task.id} className="cursor-pointer hover:bg-muted/50">
                                            <TableCell>
                                                <Link
                                                    href={`/dashboard/projects/${project.id}/tasks/${task.id}`}
                                                    className="font-medium hover:underline"
                                                >
                                                    {task.title}
                                                </Link>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex -space-x-2">
                                                    {task.assignees && Array.isArray(task.assignees) && task.assignees.slice(0, 3).map((assignee: any, assigneeIndex: number) => (
                                                        <Avatar key={`assignee-${task.id}-${assignee.id}-${assigneeIndex}`} className="h-6 w-6 border-2 border-background">
                                                            <AvatarImage src={assignee.avatarUrl || undefined} />
                                                            <AvatarFallback className="text-xs">
                                                                {assignee.username?.substring(0, 2).toUpperCase() || "??"}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                    ))}
                                                    {task.assignees && Array.isArray(task.assignees) && task.assignees.length > 3 && (
                                                        <div key={`more-assignees-${task.id}`} className="h-6 w-6 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs">
                                                            +{task.assignees.length - 3}
                                                        </div>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={statusColors[task.status] || "bg-gray-500/10 text-gray-500 border-gray-500/20"}>
                                                    {task.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={priorityColors[task.priority] || "bg-gray-500/10 text-gray-500 border-gray-500/20"}>
                                                    {task.priority}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {task.dueDate ? (
                                                    <div className="flex items-center gap-1 text-sm">
                                                        <Calendar className="h-3 w-3" />
                                                        {format(new Date(task.dueDate), "MMM d, yyyy")}
                                                    </div>
                                                ) : (
                                                    <span className="text-muted-foreground text-sm">—</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {isBlocked ? (
                                                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                                                ) : (
                                                    <span className="text-muted-foreground">—</span>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    )
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    )
}

