"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { updateProfile } from "@/app/actions/settings"
import { Loader2 } from "lucide-react"
import { useSession } from "next-auth/react"

export function ProfileForm({ user }: { user: any }) {
    const { update } = useSession()
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState("")

    async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setLoading(true)
        setMessage("")
        const formData = new FormData(event.currentTarget)

        const result = await updateProfile(formData)

        setLoading(false)
        if (result?.success) {
            setMessage("Profile updated successfully!")
            update({ name: formData.get("username") }) // Update session client-side
        } else {
            setMessage(result?.error || "Failed to update profile")
        }
    }

    return (
        <form onSubmit={onSubmit} className="space-y-4 max-w-md">
            <div className="grid gap-2">
                <Label htmlFor="username">Username</Label>
                <Input id="username" name="username" defaultValue={user.username} required />
            </div>
            <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" defaultValue={user.email} required />
            </div>
            <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Update Profile
            </Button>
            {message && <p className="text-sm text-muted-foreground">{message}</p>}
        </form>
    )
}
