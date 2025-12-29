"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createUser } from "@/app/actions/users"
import { Loader2, Plus, UserPlus } from "lucide-react"

export function UserDialog({ teams }: { teams: { id: number, name: string }[] }) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)

    async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setLoading(true)
        const formData = new FormData(event.currentTarget)

        const result = await createUser(formData)

        setLoading(false)
        if (result?.success) {
            setOpen(false)
        } else {
            alert(result?.error || "Failed to create user")
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Create User
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Create User</DialogTitle>
                    <DialogDescription>
                        Create a new user with access credentials.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={onSubmit}>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="username">Username</Label>
                            <Input id="username" name="username" required />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="email">Email</Label>
                            <Input id="email" name="email" type="email" required />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="password">Password</Label>
                            <Input id="password" name="password" type="password" required minLength={6} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="role">Role</Label>
                            <select
                                id="role"
                                name="role"
                                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <option value="developer">Developer</option>
                                <option value="team_lead">Team Lead</option>
                                <option value="admin">Admin</option>
                                <option value="viewer">Viewer</option>
                            </select>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="teamId">Assign Team (Optional)</Label>
                            <select
                                id="teamId"
                                name="teamId"
                                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <option value="">No Team</option>
                                {teams.map(team => (
                                    <option key={team.id} value={team.id}>{team.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Create User
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
