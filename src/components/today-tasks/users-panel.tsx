"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Users, FolderKanban } from "lucide-react"
import { cn } from "@/lib/utils"

interface User {
    id: number
    username: string
    email: string
    role: string
    avatarUrl: string | null
    team: { id: number; name: string } | null
    activeProjectsCount: number
}

interface UsersPanelProps {
    users: User[]
    selectedUserId: number | null
    onUserSelect: (userId: number) => void
}

export function UsersPanel({ users, selectedUserId, onUserSelect }: UsersPanelProps) {
    const getRoleBadgeVariant = (role: string) => {
        switch (role) {
            case "admin":
                return "destructive"
            case "team_lead":
                return "default"
            case "developer":
                return "secondary"
            default:
                return "outline"
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
                <Users className="h-5 w-5 text-muted-foreground" />
                <h2 className="text-xl font-semibold">Users</h2>
                <Badge variant="outline" className="ml-auto">
                    {users.length} total
                </Badge>
            </div>

            <div className="space-y-2 max-h-[calc(100vh-250px)] overflow-y-auto">
                {users.map((user) => (
                    <Card
                        key={user.id}
                        className={cn(
                            "cursor-pointer transition-all hover:shadow-md",
                            selectedUserId === user.id && "ring-2 ring-primary"
                        )}
                        onClick={() => onUserSelect(user.id)}
                    >
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <Avatar className="h-10 w-10">
                                    <AvatarImage src={user.avatarUrl || undefined} />
                                    <AvatarFallback>
                                        {user.username.substring(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <p className="font-medium text-sm truncate">
                                            {user.username}
                                        </p>
                                        <Badge
                                            variant={getRoleBadgeVariant(user.role)}
                                            className="text-xs"
                                        >
                                            {user.role.replace("_", " ")}
                                        </Badge>
                                    </div>
                                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                        {user.team && (
                                            <span className="truncate">{user.team.name}</span>
                                        )}
                                        <div className="flex items-center gap-1">
                                            <FolderKanban className="h-3 w-3" />
                                            <span>{user.activeProjectsCount} projects</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {users.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No users found</p>
                </div>
            )}
        </div>
    )
}

