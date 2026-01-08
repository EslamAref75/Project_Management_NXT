import { getProjectsWithFilters } from "@/app/actions/projects"
import { getUsers } from "@/app/actions/users"
import { getAllProjectsStats } from "@/app/actions/stats"
import { ProjectsDashboard } from "@/components/projects/projects-dashboard"

export default async function ProjectsPage() {
    // Get initial data
    const [initialResult, statsResult, users] = await Promise.all([
        getProjectsWithFilters({
            page: 1,
            limit: 12,
        }),
        getAllProjectsStats(),
        getUsers()
    ])

    const initialProjects = initialResult.success ? initialResult.projects || [] : []
    const initialTotal = initialResult.success ? initialResult.total || 0 : 0
    const stats = statsResult.success && statsResult.data ? statsResult.data : { total: 0, active: 0, completed: 0, urgent: 0 }

    return (
        <div className="space-y-6">
            <ProjectsDashboard
                initialProjects={initialProjects}
                initialTotal={initialTotal}
                users={users}
                stats={stats}
            />
        </div>
    )
}
