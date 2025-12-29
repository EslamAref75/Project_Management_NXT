"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AlertTriangle, ArrowRight } from "lucide-react"
import Link from "next/link"
import { getUrgentProjects } from "@/app/actions/project-priority"
import { useEffect, useState } from "react"
import { formatDistanceToNow } from "date-fns"

export function UrgentProjectsSection() {
    const [urgentProjects, setUrgentProjects] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function fetchUrgentProjects() {
            const result = await getUrgentProjects()
            if (result.success && result.projects) {
                setUrgentProjects(result.projects)
            }
            setLoading(false)
        }
        fetchUrgentProjects()
    }, [])

    if (loading) {
        return null
    }

    if (urgentProjects.length === 0) {
        return null
    }

    return (
        <Card className="border-red-500 bg-red-50 dark:bg-red-950/20">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-red-600" />
                        <CardTitle className="text-red-900 dark:text-red-100">
                            Urgent Projects
                        </CardTitle>
                        <Badge variant="destructive" className="ml-2">
                            {urgentProjects.length}
                        </Badge>
                    </div>
                    <Button variant="ghost" size="sm" asChild>
                        <Link href="/dashboard/projects?priority=urgent">
                            View All
                            <ArrowRight className="h-4 w-4 ml-2" />
                        </Link>
                    </Button>
                </div>
                <CardDescription className="text-red-800 dark:text-red-200">
                    Projects requiring immediate attention
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    {urgentProjects.slice(0, 3).map((project) => (
                        <Link
                            key={project.id}
                            href={`/dashboard/projects/${project.id}`}
                            className="block p-3 rounded-lg border border-red-200 dark:border-red-800 bg-white dark:bg-gray-900 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h4 className="font-semibold text-sm text-red-900 dark:text-red-100 truncate">
                                            {project.name}
                                        </h4>
                                        <Badge variant="destructive" className="text-xs">
                                            URGENT
                                        </Badge>
                                    </div>
                                    {project.urgentReason && (
                                        <p className="text-xs text-red-700 dark:text-red-300 truncate mb-1">
                                            {project.urgentReason}
                                        </p>
                                    )}
                                    {project.urgentMarkedAt && (
                                        <p className="text-xs text-red-600 dark:text-red-400">
                                            {formatDistanceToNow(new Date(project.urgentMarkedAt), { addSuffix: true })}
                                        </p>
                                    )}
                                </div>
                                {project.urgentAcknowledgments && project.urgentAcknowledgments.length === 0 && (
                                    <Badge variant="outline" className="border-yellow-500 text-yellow-700">
                                        Unacknowledged
                                    </Badge>
                                )}
                            </div>
                        </Link>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}

