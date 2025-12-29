"use client"

import { useEffect, useState } from "react"
import { getActivityLogs } from "@/app/actions/activity-logs"
import { format } from "date-fns"
import { Loader2 } from "lucide-react"

interface ProjectRecentActivityProps {
    projectId: number
}

export function ProjectRecentActivity({ projectId }: ProjectRecentActivityProps) {
    const [activities, setActivities] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function loadActivities() {
            try {
                const result = await getActivityLogs({
                    projectId,
                    limit: 10,
                })
                if (result.success) {
                    setActivities(result.logs || [])
                }
            } catch (error) {
                console.error("Failed to load activities:", error)
            } finally {
                setLoading(false)
            }
        }
        loadActivities()
    }, [projectId])

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        )
    }

    if (activities.length === 0) {
        return <p className="text-sm text-muted-foreground">No recent activity</p>
    }

    return (
        <div className="space-y-3">
            {activities.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3 p-3 border rounded-lg">
                    <div className="flex-1">
                        <p className="text-sm font-medium">{activity.actionSummary}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                            {activity.performedBy?.username || "Unknown"} •{" "}
                            {format(new Date(activity.createdAt), "MMM d, yyyy 'at' h:mm a")}
                        </p>
                    </div>
                </div>
            ))}
        </div>
    )
}

