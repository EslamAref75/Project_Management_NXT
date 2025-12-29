"use client"

import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Users, FolderKanban } from "lucide-react"

interface TeamCardProps {
    team: any
}

export function TeamCard({ team }: TeamCardProps) {
    const memberCount = team._count?.members || team._count?.users || 0
    const projectCount = team._count?.projectTeams || 0

    return (
        <Link href={`/dashboard/teams/${team.id}`}>
            <Card className="cursor-pointer hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xl font-semibold">
                        {team.name}
                    </CardTitle>
                    <Badge variant={team.status === "active" ? "default" : "secondary"}>
                        {team.status}
                    </Badge>
                </CardHeader>
                <CardContent>
                    <CardDescription className="min-h-[40px] mb-4">
                        {team.description || "No description"}
                    </CardDescription>

                    {team.teamLead && (
                        <div className="mb-4 flex items-center gap-2 text-sm">
                            <span className="text-muted-foreground">Lead:</span>
                            <div className="flex items-center gap-2">
                                <Avatar className="h-6 w-6">
                                    <AvatarImage src={team.teamLead.avatarUrl || undefined} />
                                    <AvatarFallback className="text-xs">
                                        {team.teamLead.username.substring(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                                <span className="font-medium">{team.teamLead.username}</span>
                            </div>
                        </div>
                    )}

                    <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Users className="h-4 w-4" />
                                <span>Members</span>
                            </div>
                            <span className="font-medium">{memberCount}</span>
                        </div>

                        <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <FolderKanban className="h-4 w-4" />
                                <span>Projects</span>
                            </div>
                            <span className="font-medium">{projectCount}</span>
                        </div>

                        {team.members && team.members.length > 0 && (
                            <div className="flex -space-x-2 overflow-hidden pt-2">
                                {team.members.slice(0, 5).map((member: any, i: number) => (
                                    <div key={i} title={member.user?.username || member.username}>
                                        <Avatar className="inline-block h-8 w-8 rounded-full ring-2 ring-background">
                                            <AvatarImage src={member.user?.avatarUrl || member.avatarUrl || undefined} />
                                            <AvatarFallback className="bg-muted text-xs">
                                                {(member.user?.username || member.username || "").substring(0, 2).toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                    </div>
                                ))}
                                {memberCount > 5 && (
                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted ring-2 ring-background text-xs">
                                        +{memberCount - 5}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </Link>
    )
}

