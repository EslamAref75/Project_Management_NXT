"use client"

import Link from "next/link"
import { useState } from "react"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { format } from "date-fns"
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination"
import { cn } from "@/lib/utils"

type SortField = "name" | "status" | "progress" | "startDate" | "endDate"
type SortDirection = "asc" | "desc"

interface ProjectsTableViewProps {
    projects: any[]
    total: number
    page: number
    limit: number
    onPageChange: (page: number) => void
    users: any[]
    onProjectDeleted?: () => void
}

export function ProjectsTableView({
    projects,
    total,
    page,
    limit,
    onPageChange,
    users,
}: ProjectsTableViewProps) {
    const [sortField, setSortField] = useState<SortField | null>(null)
    const [sortDirection, setSortDirection] = useState<SortDirection>("asc")

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDirection(sortDirection === "asc" ? "desc" : "asc")
        } else {
            setSortField(field)
            setSortDirection("asc")
        }
    }

    const sortedProjects = [...projects].sort((a, b) => {
        if (!sortField) return 0

        let aValue: any
        let bValue: any

        switch (sortField) {
            case "name":
                aValue = a.name.toLowerCase()
                bValue = b.name.toLowerCase()
                break
            case "status":
                aValue = a.status
                bValue = b.status
                break
            case "progress":
                const aTasks = a.tasks || []
                const bTasks = b.tasks || []
                aValue =
                    aTasks.length > 0
                        ? aTasks.filter((t: any) => t.status === "completed").length /
                        aTasks.length
                        : 0
                bValue =
                    bTasks.length > 0
                        ? bTasks.filter((t: any) => t.status === "completed").length /
                        bTasks.length
                        : 0
                break
            case "startDate":
                aValue = a.startDate ? new Date(a.startDate).getTime() : 0
                bValue = b.startDate ? new Date(b.startDate).getTime() : 0
                break
            case "endDate":
                aValue = a.endDate ? new Date(a.endDate).getTime() : 0
                bValue = b.endDate ? new Date(b.endDate).getTime() : 0
                break
            default:
                return 0
        }

        if (aValue < bValue) return sortDirection === "asc" ? -1 : 1
        if (aValue > bValue) return sortDirection === "asc" ? 1 : -1
        return 0
    })

    const calculateProgress = (project: any) => {
        const tasks = project.tasks || []
        if (tasks.length === 0) return 0
        const completed = tasks.filter((t: any) => t.status === "completed").length
        return Math.round((completed / tasks.length) * 100)
    }

    const totalPages = Math.ceil(total / limit)

    const SortButton = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
        <Button
            variant="ghost"
            size="sm"
            className="h-8 data-[state=open]:bg-accent"
            onClick={() => handleSort(field)}
        >
            {children}
            {sortField === field ? (
                sortDirection === "asc" ? (
                    <ArrowUp className="ml-2 h-4 w-4" />
                ) : (
                    <ArrowDown className="ml-2 h-4 w-4" />
                )
            ) : (
                <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />
            )}
        </Button>
    )

    if (projects.length === 0) {
        return (
            <div className="flex min-h-[400px] flex-col items-center justify-center rounded-md border border-dashed p-8 text-center">
                <h3 className="mt-4 text-lg font-semibold">No projects found</h3>
                <p className="mb-4 mt-2 text-sm text-muted-foreground max-w-sm">
                    Try adjusting your filters or create a new project.
                </p>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>
                                <SortButton field="name">Project Name</SortButton>
                            </TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>
                                <SortButton field="status">Status</SortButton>
                            </TableHead>
                            <TableHead>
                                <SortButton field="progress">Progress</SortButton>
                            </TableHead>
                            <TableHead>
                                <SortButton field="startDate">Start Date</SortButton>
                            </TableHead>
                            <TableHead>
                                <SortButton field="endDate">End Date</SortButton>
                            </TableHead>
                            <TableHead>Project Manager</TableHead>
                            <TableHead>Tasks</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {sortedProjects.map((project) => {
                            const progress = calculateProgress(project)
                            const statusColors: Record<string, string> = {
                                active: "bg-green-100 text-green-800",
                                completed: "bg-blue-100 text-blue-800",
                                on_hold: "bg-yellow-100 text-yellow-800",
                                planned: "bg-gray-100 text-gray-800",
                                cancelled: "bg-red-100 text-red-800",
                            }

                            return (
                                <TableRow
                                    key={project.id}
                                    className="cursor-pointer hover:bg-muted/50"
                                >
                                    <TableCell>
                                        <Link
                                            href={`/dashboard/projects/${project.id}`}
                                            className="font-medium hover:underline"
                                        >
                                            {project.name}
                                        </Link>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="secondary" className="capitalize">
                                            {project.type}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge
                                            className={cn(
                                                "text-xs",
                                                statusColors[project.status] ||
                                                "bg-gray-100 text-gray-800"
                                            )}
                                        >
                                            {project.status.replace("_", " ")}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2 w-32">
                                            <Progress value={progress} className="h-2 flex-1" />
                                            <span className="text-xs text-muted-foreground w-10">
                                                {progress}%
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {project.startDate ? (
                                            <span className="text-sm">
                                                {format(new Date(project.startDate), "MMM d, yyyy")}
                                            </span>
                                        ) : (
                                            <span className="text-muted-foreground">—</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {project.endDate ? (
                                            <span className="text-sm">
                                                {format(new Date(project.endDate), "MMM d, yyyy")}
                                            </span>
                                        ) : (
                                            <span className="text-muted-foreground">—</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {project.projectManager ? (
                                            <div className="flex items-center gap-2">
                                                <Avatar className="h-6 w-6">
                                                    <AvatarImage
                                                        src={project.projectManager.avatarUrl || undefined}
                                                    />
                                                    <AvatarFallback className="text-xs">
                                                        {project.projectManager.username
                                                            .substring(0, 2)
                                                            .toUpperCase()}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <span className="text-sm">
                                                    {project.projectManager.username}
                                                </span>
                                            </div>
                                        ) : (
                                            <span className="text-muted-foreground">—</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <span className="text-sm">{project.tasks?.length || 0}</span>
                                    </TableCell>
                                </TableRow>
                            )
                        })}
                    </TableBody>
                </Table>
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

