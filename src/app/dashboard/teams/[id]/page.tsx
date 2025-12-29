import { getTeam, getAvailableProjects } from "@/app/actions/teams"
import { getUsers } from "@/app/actions/users"
import { getProjects } from "@/app/actions/projects"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { TeamDetailsPage } from "@/components/teams/team-details-page"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

type Params = Promise<{ id: string }>

export default async function TeamDetailsPageRoute({
    params
}: {
    params: Params
}) {
    const session = await getServerSession(authOptions)
    if (!session) {
        redirect("/login")
    }

    const { id } = await params
    const teamId = parseInt(id)

    if (isNaN(teamId)) {
        redirect("/dashboard/teams")
    }

    const [team, availableProjects, allUsers] = await Promise.all([
        getTeam(teamId),
        getAvailableProjects(teamId),
        getUsers()
    ])

    if (!team) {
        redirect("/dashboard/teams")
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/dashboard/teams">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">{team.name}</h2>
                    <p className="text-muted-foreground">
                        Team details and project assignments
                    </p>
                </div>
            </div>

            <TeamDetailsPage 
                team={team} 
                availableProjects={availableProjects}
                allUsers={allUsers}
            />
        </div>
    )
}

