"use client"

import { Button } from "@/components/ui/button"
import { deleteUser } from "@/app/actions/users"
import { Trash2 } from "lucide-react"
import { useTransition } from "react"
import { useToast } from "@/components/ui/use-toast"
import { useRouter } from "next/navigation"

export function UserListActions({ userId }: { userId: number }) {
    const [isPending, startTransition] = useTransition()
    const { toast } = useToast()
    const router = useRouter()

    function onDelete() {
        if (confirm("Are you sure you want to delete this user? This action cannot be undone.")) {
            startTransition(async () => {
                const result = await deleteUser(userId)

                if (result.error) {
                    toast({
                        variant: "destructive",
                        title: "Delete Failed",
                        description: result.error,
                    })
                } else {
                    toast({
                        title: "User Deleted",
                        description: "User has been successfully deleted.",
                    })
                    router.refresh()
                }
            })
        }
    }

    return (
        <div className="flex gap-2">
            <Button
                variant="ghost"
                size="icon"
                onClick={onDelete}
                disabled={isPending}
                className="text-destructive h-8 w-8"
            >
                <Trash2 className="h-4 w-4" />
            </Button>
        </div>
    )
}
