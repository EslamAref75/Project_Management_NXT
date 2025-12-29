"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ProjectRecentActivity } from "./project-recent-activity"
import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"
import { useSession } from "next-auth/react"

interface ProjectActivityTabProps {
    project: any
}

export function ProjectActivityTab({ project }: ProjectActivityTabProps) {
    const { data: session } = useSession()
    const isAdmin = session?.user.role === "admin"

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Activity Log</CardTitle>
                        <CardDescription>
                            All actions and changes in this project
                        </CardDescription>
                    </div>
                    {isAdmin && (
                        <Button variant="outline" size="sm" disabled>
                            <Download className="h-4 w-4 mr-2" />
                            Export
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                <ProjectRecentActivity projectId={project.id} />
            </CardContent>
        </Card>
    )
}

