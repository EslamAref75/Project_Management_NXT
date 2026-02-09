import { getProjectServer } from "@/lib/api/projects-server"
import { getProjectSettings, getResolvedProjectSettings } from "@/app/actions/project-settings"
import { ProjectSettingsPanel } from "@/components/projects/project-settings-panel"
import { Card } from "@/components/ui/card"
import { redirect } from "next/navigation"
import Link from "next/link"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { Settings, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

type Params = Promise<{ id: string }>

export default async function ProjectSettingsPage({
    params
}: {
    params: Params
}) {
    const session = await getServerSession(authOptions)
    if (!session) redirect("/login")

    const { id } = await params
    const projectId = parseInt(id)

    // Check if user is admin or project manager (project from backend when configured)
    const rawProject = await getProjectServer(projectId)
    if (!rawProject) {
        redirect("/dashboard/projects")
    }
    const project = rawProject as { projectManagerId?: number | null; createdById?: number | null; name?: string }

    const isAdmin = session.user.role === "admin"
    const isProjectManager = project.projectManagerId === parseInt(session.user.id) || 
                            project.createdById === parseInt(session.user.id)

    if (!isAdmin && !isProjectManager) {
        redirect(`/dashboard/projects/${projectId}`)
    }

    // Get project settings and resolved settings
    const [settingsResult, resolvedResult] = await Promise.all([
        getProjectSettings(projectId),
        getResolvedProjectSettings(projectId)
    ])

    const projectSettings = settingsResult.success ? settingsResult.settings : {}
    const resolvedSettings = resolvedResult.success ? resolvedResult.settings : {}

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex-1">
                    <div className="flex items-center gap-4 mb-2">
                        <Button variant="ghost" size="sm" asChild>
                            <Link href={`/dashboard/projects/${projectId}`}>
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Back to Project
                            </Link>
                        </Button>
                    </div>
                    <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <Settings className="h-8 w-8" />
                        Project Settings
                    </h2>
                    <p className="text-muted-foreground mt-1">
                        {project.name} - Configure project-specific settings and overrides
                    </p>
                </div>
            </div>

            {settingsResult.error ? (
                <Card className="p-8 text-center">
                    <p className="text-destructive">{settingsResult.error}</p>
                </Card>
            ) : (
                <ProjectSettingsPanel
                    projectId={projectId}
                    projectName={project.name ?? ""}
                    projectSettings={projectSettings}
                    resolvedSettings={resolvedSettings}
                    isAdmin={isAdmin}
                />
            )}
        </div>
    )
}

