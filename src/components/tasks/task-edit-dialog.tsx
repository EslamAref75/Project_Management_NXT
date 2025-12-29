"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { updateTask } from "@/app/actions/tasks"
import { Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"

interface TaskEditDialogProps {
    task: {
        id: number
        title: string
        description: string | null
        priority: string
        status: string
        dueDate: Date | null
        assignees?: Array<{ id: number; username: string }>
    }
    projectId: number
    users?: Array<{ id: number; username: string }>
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function TaskEditDialog({ task, projectId, users = [], open, onOpenChange }: TaskEditDialogProps) {
    const [loading, setLoading] = useState(false)
    const [selectedAssignees, setSelectedAssignees] = useState<number[]>([])
    const router = useRouter()

    // Initialize selected assignees when task changes
    useEffect(() => {
        if (task.assignees) {
            setSelectedAssignees(task.assignees.map(a => a.id))
        }
    }, [task])

    async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setLoading(true)
        const formData = new FormData(event.currentTarget)

        // Add assigneeIds as JSON string
        formData.set("assigneeIds", JSON.stringify(selectedAssignees))

        const result = await updateTask(task.id, formData)

        setLoading(false)
        if (result?.success) {
            onOpenChange(false)
            router.refresh()
        } else {
            alert(result?.error + (result?.details ? `: ${result.details}` : ""))
        }
    }

    // Format date for input field
    const formatDateForInput = (date: Date | null) => {
        if (!date) return ""
        const d = new Date(date)
        const year = d.getFullYear()
        const month = String(d.getMonth() + 1).padStart(2, "0")
        const day = String(d.getDate()).padStart(2, "0")
        return `${year}-${month}-${day}`
    }

    const toggleAssignee = (userId: number) => {
        setSelectedAssignees(prev =>
            prev.includes(userId)
                ? prev.filter(id => id !== userId)
                : [...prev, userId]
        )
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Edit Task</DialogTitle>
                    <DialogDescription>
                        Update task details, assignees, and priority.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={onSubmit}>
                    <div className="grid gap-4 py-4">
                        {/* Title */}
                        <div className="grid gap-2">
                            <Label htmlFor="title">Title *</Label>
                            <Input
                                id="title"
                                name="title"
                                defaultValue={task.title}
                                placeholder="Task title"
                                required
                            />
                        </div>

                        {/* Description */}
                        <div className="grid gap-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                name="description"
                                defaultValue={task.description || ""}
                                placeholder="Task description..."
                                rows={4}
                            />
                        </div>

                        {/* Priority and Status */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="priority">Priority</Label>
                                <Select name="priority" defaultValue={task.priority}>
                                    <SelectTrigger id="priority">
                                        <SelectValue placeholder="Select priority" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="normal">Normal</SelectItem>
                                        <SelectItem value="urgent">Urgent</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="status">Status</Label>
                                <Select name="status" defaultValue={task.status}>
                                    <SelectTrigger id="status">
                                        <SelectValue placeholder="Select status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="pending">Pending</SelectItem>
                                        <SelectItem value="waiting">Waiting</SelectItem>
                                        <SelectItem value="in_progress">In Progress</SelectItem>
                                        <SelectItem value="review">Review</SelectItem>
                                        <SelectItem value="completed">Completed</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Due Date */}
                        <div className="grid gap-2">
                            <Label htmlFor="dueDate">Due Date</Label>
                            <Input
                                id="dueDate"
                                name="dueDate"
                                type="date"
                                defaultValue={formatDateForInput(task.dueDate)}
                            />
                        </div>

                        {/* Assignees */}
                        <div className="grid gap-2">
                            <Label>Assignees</Label>
                            <div className="border rounded-md p-2 max-h-[150px] overflow-y-auto space-y-2">
                                {users.length > 0 ? users.map((user) => (
                                    <div key={user.id} className="flex items-center space-x-2">
                                        <input
                                            type="checkbox"
                                            id={`assignee-${user.id}`}
                                            checked={selectedAssignees.includes(user.id)}
                                            onChange={() => toggleAssignee(user.id)}
                                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
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
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Update Task
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}

