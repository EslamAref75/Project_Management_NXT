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
    AlertCircle
} from "lucide-react"
import { TeamOverview } from "./team-overview"
import { TeamMembers } from "./team-members"
import { TeamProjects } from "./team-projects"
import { useRouter } from "next/navigation"

interface TeamDetailsPageProps {
    team: any
    availableProjects: any[]
    allUsers: any[]
}

export function TeamDetailsPage({ team, availableProjects, allUsers }: TeamDetailsPageProps) {
    const router = useRouter()
    const [activeTab, setActiveTab] = useState("overview")

    if (!team) {
        return <div>Team not found</div>
    }

    return (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="members">Members</TabsTrigger>
                <TabsTrigger value="projects">Projects</TabsTrigger>
            </TabsList>

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

