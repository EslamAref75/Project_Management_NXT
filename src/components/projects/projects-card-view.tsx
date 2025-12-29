"use client"

import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { format, formatDistanceToNow } from "date-fns"
import { Folder, Calendar, Users, MoreVertical, Edit, Trash2, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
import { useState } from "react"
import { useSession } from "next-auth/react"
import { deleteProject } from "@/app/actions/projects"
import { useRouter } from "next/navigation"
import { ProjectEditDialog } from "./project-edit-dialog"
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination"

interface ProjectsCardViewProps {
    projects: any[]
    total: number
    page: number
    limit: number
    onPageChange: (page: number) => void
    onProjectDeleted?: () => void
}

export function ProjectsCardView({
    projects,
    total,
    page,
    limit,
    onPageChange,
    onProjectDeleted,
}: ProjectsCardViewProps) {
    const totalPages = Math.ceil(total / limit)
    const { data: session } = useSession()
    const router = useRouter()

    const calculateProgress = (project: any) => {
        const tasks = project.tasks || []
        if (tasks.length === 0) return 0
        const completed = tasks.filter((t: any) => t.status === "completed").length
        return Math.round((completed / tasks.length) * 100)
    }

    if (projects.length === 0) {
        return (
            <div className="flex min-h-[400px] flex-col items-center justify-center rounded-md border border-dashed p-8 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent">
                    <Folder className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="mt-4 text-lg font-semibold">No projects found</h3>
                <p className="mb-4 mt-2 text-sm text-muted-foreground max-w-sm">
                    Try adjusting your filters or create a new project.
                </p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {projects.map((project) => {
                    const progress = calculateProgress(project)
                    const statusColors: Record<string, string> = {
                        active: "bg-green-100 text-green-800",
                        completed: "bg-blue-100 text-blue-800",
                        on_hold: "bg-yellow-100 text-yellow-800",
                        planned: "bg-gray-100 text-gray-800",
                        cancelled: "bg-red-100 text-red-800",
                    }

                    const userId = session?.user?.id ? parseInt(session.user.id) : 0
                    const userRole = session?.user?.role || "developer"
                    const isAdmin = userRole === "admin"
                    const isCreator = project.createdById === userId
                    const canEdit = isAdmin || isCreator
                    const canDelete = isAdmin || isCreator

                    return (
                        <ProjectCard
                            key={project.id}
                            project={project}
                            progress={progress}
                            statusColors={statusColors}
                            canEdit={canEdit}
                            canDelete={canDelete}
                            onDeleted={onProjectDeleted}
                        />
                    )
                })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <Pagination>
                    <PaginationContent>
                        <PaginationItem>
                            <PaginationPrevious
                                onClick={() => page > 1 && onPageChange(page - 1)}
                                className={page === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                            />
                        </PaginationItem>
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                            <PaginationItem key={p}>
                                <PaginationLink
                                    onClick={() => onPageChange(p)}
                                    isActive={p === page}
                                    className="cursor-pointer"
                                >
                                    {p}
                                </PaginationLink>
                            </PaginationItem>
                        ))}
                        <PaginationItem>
                            <PaginationNext
                                onClick={() => page < totalPages && onPageChange(page + 1)}
                                className={
                                    page === totalPages
                                        ? "pointer-events-none opacity-50"
                                        : "cursor-pointer"
                                }
                            />
                        </PaginationItem>
                    </PaginationContent>
                </Pagination>
            )}
        </div>
    )
}

interface ProjectCardProps {
    project: any
    progress: number
    statusColors: Record<string, string>
    canEdit: boolean
    canDelete: boolean
    onDeleted?: () => void
}

function ProjectCard({ project, progress, statusColors, canEdit, canDelete, onDeleted }: ProjectCardProps) {
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [editDialogOpen, setEditDialogOpen] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const router = useRouter()

    const handleDelete = async () => {
        setDeleting(true)
        const result = await deleteProject(project.id)
        setDeleting(false)
        setDeleteDialogOpen(false)

        if (result.success) {
            // Call the callback to refetch projects
            if (onDeleted) {
                onDeleted()
            }
            router.refresh()
        } else {
            alert(result.error || "Failed to delete project")
        }
    }

    return (
        <>
            <Card className="transition-shadow hover:shadow-md h-full relative group">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <Link href={`/dashboard/projects/${project.id}`} className="flex-1">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2 mb-1">
                                <Badge
                                    variant="secondary"
                                    className="text-xs capitalize"
                                >
                                    {project.type}
                                </Badge>
                                {project.priority === "urgent" && (
                                    <Badge variant="destructive" className="text-xs animate-pulse">
                                        🚨 URGENT
                                    </Badge>
                                )}
                                {project.priority === "high" && (
                                    <Badge variant="outline" className="text-xs border-orange-500 text-orange-700">
                                        High
                                    </Badge>
                                )}
                            </div>
                            <CardTitle className="text-xl font-semibold line-clamp-1">
                                {project.name}
                            </CardTitle>
                        </div>
                    </Link>
                    <div className="flex items-center gap-2">
                        <Badge
                            className={cn(
                                "text-xs",
                                statusColors[project.status] ||
                                    "bg-gray-100 text-gray-800"
                            )}
                        >
                            {project.status.replace("_", " ")}
                        </Badge>
                        {(canEdit || canDelete) && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={(e) => {
                                            e.preventDefault()
                                            e.stopPropagation()
                                        }}
                                    >
                                        <MoreVertical className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                                    {canEdit && (
                                        <DropdownMenuItem
                                            onClick={(e) => {
                                                e.preventDefault()
                                                e.stopPropagation()
                                                setEditDialogOpen(true)
                                            }}
                                        >
                                            <Edit className="h-4 w-4 mr-2" />
                                            Edit Project
                                        </DropdownMenuItem>
                                    )}
                                    {canDelete && (
                                        <>
                                            {canEdit && <DropdownMenuSeparator />}
                                            <DropdownMenuItem
                                                onClick={(e) => {
                                                    e.preventDefault()
                                                    e.stopPropagation()
                                                    setDeleteDialogOpen(true)
                                                }}
                                                className="text-red-600 focus:text-red-600"
                                            >
                                                <Trash2 className="h-4 w-4 mr-2" />
                                                Delete Project
                                            </DropdownMenuItem>
                                        </>
                                    )}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    </div>
                </CardHeader>
                <Link href={`/dashboard/projects/${project.id}`}>
                    <CardContent className="space-y-4">
                        <CardDescription className="line-clamp-2 min-h-[40px]">
                            {project.description || "No description provided."}
                        </CardDescription>

                        {/* Progress Bar */}
                        {project.tasks && project.tasks.length > 0 && (
                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-muted-foreground">Progress</span>
                                    <span className="font-medium">{progress}%</span>
                                </div>
                                <Progress value={progress} className="h-2" />
                            </div>
                        )}

                        {/* Dates */}
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            {project.startDate && (
                                <div className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    <span>
                                        {format(new Date(project.startDate), "MMM d, yyyy")}
                                    </span>
                                </div>
                            )}
                            {project.endDate && project.startDate && (
                                <span>→</span>
                            )}
                            {project.endDate && (
                                <div className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    <span>
                                        {format(new Date(project.endDate), "MMM d, yyyy")}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Stats */}
                        <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-1 text-muted-foreground">
                                <Folder className="h-3 w-3" />
                                <span>{project.tasks?.length || 0} tasks</span>
                            </div>
                            {project.projectManager && (
                                <div className="flex items-center gap-2">
                                    <Users className="h-3 w-3 text-muted-foreground" />
                                    <span className="text-xs text-muted-foreground">
                                        {project.projectManager.username}
                                    </span>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Link>
            </Card>

            {/* Edit Dialog */}
            {canEdit && (
                <ProjectEditDialog
                    project={{
                        id: project.id,
                        name: project.name,
                        type: project.type,
                        projectTypeId: project.projectTypeId || null,
                        projectStatusId: project.projectStatusId || null,
                        description: project.description || null,
                        scope: project.scope || null,
                        status: project.status,
                        startDate: project.startDate ? new Date(project.startDate) : null,
                        endDate: project.endDate ? new Date(project.endDate) : null,
                    }}
                    open={editDialogOpen}
                    onOpenChange={setEditDialogOpen}
                />
            )}

            {/* Delete Confirmation Dialog */}
            {canDelete && (
                <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle className="flex items-center gap-2">
                                <AlertTriangle className="h-5 w-5 text-red-600" />
                                Delete Project
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                                Are you sure you want to delete <strong>{project.name}</strong>?
                                <br />
                                <br />
                                This action cannot be undone. All tasks, dependencies, and related data will be permanently deleted.
                                {project.tasks && project.tasks.length > 0 && (
                                    <span className="block mt-2 text-red-600 font-medium">
                                        This project has {project.tasks.length} task(s) that will also be deleted.
                                    </span>
                                )}
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={handleDelete}
                                disabled={deleting}
                                className="bg-red-600 hover:bg-red-700"
                            >
                                {deleting ? "Deleting..." : "Delete Project"}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}
        </>
    )
}

