"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
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
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Plus, Edit, Trash2, GripVertical, Loader2 } from "lucide-react"
import {
    getProjectTypes,
    createProjectType,
    updateProjectType,
    deleteProjectType,
    toggleProjectTypeStatus,
    reorderProjectTypes,
} from "@/app/actions/project-types"
import { useToast } from "@/components/ui/use-toast"
import { useRouter } from "next/navigation"

interface ProjectType {
    id: number
    name: string
    description: string | null
    isActive: boolean
    displayOrder: number
    color: string | null
    icon: string | null
    createdAt: Date
    updatedAt: Date
    usageCount?: number
}

export function ProjectTypesPanel() {
    const [projectTypes, setProjectTypes] = useState<ProjectType[]>([])
    const [loading, setLoading] = useState(true)
    const [dialogOpen, setDialogOpen] = useState(false)
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [editingType, setEditingType] = useState<ProjectType | null>(null)
    const [deletingType, setDeletingType] = useState<ProjectType | null>(null)
    const [saving, setSaving] = useState(false)
    const [isActive, setIsActive] = useState(true)
    const { toast } = useToast()
    const router = useRouter()

    useEffect(() => {
        loadProjectTypes()
    }, [])

    const loadProjectTypes = async () => {
        setLoading(true)
        const result = await getProjectTypes(true, true) // Include inactive and usage count
        setLoading(false)

        if (result.success) {
            setProjectTypes(result.projectTypes || [])
        } else {
            toast({
                title: "Error",
                description: result.error || "Failed to load project types",
                variant: "destructive",
            })
        }
    }

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        e.stopPropagation()
        
        setSaving(true)

        try {
            const formData = new FormData(e.currentTarget)
            // Manually add isActive to FormData
            formData.set("isActive", isActive ? "true" : "false")
            
            // Debug: Log form data
            console.log("Form data:", {
                name: formData.get("name"),
                description: formData.get("description"),
                isActive: formData.get("isActive"),
                displayOrder: formData.get("displayOrder"),
                color: formData.get("color"),
                icon: formData.get("icon"),
            })
            
            const result = editingType
                ? await updateProjectType(editingType.id, formData)
                : await createProjectType(formData)

            console.log("Server result:", result)

            if (result.success) {
                toast({
                    title: "Success",
                    description: editingType
                        ? "Project type updated successfully"
                        : "Project type created successfully",
                })
                setDialogOpen(false)
                setEditingType(null)
                setIsActive(true) // Reset to default
                loadProjectTypes()
                router.refresh()
            } else {
                console.error("Error result:", result)
                const errorMessage = result.error || "Failed to save project type"
                const details = result.details ? `\n\nDetails: ${JSON.stringify(result.details)}` : ""
                toast({
                    title: "Error",
                    description: errorMessage + details,
                    variant: "destructive",
                })
            }
        } catch (error: any) {
            console.error("Exception in handleSubmit:", error)
            toast({
                title: "Error",
                description: error.message || "An unexpected error occurred",
                variant: "destructive",
            })
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async () => {
        if (!deletingType) return

        setSaving(true)
        const result = await deleteProjectType(deletingType.id)
        setSaving(false)

        if (result.success) {
            toast({
                title: "Success",
                description: "Project type deleted successfully",
            })
            setDeleteDialogOpen(false)
            setDeletingType(null)
            loadProjectTypes()
            router.refresh()
        } else {
            toast({
                title: "Error",
                description: result.error || "Failed to delete project type",
                variant: "destructive",
            })
        }
    }

    const handleToggleStatus = async (type: ProjectType) => {
        const result = await toggleProjectTypeStatus(type.id)
        if (result.success) {
            toast({
                title: "Success",
                description: `Project type ${type.isActive ? "deactivated" : "activated"}`,
            })
            loadProjectTypes()
            router.refresh()
        } else {
            toast({
                title: "Error",
                description: result.error || "Failed to toggle status",
                variant: "destructive",
            })
        }
    }

    const openEditDialog = (type: ProjectType) => {
        setEditingType(type)
        setIsActive(type.isActive)
        setDialogOpen(true)
    }

    const openDeleteDialog = (type: ProjectType) => {
        setDeletingType(type)
        setDeleteDialogOpen(true)
    }

    const openCreateDialog = () => {
        setEditingType(null)
        setIsActive(true) // Reset to default
        setDialogOpen(true)
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-medium">Project Types</h3>
                    <p className="text-sm text-muted-foreground">
                        Manage project types that can be assigned to projects
                    </p>
                </div>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={openCreateDialog}>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Project Type
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>
                                {editingType ? "Edit Project Type" : "Create Project Type"}
                            </DialogTitle>
                            <DialogDescription>
                                {editingType
                                    ? "Update the project type details"
                                    : "Add a new project type to the system"}
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleSubmit}>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Name *</Label>
                                    <Input
                                        id="name"
                                        name="name"
                                        defaultValue={editingType?.name || ""}
                                        required
                                        maxLength={100}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="description">Description</Label>
                                    <Textarea
                                        id="description"
                                        name="description"
                                        defaultValue={editingType?.description || ""}
                                        rows={3}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="color">Color (hex)</Label>
                                        <Input
                                            id="color"
                                            name="color"
                                            type="color"
                                            defaultValue={editingType?.color || "#3b82f6"}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="icon">Icon Name</Label>
                                        <Input
                                            id="icon"
                                            name="icon"
                                            defaultValue={editingType?.icon || ""}
                                            placeholder="e.g., Folder, Briefcase"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="displayOrder">Display Order</Label>
                                    <Input
                                        id="displayOrder"
                                        name="displayOrder"
                                        type="number"
                                        defaultValue={editingType?.displayOrder || 0}
                                        min={0}
                                    />
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Switch
                                        id="isActive"
                                        checked={isActive}
                                        onCheckedChange={setIsActive}
                                    />
                                    <Label htmlFor="isActive">Active</Label>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                        setDialogOpen(false)
                                        setEditingType(null)
                                        setIsActive(true)
                                    }}
                                    disabled={saving}
                                >
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={saving}>
                                    {saving ? (
                                        <>
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            Saving...
                                        </>
                                    ) : editingType ? (
                                        "Update"
                                    ) : (
                                        "Create"
                                    )}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="border rounded-lg">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-12"></TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Order</TableHead>
                            <TableHead>Usage</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {projectTypes.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                    No project types found. Create one to get started.
                                </TableCell>
                            </TableRow>
                        ) : (
                            projectTypes.map((type) => (
                                <TableRow key={type.id}>
                                    <TableCell>
                                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            {type.color && (
                                                <div
                                                    className="h-4 w-4 rounded"
                                                    style={{ backgroundColor: type.color }}
                                                />
                                            )}
                                            <span className="font-medium">{type.name}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="max-w-md truncate">
                                        {type.description || "-"}
                                    </TableCell>
                                    <TableCell>{type.displayOrder}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline">
                                            {type.usageCount || 0} project{type.usageCount !== 1 ? "s" : ""}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={type.isActive ? "default" : "secondary"}>
                                            {type.isActive ? "Active" : "Inactive"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <Switch
                                                checked={type.isActive}
                                                onCheckedChange={() => handleToggleStatus(type)}
                                            />
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => openEditDialog(type)}
                                            >
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => openDeleteDialog(type)}
                                            >
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Project Type</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete "{deletingType?.name}"? This action
                            cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            disabled={saving}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {saving ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Deleting...
                                </>
                            ) : (
                                "Delete"
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}

