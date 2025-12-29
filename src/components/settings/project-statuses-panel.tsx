"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
    getProjectStatuses,
    createProjectStatus,
    updateProjectStatus,
    deleteProjectStatus,
    toggleProjectStatusActive,
    reorderProjectStatuses,
} from "@/app/actions/project-statuses"
import { useToast } from "@/components/ui/use-toast"
import { useRouter } from "next/navigation"

interface ProjectStatus {
    id: number
    name: string
    color: string
    isDefault: boolean
    isFinal: boolean
    orderIndex: number
    isActive: boolean
    createdAt: Date
    updatedAt: Date
}

export function ProjectStatusesPanel() {
    const [projectStatuses, setProjectStatuses] = useState<ProjectStatus[]>([])
    const [loading, setLoading] = useState(true)
    const [dialogOpen, setDialogOpen] = useState(false)
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [editStatus, setEditStatus] = useState<ProjectStatus | null>(null)
    const [deleteStatus, setDeleteStatus] = useState<ProjectStatus | null>(null)
    const [saving, setSaving] = useState(false)
    const [isDefault, setIsDefault] = useState(false)
    const [isFinal, setIsFinal] = useState(false)
    const [isActive, setIsActive] = useState(true)
    const { toast } = useToast()
    const router = useRouter()

    useEffect(() => {
        loadProjectStatuses()
    }, [])

    const loadProjectStatuses = async () => {
        setLoading(true)
        const result = await getProjectStatuses(true) // Include inactive
        setLoading(false)

        if (result.success) {
            setProjectStatuses(result.projectStatuses || [])
        } else {
            toast({
                title: "Error",
                description: result.error || "Failed to load project statuses",
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
            formData.set("isDefault", isDefault ? "true" : "false")
            formData.set("isFinal", isFinal ? "true" : "false")
            formData.set("isActive", isActive ? "true" : "false")
            
            // Debug: Log form data
            console.log("Form data:", {
                name: formData.get("name"),
                color: formData.get("color"),
                isDefault: formData.get("isDefault"),
                isFinal: formData.get("isFinal"),
                orderIndex: formData.get("orderIndex"),
                isActive: formData.get("isActive"),
            })
            
            const result = editStatus
                ? await updateProjectStatus(editStatus.id, formData)
                : await createProjectStatus(formData)

            console.log("Server result:", result)

            if (result.success) {
                toast({
                    title: "Success",
                    description: editStatus
                        ? "Project status updated successfully"
                        : "Project status created successfully",
                })
                setDialogOpen(false)
                setEditStatus(null)
                setIsDefault(false)
                setIsFinal(false)
                setIsActive(true)
                loadProjectStatuses()
                router.refresh()
            } else {
                const errorMessage = result.error || "Failed to save project status"
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
        if (!deleteStatus) return

        setSaving(true)
        const result = await deleteProjectStatus(deleteStatus.id)
        setSaving(false)

        if (result.success) {
            toast({
                title: "Success",
                description: "Project status deleted successfully",
            })
            setDeleteDialogOpen(false)
            setDeleteStatus(null)
            loadProjectStatuses()
            router.refresh()
        } else {
            toast({
                title: "Error",
                description: result.error || "Failed to delete project status",
                variant: "destructive",
            })
        }
    }

    const handleToggleStatus = async (status: ProjectStatus) => {
        const result = await toggleProjectStatusActive(status.id)
        if (result.success) {
            toast({
                title: "Success",
                description: `Project status ${status.isActive ? "deactivated" : "activated"}`,
            })
            loadProjectStatuses()
            router.refresh()
        } else {
            toast({
                title: "Error",
                description: result.error || "Failed to toggle status",
                variant: "destructive",
            })
        }
    }

    const openEditDialog = (status: ProjectStatus) => {
        setEditStatus(status)
        setIsDefault(status.isDefault)
        setIsFinal(status.isFinal)
        setIsActive(status.isActive)
        setDialogOpen(true)
        // Sync color inputs after dialog opens
        setTimeout(() => {
            const colorValue = status.color || "#6b7280"
            const colorPicker = document.getElementById("colorPicker") as HTMLInputElement
            const colorText = document.getElementById("colorText") as HTMLInputElement
            const colorHidden = document.getElementById("color") as HTMLInputElement
            if (colorPicker) colorPicker.value = colorValue
            if (colorText) colorText.value = colorValue
            if (colorHidden) colorHidden.value = colorValue
        }, 100)
    }

    const openDeleteDialog = (status: ProjectStatus) => {
        setDeleteStatus(status)
        setDeleteDialogOpen(true)
    }

    const openCreateDialog = () => {
        setEditStatus(null)
        setIsDefault(false)
        setIsFinal(false)
        setIsActive(true)
        setDialogOpen(true)
        // Sync color inputs after dialog opens
        setTimeout(() => {
            const colorValue = "#6b7280"
            const colorPicker = document.getElementById("colorPicker") as HTMLInputElement
            const colorText = document.getElementById("colorText") as HTMLInputElement
            const colorHidden = document.getElementById("color") as HTMLInputElement
            if (colorPicker) colorPicker.value = colorValue
            if (colorText) colorText.value = colorValue
            if (colorHidden) colorHidden.value = colorValue
        }, 100)
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
                    <h3 className="text-lg font-medium">Project Statuses</h3>
                    <p className="text-sm text-muted-foreground">
                        Manage project lifecycle states. Define workflow order and final states.
                    </p>
                </div>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={openCreateDialog}>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Project Status
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>
                                {editStatus ? "Edit Project Status" : "Create Project Status"}
                            </DialogTitle>
                            <DialogDescription>
                                {editStatus
                                    ? "Update the project status details"
                                    : "Add a new project status to the system"}
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleSubmit}>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Status Name *</Label>
                                    <Input
                                        id="name"
                                        name="name"
                                        defaultValue={editStatus?.name || ""}
                                        required
                                        maxLength={100}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="color">Color *</Label>
                                    <div className="flex items-center gap-4">
                                        <Input
                                            id="colorPicker"
                                            type="color"
                                            defaultValue={editStatus?.color || "#6b7280"}
                                            className="w-20 h-10"
                                            onChange={(e) => {
                                                const textInput = document.getElementById("colorText") as HTMLInputElement
                                                const hiddenInput = document.getElementById("color") as HTMLInputElement
                                                if (textInput) {
                                                    textInput.value = e.target.value
                                                }
                                                if (hiddenInput) {
                                                    hiddenInput.value = e.target.value
                                                }
                                            }}
                                        />
                                        <Input
                                            id="colorText"
                                            type="text"
                                            defaultValue={editStatus?.color || "#6b7280"}
                                            placeholder="#6b7280"
                                            pattern="^#[0-9A-Fa-f]{6}$"
                                            className="flex-1"
                                            onChange={(e) => {
                                                const colorInput = document.getElementById("colorPicker") as HTMLInputElement
                                                const hiddenInput = document.getElementById("color") as HTMLInputElement
                                                if (colorInput && /^#[0-9A-Fa-f]{6}$/.test(e.target.value)) {
                                                    colorInput.value = e.target.value
                                                }
                                                if (hiddenInput) {
                                                    hiddenInput.value = e.target.value
                                                }
                                            }}
                                        />
                                        <input
                                            id="color"
                                            name="color"
                                            type="hidden"
                                            defaultValue={editStatus?.color || "#6b7280"}
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="orderIndex">Order Index</Label>
                                        <Input
                                            id="orderIndex"
                                            name="orderIndex"
                                            type="number"
                                            defaultValue={editStatus?.orderIndex || 0}
                                            min={0}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    {/* Hidden inputs to ensure values are in form data */}
                                    <input type="hidden" name="isDefault" value={isDefault ? "true" : "false"} />
                                    <input type="hidden" name="isFinal" value={isFinal ? "true" : "false"} />
                                    <input type="hidden" name="isActive" value={isActive ? "true" : "false"} />
                                    
                                    <div className="flex items-center space-x-2">
                                        <Switch
                                            id="isDefault"
                                            checked={isDefault}
                                            onCheckedChange={setIsDefault}
                                        />
                                        <Label htmlFor="isDefault">Default Status</Label>
                                    </div>
                                    <p className="text-xs text-muted-foreground ml-8">
                                        Only one status can be the default. Setting this will unset others.
                                    </p>
                                    <div className="flex items-center space-x-2">
                                        <Switch
                                            id="isFinal"
                                            checked={isFinal}
                                            onCheckedChange={setIsFinal}
                                        />
                                        <Label htmlFor="isFinal">Final Status</Label>
                                    </div>
                                    <p className="text-xs text-muted-foreground ml-8">
                                        Final statuses prevent projects from moving to other statuses.
                                    </p>
                                    <div className="flex items-center space-x-2">
                                        <Switch
                                            id="isActive"
                                            checked={isActive}
                                            onCheckedChange={setIsActive}
                                        />
                                        <Label htmlFor="isActive">Active</Label>
                                    </div>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                        setDialogOpen(false)
                                        setEditStatus(null)
                                        setIsDefault(false)
                                        setIsFinal(false)
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
                                    ) : editStatus ? (
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
                            <TableHead>Color</TableHead>
                            <TableHead>Order</TableHead>
                            <TableHead>Default</TableHead>
                            <TableHead>Final</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {projectStatuses.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                                    No project statuses found. Create one to get started.
                                </TableCell>
                            </TableRow>
                        ) : (
                            projectStatuses.map((status) => (
                                <TableRow key={status.id}>
                                    <TableCell>
                                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <div
                                                className="h-4 w-4 rounded"
                                                style={{ backgroundColor: status.color }}
                                            />
                                            <span className="font-medium">{status.name}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <div
                                                className="h-4 w-4 rounded"
                                                style={{ backgroundColor: status.color }}
                                            />
                                            <span className="text-xs text-muted-foreground">{status.color}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>{status.orderIndex}</TableCell>
                                    <TableCell>
                                        {status.isDefault ? (
                                            <Badge variant="default">Default</Badge>
                                        ) : (
                                            <span className="text-muted-foreground">-</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {status.isFinal ? (
                                            <Badge variant="secondary">Final</Badge>
                                        ) : (
                                            <span className="text-muted-foreground">-</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={status.isActive ? "default" : "secondary"}>
                                            {status.isActive ? "Active" : "Inactive"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <Switch
                                                checked={status.isActive}
                                                onCheckedChange={() => handleToggleStatus(status)}
                                            />
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => openEditDialog(status)}
                                            >
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => openDeleteDialog(status)}
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
                        <AlertDialogTitle>Delete Project Status</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete "{deleteStatus?.name}"? This action
                            cannot be undone. If any projects are using this status, you must
                            deactivate it instead of deleting.
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

