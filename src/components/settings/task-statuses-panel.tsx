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
    getTaskStatuses,
    createTaskStatus,
    updateTaskStatus,
    deleteTaskStatus,
    toggleTaskStatusActive,
    reorderTaskStatuses,
} from "@/app/actions/task-statuses"
import { useToast } from "@/components/ui/use-toast"
import { useRouter } from "next/navigation"

interface TaskStatus {
    id: number
    name: string
    color: string
    isDefault: boolean
    isFinal: boolean
    isBlocking: boolean
    orderIndex: number
    isActive: boolean
    createdAt: Date
    updatedAt: Date
}

export function TaskStatusesPanel() {
    const [taskStatuses, setTaskStatuses] = useState<TaskStatus[]>([])
    const [loading, setLoading] = useState(true)
    const [dialogOpen, setDialogOpen] = useState(false)
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [editStatus, setEditStatus] = useState<TaskStatus | null>(null)
    const [deleteStatus, setDeleteStatus] = useState<TaskStatus | null>(null)
    const [saving, setSaving] = useState(false)
    const [isDefault, setIsDefault] = useState(false)
    const [isFinal, setIsFinal] = useState(false)
    const [isBlocking, setIsBlocking] = useState(false)
    const [isActive, setIsActive] = useState(true)
    const { toast } = useToast()
    const router = useRouter()

    useEffect(() => {
        loadTaskStatuses()
    }, [])

    const loadTaskStatuses = async () => {
        setLoading(true)
        const result = await getTaskStatuses(true) // Include inactive
        setLoading(false)

        if (result.success) {
            setTaskStatuses(result.taskStatuses || [])
        } else {
            toast({
                title: "Error",
                description: result.error || "Failed to load task statuses",
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
            formData.set("isBlocking", isBlocking ? "true" : "false")
            formData.set("isActive", isActive ? "true" : "false")
            
            const result = editStatus
                ? await updateTaskStatus(editStatus.id, formData)
                : await createTaskStatus(formData)

            if (result.success) {
                toast({
                    title: "Success",
                    description: editStatus
                        ? "Task status updated successfully"
                        : "Task status created successfully",
                })
                setDialogOpen(false)
                setEditStatus(null)
                setIsDefault(false)
                setIsFinal(false)
                setIsBlocking(false)
                setIsActive(true)
                loadTaskStatuses()
                router.refresh()
            } else {
                const errorMessage = result.error || "Failed to save task status"
                const details = result.details ? `\n\nDetails: ${JSON.stringify(result.details)}` : ""
                toast({
                    title: "Error",
                    description: errorMessage + details,
                    variant: "destructive",
                })
            }
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "An unexpected error occurred",
                variant: "destructive",
            })
        } finally {
            setSaving(false)
        }
    }

    const handleEdit = (status: TaskStatus) => {
        setEditStatus(status)
        setIsDefault(status.isDefault)
        setIsFinal(status.isFinal)
        setIsBlocking(status.isBlocking)
        setIsActive(status.isActive)
        setDialogOpen(true)
    }

    const handleDelete = (status: TaskStatus) => {
        setDeleteStatus(status)
        setDeleteDialogOpen(true)
    }

    const confirmDelete = async () => {
        if (!deleteStatus) return

        const result = await deleteTaskStatus(deleteStatus.id)

        if (result.success) {
            toast({
                title: "Success",
                description: "Task status deleted successfully",
            })
            loadTaskStatuses()
            router.refresh()
        } else {
            toast({
                title: "Error",
                description: result.error || "Failed to delete task status",
                variant: "destructive",
            })
        }

        setDeleteDialogOpen(false)
        setDeleteStatus(null)
    }

    const handleToggleActive = async (status: TaskStatus) => {
        const result = await toggleTaskStatusActive(status.id)

        if (result.success) {
            toast({
                title: "Success",
                description: `Task status ${result.taskStatus?.isActive ? "activated" : "deactivated"}`,
            })
            loadTaskStatuses()
            router.refresh()
        } else {
            toast({
                title: "Error",
                description: result.error || "Failed to toggle task status",
                variant: "destructive",
            })
        }
    }

    const handleNewStatus = () => {
        setEditStatus(null)
        setIsDefault(false)
        setIsFinal(false)
        setIsBlocking(false)
        setIsActive(true)
        setDialogOpen(true)
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold">Task Statuses</h3>
                    <p className="text-sm text-muted-foreground">
                        Manage task workflow statuses. Define which statuses are final, blocking, or default.
                    </p>
                </div>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={handleNewStatus}>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Status
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>
                                {editStatus ? "Edit Task Status" : "Create Task Status"}
                            </DialogTitle>
                            <DialogDescription>
                                {editStatus
                                    ? "Update the task status details."
                                    : "Add a new task status to the system."}
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleSubmit}>
                            <div className="space-y-4 py-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="name">Status Name *</Label>
                                    <Input
                                        id="name"
                                        name="name"
                                        defaultValue={editStatus?.name || ""}
                                        placeholder="e.g., In Progress"
                                        required
                                    />
                                </div>
                                <div className="grid gap-2">
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
                                    <input type="hidden" name="isBlocking" value={isBlocking ? "true" : "false"} />
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
                                        Tasks in final status cannot be edited.
                                    </p>
                                    <div className="flex items-center space-x-2">
                                        <Switch
                                            id="isBlocking"
                                            checked={isBlocking}
                                            onCheckedChange={setIsBlocking}
                                        />
                                        <Label htmlFor="isBlocking">Blocking Status</Label>
                                    </div>
                                    <p className="text-xs text-muted-foreground ml-8">
                                        Tasks in blocking status prevent dependent tasks from starting.
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
                                        setIsBlocking(false)
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
                            <TableHead>Blocking</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {taskStatuses.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                                    No task statuses found. Create one to get started.
                                </TableCell>
                            </TableRow>
                        ) : (
                            taskStatuses
                                .sort((a, b) => a.orderIndex - b.orderIndex)
                                .map((status) => (
                                    <TableRow key={status.id}>
                                        <TableCell>
                                            <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                                        </TableCell>
                                        <TableCell className="font-medium">{status.name}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <div
                                                    className="h-4 w-4 rounded-full border"
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
                                            {status.isBlocking ? (
                                                <Badge variant="destructive">Blocking</Badge>
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
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleEdit(status)}
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleToggleActive(status)}
                                                >
                                                    {status.isActive ? "Deactivate" : "Activate"}
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleDelete(status)}
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
                        <AlertDialogTitle>Delete Task Status</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete "{deleteStatus?.name}"? This action cannot be undone.
                            {deleteStatus && (
                                <span className="block mt-2 text-sm text-muted-foreground">
                                    Note: Statuses assigned to existing tasks cannot be deleted. Deactivate them instead.
                                </span>
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}

