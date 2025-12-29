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
import { addProjectToTeam } from "@/app/actions/teams"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

interface AddProjectDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    teamId: number
    availableProjects: any[]
}

export function AddProjectDialog({ open, onOpenChange, teamId, availableProjects }: AddProjectDialogProps) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [projectId, setProjectId] = useState<string>("")

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!projectId) return

        setLoading(true)
        const result = await addProjectToTeam(teamId, parseInt(projectId))
        setLoading(false)

        if (result?.success) {
            setProjectId("")
            onOpenChange(false)
            router.refresh()
        } else {
            alert(result?.error || "Failed to add project")
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Add Project to Team</DialogTitle>
                        <DialogDescription>
                            Select a project to assign to this team
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="projectId">Project</Label>
                            <Select value={projectId} onValueChange={setProjectId} required>
                                <SelectTrigger id="projectId">
                                    <SelectValue placeholder="Select a project" />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableProjects.map((project) => (
                                        <SelectItem key={project.id} value={project.id.toString()}>
                                            {project.name} ({project.code})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading || !projectId}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Add Project
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}

