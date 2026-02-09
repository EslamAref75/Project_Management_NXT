"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { tasksAdapter } from "@/lib/api/tasks-adapter"
import { Loader2, AlertTriangle } from "lucide-react"
import { useRouter } from "next/navigation"

interface TaskDeleteDialogProps {
    task: {
        id: number
        title: string
        subtaskCount?: number
        commentCount?: number
        dependencyCount?: number
    }
    projectId: number
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function TaskDeleteDialog({ task, projectId, open, onOpenChange }: TaskDeleteDialogProps) {
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    async function handleDelete() {
        setLoading(true)
        const result = await tasksAdapter.deleteTask(task.id)

        setLoading(false)
        if (result?.success) {
            onOpenChange(false)
            router.push(`/dashboard/projects/${projectId}`)
            router.refresh()
        } else {
            alert(result?.error + ((result as { details?: string })?.details ? `\n\n${(result as { details?: string }).details}` : ""))
        }
    }

    const hasRelatedData = (task.subtaskCount || 0) > 0 || (task.commentCount || 0) > 0 || (task.dependencyCount || 0) > 0

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-destructive" />
                        Delete Task
                    </DialogTitle>
                    <DialogDescription>
                        Are you sure you want to delete <strong>{task.title}</strong>?
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <p className="text-sm text-muted-foreground">
                        This action cannot be undone. This will permanently delete the task
                        {hasRelatedData && (
                            <span className="block mt-2 text-destructive font-medium">
                                ⚠️ Warning: This task has related data that will be permanently deleted:
                                {task.subtaskCount && task.subtaskCount > 0 && (
                                    <span className="block">• {task.subtaskCount} subtask(s)</span>
                                )}
                                {task.commentCount && task.commentCount > 0 && (
                                    <span className="block">• {task.commentCount} comment(s)</span>
                                )}
                                {task.dependencyCount && task.dependencyCount > 0 && (
                                    <span className="block">• {task.dependencyCount} dependency relationship(s)</span>
                                )}
                            </span>
                        )}
                    </p>
                </div>
                <DialogFooter>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={loading}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        variant="destructive"
                        onClick={handleDelete}
                        disabled={loading}
                    >
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Delete Task
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

