"use client"

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { SubtaskList } from "./subtask-list"
import { AttachmentList } from "./attachment-list"
import { CommentSection } from "./comment-section"
import { DependencyList } from "./dependency-list"
import { DependentsList } from "./dependents-list"
import { DependencyDialog } from "./dependency-dialog"
import { AlertCircle } from "lucide-react"

interface TaskDetailSheetProps {
    task: any
    open: boolean
    onOpenChange: (open: boolean) => void
    projectId: number
    users?: Array<{ id: number; username: string; email?: string; avatarUrl?: string }>
}

export function TaskDetailSheet({ task, open, onOpenChange, projectId, users = [] }: TaskDetailSheetProps) {
    if (!task) return null

    const dependencies = task.dependencies || []
    const dependents = task.dependents || []
    const isBlocked = dependencies.some(
        (dep: any) => dep.dependsOnTask.status !== "completed"
    )
    const existingDependencyIds = dependencies.map((dep: any) => dep.dependsOnTask.id)

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="sm:max-w-[600px] overflow-y-auto">
                <SheetHeader className="mb-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Badge variant="outline">{task.status}</Badge>
                            {isBlocked && (
                                <Badge variant="outline" className="bg-orange-500/10 text-orange-500 border-orange-500/20">
                                    <AlertCircle className="w-3 h-3 mr-1" />
                                    Blocked
                                </Badge>
                            )}
                        </div>
                        <Badge variant={task.priority === "urgent" ? "destructive" : "secondary"}>
                            {task.priority || "Normal"}
                        </Badge>
                    </div>
                    <SheetTitle className="text-xl mt-2">{task.title}</SheetTitle>
                    <SheetDescription className="whitespace-pre-wrap">
                        {task.description || "No description provided."}
                    </SheetDescription>
                </SheetHeader>

                <div className="space-y-6">
                    {/* Metadata */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <span className="text-muted-foreground">Due Date:</span>
                            <p>{task.dueDate ? format(new Date(task.dueDate), "PPP") : "No due date"}</p>
                        </div>
                        <div>
                            <span className="text-muted-foreground">Assignees:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                                {task.assignees?.map((u: any) => (
                                    <Badge key={u.username} variant="secondary" className="text-xs">
                                        {u.username}
                                    </Badge>
                                ))}
                                {(!task.assignees || task.assignees.length === 0) && <p>Unassigned</p>}
                            </div>
                        </div>
                    </div>

                    {/* Dependency Section */}
                    <div className="border-t pt-4">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-semibold">Dependency</h3>
                            <DependencyDialog 
                                taskId={task.id} 
                                projectId={projectId}
                                existingDependencyIds={existingDependencyIds}
                            />
                        </div>
                        <DependencyList 
                            dependencies={dependencies}
                            taskId={task.id}
                            projectId={projectId}
                        />
                        {isBlocked && (
                            <div className="mt-3 p-3 bg-orange-500/10 border border-orange-500/20 rounded-md">
                                <p className="text-sm text-orange-700 dark:text-orange-400">
                                    <AlertCircle className="w-4 h-4 inline mr-2" />
                                    This task is blocked. Complete all dependency tasks to proceed.
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Dependents Section */}
                    {dependents.length > 0 && (
                        <div className="border-t pt-4">
                            <h3 className="text-sm font-semibold mb-4">Tasks Waiting on This</h3>
                            <DependentsList dependents={dependents} />
                        </div>
                    )}

                    <div className="border-t pt-4">
                        <SubtaskList subtasks={task.subtasks || []} parentTaskId={task.id} />
                    </div>

                    <div className="border-t pt-4">
                        <AttachmentList attachments={task.attachments || []} />
                    </div>

                    <div className="border-t pt-4">
                        <CommentSection comments={task.comments || []} taskId={task.id} projectId={projectId} users={users} />
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    )
}
