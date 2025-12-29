import { getUsersForAssignment, getUsersTaskCounts } from "@/app/actions/today-tasks-assignment"
import { getTeams } from "@/app/actions/teams"
import { TasksManagementPage } from "@/components/today-tasks/tasks-management-page"
import { Card } from "@/components/ui/card"
import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export default async function TodayTasksAssignmentPage() {
    const session = await getServerSession(authOptions)
    
    // Check if user is admin or team_lead
    if (!session || (session.user.role !== "admin" && session.user.role !== "team_lead")) {
        redirect("/dashboard")
    }

    const [usersResult, teamsResult, countsResult] = await Promise.all([
        getUsersForAssignment(),
        getTeams(),
        getUsersTaskCounts()
    ])

    if (usersResult.error) {
        return (
            <div className="space-y-6">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Today's Tasks Management</h2>
                    <p className="text-muted-foreground">
                        Manage daily task assignments for your team
                    </p>
                </div>
                <Card className="p-8 text-center">
                    <p className="text-destructive">{usersResult.error}</p>
                </Card>
            </div>
        )
    }

    const users = usersResult.users || []
    const teams = teamsResult.map((t: any) => ({ id: t.id, name: t.name }))
    const initialCounts = countsResult.success ? countsResult.counts || {} : {}

    return (
        <div className="space-y-6">
            <TasksManagementPage 
                users={users} 
                teams={teams}
                initialCounts={initialCounts}
            />
        </div>
    )
}

