"use client"

import { useState, useEffect } from "react"
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { AlertCircle } from "lucide-react"
import Link from "next/link"
import { updateTaskStatus } from "@/app/actions/tasks"
import { useRouter } from "next/navigation"

interface ProjectKanbanBoardProps {
    project: any
    users: any[]
}

const columns = [
    { id: "backlog", title: "Backlog", statuses: [] },
    { id: "pending", title: "To Do", statuses: ["pending"] },
    { id: "in_progress", title: "In Progress", statuses: ["in_progress"] },
    { id: "review", title: "Review", statuses: ["review"] },
    { id: "waiting", title: "Blocked", statuses: ["waiting"] },
    { id: "completed", title: "Done", statuses: ["completed"] },
]

export function ProjectKanbanBoard({ project, users }: ProjectKanbanBoardProps) {
    const router = useRouter()
    const [tasks, setTasks] = useState(project.tasks || [])

    useEffect(() => {
        setTasks(project.tasks || [])
    }, [project.tasks])

    const getTasksForColumn = (columnId: string) => {
        const column = columns.find(col => col.id === columnId)
        if (!column) return []
        
        if (columnId === "backlog") {
            return tasks.filter((task: any) => !task.status || task.status === "")
        }
        
        return tasks.filter((task: any) => column.statuses.includes(task.status))
    }

    const handleDragEnd = async (result: DropResult) => {
        if (!result.destination) return

        const { draggableId, destination } = result
        const taskId = parseInt(draggableId)
        const newStatus = destination.droppableId

        // Find the column to get the actual status
        const column = columns.find(col => col.id === newStatus)
        if (!column || column.statuses.length === 0) return

        const actualStatus = column.statuses[0]

        // Optimistic update
        setTasks((prev: any[]) =>
            prev.map((task: any) =>
                task.id === taskId ? { ...task, status: actualStatus } : task
            )
        )

        // Update on server
        const result_action = await updateTaskStatus(taskId, actualStatus, project.id)
        if (!result_action?.success) {
            // Revert on error
            router.refresh()
        } else {
            router.refresh()
        }
    }

    return (
        <DragDropContext onDragEnd={handleDragEnd}>
            <div className="grid grid-cols-6 gap-4 overflow-x-auto pb-4">
                {columns.map((column) => {
                    const columnTasks = getTasksForColumn(column.id)

                    return (
                        <div key={column.id} className="flex flex-col min-w-[250px]">
                            <div className="mb-3">
                                <h3 className="font-semibold text-sm">
                                    {column.title}
                                </h3>
                                <span className="text-xs text-muted-foreground">
                                    {columnTasks.length} tasks
                                </span>
                            </div>
                            <Droppable droppableId={column.id}>
                                {(provided, snapshot) => (
                                    <div
                                        ref={provided.innerRef}
                                        {...provided.droppableProps}
                                        className={`flex-1 min-h-[200px] p-2 rounded-lg border-2 border-dashed transition-colors ${
                                            snapshot.isDraggingOver
                                                ? "bg-primary/5 border-primary"
                                                : "bg-muted/30 border-muted"
                                        }`}
                                    >
                                        {columnTasks.map((task: any, index: number) => {
                                            const isBlocked = task.status === "waiting" ||
                                                (task.dependencies && task.dependencies.some(
                                                    (dep: any) => dep.dependsOnTask.status !== "completed"
                                                ))

                                            return (
                                                <Draggable
                                                    key={`draggable-${task.id}-${index}`}
                                                    draggableId={task.id.toString()}
                                                    index={index}
                                                >
                                                    {(provided, snapshot) => (
                                                        <Card
                                                            ref={provided.innerRef}
                                                            {...provided.draggableProps}
                                                            {...provided.dragHandleProps}
                                                            className={`mb-2 ${
                                                                snapshot.isDragging ? "shadow-lg" : ""
                                                            } ${isBlocked ? "border-yellow-500" : ""}`}
                                                        >
                                                            <CardContent className="p-3">
                                                                <Link
                                                                    href={`/dashboard/projects/${project.id}/tasks/${task.id}`}
                                                                    className="block"
                                                                >
                                                                    <div className="flex items-start justify-between mb-2">
                                                                        <p className="text-sm font-medium line-clamp-2">
                                                                            {task.title}
                                                                        </p>
                                                                        {isBlocked && (
                                                                            <AlertCircle className="h-4 w-4 text-yellow-600 flex-shrink-0 ml-2" />
                                                                        )}
                                                                    </div>
                                                                    {task.assignees && task.assignees.length > 0 && (
                                                                        <div className="flex -space-x-1 mb-2">
                                                                            {task.assignees.slice(0, 3).map((assignee: any, assigneeIndex: number) => (
                                                                                <Avatar key={`assignee-${assignee.id}-${assigneeIndex}`} className="h-6 w-6 border-2 border-background">
                                                                                    <AvatarImage src={assignee.avatarUrl || undefined} />
                                                                                    <AvatarFallback className="text-xs">
                                                                                        {assignee.username.substring(0, 2).toUpperCase()}
                                                                                    </AvatarFallback>
                                                                                </Avatar>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                    <div className="flex items-center gap-2">
                                                                        <Badge variant="outline" className="text-xs">
                                                                            {task.priority}
                                                                        </Badge>
                                                                    </div>
                                                                </Link>
                                                            </CardContent>
                                                        </Card>
                                                    )}
                                                </Draggable>
                                            )
                                        })}
                                        {provided.placeholder}
                                    </div>
                                )}
                            </Droppable>
                        </div>
                    )
                })}
            </div>
        </DragDropContext>
    )
}

