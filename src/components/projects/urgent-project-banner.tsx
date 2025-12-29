"use client"

import { AlertTriangle, CheckCircle2, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { acknowledgeUrgentProject, hasAcknowledgedUrgent } from "@/app/actions/project-priority"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { formatDistanceToNow } from "date-fns"
import { Loader2 } from "lucide-react"

interface UrgentProjectBannerProps {
    project: {
        id: number
        name: string
        priority: string
        urgentReason?: string | null
        urgentMarkedAt?: Date | null
        urgentMarkedBy?: {
            id: number
            username: string
        } | null
    }
    userId: number
}

export function UrgentProjectBanner({ project, userId }: UrgentProjectBannerProps) {
    const router = useRouter()
    const [acknowledged, setAcknowledged] = useState(false)
    const [acknowledging, setAcknowledging] = useState(false)
    const [checking, setChecking] = useState(true)

    useEffect(() => {
        async function checkAcknowledgment() {
            const hasAcknowledged = await hasAcknowledgedUrgent(project.id)
            setAcknowledged(hasAcknowledged)
            setChecking(false)
        }
        checkAcknowledgment()
    }, [project.id])

    const handleAcknowledge = async () => {
        setAcknowledging(true)
        try {
            const result = await acknowledgeUrgentProject(project.id)
            if (result.success) {
                setAcknowledged(true)
                router.refresh()
            } else {
                alert(result.error || "Failed to acknowledge")
            }
        } catch (error) {
            console.error("Error acknowledging:", error)
            alert("Failed to acknowledge urgent project")
        } finally {
            setAcknowledging(false)
        }
    }

    if (project.priority !== "urgent") {
        return null
    }

    if (checking) {
        return (
            <Card className="border-red-500 bg-red-50 dark:bg-red-950/20 mb-6">
                <div className="p-4 flex items-center gap-3">
                    <Loader2 className="h-5 w-5 animate-spin text-red-600" />
                    <span className="text-sm text-red-600">Checking acknowledgment status...</span>
                </div>
            </Card>
        )
    }

    return (
        <Card className="border-red-500 bg-red-50 dark:bg-red-950/20 mb-6 animate-pulse">
            <div className="p-4">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                        <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                                <Badge variant="destructive" className="text-sm font-bold">
                                    🚨 URGENT PROJECT
                                </Badge>
                                {project.urgentMarkedAt && (
                                    <span className="text-xs text-muted-foreground">
                                        Marked {formatDistanceToNow(new Date(project.urgentMarkedAt), { addSuffix: true })}
                                    </span>
                                )}
                            </div>
                            <p className="text-sm font-medium text-red-900 dark:text-red-100 mb-1">
                                {project.name}
                            </p>
                            {project.urgentReason && (
                                <p className="text-sm text-red-800 dark:text-red-200 mb-2">
                                    <strong>Reason:</strong> {project.urgentReason}
                                </p>
                            )}
                            {project.urgentMarkedBy && (
                                <p className="text-xs text-red-700 dark:text-red-300">
                                    Marked urgent by: {project.urgentMarkedBy.username}
                                </p>
                            )}
                        </div>
                    </div>
                    {!acknowledged && (
                        <Button
                            onClick={handleAcknowledge}
                            disabled={acknowledging}
                            variant="default"
                            className="bg-red-600 hover:bg-red-700 text-white flex-shrink-0"
                        >
                            {acknowledging ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Acknowledging...
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 className="h-4 w-4 mr-2" />
                                    Acknowledge
                                </>
                            )}
                        </Button>
                    )}
                    {acknowledged && (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Acknowledged
                        </Badge>
                    )}
                </div>
            </div>
        </Card>
    )
}

