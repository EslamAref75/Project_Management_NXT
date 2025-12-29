"use client"

import { Button } from "@/components/ui/button"
import { deleteUser } from "@/app/actions/users"
import { Trash2 } from "lucide-react"
import { useTransition } from "react"

export function UserListActions({ userId }: { userId: number }) {
    const [isPending, startTransition] = useTransition()

    function onDelete() {
        if (confirm("Are you sure you want to delete this user?")) {
            startTransition(async () => {
                await deleteUser(userId)
            })
        }
    }

    return (
        <div className="flex gap-2">
            <Button variant="ghost" size="icon" onClick={onDelete} disabled={isPending} className="text-destructive h-8 w-8">
                <Trash2 className="h-4 w-4" />
            </Button>
        </div>
    )
}
