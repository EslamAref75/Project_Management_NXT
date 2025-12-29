"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { format } from "date-fns"
import { 
    Users, 
    Calendar, 
    UserCircle, 
    FolderKanban,
    CheckCircle2,
    Clock
} from "lucide-react"

interface TeamOverviewProps {
    team: any
}

export function TeamOverview({ team }: TeamOverviewProps) {
    const memberCount = team._count?.members || 0
    const projectCount = team._count?.projectTeams || 0
    const taskCount = team._count?.tasks || 0

    return (
        <div className="grid gap-6 md:grid-cols-2">
            <Card>
                <CardHeader>
                    <CardTitle>Team Information</CardTitle>
                    <CardDescription>Basic team details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <label className="text-sm font-medium text-muted-foreground">Name</label>
                        <p className="text-lg font-semibold">{team.name}</p>
                    </div>

                    <div>
                        <label className="text-sm font-medium text-muted-foreground">Description</label>
                        <p className="text-sm">{team.description || "No description provided"}</p>
                    </div>

                    <div>
                        <label className="text-sm font-medium text-muted-foreground">Status</label>
                        <div className="mt-1">
                            <Badge variant={team.status === "active" ? "default" : "secondary"}>
                                {team.status === "active" ? (
                                    <>
                                        <CheckCircle2 className="h-3 w-3 mr-1" />
                                        Active
                                    </>
                                ) : (
                                    <>
                                        <Clock className="h-3 w-3 mr-1" />
                                        Inactive
                                    </>
                                )}
                            </Badge>
                        </div>
                    </div>

                    <div>
                        <label className="text-sm font-medium text-muted-foreground">Created</label>
                        <p className="text-sm">
                            {format(new Date(team.createdAt), "PPp")}
                        </p>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Team Lead</CardTitle>
                    <CardDescription>Team leadership information</CardDescription>
                </CardHeader>
                <CardContent>
                    {team.teamLead ? (
                        <div className="flex items-center gap-4">
                            <Avatar className="h-16 w-16">
                                <AvatarImage src={team.teamLead.avatarUrl || undefined} />
                                <AvatarFallback>
                                    {team.teamLead.username.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                            <div>
                                <p className="font-semibold text-lg">{team.teamLead.username}</p>
                                <p className="text-sm text-muted-foreground">{team.teamLead.email}</p>
                                <Badge variant="outline" className="mt-1">
                                    {team.teamLead.role}
                                </Badge>
                            </div>
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground">No team lead assigned</p>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Statistics</CardTitle>
                    <CardDescription>Team metrics and counts</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Users className="h-5 w-5 text-muted-foreground" />
                            <span className="text-sm font-medium">Members</span>
                        </div>
                        <span className="text-2xl font-bold">{memberCount}</span>
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <FolderKanban className="h-5 w-5 text-muted-foreground" />
                            <span className="text-sm font-medium">Projects</span>
                        </div>
                        <span className="text-2xl font-bold">{projectCount}</span>
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Calendar className="h-5 w-5 text-muted-foreground" />
                            <span className="text-sm font-medium">Tasks</span>
                        </div>
                        <span className="text-2xl font-bold">{taskCount}</span>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

