"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { 
    Edit, 
    Plus, 
    FileText, 
    Bell,
    MoreVertical,
    Calendar,
    Users,
    AlertTriangle,
    CheckCircle2
} from "lucide-react"
import { format } from "date-fns"
import Link from "next/link"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ProjectEditDialog } from "./project-edit-dialog"
import { ProjectNotificationBell } from "@/components/project-notifications/project-notification-bell"
import { MarkUrgentDialog } from "./mark-urgent-dialog"
import { RemoveUrgentDialog } from "./remove-urgent-dialog"
import { useState } from "react"

interface ProjectHeaderProps {
    project: any
    stats: {
        total: number
        totalComp: number
        percentage: number
    }
    canEdit: boolean
}

export function ProjectHeader({ project, stats, canEdit, canMarkUrgent = false }: ProjectHeaderProps) {
    const [editDialogOpen, setEditDialogOpen] = useState(false)

    const statusColors: Record<string, string> = {
        planned: "bg-gray-100 text-gray-800",
        active: "bg-green-100 text-green-800",
        on_hold: "bg-yellow-100 text-yellow-800",
        completed: "bg-blue-100 text-blue-800",
        cancelled: "bg-red-100 text-red-800",
    }

    return (
        <div className="border-b pb-4 pt-4 space-y-4">
            {/* Top Row: Project Name, Code, Status */}
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                        <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
                        <Badge className={statusColors[project.status] || "bg-gray-100 text-gray-800"}>
                            {project.status}
                        </Badge>
                        {project.priority === "urgent" && (
                            <Badge variant="destructive" className="animate-pulse">
                                🚨 URGENT
                            </Badge>
                        )}
                        {project.priority === "high" && (
                            <Badge variant="outline" className="border-orange-500 text-orange-700">
                                High Priority
                            </Badge>
                        )}
                    </div>
                    {project.description && (
                        <p className="text-muted-foreground max-w-3xl">
                            {project.description}
                        </p>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <ProjectNotificationBell projectId={project.id} />
                    {canEdit && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditDialogOpen(true)}
                        >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                        </Button>
                    )}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="icon">
                                <MoreVertical className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                                <Link href={`/dashboard/projects/${project.id}/tasks/new`}>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add Task
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                                <Link href={`/dashboard/projects/${project.id}/activity`}>
                                    <FileText className="h-4 w-4 mr-2" />
                                    View Activity
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {canMarkUrgent && project.priority !== "urgent" && (
                                <DropdownMenuItem asChild>
                                    <MarkUrgentDialog projectId={project.id} projectName={project.name}>
                                        <div className="flex items-center w-full">
                                            <AlertTriangle className="h-4 w-4 mr-2" />
                                            Make Urgent
                                        </div>
                                    </MarkUrgentDialog>
                                </DropdownMenuItem>
                            )}
                            {canMarkUrgent && project.priority === "urgent" && (
                                <DropdownMenuItem asChild>
                                    <RemoveUrgentDialog projectId={project.id} projectName={project.name}>
                                        <div className="flex items-center w-full">
                                            <CheckCircle2 className="h-4 w-4 mr-2" />
                                            Remove Urgent
                                        </div>
                                    </RemoveUrgentDialog>
                                </DropdownMenuItem>
                            )}
                            <DropdownMenuItem disabled>
                                Archive Project
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {/* Progress Bar */}
            {stats.total > 0 && (
                <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-medium">{stats.percentage}%</span>
                    </div>
                    <Progress value={stats.percentage} className="h-2" />
                </div>
            )}

            {/* Info Row: Dates, Team, Manager */}
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
                {project.startDate && (
                    <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>
                            {format(new Date(project.startDate), "MMM d, yyyy")}
                            {project.endDate && ` - ${format(new Date(project.endDate), "MMM d, yyyy")}`}
                        </span>
                    </div>
                )}
                {project.projectManager && (
                    <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        <span>PM: {project.projectManager.username}</span>
                    </div>
                )}
                <div className="flex items-center gap-2">
                    <span>{stats.total} tasks</span>
                    <span>•</span>
                    <span>{stats.totalComp} completed</span>
                </div>
            </div>

            {canEdit && (
                <ProjectEditDialog
                    project={{
                        id: project.id,
                        name: project.name,
                        type: project.type,
                        projectTypeId: project.projectTypeId || null,
                        projectStatusId: project.projectStatusId || null,
                        description: project.description || "",
                        scope: project.scope || "",
                        status: project.status,
                        startDate: project.startDate,
                        endDate: project.endDate,
                    }}
                    open={editDialogOpen}
                    onOpenChange={setEditDialogOpen}
                />
            )}
        </div>
    )
}

