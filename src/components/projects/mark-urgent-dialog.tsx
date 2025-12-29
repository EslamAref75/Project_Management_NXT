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
import { AlertTriangle, Loader2 } from "lucide-react"
import { markProjectUrgent } from "@/app/actions/project-priority"
import { useRouter } from "next/navigation"

interface MarkUrgentDialogProps {
    projectId: number
    projectName: string
    children?: React.ReactNode
}

export function MarkUrgentDialog({ projectId, projectName, children }: MarkUrgentDialogProps) {
    const [confirmOpen, setConfirmOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    const handleConfirm = async (e?: React.MouseEvent) => {
        e?.preventDefault()
        e?.stopPropagation()
        
        setLoading(true)
        const formData = new FormData()
        formData.append("projectId", projectId.toString())
        formData.append("reason", "Project marked as urgent - requires immediate attention")

        try {
            const result = await markProjectUrgent(formData)
            
            console.log("Mark urgent result:", result)
            console.log("Result type:", typeof result)
            console.log("Result keys:", result ? Object.keys(result) : "null/undefined")
            
            // Check if result is null, undefined, or empty
            if (!result || (typeof result === 'object' && Object.keys(result).length === 0)) {
                alert("Unexpected response from server. Please check the console for details.")
                console.error("Empty or invalid result:", result)
                return
            }
            
            if (result.success) {
                setConfirmOpen(false)
                router.refresh()
            } else {
                // Show detailed error message
                const errorMessage = result.error || "Failed to mark project as urgent"
                let details = ""
                
                if (result.details) {
                    if (typeof result.details === 'object') {
                        // Format validation errors
                        const formatted = Object.entries(result.details).map(([key, value]: [string, any]) => {
                            if (value && typeof value === 'object' && '_errors' in value) {
                                return `${key}: ${value._errors?.join(', ') || 'Invalid'}`
                            }
                            return `${key}: ${JSON.stringify(value)}`
                        }).join('\n')
                        details = `\n\nDetails:\n${formatted}`
                    } else {
                        details = `\n\nDetails: ${result.details}`
                    }
                }
                
                alert(errorMessage + details)
                console.error("Mark urgent error:", result)
                // Keep dialog open so user can see the error
            }
        } catch (error: any) {
            console.error("Mark urgent exception:", error)
            console.error("Error stack:", error.stack)
            alert(`Error: ${error.message || "An unexpected error occurred"}`)
            // Keep dialog open so user can see the error
        } finally {
            setLoading(false)
        }
    }

    return (
        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
            <AlertDialogTrigger asChild>
                {children || (
                    <Button variant="destructive" size="sm">
                        <AlertTriangle className="h-4 w-4 mr-2" />
                        Mark as Urgent
                    </Button>
                )}
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-red-600" />
                        Confirm Urgent Priority
                    </AlertDialogTitle>
                    <AlertDialogDescription className="pt-2">
                        You are about to mark this project as Urgent.
                        <br />
                        <br />
                        This will notify all assigned leaders and escalate attention immediately.
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
                        className="bg-red-600 hover:bg-red-700 focus:ring-red-500"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Marking Urgent...
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

