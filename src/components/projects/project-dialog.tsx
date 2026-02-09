"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { projectsAdapter } from "@/lib/api/projects-adapter"
import { Loader2, Plus } from "lucide-react"
import { useRouter } from "next/navigation"

interface ProjectType {
    id: number
    name: string
    description: string | null
    isActive: boolean
    displayOrder: number
    color: string | null
    icon: string | null
}

interface ProjectDialogProps {
    onProjectCreated?: () => void
}

export function ProjectDialog({ onProjectCreated }: ProjectDialogProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [projectTypes, setProjectTypes] = useState<ProjectType[]>([])
    const [loadingTypes, setLoadingTypes] = useState(true)
    const router = useRouter()

    useEffect(() => {
        async function loadProjectTypes() {
            setLoadingTypes(true)
            const result = await projectsAdapter.getProjectTypes(false) // Only active types
            setLoadingTypes(false)
            
            if ("success" in result && result.success) {
                setProjectTypes((result.projectTypes || []) as ProjectType[])
            }
        }
        
        if (open) {
            loadProjectTypes()
        }
    }, [open])

    async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setLoading(true)
        const formData = new FormData(event.currentTarget)

        const result = await projectsAdapter.createProject(formData)

        setLoading(false)
        if (result?.success) {
            setOpen(false)
            const form = event.currentTarget as HTMLFormElement
            if (form) {
                form.reset()
            }
            // Refresh the page data
            router.refresh()
            // Call the callback if provided
            if (onProjectCreated) {
                onProjectCreated()
            }
        } else {
            alert(result?.error || "Failed to create project")
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    New Project
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Create New Project</DialogTitle>
                    <DialogDescription>
                        Configure your project with details, timeline, and team structure.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={onSubmit}>
                    <div className="grid gap-4 py-4">
                        {/* Project Name */}
                        <div className="grid gap-2">
                            <Label htmlFor="name">Project Name *</Label>
                            <Input
                                id="name"
                                name="name"
                                placeholder="E-commerce Platform"
                                required
                            />
                        </div>

                        {/* Project Type */}
                        <div className="grid gap-2">
                            <Label htmlFor="projectTypeId">Project Type *</Label>
                            <Select name="projectTypeId" required disabled={loadingTypes}>
                                <SelectTrigger id="projectTypeId">
                                    <SelectValue placeholder={loadingTypes ? "Loading types..." : "Select project type"} />
                                </SelectTrigger>
                                <SelectContent>
                                    {projectTypes.length === 0 && !loadingTypes ? (
                                        <SelectItem value="" disabled>
                                            No project types available. Please create one in Settings.
                                        </SelectItem>
                                    ) : (
                                        projectTypes.map((type) => (
                                            <SelectItem key={type.id} value={type.id.toString()}>
                                                <div className="flex items-center gap-2">
                                                    {type.color && (
                                                        <div
                                                            className="h-3 w-3 rounded-full"
                                                            style={{ backgroundColor: type.color }}
                                                        />
                                                    )}
                                                    <span>{type.name}</span>
                                                </div>
                                            </SelectItem>
                                        ))
                                    )}
                                </SelectContent>
                            </Select>
                            {/* Keep legacy type field for backward compatibility */}
                            <input type="hidden" name="type" value="" />
                        </div>

                        {/* Description */}
                        <div className="grid gap-2">
                            <Label htmlFor="description">Description</Label>
                            <textarea
                                id="description"
                                name="description"
                                placeholder="Brief overview of the project goals and purpose..."
                                rows={3}
                                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            />
                        </div>

                        {/* Scope */}
                        <div className="grid gap-2">
                            <Label htmlFor="scope">Project Scope</Label>
                            <textarea
                                id="scope"
                                name="scope"
                                placeholder="Define deliverables, features, and boundaries..."
                                rows={3}
                                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            />
                        </div>

                        {/* Timeline */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="startDate">Start Date</Label>
                                <Input
                                    id="startDate"
                                    name="startDate"
                                    type="date"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="endDate">Target End Date</Label>
                                <Input
                                    id="endDate"
                                    name="endDate"
                                    type="date"
                                />
                            </div>
                        </div>

                        {/* Project Manager - Hidden for now, will implement user selector later */}
                        <input type="hidden" name="projectManagerId" value="" />
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Create Project
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
