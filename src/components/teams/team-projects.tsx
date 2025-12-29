"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, X, FolderKanban, Calendar } from "lucide-react"
import { AddProjectDialog } from "./add-project-dialog"
import { removeProjectFromTeam } from "@/app/actions/teams"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { format } from "date-fns"

interface TeamProjectsProps {
    team: any
    availableProjects: any[]
}

export function TeamProjects({ team, availableProjects }: TeamProjectsProps) {
    const router = useRouter()
    const [addProjectOpen, setAddProjectOpen] = useState(false)

    const handleRemoveProject = async (projectId: number) => {
        if (!confirm("Are you sure you want to remove this project from the team?")) {
            return
        }

        const result = await removeProjectFromTeam(team.id, projectId)
        if (result?.success) {
            router.refresh()
        } else {
            alert(result?.error || "Failed to remove project")
        }
    }

    const projects = team.projectTeams?.map((pt: any) => pt.project) || []

    const statusColors: Record<string, string> = {
        planned: "bg-gray-100 text-gray-800",
        active: "bg-green-100 text-green-800",
        on_hold: "bg-yellow-100 text-yellow-800",
        completed: "bg-blue-100 text-blue-800",
        cancelled: "bg-red-100 text-red-800",
    }

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Team Projects</CardTitle>
                    <CardDescription>
                        Projects assigned to this team
                    </CardDescription>
                </div>
                {availableProjects.length > 0 && (
                    <>
                        <Button onClick={() => setAddProjectOpen(true)}>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Project
                        </Button>
                        <AddProjectDialog
                            open={addProjectOpen}
                            onOpenChange={setAddProjectOpen}
                            teamId={team.id}
                            availableProjects={availableProjects}
                        />
                    </>
                )}
            </CardHeader>
            <CardContent>
                {projects.length === 0 ? (
                    <div className="text-center py-8 border border-dashed rounded-lg">
                        <FolderKanban className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground mb-4">No projects assigned to this team</p>
                        {availableProjects.length > 0 && (
                            <Button onClick={() => setAddProjectOpen(true)}>
                                <Plus className="h-4 w-4 mr-2" />
                                Add Project
                            </Button>
                        )}
                    </div>
                ) : (
                    <div className="space-y-4">
                        {projects.map((project: any) => (
                            <div
                                key={project.id}
                                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                            >
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <Link
                                            href={`/dashboard/projects/${project.id}`}
                                            className="font-semibold text-lg hover:underline"
                                        >
                                            {project.name}
                                        </Link>
                                        <Badge className={statusColors[project.status] || "bg-gray-100 text-gray-800"}>
                                            {project.status}
                                        </Badge>
                                    </div>
                                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                        <span className="font-mono">{project.code}</span>
                                        {project.projectManager && (
                                            <span>PM: {project.projectManager.username}</span>
                                        )}
                                        {project.startDate && (
                                            <span className="flex items-center gap-1">
                                                <Calendar className="h-3 w-3" />
                                                {format(new Date(project.startDate), "MMM d, yyyy")}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleRemoveProject(project.id)}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

