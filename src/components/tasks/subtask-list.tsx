"use client"

import { useState, useRef, useEffect } from "react"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Plus, Loader2, Trash2, X } from "lucide-react"
import { createSubtask, updateSubtask, deleteSubtask } from "@/app/actions/subtasks"
import { useToast } from "@/components/ui/use-toast"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

interface SubtaskListProps {
    subtasks: any[]
    parentTaskId: number
}

export function SubtaskList({ subtasks, parentTaskId }: SubtaskListProps) {
    const [title, setTitle] = useState("")
    const [isCreating, setIsCreating] = useState(false)
    const [editingId, setEditingId] = useState<number | null>(null)
    const [editingTitle, setEditingTitle] = useState("")
    const inputRef = useRef<HTMLInputElement>(null)
    const editInputRef = useRef<HTMLInputElement>(null)
    const { toast } = useToast()
    const router = useRouter()

    const completedCount = subtasks.filter(st => st.status === "completed").length
    const totalCount = subtasks.length
    const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

    useEffect(() => {
        if (editingId !== null && editInputRef.current) {
            editInputRef.current.focus()
            editInputRef.current.select()
        }
    }, [editingId])

    const handleCreate = async () => {
        if (!title.trim()) return

        setIsCreating(true)
        const result = await createSubtask({
            parentTaskId,
            title: title.trim(),
            priority: "normal"
        })
        setIsCreating(false)

        if (result.error) {
            toast({
                title: "Error",
                description: result.error,
                variant: "destructive"
            })
        } else {
            setTitle("")
            router.refresh()
        }
    }

    const handleToggle = async (subtaskId: number, currentStatus: string) => {
        const newStatus = currentStatus === "completed" ? "pending" : "completed"
        await updateSubtask(subtaskId, { status: newStatus })
        router.refresh()
    }

    const handleDelete = async (subtaskId: number, subtaskTitle: string) => {
        if (!window.confirm(`Delete "${subtaskTitle}"?`)) return

        const result = await deleteSubtask(subtaskId)
        if (result.error) {
            toast({
                title: "Error",
                description: result.error,
                variant: "destructive"
            })
        } else {
            router.refresh()
        }
    }

    const startEditing = (subtask: any) => {
        setEditingId(subtask.id)
        setEditingTitle(subtask.title)
    }

    const saveEdit = async (subtaskId: number) => {
        if (!editingTitle.trim()) {
            setEditingId(null)
            return
        }

        await updateSubtask(subtaskId, { title: editingTitle.trim() })
        setEditingId(null)
        router.refresh()
    }

    const cancelEdit = () => {
        setEditingId(null)
        setEditingTitle("")
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <h3 className="text-sm font-semibold">Checklist</h3>
                    {totalCount > 0 && (
                        <span className="text-xs text-muted-foreground">
                            {completedCount} of {totalCount} completed
                        </span>
                    )}
                </div>
            </div>

            {/* Checklist Items */}
            {subtasks.length > 0 && (
                <div className="space-y-1.5">
                    {subtasks.map((st) => {
                        const isCompleted = st.status === "completed"
                        const isEditing = editingId === st.id

                        return (
                            <div
                                key={st.id}
                                className={cn(
                                    "group flex items-center gap-3 p-2 rounded-md transition-colors",
                                    "hover:bg-muted/50",
                                    isCompleted && "opacity-75"
                                )}
                            >
                                <Checkbox
                                    checked={isCompleted}
                                    onCheckedChange={() => handleToggle(st.id, st.status)}
                                    className="mt-0.5"
                                />
                                {isEditing ? (
                                    <div className="flex-1 flex items-center gap-2">
                                        <Input
                                            ref={editInputRef}
                                            value={editingTitle}
                                            onChange={(e) => setEditingTitle(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter") {
                                                    saveEdit(st.id)
                                                } else if (e.key === "Escape") {
                                                    cancelEdit()
                                                }
                                            }}
                                            onBlur={() => saveEdit(st.id)}
                                            className="h-8 text-sm"
                                        />
                                    </div>
                                ) : (
                                    <>
                                        <span
                                            className={cn(
                                                "flex-1 text-sm cursor-pointer select-none",
                                                isCompleted && "line-through text-muted-foreground"
                                            )}
                                            onDoubleClick={() => startEditing(st)}
                                        >
                                            {st.title}
                                        </span>
                                        <button
                                            className="opacity-0 group-hover:opacity-100 h-6 w-6 text-muted-foreground hover:text-destructive flex items-center justify-center transition-all rounded-sm hover:bg-destructive/10"
                                            onClick={() => handleDelete(st.id, st.title)}
                                            title="Delete subtask"
                                        >
                                            <X className="h-3.5 w-3.5" />
                                        </button>
                                    </>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Add New Item */}
            <div className="flex gap-2 items-center pt-2 border-t">
                <Input
                    ref={inputRef}
                    placeholder="Add a checklist item..."
                    className="h-9 text-sm"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" && !isCreating) {
                            handleCreate()
                        }
                    }}
                />
                <Button
                    size="sm"
                    onClick={handleCreate}
                    disabled={isCreating || !title.trim()}
                    className="h-9"
                >
                    {isCreating ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <Plus className="h-4 w-4" />
                    )}
                </Button>
            </div>

            {/* Progress Bar (optional visual indicator) */}
            {totalCount > 0 && (
                <div className="pt-2">
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                            className="h-full bg-primary transition-all duration-300"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>
            )}
        </div>
    )
}
