import { getProject } from "@/app/actions/projects"
import { getUsers } from "@/app/actions/users"
import { notFound } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { ProjectHeader } from "@/components/projects/project-header"
import { ProjectTabs } from "@/components/projects/project-tabs"
import { UrgentProjectBanner } from "@/components/projects/urgent-project-banner"

type Params = Promise<{ id: string }>

export default async function ProjectDetailsPage({
    params
}: {
    params: Params
}) {
    const { id } = await params
    const projectId = parseInt(id)

    if (isNaN(projectId)) notFound()

    const session = await getServerSession(authOptions)
    const project = await getProject(projectId)
    const users = await getUsers()

    if (!project) {
        notFound()
    }

    // Check permissions
    const isAdmin = session?.user.role === "admin"
    const isProjectManager = project.projectManagerId === parseInt(session?.user.id || "0") || 
                            project.createdById === parseInt(session?.user.id || "0")
    const isTeamLead = project.projectTeams?.some((pt: any) => 
        pt.team?.teamLeadId === parseInt(session?.user.id || "0")
    ) || false
    const canEdit = isAdmin || isProjectManager
    const canMarkUrgent = isAdmin || isProjectManager || isTeamLead

    // Calculate stats
    const total = project.tasks?.length || 0
    const totalComp = project.tasks?.filter((t: any) => t.status === "completed").length || 0
    const totalPending = project.tasks?.filter((t: any) => t.status === "pending").length || 0
    const totalInProgress = project.tasks?.filter((t: any) => ["in_progress", "review"].includes(t.status)).length || 0
    const percentage = total > 0 ? Math.round((totalComp / total) * 100) : 0

    const stats = {
        total,
        totalComp,
        totalPending,
        totalInProgress,
        percentage
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-background/95 backdrop-blur-sm border-b shadow-sm -mx-6 px-6 -mt-6 pt-6 pb-4 mb-6">
                <ProjectHeader 
                    project={project}
                    stats={stats}
                    canEdit={canEdit}
                    canMarkUrgent={canMarkUrgent}
                />
            </div>

            {/* Urgent Project Banner */}
            {project.priority === "urgent" && session?.user?.id && (
                <UrgentProjectBanner 
                    project={project}
                    userId={parseInt(session.user.id)}
                />
            )}

            {/* Navigation Tabs */}
            <ProjectTabs
                project={project}
                users={users}
                stats={stats}
            />
        </div>
    )
}
