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
import { Loader2 } from "lucide-react"
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

interface ProjectStatus {
    id: number
    name: string
    color: string
    isDefault: boolean
    isFinal: boolean
    orderIndex: number
    isActive: boolean
}

interface ProjectEditDialogProps {
    project: {
        id: number
        name: string
        type: string
        projectTypeId?: number | null
        projectStatusId?: number | null
        description: string | null
        scope: string | null
        status: string
        startDate: Date | null
        endDate: Date | null
    }
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function ProjectEditDialog({ project, open, onOpenChange }: ProjectEditDialogProps) {
    const [loading, setLoading] = useState(false)
    const [projectTypes, setProjectTypes] = useState<ProjectType[]>([])
    const [projectStatuses, setProjectStatuses] = useState<ProjectStatus[]>([])
    const [loadingTypes, setLoadingTypes] = useState(true)
    const [loadingStatuses, setLoadingStatuses] = useState(true)
    const [selectedProjectTypeId, setSelectedProjectTypeId] = useState<string>("")
    const [selectedProjectStatusId, setSelectedProjectStatusId] = useState<string>("")
    const [currentStatus, setCurrentStatus] = useState<ProjectStatus | null>(null)
    const router = useRouter()

    useEffect(() => {
        async function loadData() {
            if (!open) return
            setLoadingTypes(true)
            setLoadingStatuses(true)
            
            const [typesResult, statusesResult] = await Promise.all([
                projectsAdapter.getProjectTypes(true), // Include inactive to show current type
                projectsAdapter.getProjectStatuses(true) // Include inactive to show current status
            ])
            
            setLoadingTypes(false)
            setLoadingStatuses(false)
            
            if ("success" in typesResult && typesResult.success) {
                const raw = typesResult.projectTypes || []
                const types: ProjectType[] = raw.map((t: { id: number; name: string; description?: string | null; isActive: boolean; displayOrder?: number; color?: string | null; icon?: string | null; usageCount?: number }) => ({
                    id: t.id,
                    name: t.name,
                    description: t.description ?? null,
                    isActive: t.isActive,
                    displayOrder: t.displayOrder ?? 0,
                    color: t.color ?? null,
                    icon: t.icon ?? null,
                }))
                setProjectTypes(types)
                
                // Set the selected project type ID
                if (project.projectTypeId) {
                    setSelectedProjectTypeId(project.projectTypeId.toString())
                } else if (project.type && types.length > 0) {
                    // Try to find by type name for backward compatibility
                    const matchingType = types.find(type => type.name === project.type)
                    if (matchingType) {
                        setSelectedProjectTypeId(matchingType.id.toString())
                    }
                }
            }
            
            if ("success" in statusesResult && statusesResult.success) {
                const allStatuses = statusesResult.projectStatuses || []
                
                // Only show active statuses in the dropdown
                const filteredStatuses = allStatuses.filter(status => status.isActive)
                setProjectStatuses(filteredStatuses)
                
                // Find and store the current status (even if inactive) for display purposes
                let currentStatusObj: ProjectStatus | null = null
                if (project.projectStatusId) {
                    currentStatusObj = allStatuses.find(s => s.id === project.projectStatusId) || null
                } else if (project.status && allStatuses.length > 0) {
                    // Try to find by status name for backward compatibility
                    currentStatusObj = allStatuses.find(status => status.name === project.status) || null
                }
                setCurrentStatus(currentStatusObj)
                
                // Set the selected project status ID (only if it's active)
                if (project.projectStatusId) {
                    const currentStatus = allStatuses.find(s => s.id === project.projectStatusId)
                    if (currentStatus && currentStatus.isActive) {
                        setSelectedProjectStatusId(project.projectStatusId.toString())
                    } else {
                        // If current status is inactive, find default or first active status
                        const defaultStatus = filteredStatuses.find(status => status.isDefault)
                        if (defaultStatus) {
                            setSelectedProjectStatusId(defaultStatus.id.toString())
                        } else if (filteredStatuses.length > 0) {
                            setSelectedProjectStatusId(filteredStatuses[0].id.toString())
                        }
                    }
                } else if (project.status && allStatuses.length > 0) {
                    // Try to find by status name for backward compatibility
                    const matchingStatus = allStatuses.find(status => status.name === project.status)
                    if (matchingStatus && matchingStatus.isActive) {
                        setSelectedProjectStatusId(matchingStatus.id.toString())
                    } else {
                        // Try to find default status
                        const defaultStatus = filteredStatuses.find(status => status.isDefault)
                        if (defaultStatus) {
                            setSelectedProjectStatusId(defaultStatus.id.toString())
                        } else if (filteredStatuses.length > 0) {
                            setSelectedProjectStatusId(filteredStatuses[0].id.toString())
                        }
                    }
                } else if (filteredStatuses.length > 0) {
                    // No current status, use default or first active
                    const defaultStatus = filteredStatuses.find(status => status.isDefault)
                    if (defaultStatus) {
                        setSelectedProjectStatusId(defaultStatus.id.toString())
                    } else {
                        setSelectedProjectStatusId(filteredStatuses[0].id.toString())
                    }
                }
            }
        }
        
        loadData()
    }, [open, project.projectTypeId, project.projectStatusId, project.type, project.status])

    async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setLoading(true)
        const formData = new FormData(event.currentTarget)

        const result = await projectsAdapter.updateProject(project.id, formData)

        setLoading(false)
        if (result?.success) {
            onOpenChange(false)
            router.refresh()
        } else {
            alert(result?.error + ((result as { details?: string })?.details ? `: ${(result as { details?: string }).details}` : ""))
        }
    }

    // Format date for input field
    const formatDateForInput = (date: Date | null) => {
        if (!date) return ""
        const d = new Date(date)
        const year = d.getFullYear()
        const month = String(d.getMonth() + 1).padStart(2, "0")
        const day = String(d.getDate()).padStart(2, "0")
        return `${year}-${month}-${day}`
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Edit Project</DialogTitle>
                    <DialogDescription>
                        Update project details, timeline, and team structure.
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
                                defaultValue={project.name}
                                placeholder="E-commerce Platform"
                                required
                            />
                        </div>

                        {/* Project Type and Status */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="projectTypeId">Project Type *</Label>
                                <Select 
                                    name="projectTypeId" 
                                    required 
                                    value={selectedProjectTypeId}
                                    onValueChange={setSelectedProjectTypeId}
                                    disabled={loadingTypes}
                                >
                                    <SelectTrigger id="projectTypeId">
                                        <SelectValue placeholder={loadingTypes ? "Loading types..." : "Select project type"} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {projectTypes.length === 0 && !loadingTypes ? (
                                            <SelectItem value="" disabled>
                                                No project types available
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
                            <div className="grid gap-2">
                                <Label htmlFor="projectStatusId">Status *</Label>
                                <Select 
                                    name="projectStatusId" 
                                    required 
                                    value={selectedProjectStatusId}
                                    onValueChange={setSelectedProjectStatusId}
                                    disabled={loadingStatuses}
                                >
                                    <SelectTrigger id="projectStatusId">
                                        <SelectValue placeholder={loadingStatuses ? "Loading statuses..." : "Select status"} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {projectStatuses.length === 0 && !loadingStatuses ? (
                                            <SelectItem value="" disabled>
                                                No active project statuses available
                                            </SelectItem>
                                        ) : (
                                            projectStatuses.map((status) => (
                                                <SelectItem 
                                                    key={status.id} 
                                                    value={status.id.toString()}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <div
                                                            className="h-3 w-3 rounded-full"
                                                            style={{ backgroundColor: status.color }}
                                                        />
                                                        <span>{status.name}</span>
                                                        {status.isDefault && (
                                                            <span className="text-xs text-muted-foreground">(Default)</span>
                                                        )}
                                                    </div>
                                                </SelectItem>
                                            ))
                                        )}
                                    </SelectContent>
                                </Select>
                                {/* Keep legacy status field for backward compatibility */}
                                <input type="hidden" name="status" value="" />
                            </div>
                        </div>

                        {/* Description */}
                        <div className="grid gap-2">
                            <Label htmlFor="description">Description</Label>
                            <textarea
                                id="description"
                                name="description"
                                defaultValue={project.description || ""}
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
                                defaultValue={project.scope || ""}
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
                                    defaultValue={formatDateForInput(project.startDate)}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="endDate">Target End Date</Label>
                                <Input
                                    id="endDate"
                                    name="endDate"
                                    type="date"
                                    defaultValue={formatDateForInput(project.endDate)}
                                />
                            </div>
                        </div>

                        {/* Project Manager - Hidden for now */}
                        <input type="hidden" name="projectManagerId" value="" />
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Update Project
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}

