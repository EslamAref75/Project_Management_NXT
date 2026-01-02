"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { CheckCircle2, Loader2 } from "lucide-react"
import { removeUrgentPriority } from "@/app/actions/project-priority"
import { useRouter } from "next/navigation"

interface RemoveUrgentDialogProps {
    projectId: number
    projectName: string
    children?: React.ReactNode
}

export function RemoveUrgentDialog({ projectId, projectName, children }: RemoveUrgentDialogProps) {
    const [confirmOpen, setConfirmOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    const handleConfirm = async (e?: React.MouseEvent) => {
        e?.preventDefault()
        e?.stopPropagation()
        
        setLoading(true)
        try {
            const result = await removeUrgentPriority(projectId)
            
            if (result.success) {
                setConfirmOpen(false)
                router.refresh()
            } else {
                alert(result.error || "Failed to remove urgent priority")
            }
        } catch (error: any) {
            console.error("Remove urgent exception:", error)
            alert(`Error: ${error.message || "An unexpected error occurred"}`)
        } finally {
            setLoading(false)
        }
    }

    return (
        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
            {children ? (
                <div onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setConfirmOpen(true)
                }}>
                    {children}
                </div>
            ) : (
                <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm">
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Remove Urgent
                    </Button>
                </AlertDialogTrigger>
            )}
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Remove Urgent Priority</AlertDialogTitle>
                    <AlertDialogDescription className="pt-2">
                        This will change the project priority back to Normal.
                        <br />
                        <br />
                        The urgent notification will be cleared and the project will be removed from the urgent alerts section.
                        <br />
                        <br />
                        Are you sure you want to continue?
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleConfirm}
                        disabled={loading}
                        className="bg-blue-600 hover:bg-blue-700 focus:ring-blue-500"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Removing...
                            </>
                        ) : (
                            "Confirm"
                        )}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}

