"use client"

import { useState, useEffect } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { updateTaskStatus } from "@/app/actions/tasks"
import { getTaskStatuses } from "@/app/actions/task-statuses"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

interface TaskStatusUpdateProps {
    taskId: number
    currentStatus: string
    currentTaskStatusId?: number | null
    projectId: number
}

interface TaskStatus {
    id: number
    name: string
    color: string
    isActive: boolean
}

export function TaskStatusUpdate({ taskId, currentStatus, currentTaskStatusId, projectId }: TaskStatusUpdateProps) {
    const [status, setStatus] = useState(currentTaskStatusId?.toString() || currentStatus)
    const [loading, setLoading] = useState(false)
    const [taskStatuses, setTaskStatuses] = useState<TaskStatus[]>([])
    const [loadingStatuses, setLoadingStatuses] = useState(true)
    const router = useRouter()

    useEffect(() => {
        async function loadTaskStatuses() {
            setLoadingStatuses(true)
            const result = await getTaskStatuses(false) // Only active statuses
            setLoadingStatuses(false)
            
            if (result.success) {
                setTaskStatuses(result.taskStatuses || [])
                // If we have a taskStatusId, use it; otherwise try to match by name
                if (!currentTaskStatusId && result.taskStatuses) {
                    const matchingStatus = result.taskStatuses.find(s => s.name.toLowerCase() === currentStatus.toLowerCase())
                    if (matchingStatus) {
                        setStatus(matchingStatus.id.toString())
                    }
                }
            }
        }
        loadTaskStatuses()
    }, [currentStatus, currentTaskStatusId])

    const handleUpdate = async () => {
        const currentValue = currentTaskStatusId?.toString() || currentStatus
        if (status === currentValue) return

        setLoading(true)
        try {
            // Convert status to number if it's a taskStatusId, otherwise pass as string
            const statusValue = taskStatuses.find(s => s.id.toString() === status) 
                ? parseInt(status) 
                : status
            const result = await updateTaskStatus(taskId, statusValue, projectId)
            if (result.error) {
                alert(result.error + (result.details ? `: ${result.details}` : ""))
                setStatus(currentValue) // Revert on error
            } else {
                router.refresh()
            }
        } catch (e) {
            alert("Failed to update status")
            setStatus(currentValue) // Revert on error
        } finally {
            setLoading(false)
        }
    }

    const currentValue = currentTaskStatusId?.toString() || currentStatus

    return (
        <div className="flex gap-2">
            <Select value={status} onValueChange={setStatus} disabled={loading || loadingStatuses || taskStatuses.length === 0}>
                <SelectTrigger className="flex-1">
                    <SelectValue placeholder={loadingStatuses ? "Loading statuses..." : taskStatuses.length === 0 ? "No statuses available" : "Select status"} />
                </SelectTrigger>
                {taskStatuses.length > 0 && (
                    <SelectContent>
                        {taskStatuses.map((taskStatus) => (
                            <SelectItem key={taskStatus.id} value={taskStatus.id.toString()}>
                                <div className="flex items-center gap-2">
                                    <div
                                        className="h-3 w-3 rounded-full"
                                        style={{ backgroundColor: taskStatus.color }}
                                    />
                                    <span>{taskStatus.name}</span>
                                </div>
                            </SelectItem>
                        ))}
                    </SelectContent>
                )}
            </Select>
            <Button 
                onClick={handleUpdate} 
                disabled={loading || status === currentValue || loadingStatuses || taskStatuses.length === 0}
                size="sm"
            >
                {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                    "Update"
                )}
            </Button>
        </div>
    )
}

