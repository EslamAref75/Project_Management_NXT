"use client"

import { useState, useEffect, useTransition } from "react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { 
    getUserProjectTasks, 
    assignTodayTask, 
    removeTodayTask,
    getUserProjects 
} from "@/app/actions/today-tasks-assignment"
import { Loader2, Search, AlertTriangle, ArrowRight, ArrowLeft, CheckCircle2 } from "lucide-react"
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd"
import { cn } from "@/lib/utils"

interface Task {
    id: number
    title: string
    status: string
    priority: string
    isBlocked: boolean
    blockingDependencies: Array<{ id: number; title: string; status: string }>
    project: { id: number; name: string }
}

interface AssignmentModalProps {
    userId: number
    userName: string
    open: boolean
    onOpenChange: (open: boolean) => void
    selectedDate?: Date
}

export function AssignmentModal({ userId, userName, open, onOpenChange, selectedDate }: AssignmentModalProps) {
    const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null)
    const [projects, setProjects] = useState<Array<{ id: number; name: string }>>([])
    const [availableTasks, setAvailableTasks] = useState<Task[]>([])
    const [todayTasks, setTodayTasks] = useState<Task[]>([])
    const [searchQuery, setSearchQuery] = useState("")
    const [statusFilter, setStatusFilter] = useState<string>("all")
    const [isPending, startTransition] = useTransition()
    const [loading, setLoading] = useState(false)

    // Load projects when modal opens
    useEffect(() => {
        if (open && userId) {
            loadProjects()
        }
    }, [open, userId])

    // Load tasks when project is selected or date changes
    useEffect(() => {
        if (open && userId && selectedProjectId) {
            loadTasks()
        }
    }, [open, userId, selectedProjectId, selectedDate])

    const loadProjects = async () => {
        setLoading(true)
        try {
            const result = await getUserProjects(userId)
            if (result.success && result.projects) {
                setProjects(result.projects)
                if (result.projects.length > 0 && !selectedProjectId) {
                    setSelectedProjectId(result.projects[0].id)
                }
            }
        } catch (e) {
            console.error("Failed to load projects:", e)
        } finally {
            setLoading(false)
        }
    }

    const loadTasks = async () => {
        if (!selectedProjectId) return
        
        setLoading(true)
        try {
            const date = selectedDate || new Date()
            const result = await getUserProjectTasks(userId, selectedProjectId, date)
            if (result.success) {
                setAvailableTasks(result.availableTasks || [])
                setTodayTasks(result.todayTasks || [])
            }
        } catch (e) {
            console.error("Failed to load tasks:", e)
        } finally {
            setLoading(false)
        }
    }

    const handleAssignTask = async (taskId: number) => {
        // Optimistic update
        const task = availableTasks.find(t => t.id === taskId)
        if (task) {
            setAvailableTasks(prev => prev.filter(t => t.id !== taskId))
            setTodayTasks(prev => [...prev, task])
        }

        startTransition(async () => {
            const date = selectedDate || new Date()
            const result = await assignTodayTask(userId, taskId, date)
            if (!result.success) {
                // Revert on error
                if (task) {
                    setAvailableTasks(prev => [...prev, task])
                    setTodayTasks(prev => prev.filter(t => t.id !== taskId))
                }
                alert(result.error || "Failed to assign task")
            }
            // Don't reload tasks to avoid blinking - optimistic update is sufficient
        })
    }

    const handleRemoveTask = async (taskId: number) => {
        // Optimistic update
        const task = todayTasks.find(t => t.id === taskId)
        if (task) {
            setTodayTasks(prev => prev.filter(t => t.id !== taskId))
            setAvailableTasks(prev => [...prev, task])
        }

        startTransition(async () => {
            const result = await removeTodayTask(userId, taskId)
            if (!result.success) {
                // Revert on error
                if (task) {
                    setTodayTasks(prev => [...prev, task])
                    setAvailableTasks(prev => prev.filter(t => t.id !== taskId))
                }
                alert(result.error || "Failed to remove task")
            }
            // Don't reload tasks to avoid blinking - optimistic update is sufficient
        })
    }

    const onDragEnd = (result: DropResult) => {
        const { source, destination } = result

        if (!destination) return

        // Moving from Available to Today's Tasks
        if (source.droppableId === "available" && destination.droppableId === "today") {
            const task = filteredAvailableTasks[source.index]
            if (task) {
                handleAssignTask(task.id)
            }
        }
        // Moving from Today's Tasks to Available
        else if (source.droppableId === "today" && destination.droppableId === "available") {
            const task = todayTasks[source.index]
            if (task) {
                handleRemoveTask(task.id)
            }
        }
        // Reordering within Today's Tasks (visual only for now)
        else if (source.droppableId === "today" && destination.droppableId === "today") {
            const items = [...todayTasks]
            const [reorderedItem] = items.splice(source.index, 1)
            items.splice(destination.index, 0, reorderedItem)
            setTodayTasks(items)
        }
    }

    // Filter tasks based on search and status
    const filteredAvailableTasks = availableTasks.filter(task => {
        const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            task.project.name.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesStatus = statusFilter === "all" || task.status === statusFilter
        return matchesSearch && matchesStatus
    })

    const getStatusBadge = (status: string) => {
        const statusColors: Record<string, string> = {
            pending: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
            waiting: "bg-orange-500/10 text-orange-500 border-orange-500/20",
            in_progress: "bg-blue-500/10 text-blue-500 border-blue-500/20",
            review: "bg-purple-500/10 text-purple-500 border-purple-500/20",
            completed: "bg-green-500/10 text-green-500 border-green-500/20",
        }
        return statusColors[status] || "bg-gray-500/10 text-gray-500"
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[98vw] w-full max-h-[98vh] h-[98vh] overflow-hidden flex flex-col p-0 gap-0 rounded-xl">
                <DialogHeader className="px-8 pt-8 pb-6 border-b bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30">
                    <DialogTitle className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        Today's Tasks Assignment
                    </DialogTitle>
                    <DialogDescription className="text-base mt-2 text-gray-600 dark:text-gray-400">
                        Assign tasks to <span className="font-semibold text-gray-900 dark:text-gray-100">{userName}</span>'s daily focus. Select a project to get started.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-hidden flex flex-col">
                    {/* Project Filter */}
                    <div className="flex-shrink-0 px-8 py-6 bg-white dark:bg-gray-900 border-b">
                        <div className="space-y-3">
                            <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                                Project Filter <span className="text-red-500">*</span>
                            </Label>
                            <Select
                                value={selectedProjectId?.toString() || ""}
                                onValueChange={(value) => setSelectedProjectId(parseInt(value))}
                            >
                                <SelectTrigger className="h-11 text-base border-2 focus:ring-2 focus:ring-blue-500">
                                    <SelectValue placeholder="Select a project" />
                                </SelectTrigger>
                                <SelectContent>
                                    {projects.map((project) => (
                                        <SelectItem key={project.id} value={project.id.toString()}>
                                            {project.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {projects.length === 0 && !loading && (
                                <p className="text-sm text-muted-foreground flex items-center gap-2">
                                    <AlertTriangle className="h-4 w-4" />
                                    No projects found for this user
                                </p>
                            )}
                        </div>
                    </div>

                    {selectedProjectId && (
                        <DragDropContext onDragEnd={onDragEnd}>
                            <div className="flex-1 grid grid-cols-2 gap-6 overflow-hidden min-h-0 px-8 py-6 bg-gray-50 dark:bg-gray-950">
                                {/* Left Column - Available Tasks */}
                                <div className="flex flex-col bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
                                    <div className="p-6 border-b bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-850 flex-shrink-0">
                                        <h3 className="font-bold text-lg mb-4 text-gray-900 dark:text-gray-100">All Tasks</h3>
                                        <div className="space-y-3">
                                            <div className="relative">
                                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                                                <Input
                                                    placeholder="Search tasks..."
                                                    value={searchQuery}
                                                    onChange={(e) => setSearchQuery(e.target.value)}
                                                    className="pl-10 h-11 text-base border-2 focus:ring-2 focus:ring-blue-500"
                                                />
                                            </div>
                                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                                <SelectTrigger className="h-11 border-2 focus:ring-2 focus:ring-blue-500">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">All Status</SelectItem>
                                                    <SelectItem value="pending">Pending</SelectItem>
                                                    <SelectItem value="waiting">Waiting</SelectItem>
                                                    <SelectItem value="in_progress">In Progress</SelectItem>
                                                    <SelectItem value="review">Review</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <TaskColumn
                                        id="available"
                                        tasks={filteredAvailableTasks}
                                        onTaskClick={handleAssignTask}
                                        emptyMessage="No tasks available"
                                        loading={loading}
                                    />
                                </div>

                                {/* Right Column - Today's Tasks */}
                                <div className="flex flex-col bg-white dark:bg-gray-900 rounded-xl shadow-lg border-2 border-blue-200 dark:border-blue-800 overflow-hidden">
                                    <div className="p-6 border-b bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50 flex-shrink-0">
                                        <div className="flex items-center justify-between">
                                            <h3 className="font-bold text-lg text-blue-700 dark:text-blue-400">
                                                Today's Tasks
                                            </h3>
                                            <Badge className="bg-blue-500 text-white font-semibold px-3 py-1 text-sm">
                                                {todayTasks.length}
                                            </Badge>
                                        </div>
                                    </div>
                                    <TaskColumn
                                        id="today"
                                        tasks={todayTasks}
                                        onTaskClick={handleRemoveTask}
                                        emptyMessage="No tasks assigned for today"
                                        loading={loading}
                                        isTodayColumn
                                    />
                                </div>
                            </div>
                        </DragDropContext>
                    )}

                    {!selectedProjectId && (
                        <div className="flex-1 flex items-center justify-center text-muted-foreground">
                            <p>Please select a project to view tasks</p>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}

interface TaskColumnProps {
    id: string
    tasks: Task[]
    onTaskClick: (taskId: number) => void
    emptyMessage: string
    loading: boolean
    isTodayColumn?: boolean
}

function TaskColumn({ id, tasks, onTaskClick, emptyMessage, loading, isTodayColumn }: TaskColumnProps) {
    return (
        <Droppable droppableId={id}>
            {(provided, snapshot) => (
                <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className={cn(
                        "flex-1 overflow-y-auto p-6 space-y-3 min-h-0 transition-all duration-200",
                        snapshot.isDraggingOver && "bg-blue-50/50 dark:bg-blue-950/20"
                    )}
                >
                    {loading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : tasks.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                            <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                                <Search className="h-8 w-8 text-gray-400" />
                            </div>
                            <p className="text-sm font-medium">{emptyMessage}</p>
                        </div>
                    ) : (
                        tasks.map((task, index) => (
                            <Draggable key={task.id} draggableId={`${id}-${task.id}`} index={index}>
                                {(provided, snapshot) => (
                                    <TaskCard
                                        task={task}
                                        provided={provided}
                                        snapshot={snapshot}
                                        onClick={() => onTaskClick(task.id)}
                                        isTodayColumn={isTodayColumn}
                                    />
                                )}
                            </Draggable>
                        ))
                    )}
                    {provided.placeholder}
                </div>
            )}
        </Droppable>
    )
}

interface TaskCardProps {
    task: Task
    provided: any
    snapshot: any
    onClick: () => void
    isTodayColumn?: boolean
}

function TaskCard({ task, provided, snapshot, onClick, isTodayColumn }: TaskCardProps) {
    const statusColors: Record<string, string> = {
        pending: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
        waiting: "bg-orange-500/10 text-orange-500 border-orange-500/20",
        in_progress: "bg-blue-500/10 text-blue-500 border-blue-500/20",
        review: "bg-purple-500/10 text-purple-500 border-purple-500/20",
        completed: "bg-green-500/10 text-green-500 border-green-500/20",
    }

    return (
        <Card
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            className={cn(
                "cursor-grab active:cursor-grabbing transition-all duration-200 hover:shadow-md border-2",
                snapshot.isDragging && "shadow-xl ring-2 ring-blue-500 scale-105 z-50",
                task.isBlocked && "border-l-4 border-l-orange-500 bg-orange-50/70 dark:bg-orange-950/30"
            )}
        >
            <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                    <h4 className="font-semibold text-base flex-1 line-clamp-2 text-gray-900 dark:text-gray-100">
                        {task.title}
                    </h4>
                    {isTodayColumn ? (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 flex-shrink-0 hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400 rounded-full transition-colors"
                            onClick={(e) => {
                                e.stopPropagation()
                                onClick()
                            }}
                        >
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    ) : (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 flex-shrink-0 hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 rounded-full transition-colors"
                            onClick={(e) => {
                                e.stopPropagation()
                                onClick()
                            }}
                        >
                            <ArrowRight className="h-4 w-4" />
                        </Button>
                    )}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <Badge
                        variant="outline"
                        className={cn("text-xs font-medium px-2 py-1", statusColors[task.status] || "")}
                    >
                        {task.status.replace("_", " ")}
                    </Badge>
                    {task.isBlocked && (
                        <Badge variant="outline" className="text-xs font-medium px-2 py-1 border-orange-500 text-orange-600 bg-orange-50 dark:bg-orange-950/30 dark:text-orange-400">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Blocked
                        </Badge>
                    )}
                    <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">{task.project.name}</span>
                </div>
                {task.isBlocked && task.blockingDependencies.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-orange-200 dark:border-orange-800">
                        <p className="text-xs font-semibold text-orange-600 dark:text-orange-400 mb-1.5">Blocked by:</p>
                        <ul className="space-y-1">
                            {task.blockingDependencies.map((dep) => (
                                <li key={dep.id} className="text-xs text-orange-700 dark:text-orange-300 flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                                    {dep.title}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

