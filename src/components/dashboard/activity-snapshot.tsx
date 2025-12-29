"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ExternalLink, Activity } from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"

interface ActivitySnapshotProps {
    activities: any[]
    isAdmin?: boolean
}

export function ActivitySnapshot({ activities, isAdmin = false }: ActivitySnapshotProps) {
    if (activities.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Activity className="h-5 w-5" />
                        Recent Activity
                    </CardTitle>
                    <CardDescription>System activity and updates</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-8 text-muted-foreground">
                        <p>No recent activity</p>
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <Activity className="h-5 w-5" />
                            Recent Activity
                        </CardTitle>
                        <CardDescription>Last {activities.length} system activities</CardDescription>
                    </div>
                    {isAdmin && (
                        <Button variant="outline" size="sm" asChild>
                            <Link href="/dashboard/admin/activity-logs">
                                View All
                                <ExternalLink className="h-4 w-4 ml-2" />
                            </Link>
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    {activities.map((activity) => (
                        <div
                            key={activity.id}
                            className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                        >
                            <Avatar className="h-8 w-8">
                                <AvatarImage src={activity.performedBy?.avatarUrl || undefined} />
                                <AvatarFallback className="text-xs">
                                    {activity.performedBy?.username?.substring(0, 2).toUpperCase() || "??"}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium">{activity.actionSummary}</p>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                    <span>{activity.performedBy?.username || "Unknown"}</span>
                                    {activity.project && (
                                        <>
                                            <span>•</span>
                                            <Link
                                                href={`/dashboard/projects/${activity.project.id}`}
                                                className="hover:underline"
                                            >
                                                {activity.project.name}
                                            </Link>
                                        </>
                                    )}
                                    <span>•</span>
                                    <span>{format(new Date(activity.createdAt), "MMM d, h:mm a")}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}

