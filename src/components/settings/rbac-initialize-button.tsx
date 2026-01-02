"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { initializeRBAC } from "@/app/actions/rbac"
import { Loader2, Database } from "lucide-react"
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
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

export function RBACInitializeButton() {
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState<{ type: "success" | "error", text: string } | null>(null)
    const router = useRouter()

    async function handleInitialize() {
        setLoading(true)
        setMessage(null)

        try {
            const result = await initializeRBAC()
            
            if (result.success) {
                setMessage({ type: "success", text: "RBAC system initialized successfully! Default roles and permissions have been created." })
                setTimeout(() => {
                    router.refresh()
                }, 1500)
            } else {
                setMessage({ type: "error", text: result.error || "Failed to initialize RBAC system" })
            }
        } catch (error: any) {
            setMessage({ type: "error", text: error.message || "An error occurred while initializing RBAC" })
        } finally {
            setLoading(false)
        }
    }

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant="outline" disabled={loading}>
                    <Database className="h-4 w-4 mr-2" />
                    {loading ? "Initializing..." : "Initialize RBAC System"}
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Initialize RBAC System</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will create default roles (System Admin, Project Manager, Team Lead, Developer) 
                        and all required permissions in the database. Existing roles not in this list will be removed 
                        (if no users are assigned). This action is safe to run multiple times and will update roles 
                        and permissions as needed.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                {message && (
                    <div className={`p-3 rounded-md ${
                        message.type === "success" 
                            ? "bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200" 
                            : "bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200"
                    }`}>
                        {message.text}
                    </div>
                )}
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                        onClick={handleInitialize} 
                        disabled={loading}
                        className="bg-primary text-primary-foreground"
                    >
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Initialize
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}

