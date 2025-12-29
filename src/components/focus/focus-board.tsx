"use client"

import { useState, useTransition, useEffect } from "react"
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { setFocusDate, clearFocus } from "@/app/actions/focus"
import { Calendar, Smile, Rocket, Target, Zap, Trash2, BarChart2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { FocusSummary } from "./focus-summary"

type Task = {
    id: number
    title: string
    status: string
    priority: string
    estimatedHours: number
    project: { name: string }
}

export function FocusBoard({
    initialFocusTasks,
    initialLibraryTasks,
    summaryTasks
}: {
    initialFocusTasks: Task[],
    initialLibraryTasks: Task[],
    summaryTasks?: Task[]
}) {
    const [focusTasks, setFocusTasks] = useState(initialFocusTasks)
    const [libraryTasks, setLibraryTasks] = useState(initialLibraryTasks)
    const [isPending, startTransition] = useTransition()
    const [isMounted, setIsMounted] = useState(false)

    useEffect(() => {
        setIsMounted(true)
    }, [])

    const onDragEnd = (result: DropResult) => {
        const { source, destination } = result

        // Dropped outside the list
        if (!destination) {
            return
        }

        // Dropped in the same list at same index
        if (source.droppableId === destination.droppableId && source.index === destination.index) {
            return
        }

        // Moving from Library to Focus
        if (source.droppableId === "library" && destination.droppableId === "focus") {
            const task = libraryTasks[source.index]
            const newLibrary = [...libraryTasks]
            newLibrary.splice(source.index, 1)

            const newFocus = [...focusTasks]
            newFocus.splice(destination.index, 0, task)

            setLibraryTasks(newLibrary)
            setFocusTasks(newFocus)

            startTransition(async () => {
                await setFocusDate(task.id, new Date())
            })
        }
        // Moving from Focus to Library
        else if (source.droppableId === "focus" && destination.droppableId === "library") {
            const task = focusTasks[source.index]
            const newFocus = [...focusTasks]
            newFocus.splice(source.index, 1)

            const newLibrary = [...libraryTasks]
            newLibrary.splice(destination.index, 0, task)

            setFocusTasks(newFocus)
            setLibraryTasks(newLibrary)

            startTransition(async () => {
                await setFocusDate(task.id, null)
            })
        }
        // Reordering within the same list (Visual only for now, logic could be added)
        else if (source.droppableId === destination.droppableId) {
            const items = source.droppableId === "focus" ? [...focusTasks] : [...libraryTasks]
            const [reorderedItem] = items.splice(source.index, 1)
            items.splice(destination.index, 0, reorderedItem)

            if (source.droppableId === "focus") setFocusTasks(items)
            else setLibraryTasks(items)
        }
    }

    const onClearFocus = () => {
        if (focusTasks.length === 0) return

        const tasksToClear = [...focusTasks]
        setFocusTasks([])
        setLibraryTasks((prev) => [...prev, ...tasksToClear])

        startTransition(async () => {
            await clearFocus()
        })
    }

    if (!isMounted) {
        return null
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
            <DragDropContext onDragEnd={onDragEnd}>
                {/* 1. My Tasks Library */}
                <div className="flex flex-col h-full bg-card rounded-xl border shadow-sm overflow-hidden">
                    <div className="p-4 border-b flex-shrink-0">
                        <h3 className="font-semibold flex items-center gap-2">
                            <span className="text-primary">+</span> My Tasks Library
                        </h3>
                        <p className="text-sm text-muted-foreground">{libraryTasks.length} tasks available</p>
                    </div>
                    <div className="flex-1 overflow-hidden">
                        <DataColumn id="library" tasks={libraryTasks} />
                    </div>
                </div>

                {/* 2. Today's Focus Board */}
                <div className="flex flex-col h-full bg-gradient-to-b from-blue-50/50 to-white dark:from-slate-900/50 dark:to-background rounded-xl border border-blue-200 dark:border-blue-900/30 shadow-md overflow-hidden">
                    <div className="p-4 border-b border-blue-100 dark:border-blue-900/30 flex-shrink-0">
                        <div className="flex items-center justify-between">
                            <h3 className="font-semibold flex items-center gap-2 text-blue-700 dark:text-blue-400">
                                <Target className="h-4 w-4" /> Today's Focus Board
                            </h3>
                            {focusTasks.length > 0 && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={onClearFocus}
                                    className="h-8 px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-100 dark:text-blue-400 dark:hover:bg-blue-900/50"
                                >
                                    <Trash2 className="h-4 w-4 mr-1" /> Clear
                                </Button>
                            )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">Drag tasks here to work on today</p>
                    </div>
                    <div className="flex-1 overflow-hidden">
                        <DataColumn id="focus" tasks={focusTasks} isPlaceholder={focusTasks.length === 0} />
                    </div>
                    <div className="p-4 border-t mt-auto flex-shrink-0">
                        <p className="text-sm text-muted-foreground mb-3">How are you feeling today?</p>
                        <div className="flex gap-2">
                            {[Smile, Rocket, Zap, Target].map((Icon, i) => (
                                <button key={i} className="p-2 rounded-full hover:bg-muted transition-colors">
                                    <Icon className="h-4 w-4 text-muted-foreground" />
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* 3. Summary */}
                <div className="flex flex-col h-full">
                    <FocusSummary tasks={summaryTasks || focusTasks} />
                </div>
            </DragDropContext>
        </div>
    )
}

function DataColumn({ id, tasks, isPlaceholder }: { id: string, tasks: Task[], isPlaceholder?: boolean }) {
    return (
        <Droppable droppableId={id}>
            {(provided) => (
                <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="h-full p-4 overflow-y-auto space-y-3 min-h-[100px]"
                >
                    {isPlaceholder ? (
                        <div className="h-full flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed rounded-lg p-8">
                            <Target className="h-12 w-12 mb-4 opacity-20" />
                            <p className="text-center">Drag tasks from your library<br />Or start by clicking on a task</p>
                        </div>
                    ) : (
                        tasks.map((task, index) => (
                            <Draggable key={task.id} draggableId={task.id.toString()} index={index}>
                                {(provided) => (
                                    <div
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        {...provided.dragHandleProps}
                                    >
                                        <Card className="cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow">
                                            <CardContent className="p-3">
                                                <div className="flex justify-between items-start mb-1">
                                                    <h4 className="font-medium text-sm line-clamp-2">{task.title}</h4>
                                                </div>
                                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                    <span>{task.project?.name}</span>
                                                    <Badge variant="outline" className="text-[10px] h-5 px-1">{task.priority}</Badge>
                                                    {task.status !== 'pending' && <Badge variant="secondary" className="text-[10px] h-5 px-1">{task.status}</Badge>}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </div>
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
