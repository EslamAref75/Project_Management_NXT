"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AlertTriangle, ArrowRight, CheckCircle2, Loader2 } from "lucide-react"
import Link from "next/link"
import { getUrgentProjects, acknowledgeUrgentProject } from "@/app/actions/project-priority"
import { useEffect, useState } from "react"
import { formatDistanceToNow } from "date-fns"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"

export function UrgentProjectsSection() {
    const [urgentProjects, setUrgentProjects] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [acknowledging, setAcknowledging] = useState<number | null>(null)
    const router = useRouter()
    const { data: session } = useSession()

    const fetchUrgentProjects = async () => {
        const result = await getUrgentProjects()
        if (result.success && result.projects) {
            setUrgentProjects(result.projects)
        }
        setLoading(false)
    }

    useEffect(() => {
        fetchUrgentProjects()
    }, [])

    const handleAcknowledge = async (projectId: number, e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        
        setAcknowledging(projectId)
        try {
            const result = await acknowledgeUrgentProject(projectId)
            if (result.success) {
                await fetchUrgentProjects()
                router.refresh()
            } else {
                alert(result.error || "Failed to acknowledge")
            }
        } catch (error) {
            console.error("Error acknowledging:", error)
            alert("Failed to acknowledge urgent project")
        } finally {
            setAcknowledging(null)
        }
    }

    if (loading) {
        return null
    }

    if (urgentProjects.length === 0) {
        return null
    }

    // Separate pending and acknowledged projects
    const pendingProjects = urgentProjects.filter(p => !p.urgentAcknowledgments || p.urgentAcknowledgments.length === 0)
    const acknowledgedProjects = urgentProjects.filter(p => p.urgentAcknowledgments && p.urgentAcknowledgments.length > 0)
    const currentUserId = session?.user?.id ? parseInt(session.user.id) : 0

    return (
        <div className="space-y-4">
            {/* Pending Urgent Projects */}
            {pendingProjects.length > 0 && (
                <Card className="border-red-500 bg-red-50 dark:bg-red-950/20 animate-pulse">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <AlertTriangle className="h-5 w-5 text-red-600" />
                                <CardTitle className="text-red-900 dark:text-red-100">
                                    Urgent Alerts
                                </CardTitle>
                                <Badge variant="destructive" className="ml-2">
                                    {pendingProjects.length}
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
                            Projects requiring immediate attention - Action needed
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {pendingProjects.slice(0, 3).map((project) => (
                                <div
                                    key={project.id}
                                    className="p-3 rounded-lg border border-red-200 dark:border-red-800 bg-white dark:bg-gray-900 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <Link
                                            href={`/dashboard/projects/${project.id}`}
                                            className="flex-1 min-w-0"
                                        >
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
                                        </Link>
                                        <Button
                                            size="sm"
                                            variant="default"
                                            className="bg-red-600 hover:bg-red-700 text-white flex-shrink-0"
                                            onClick={(e) => handleAcknowledge(project.id, e)}
                                            disabled={acknowledging === project.id}
                                        >
                                            {acknowledging === project.id ? (
                                                <>
                                                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                                    Acknowledging...
                                                </>
                                            ) : (
                                                <>
                                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                                    Acknowledge
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Acknowledged Urgent Projects */}
            {acknowledgedProjects.length > 0 && (
                <Card className="border-orange-500 bg-orange-50 dark:bg-orange-950/20">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="h-5 w-5 text-orange-600" />
                                <CardTitle className="text-orange-900 dark:text-orange-100">
                                    Acknowledged Urgent Projects
                                </CardTitle>
                                <Badge variant="outline" className="ml-2 border-orange-500 text-orange-700">
                                    {acknowledgedProjects.length}
                                </Badge>
                            </div>
                        </div>
                        <CardDescription className="text-orange-800 dark:text-orange-200">
                            Urgent projects that have been acknowledged
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {acknowledgedProjects.slice(0, 3).map((project) => (
                                <Link
                                    key={project.id}
                                    href={`/dashboard/projects/${project.id}`}
                                    className="block p-3 rounded-lg border border-orange-200 dark:border-orange-800 bg-white dark:bg-gray-900 hover:bg-orange-50 dark:hover:bg-orange-950/20 transition-colors"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h4 className="font-semibold text-sm text-orange-900 dark:text-orange-100 truncate">
                                                    {project.name}
                                                </h4>
                                                <Badge variant="outline" className="border-orange-500 text-orange-700 text-xs">
                                                    URGENT
                                                </Badge>
                                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300 text-xs">
                                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                                    Acknowledged
                                                </Badge>
                                            </div>
                                            {project.urgentReason && (
                                                <p className="text-xs text-orange-700 dark:text-orange-300 truncate mb-1">
                                                    {project.urgentReason}
                                                </p>
                                            )}
                                            {project.urgentAcknowledgments && project.urgentAcknowledgments.length > 0 && (
                                                <p className="text-xs text-orange-600 dark:text-orange-400">
                                                    Acknowledged {formatDistanceToNow(new Date(project.urgentAcknowledgments[0].acknowledgedAt), { addSuffix: true })}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}

