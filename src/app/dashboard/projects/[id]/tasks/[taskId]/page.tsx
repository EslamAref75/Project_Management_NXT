import { notFound } from "next/navigation"
import { getTask } from "@/app/actions/tasks"
import { getUsers } from "@/app/actions/users"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { SubtaskList } from "@/components/tasks/subtask-list"
import { DependencyList } from "@/components/tasks/dependency-list"
import { DependencyDialog } from "@/components/tasks/dependency-dialog"
import { CommentSection } from "@/components/tasks/comment-section"
import { TaskActions } from "@/components/tasks/task-actions"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Edit, ArrowLeft, Trash2 } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { updateTaskStatus } from "@/app/actions/tasks"
import { TaskStatusUpdate } from "@/components/tasks/task-status-update"

type Params = Promise<{ id: string; taskId: string }>

export default async function TaskPage({ params }: { params: Params }) {
    const { id, taskId } = await params
    const projectId = parseInt(id)
    const tId = parseInt(taskId)

    if (isNaN(projectId) || isNaN(tId)) notFound()

    const task = await getTask(tId)
    const users = await getUsers()

    if (!task) notFound()

    const dependencies = task.dependencies || []
    const existingDependencyIds = dependencies.map((dep: any) => dep.dependsOnTask.id)
    
    // Debug: Log dependencies to verify they're being loaded
    if (dependencies.length > 0) {
        console.log("📋 Task dependencies found:", dependencies.length)
        dependencies.forEach((dep: any) => {
            console.log(`  - Depends on: ${dep.dependsOnTask.title} (ID: ${dep.dependsOnTask.id})`)
        })
    } else {
        console.log("⚠️ No dependencies found for task", tId)
    }

    const statusColors: Record<string, string> = {
        pending: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
        in_progress: "bg-blue-500/10 text-blue-500 border-blue-500/20",
        completed: "bg-green-500/10 text-green-500 border-green-500/20",
        review: "bg-purple-500/10 text-purple-500 border-purple-500/20",
        waiting: "bg-orange-500/10 text-orange-500 border-orange-500/20",
    }

    return (
        <div className="space-y-6 max-w-6xl mx-auto py-6 px-4">
            {/* Back Button */}
            <Button variant="ghost" size="sm" asChild>
                <Link href={`/dashboard/projects/${projectId}`}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Project
                </Link>
            </Button>

            {/* Header */}
            <div className="flex items-start justify-between border-b pb-4">
                <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-3">
                        <h1 className="text-3xl font-bold">{task.title}</h1>
                        <Badge variant="outline" className={statusColors[task.status] || ""}>
                            {task.status.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase())}
                        </Badge>
                    </div>
                    <p className="text-muted-foreground">{task.description || "No description"}</p>
                </div>
                <TaskActions 
                    task={task as any}
                    projectId={projectId}
                    users={users as any}
                />
            </div>

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Task Details Section */}
                    <div className="border rounded-lg p-4 bg-card shadow-sm">
                        <h2 className="text-lg font-semibold mb-4">Task Details</h2>
                        <div className="space-y-3 text-sm">
                            <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Status:</span>
                                <Badge variant="outline" className={statusColors[task.status] || ""}>
                                    {task.status.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase())}
                                </Badge>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Project:</span>
                                <Link 
                                    href={`/dashboard/projects/${task.project.id}`}
                                    className="text-primary hover:underline font-medium"
                                >
                                    {task.project.name}
                                </Link>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Assigned to:</span>
                                <div className="flex flex-wrap gap-1 justify-end">
                                    {task.assignees && task.assignees.length > 0 ? (
                                        task.assignees.map((assignee: any) => (
                                            <Link
                                                key={assignee.username}
                                                href="#"
                                                className="text-primary hover:underline font-medium"
                                            >
                                                {assignee.username}
                                            </Link>
                                        ))
                                    ) : (
                                        <span className="text-muted-foreground">Unassigned</span>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Created on:</span>
                                <span className="font-medium">
                                    {format(new Date(task.createdAt), "MMMM d, yyyy 'at' h:mm a")}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Priority:</span>
                                <Badge variant={task.priority === "urgent" || task.priority === "high" ? "destructive" : "secondary"}>
                                    {task.priority || "Normal"}
                                </Badge>
                            </div>
                            {task.team && (
                                <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground">Team:</span>
                                    <Link
                                        href="#"
                                        className="text-primary hover:underline font-medium"
                                    >
                                        {task.team.name}
                                    </Link>
                                </div>
                            )}
                            {task.creator && (
                                <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground">Created by:</span>
                                    <Link
                                        href="#"
                                        className="text-primary hover:underline font-medium"
                                    >
                                        {task.creator.username}
                                    </Link>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Dependencies Section */}
                    <div className="border rounded-lg p-4 bg-card shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold">Dependencies</h2>
                            <DependencyDialog 
                                taskId={task.id} 
                                projectId={projectId}
                                existingDependencyIds={existingDependencyIds}
                            />
                        </div>
                        {dependencies.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No dependencies</p>
                        ) : (
                            <>
                                <DependencyList 
                                    dependencies={dependencies.map((dep: any) => ({
                                        ...dep,
                                        createdAt: dep.createdAt instanceof Date ? dep.createdAt.toISOString() : dep.createdAt
                                    }))}
                                    taskId={task.id}
                                    projectId={projectId}
                                />
                                {/* Debug info - remove in production */}
                                <div className="mt-2 text-xs text-muted-foreground">
                                    Debug: Found {dependencies.length} dependency(ies)
                                </div>
                            </>
                        )}
                    </div>

                    {/* Subtasks Section */}
                    <div className="border rounded-lg p-4 bg-card shadow-sm">
                        <SubtaskList subtasks={task.subtasks || []} parentTaskId={task.id} />
                    </div>
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                    {/* Actions Section */}
                    <div className="border rounded-lg p-4 bg-card shadow-sm">
                        <h2 className="text-lg font-semibold mb-4">Actions</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-medium mb-2 block">Update Status</label>
                                <TaskStatusUpdate 
                                    taskId={task.id} 
                                    currentStatus={task.status}
                                    currentTaskStatusId={task.taskStatusId}
                                    projectId={projectId}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Comments Section */}
                    <div className="border rounded-lg p-4 bg-card shadow-sm">
                        <CommentSection 
                            comments={task.comments || []} 
                            taskId={task.id} 
                            projectId={projectId}
                            users={users.map((user: any) => ({
                                id: user.id,
                                username: user.username,
                                email: user.email || undefined,
                                avatarUrl: user.avatarUrl || undefined
                            }))}
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}
