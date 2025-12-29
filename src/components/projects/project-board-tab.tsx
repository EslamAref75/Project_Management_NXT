"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import Link from "next/link"
import dynamic from "next/dynamic"

// Dynamically import the Kanban board to avoid SSR issues
const ProjectKanbanBoard = dynamic(
    () => import("./project-kanban-board").then(mod => ({ default: mod.ProjectKanbanBoard })),
    { ssr: false }
)

interface ProjectBoardTabProps {
    project: any
    users: any[]
}

export function ProjectBoardTab({ project, users }: ProjectBoardTabProps) {
    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Kanban Board</CardTitle>
                        <CardDescription>
                            Drag and drop tasks to update their status
                        </CardDescription>
                    </div>
                    <Button asChild>
                        <Link href={`/dashboard/projects/${project.id}/tasks/new`}>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Task
                        </Link>
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <ProjectKanbanBoard project={project} users={users} />
            </CardContent>
        </Card>
    )
}

