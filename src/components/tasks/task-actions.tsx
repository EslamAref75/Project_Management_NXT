"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { TaskEditDialog } from "./task-edit-dialog"
import { TaskDeleteDialog } from "./task-delete-dialog"
import { Edit, Trash2 } from "lucide-react"

interface TaskActionsProps {
    task: {
        id: number
        title: string
        description: string | null
        priority: string
        status: string
        dueDate: Date | null
        assignees?: Array<{ id: number; username: string }>
        subtasks?: Array<any>
        comments?: Array<any>
        dependencies?: Array<any>
        dependents?: Array<any>
    }
    projectId: number
    users?: Array<{ id: number; username: string }>
}

export function TaskActions({ task, projectId, users = [] }: TaskActionsProps) {
    const [editOpen, setEditOpen] = useState(false)
    const [deleteOpen, setDeleteOpen] = useState(false)

    return (
        <>
            <Button 
                variant="outline" 
                size="sm"
                onClick={() => setEditOpen(true)}
            >
                <Edit className="mr-2 h-4 w-4" />
                Edit
            </Button>
            <Button 
                variant="outline" 
                size="sm"
                onClick={() => setDeleteOpen(true)}
                className="text-destructive hover:text-destructive"
            >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
            </Button>

            <TaskEditDialog
                task={{
                    id: task.id,
                    title: task.title,
                    description: task.description,
                    priority: task.priority,
                    status: task.status,
                    dueDate: task.dueDate,
                    assignees: task.assignees
                }}
                projectId={projectId}
                users={users}
                open={editOpen}
                onOpenChange={setEditOpen}
            />
            <TaskDeleteDialog
                task={{
                    id: task.id,
                    title: task.title,
                    subtaskCount: task.subtasks?.length || 0,
                    commentCount: task.comments?.length || 0,
                    dependencyCount: (task.dependencies?.length || 0) + (task.dependents?.length || 0)
                }}
                projectId={projectId}
                open={deleteOpen}
                onOpenChange={setDeleteOpen}
            />
        </>
    )
}

