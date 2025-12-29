"use client"

import { useState } from "react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { addMemberToTeam } from "@/app/actions/teams"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

interface AddMemberDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    teamId: number
    availableUsers: any[]
}

export function AddMemberDialog({ open, onOpenChange, teamId, availableUsers }: AddMemberDialogProps) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [userId, setUserId] = useState<string>("")
    const [role, setRole] = useState<string>("member")

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!userId) return

        setLoading(true)
        const result = await addMemberToTeam(teamId, parseInt(userId), role)
        setLoading(false)

        if (result?.success) {
            setUserId("")
            setRole("member")
            onOpenChange(false)
            router.refresh()
        } else {
            alert(result?.error || "Failed to add member")
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Add Team Member</DialogTitle>
                        <DialogDescription>
                            Select a user to add to this team
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="userId">User</Label>
                            <Select value={userId} onValueChange={setUserId} required>
                                <SelectTrigger id="userId">
                                    <SelectValue placeholder="Select a user" />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableUsers.map((user) => (
                                        <SelectItem key={user.id} value={user.id.toString()}>
                                            {user.username} ({user.email})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="role">Role</Label>
                            <Select value={role} onValueChange={setRole}>
                                <SelectTrigger id="role">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="member">Member</SelectItem>
                                    <SelectItem value="lead">Lead</SelectItem>
                                    <SelectItem value="admin">Admin</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading || !userId}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Add Member
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}

