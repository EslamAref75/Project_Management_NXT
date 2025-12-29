"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { changePassword } from "@/app/actions/settings"
import { Loader2 } from "lucide-react"

export function PasswordForm() {
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState("")

    async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setLoading(true)
        setMessage("")
        const formData = new FormData(event.currentTarget)

        const result = await changePassword(formData)

        setLoading(false)
        if (result && 'success' in result && result.success) {
            setMessage("Password changed successfully!");
            // Optionally reset form
            const form = event.currentTarget as HTMLFormElement
            if (form) {
                form.reset()
            }
        } else {
            setMessage(result?.error || "Failed to change password")
        }
    }

    return (
        <form onSubmit={onSubmit} className="space-y-4 max-w-md">
            <div className="grid gap-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input id="currentPassword" name="currentPassword" type="password" required />
            </div>
            <div className="grid gap-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input id="newPassword" name="newPassword" type="password" required minLength={6} />
            </div>
            <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Change Password
            </Button>
            {message && <p className="text-sm text-muted-foreground">{message}</p>}
        </form>
    )
}
