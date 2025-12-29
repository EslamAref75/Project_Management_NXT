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
import { deleteProject } from "@/app/actions/projects"
import { Loader2, AlertTriangle } from "lucide-react"
import { useRouter } from "next/navigation"

interface ProjectDeleteDialogProps {
    project: {
        id: number
        name: string
        taskCount?: number
    }
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function ProjectDeleteDialog({ project, open, onOpenChange }: ProjectDeleteDialogProps) {
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    async function handleDelete() {
        setLoading(true)
        const result = await deleteProject(project.id)

        setLoading(false)
        if (result?.success) {
            onOpenChange(false)
            router.push("/dashboard/projects")
            router.refresh()
        } else {
            alert(result?.error + (result?.details ? `\n\n${result.details}` : ""))
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-destructive" />
                        Delete Project
                    </DialogTitle>
                    <DialogDescription>
                        Are you sure you want to delete <strong>{project.name}</strong>?
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <p className="text-sm text-muted-foreground">
                        This action cannot be undone. This will permanently delete the project
                        {project.taskCount !== undefined && project.taskCount > 0 && (
                            <span className="block mt-2 text-destructive font-medium">
                                ⚠️ Warning: This project has {project.taskCount} task(s). All tasks and their associated data (comments, subtasks, dependencies, etc.) will be permanently deleted along with the project.
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
                        Delete Project
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

