"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { tasksAdapter } from "@/lib/api/tasks-adapter"
import { Loader2, Plus } from "lucide-react"

export function TaskDialog({ projectId, users = [] }: { projectId: number, users?: any[] }) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const formRef = useRef<HTMLFormElement>(null)
    const router = useRouter()

    async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setLoading(true)
        if (!formRef.current) return

        const formData = new FormData(formRef.current)
        formData.append("projectId", projectId.toString())

        // Handle multiple assignees
        const assigneeIds: number[] = []
        formRef.current.querySelectorAll<HTMLInputElement>('input[name="assigneeIds"]:checked').forEach((checkbox) => {
            assigneeIds.push(parseInt(checkbox.value))
        })
        // Always set assigneeIds, even if empty array
        formData.set("assigneeIds", JSON.stringify(assigneeIds))

        try {
            console.log("Creating task with data:", Object.fromEntries(formData.entries()))
            const result = await tasksAdapter.createTask(formData)
            console.log("Task creation result:", result)

            if (result?.success) {
                formRef.current?.reset()
                setOpen(false)
                router.refresh() // Refresh the page to show the new task
            } else {
                console.error("Task creation failed:", result?.error, result?.details)
                alert(result?.error || (result as { details?: string })?.details || "Failed to create task")
            }
        } catch (error: any) {
            console.error("Task creation error:", error)
            alert(error?.message || "An unexpected error occurred")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Task
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Create Task</DialogTitle>
                    <DialogDescription>
                        Add a new task to this project.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={onSubmit} ref={formRef}>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="title">Title</Label>
                            <Input id="title" name="title" required placeholder="Task title" />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea id="description" name="description" placeholder="Describe the task..." />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="priority">Priority</Label>
                                <select
                                    id="priority"
                                    name="priority"
                                    defaultValue="normal"
                                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <option value="low">Low</option>
                                    <option value="normal">Normal</option>
                                    <option value="high">High</option>
                                    <option value="urgent">Urgent</option>
                                </select>
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="dueDate">Due Date</Label>
                                <Input type="date" id="dueDate" name="dueDate" />
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label>Assignees</Label>
                            <div className="border rounded-md p-2 max-h-[150px] overflow-y-auto space-y-2">
                                {users.length > 0 ? users.map((user: any) => (
                                    <div key={user.id} className="flex items-center space-x-2">
                                        <input
                                            type="checkbox"
                                            id={`assignee-${user.id}`}
                                            name="assigneeIds" // Since we parse this manually or create logic
                                            value={user.id}
                                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                            onChange={(e) => {
                                                // We need to handle this because FormData might not handle multiple values with same name nicely in all environments
                                                // But usually `formData.getAll('assigneeIds')` works.
                                                // However, my updated server action expects a JSON string or we can update client to send JSON.
                                                // Let's rely on manual collection in onSubmit or update logic below.
                                            }}
                                        />
                                        <Label htmlFor={`assignee-${user.id}`} className="text-sm font-normal cursor-pointer">
                                            {user.username}
                                        </Label>
                                    </div>
                                )) : (
                                    <p className="text-sm text-muted-foreground">No users available</p>
                                )}
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Create Task
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
