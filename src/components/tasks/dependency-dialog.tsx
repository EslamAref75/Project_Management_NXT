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
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Label } from "@/components/ui/label"
import { Plus, Loader2, Check, ChevronsUpDown, Info, Search } from "lucide-react"
import { createTaskDependency, getAvailableDependencyTasks } from "@/app/actions/dependencies"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface DependencyDialogProps {
    taskId: number
    projectId: number
    existingDependencyIds?: number[]
}

export function DependencyDialog({
    taskId,
    projectId,
    existingDependencyIds = []
}: DependencyDialogProps) {
    const [open, setOpen] = useState(false)
    const [dropdownOpen, setDropdownOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [availableTasks, setAvailableTasks] = useState<any[]>([])
    const [filteredTasks, setFilteredTasks] = useState<any[]>([])
    const [searchQuery, setSearchQuery] = useState("")
    const [loadingTasks, setLoadingTasks] = useState(false)
    const [selectedTaskId, setSelectedTaskId] = useState<string>("")
    const router = useRouter()

    useEffect(() => {
        if (open) {
            loadAvailableTasks()
        } else {
            // Reset when dialog closes
            setSelectedTaskId("")
            setAvailableTasks([])
            setFilteredTasks([])
            setSearchQuery("")
        }
    }, [open, taskId, existingDependencyIds])

    // Filter tasks based on search query
    useEffect(() => {
        if (!searchQuery.trim()) {
            setFilteredTasks(availableTasks)
        } else {
            const query = searchQuery.toLowerCase()
            const filtered = availableTasks.filter((task) => {
                const title = task.title.toLowerCase()
                const status = task.status.toLowerCase()
                const assigneeInfo = task.assignees && task.assignees.length > 0
                    ? task.assignees.map((a: any) => a.username.toLowerCase()).join(" ")
                    : task.team
                        ? task.team.name.toLowerCase()
                        : ""
                return title.includes(query) || status.includes(query) || assigneeInfo.includes(query) || task.id.toString().includes(query)
            })
            setFilteredTasks(filtered)
        }
    }, [searchQuery, availableTasks])

    const loadAvailableTasks = async () => {
        setLoadingTasks(true)
        try {
            const tasks = await getAvailableDependencyTasks(taskId)
            // Filter out only already added dependencies to avoid duplicates
            const filtered = tasks.filter(
                task => !existingDependencyIds.includes(task.id)
            )
            console.log("Available tasks for dependency:", filtered.length, filtered)
            setAvailableTasks(filtered)
            setFilteredTasks(filtered) // Initialize filtered tasks with all available tasks
        } catch (e) {
            console.error("Failed to load available tasks:", e)
            alert("Failed to load tasks. Please try again.")
            setAvailableTasks([])
        } finally {
            setLoadingTasks(false)
        }
    }

    const handleSubmit = async () => {
        if (!selectedTaskId) {
            alert("Please select a task")
            return
        }

        setLoading(true)
        try {
            const formData = new FormData()
            formData.append("taskId", taskId.toString())
            formData.append("dependsOnTaskId", selectedTaskId)
            formData.append("dependencyType", "finish_to_start")

            const result = await createTaskDependency(formData)

            if (result.error) {
                // If dependency already exists, refresh the page to show it
                if (result.error.includes("already exists")) {
                    setOpen(false)
                    setSelectedTaskId("")
                    window.location.reload()
                    return
                } else {
                    alert(result.error + (result.details ? `: ${result.details}` : ""))
                    return
                }
            }

            // Success - close dialog and refresh
            setOpen(false)
            setSelectedTaskId("")
            window.location.href = `/dashboard/projects/${projectId}/tasks/${taskId}`
        } catch (e) {
            alert("Failed to create dependency")
        } finally {
            setLoading(false)
        }
    }

    const selectedTask = availableTasks.find(
        task => task.id.toString() === selectedTaskId
    )

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Dependency
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Add Task Dependency</DialogTitle>
                    <DialogDescription>
                        Search and select a task that must be completed before this task can proceed.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2 flex flex-col">
                        <Label>Prerequisite Task</Label>
                        {loadingTasks ? (
                            <div className="flex items-center justify-center py-4 border rounded-md">
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                <span className="text-sm text-muted-foreground">
                                    Loading available tasks...
                                </span>
                            </div>
                        ) : availableTasks.length === 0 ? (
                            <div className="flex items-center justify-center py-4 border rounded-md bg-muted/50">
                                <span className="text-sm text-muted-foreground">
                                    {existingDependencyIds.length > 0
                                        ? "All project tasks are already linked."
                                        : "No other tasks available in this project."}
                                </span>
                            </div>
                        ) : (
                            <Popover open={dropdownOpen} onOpenChange={setDropdownOpen}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        role="combobox"
                                        aria-expanded={dropdownOpen}
                                        className="w-full justify-between"
                                    >
                                        {selectedTaskId
                                            ? availableTasks.find((task) => task.id.toString() === selectedTaskId)?.title
                                            : "Select task..."}
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[450px] p-0" align="start">
                                    <div className="flex flex-col">
                                        <div className="flex items-center border-b px-3">
                                            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                                            <input
                                                type="text"
                                                placeholder="Search tasks..."
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
                                            />
                                        </div>
                                        <div className="max-h-[300px] overflow-y-auto overflow-x-hidden p-1">
                                            {filteredTasks.length === 0 ? (
                                                <div className="py-6 text-center text-sm text-muted-foreground">
                                                    No task found.
                                                </div>
                                            ) : (
                                                <div className="space-y-1">
                                                    {filteredTasks.map((task) => {
                                                        const isCompleted = task.status === "completed"
                                                        const assigneeInfo = task.assignees && task.assignees.length > 0
                                                            ? task.assignees.map((a: any) => a.username).join(", ")
                                                            : task.team
                                                                ? `Team: ${task.team.name}`
                                                                : "Unassigned"
                                                        
                                                        const isSelected = selectedTaskId === task.id.toString()

                                                        return (
                                                            <div
                                                                key={task.id}
                                                                onClick={() => {
                                                                    const newSelectedId = task.id.toString()
                                                                    setSelectedTaskId(newSelectedId === selectedTaskId ? "" : newSelectedId)
                                                                    setDropdownOpen(false)
                                                                }}
                                                                className={cn(
                                                                    "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors",
                                                                    "hover:bg-accent hover:text-accent-foreground",
                                                                    isSelected && "bg-accent text-accent-foreground"
                                                                )}
                                                            >
                                                                <Check
                                                                    className={cn(
                                                                        "mr-2 h-4 w-4",
                                                                        isSelected ? "opacity-100" : "opacity-0"
                                                                    )}
                                                                />
                                                                <div className="flex flex-col flex-1 gap-1">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="font-medium">{task.title}</span>
                                                                        {isCompleted && (
                                                                            <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 bg-green-500/10 text-green-500 border-green-500/20">
                                                                                Done
                                                                            </Badge>
                                                                        )}
                                                                    </div>
                                                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                                        <span className="capitalize">{task.status.replace("_", " ")}</span>
                                                                        <span>•</span>
                                                                        <span>{assigneeInfo}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </PopoverContent>
                            </Popover>
                        )}
                    </div>

                    {selectedTask && (
                        <div className="p-3 bg-muted/50 rounded-md border space-y-2">
                            <div className="flex items-center gap-2 text-sm font-medium">
                                <Info className="w-4 h-4 text-blue-500" />
                                Selected Prerequisite
                            </div>
                            <div className="text-sm pl-6">
                                <p className="font-medium">{selectedTask.title}</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    This task must be completed before the current task can start.
                                </p>
                            </div>
                        </div>
                    )}

                    <div className="space-y-2 pt-2">
                        <Label>Dependency Type</Label>
                        <div className="text-sm text-muted-foreground flex items-center gap-2 p-2 border rounded-md">
                            <Badge variant="outline">Finish-to-Start</Badge>
                            <span>Mandatory: Prerequisite must finish for dependent to start.</span>
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => setOpen(false)}
                        disabled={loading}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={loading || !selectedTaskId || loadingTasks}
                    >
                        {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Add Dependency
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

