"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { format } from "date-fns"
import { 
    Users, 
    Calendar, 
    UserCircle, 
    FolderKanban, 
    Plus, 
    X,
    CheckCircle2,
    Clock,
    AlertCircle,
    Trash2
} from "lucide-react"
import { TeamOverview } from "./team-overview"
import { TeamMembers } from "./team-members"
import { TeamProjects } from "./team-projects"
import { useRouter } from "next/navigation"
import { deleteTeam } from "@/app/actions/teams"
import { useToast } from "@/components/ui/use-toast"

interface TeamDetailsPageProps {
    team: any
    availableProjects: any[]
    allUsers: any[]
}

export function TeamDetailsPage({ team, availableProjects, allUsers }: TeamDetailsPageProps) {
    const router = useRouter()
    const { toast } = useToast()
    const [activeTab, setActiveTab] = useState("overview")
    const [deleting, setDeleting] = useState(false)

    const handleDeleteTeam = async () => {
        if (!team) return
        if (!confirm(`Are you sure you want to delete "${team.name}"? This cannot be undone.`)) return
        setDeleting(true)
        const result = await deleteTeam(team.id)
        setDeleting(false)
        if (result?.error) {
            toast({
                variant: "destructive",
                title: "Delete Failed",
                description: result.error,
            })
        } else {
            toast({ title: "Team Deleted", description: "The team has been deleted." })
            router.push("/dashboard/teams")
            router.refresh()
        }
    }

    if (!team) {
        return <div>Team not found</div>
    }

    return (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <div className="flex items-center justify-between">
                <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="members">Members</TabsTrigger>
                    <TabsTrigger value="projects">Projects</TabsTrigger>
                </TabsList>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDeleteTeam}
                    disabled={deleting}
                    className="text-destructive border-destructive/50 hover:bg-destructive/10 hover:text-destructive"
                >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete team
                </Button>
            </div>

            <TabsContent value="overview" className="space-y-6">
                <TeamOverview team={team} />
            </TabsContent>

            <TabsContent value="members" className="space-y-6">
                <TeamMembers 
                    team={team} 
                    allUsers={allUsers}
                />
            </TabsContent>

            <TabsContent value="projects" className="space-y-6">
                <TeamProjects 
                    team={team} 
                    availableProjects={availableProjects}
                />
            </TabsContent>
        </Tabs>
    )
}

