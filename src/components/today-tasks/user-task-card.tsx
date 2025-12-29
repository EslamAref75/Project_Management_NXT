"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Edit } from "lucide-react"
import { cn } from "@/lib/utils"

interface UserTaskCardProps {
    user: {
        id: number
        username: string
        email: string
        role: string
        avatarUrl: string | null
        team: { id: number; name: string } | null
    }
    todayTasksCount: number
    totalTasksCount: number
    onEditClick: () => void
}

export function UserTaskCard({ user, todayTasksCount, totalTasksCount, onEditClick }: UserTaskCardProps) {
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
        <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12">
                            <AvatarImage src={user.avatarUrl || undefined} />
                            <AvatarFallback className="bg-blue-500 text-white">
                                {user.username.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                        <div>
                            <p className="font-semibold text-sm">{user.username}</p>
                            <Badge
                                variant={getRoleBadgeVariant(user.role)}
                                className="text-xs mt-1"
                            >
                                {user.role.replace("_", " ")}
                            </Badge>
                        </div>
                    </div>
                    <Button
                        onClick={onEditClick}
                        className="bg-purple-600 hover:bg-purple-700 text-white"
                        size="sm"
                    >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit Today
                    </Button>
                </div>
                
                <div className="space-y-2">
                    {todayTasksCount === 0 ? (
                        <p className="text-sm text-muted-foreground">
                            No tasks assigned for today
                        </p>
                    ) : (
                        <p className="text-sm font-medium">
                            {todayTasksCount} task{todayTasksCount !== 1 ? 's' : ''} assigned for today
                        </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                        Total: {totalTasksCount} task{totalTasksCount !== 1 ? 's' : ''}
                    </p>
                </div>
            </CardContent>
        </Card>
    )
}

