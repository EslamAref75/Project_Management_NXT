import { getTeams } from "@/app/actions/teams"
import { TeamDialog } from "@/components/teams/team-dialog"
import { TeamCard } from "@/components/teams/team-card"

export default async function TeamsPage() {
    const teams = await getTeams()

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Teams</h2>
                    <p className="text-muted-foreground">
                        Manage your teams and their members.
                    </p>
                </div>
                <TeamDialog />
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {teams.map((team) => (
                    <TeamCard key={team.id} team={team} />
                ))}
            </div>

            {teams.length === 0 && (
                <div className="text-center p-8 border border-dashed rounded-lg">
                    <p className="text-muted-foreground">No teams found. Create one to get started.</p>
                </div>
            )}
        </div>
    )
}
