"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ProjectEditDialog } from "./project-edit-dialog"
import { ProjectDeleteDialog } from "./project-delete-dialog"
import { Edit, Trash2, MoreVertical, Settings } from "lucide-react"
import Link from "next/link"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface ProjectCardActionsProps {
    project: {
        id: number
        code: string
        name: string
        type: string
        description: string | null
        scope: string | null
        status: string
        startDate: Date | null
        endDate: Date | null
    }
    taskCount?: number
}

export function ProjectCardActions({ project, taskCount }: ProjectCardActionsProps) {
    const [editOpen, setEditOpen] = useState(false)
    const [deleteOpen, setDeleteOpen] = useState(false)

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                        }}
                    >
                        <MoreVertical className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenuItem
                        onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            setEditOpen(true)
                        }}
                    >
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                        <Link href={`/dashboard/projects/${project.id}/settings`}>
                            <Settings className="mr-2 h-4 w-4" />
                            Settings
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            setDeleteOpen(true)
                        }}
                        className="text-destructive"
                    >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <ProjectEditDialog
                project={project}
                open={editOpen}
                onOpenChange={setEditOpen}
            />
            <ProjectDeleteDialog
                project={{ ...project, taskCount }}
                open={deleteOpen}
                onOpenChange={setDeleteOpen}
            />
        </>
    )
}

