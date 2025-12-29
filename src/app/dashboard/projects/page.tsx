import { getProjectsWithFilters } from "@/app/actions/projects"
import { getUsers } from "@/app/actions/users"
import { ProjectsDashboard } from "@/components/projects/projects-dashboard"

export default async function ProjectsPage() {
    // Get initial data
    const initialResult = await getProjectsWithFilters({
        page: 1,
        limit: 12,
    })
    
    const users = await getUsers()

    const initialProjects = initialResult.success ? initialResult.projects || [] : []
    const initialTotal = initialResult.success ? initialResult.total || 0 : 0

    return (
        <ProjectsDashboard
            initialProjects={initialProjects}
            initialTotal={initialTotal}
            users={users}
        />
    )
}
