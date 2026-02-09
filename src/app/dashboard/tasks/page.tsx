import { getTasksWithFiltersServer } from "@/lib/api/tasks-server"
import { getUsers } from "@/app/actions/users"
import { getProjects } from "@/app/actions/projects"
import { TasksDashboard } from "@/components/tasks/tasks-dashboard"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export default async function TasksPage() {
    // Get initial data (tasks from backend when configured)
    const session = await getServerSession(authOptions)
    if (!session) return null

    const [initialResult, users, projects] = await Promise.all([
        getTasksWithFiltersServer({
            page: 1,
            limit: 20,
        }),
        getUsers(),
        getProjects(),
    ])

    const initialTasks = initialResult.success ? initialResult.tasks || [] : []
    const initialTotal = initialResult.success ? initialResult.total || 0 : 0

    return (
        <TasksDashboard
            initialTasks={initialTasks}
            initialTotal={initialTotal}
            users={users}
            projects={projects}
            currentUserId={parseInt(session.user.id)}
        />
    )
}
