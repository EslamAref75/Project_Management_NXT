import { getUsers } from "@/app/actions/users"
import { getTeams } from "@/app/actions/teams"
import { getRoles } from "@/app/actions/rbac"
import { UserDialog } from "@/components/users/user-dialog"
import { UserListActions } from "@/components/users/user-actions"
import { Badge } from "@/components/ui/badge"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table" // Need to Create Table component
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { formatDistanceToNow } from "date-fns"

export default async function UsersPage() {
    const users = await getUsers()
    const teams = await getTeams() // For the dialog
    const roles = await getRoles().catch(() => []) // Fetch roles, fallback to empty array if error

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Users</h2>
                    <p className="text-muted-foreground">
                        Manage users and their roles.
                    </p>
                </div>
                <UserDialog teams={teams} roles={roles} />
            </div>

            <div className="rounded-md border bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>User</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Team</TableHead>
                            <TableHead>Joined</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {users.map((user) => (
                            <TableRow key={user.id}>
                                <TableCell className="flex items-center gap-3 font-medium">
                                    <Avatar className="h-8 w-8">
                                        <AvatarFallback>
                                            {user.username.substring(0, 2).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex flex-col">
                                        <span>{user.username}</span>
                                        <span className="text-xs text-muted-foreground">{user.email}</span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Badge variant="outline" className="capitalize">
                                        {user.role.replace("_", " ")}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    {user.team ? (
                                        <Badge variant="secondary">{user.team.name}</Badge>
                                    ) : (
                                        <span className="text-muted-foreground text-sm">-</span>
                                    )}
                                </TableCell>
                                <TableCell className="text-muted-foreground text-sm">
                                    {formatDistanceToNow(new Date(user.createdAt), { addSuffix: true })}
                                </TableCell>
                                <TableCell>
                                    <Badge variant={user.isActive ? "default" : "destructive"} className="text-xs">
                                        {user.isActive ? "Active" : "Inactive"}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <UserListActions userId={user.id} />
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
