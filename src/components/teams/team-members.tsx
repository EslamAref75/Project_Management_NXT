"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Plus, X, UserCircle } from "lucide-react"
import { AddMemberDialog } from "./add-member-dialog"
import { removeMemberFromTeam } from "@/app/actions/teams"
import { useRouter } from "next/navigation"
import { format } from "date-fns"

interface TeamMembersProps {
    team: any
    allUsers: any[]
}

export function TeamMembers({ team, allUsers }: TeamMembersProps) {
    const router = useRouter()
    const [addMemberOpen, setAddMemberOpen] = useState(false)

    const handleRemoveMember = async (userId: number) => {
        if (!confirm("Are you sure you want to remove this member from the team?")) {
            return
        }

        const result = await removeMemberFromTeam(team.id, userId)
        if (result?.success) {
            router.refresh()
        } else {
            alert(result?.error || "Failed to remove member")
        }
    }

    const members = team.members || []
    const existingMemberIds = members.map((m: any) => m.userId)
    const availableUsers = allUsers.filter(u => !existingMemberIds.includes(u.id))

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Team Members</CardTitle>
                    <CardDescription>
                        Manage team members and their roles
                    </CardDescription>
                </div>
                {availableUsers.length > 0 && (
                    <>
                        <Button onClick={() => setAddMemberOpen(true)}>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Member
                        </Button>
                        <AddMemberDialog
                            open={addMemberOpen}
                            onOpenChange={setAddMemberOpen}
                            teamId={team.id}
                            availableUsers={availableUsers}
                        />
                    </>
                )}
            </CardHeader>
            <CardContent>
                {members.length === 0 ? (
                    <div className="text-center py-8 border border-dashed rounded-lg">
                        <UserCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground mb-4">No members in this team</p>
                        {availableUsers.length > 0 && (
                            <Button onClick={() => setAddMemberOpen(true)}>
                                <Plus className="h-4 w-4 mr-2" />
                                Add Member
                            </Button>
                        )}
                    </div>
                ) : (
                    <div className="space-y-4">
                        {members.map((member: any) => (
                            <div
                                key={member.id}
                                className="flex items-center justify-between p-4 border rounded-lg"
                            >
                                <div className="flex items-center gap-4">
                                    <Avatar className="h-12 w-12">
                                        <AvatarImage src={member.user?.avatarUrl || undefined} />
                                        <AvatarFallback>
                                            {member.user?.username?.substring(0, 2).toUpperCase() || "U"}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="font-semibold">{member.user?.username || "Unknown"}</p>
                                        <p className="text-sm text-muted-foreground">{member.user?.email || ""}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <Badge variant="outline">{member.role}</Badge>
                                            <span className="text-xs text-muted-foreground">
                                                Joined {format(new Date(member.joinedAt), "MMM d, yyyy")}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleRemoveMember(member.userId)}
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

