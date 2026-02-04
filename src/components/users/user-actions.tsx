"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { deleteUser, toggleUserStatus } from "@/app/actions/users"
import { Trash2 } from "lucide-react"
import { useTransition } from "react"
import { useToast } from "@/components/ui/use-toast"
import { useRouter } from "next/navigation"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export function UserListActions({ userId }: { userId: number }) {
    const [isPending, startTransition] = useTransition()
    const [showDeactivateDialog, setShowDeactivateDialog] = useState(false)
    const { toast } = useToast()
    const router = useRouter()

    function onDelete() {
        if (confirm("Are you sure you want to delete this user? This action cannot be undone.")) {
            startTransition(async () => {
                const result = await deleteUser(userId)

                if (result.error) {
                    if (result.code === "HAS_HISTORY") {
                        setShowDeactivateDialog(true)
                    } else {
                        toast({
                            variant: "destructive",
                            title: "Delete Failed",
                            description: result.error,
                        })
                    }
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

    function onDeactivate() {
        startTransition(async () => {
            const result = await toggleUserStatus(userId, false) // false for deactivate
            if (result.success) {
                toast({
                    title: "User Deactivated",
                    description: "User has been deactivated successfully.",
                })
                setShowDeactivateDialog(false)
                router.refresh()
            } else {
                toast({
                    variant: "destructive",
                    title: "Deactivation Failed",
                    description: result.error || "Failed to deactivate user.",
                })
            }
        })
    }

    return (
        <>
            <div className="flex gap-2">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onDelete}
                    disabled={isPending}
                    className="text-destructive h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                >
                    <Trash2 className="h-4 w-4" />
                </Button>
            </div>

            <AlertDialog open={showDeactivateDialog} onOpenChange={setShowDeactivateDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Cannot Delete User</AlertDialogTitle>
                        <AlertDialogDescription>
                            This user has associated history (Time Logs, Comments, etc.) that must be preserved for data integrity.
                            <br /><br />
                            Would you like to <strong>deactivate</strong> their account instead? This will revoke their access while keeping their data safe.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={onDeactivate}>
                            Deactivate User
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
