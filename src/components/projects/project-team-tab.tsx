import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Users, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ProjectTeamTabProps {
    project: any
    users: any[]
}

export function ProjectTeamTab({ project, users }: ProjectTeamTabProps) {
    // Get teams from project data (already loaded in getProject)
    const projectTeams = project.projectTeams || []

    // Get all unique members from all teams
    const allMembers = new Map()
    projectTeams.forEach((pt: any) => {
        if (pt.team.teamLead) {
            allMembers.set(pt.team.teamLead.id, {
                ...pt.team.teamLead,
                role: "Team Lead",
                team: pt.team.name
            })
        }
        pt.team.members?.forEach((member: any) => {
            if (!allMembers.has(member.user.id)) {
                allMembers.set(member.user.id, {
                    ...member.user,
                    role: member.role,
                    team: pt.team.name
                })
            }
        })
    })

    return (
        <div className="space-y-6">
            {/* Teams */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Assigned Teams
                    </CardTitle>
                    <CardDescription>
                        Teams working on this project
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {projectTeams.length === 0 ? (
                        <div className="text-center py-8 border border-dashed rounded-lg">
                            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                            <p className="text-muted-foreground mb-4">No teams assigned</p>
                            <Button variant="outline" size="sm">
                                <Plus className="h-4 w-4 mr-2" />
                                Assign Team
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {projectTeams.map((pt: any) => (
                                <div key={pt.id} className="p-4 border rounded-lg">
                                    <div className="flex items-center justify-between mb-3">
                                        <div>
                                            <h4 className="font-semibold">{pt.team.name}</h4>
                                            {pt.team.description && (
                                                <p className="text-sm text-muted-foreground">
                                                    {pt.team.description}
                                                </p>
                                            )}
                                        </div>
                                        <Badge>{pt.team._count.members} members</Badge>
                                    </div>
                                    {pt.team.teamLead && (
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="text-sm text-muted-foreground">Lead:</span>
                                            <Avatar className="h-6 w-6">
                                                <AvatarImage src={pt.team.teamLead.avatarUrl || undefined} />
                                                <AvatarFallback className="text-xs">
                                                    {pt.team.teamLead.username.substring(0, 2).toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                            <span className="text-sm">{pt.team.teamLead.username}</span>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* All Members */}
            <Card>
                <CardHeader>
                    <CardTitle>All Team Members</CardTitle>
                    <CardDescription>
                        All members from assigned teams
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {allMembers.size === 0 ? (
                        <p className="text-sm text-muted-foreground">No team members</p>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {Array.from(allMembers.values()).map((member: any) => (
                                <div key={member.id} className="flex items-center gap-3 p-3 border rounded-lg">
                                    <Avatar>
                                        <AvatarImage src={member.avatarUrl || undefined} />
                                        <AvatarFallback>
                                            {member.username.substring(0, 2).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1">
                                        <p className="font-medium">{member.username}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {member.role} • {member.team}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}

