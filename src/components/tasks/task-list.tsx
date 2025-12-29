import { TaskDialog } from "./task-dialog"
import { TaskCard } from "./task-card"

interface TaskListProps {
    tasks: any[]
    projectId?: number
    users?: any[]
}

export function TaskList({ tasks, projectId, users = [] }: TaskListProps) {
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Tasks</h2>
                {projectId && <TaskDialog projectId={projectId} users={users} />}
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {tasks.map((task) => (
                    <TaskCard key={task.id} task={task} />
                ))}
                {tasks.length === 0 && (
                    <div className="col-span-full text-center p-8 border border-dashed rounded-lg text-muted-foreground">
                        No tasks yet. Create one to get started.
                    </div>
                )}
            </div>
        </div>
    )
}
