"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Loader2, Download, Filter, Calendar as CalendarIcon } from "lucide-react"
import { getProjectReports, getProjects } from "@/app/actions/reports"
import { getProjects as getAllProjects } from "@/app/actions/projects"
import { getUsers } from "@/app/actions/users"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from "recharts"
import Link from "next/link"

interface ProjectReportsProps {
    userId: number
    userRole: string
}

export function ProjectReports({ userId, userRole }: ProjectReportsProps) {
    const [loading, setLoading] = useState(true)
    const [data, setData] = useState<any[]>([])
    const [error, setError] = useState<string | null>(null)
    const [projects, setProjects] = useState<any[]>([])
    const [users, setUsers] = useState<any[]>([])

    // Filters
    const [projectFilter, setProjectFilter] = useState<string>("all")
    const [categoryFilter, setCategoryFilter] = useState<string[]>([])
    const [statusFilter, setStatusFilter] = useState<string[]>([])
    const [dateRange, setDateRange] = useState<{ start?: Date; end?: Date }>({})
    const [projectManagerFilter, setProjectManagerFilter] = useState<string>("all")

    useEffect(() => {
        loadInitialData()
    }, [])

    useEffect(() => {
        fetchReports()
    }, [projectFilter, categoryFilter, statusFilter, dateRange, projectManagerFilter])

    const loadInitialData = async () => {
        const [projectsResult, usersResult] = await Promise.all([
            getAllProjects(),
            getUsers(),
        ])
        setProjects(projectsResult)
        setUsers(usersResult)
    }

    const fetchReports = async () => {
        setLoading(true)
        setError(null)

        const result = await getProjectReports({
            projectId: projectFilter !== "all" ? parseInt(projectFilter) : undefined,
            category: categoryFilter.length > 0 ? categoryFilter : undefined,
            status: statusFilter.length > 0 ? statusFilter : undefined,
            startDate: dateRange.start,
            endDate: dateRange.end,
            projectManagerId:
                projectManagerFilter !== "all" ? parseInt(projectManagerFilter) : undefined,
        })

        if (result.success) {
            setData(result.data || [])
        } else {
            setError(result.error || "Failed to load project reports")
        }
        setLoading(false)
    }

    const exportToCSV = () => {
        const headers = [
            "Project Name",
            "Code",
            "Status",
            "Type",
            "Progress %",
            "Total Tasks",
            "Completed",
            "Blocked",
            "Overdue",
            "Project Manager",
        ]
        const rows = data.map((project) => [
            project.name,
            project.code,
            project.status,
            project.type,
            project.progress,
            project.totalTasks,
            project.completedTasks,
            project.blockedTasks,
            project.overdueTasks,
            project.projectManager,
        ])

        const csv = [headers, ...rows]
            .map((row) => row.map((cell) => `"${cell}"`).join(","))
            .join("\n")

        const blob = new Blob([csv], { type: "text/csv" })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `project-reports-${format(new Date(), "yyyy-MM-dd")}.csv`
        a.click()
    }

    if (loading && data.length === 0) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Filters */}
            <Card>
                <CardContent className="pt-6">
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="space-y-2">
                            <Select value={projectFilter} onValueChange={setProjectFilter}>
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="All Projects" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Projects</SelectItem>
                                    {projects.map((project) => (
                                        <SelectItem key={project.id} value={project.id.toString()}>
                                            {project.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Select value={projectManagerFilter} onValueChange={setProjectManagerFilter}>
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="All Managers" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Managers</SelectItem>
                                    {users.map((user) => (
                                        <SelectItem key={user.id} value={user.id.toString()}>
                                            {user.username}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <Button variant="outline" onClick={exportToCSV}>
                            <Download className="h-4 w-4 mr-2" />
                            Export CSV
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {error && (
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-center text-destructive">{error}</div>
                    </CardContent>
                </Card>
            )}

            {/* Progress Chart */}
            {data.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Project Progress</CardTitle>
                        <CardDescription>Progress percentage by project</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={400}>
                            <BarChart data={data} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis type="number" domain={[0, 100]} />
                                <YAxis
                                    dataKey="name"
                                    type="category"
                                    width={150}
                                    tick={{ fontSize: 12 }}
                                />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="progress" fill="#0088FE" name="Progress %" />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            )}

            {/* Projects Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Project Details</CardTitle>
                    <CardDescription>Detailed project metrics and statistics</CardDescription>
                </CardHeader>
                <CardContent>
                    {data.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            No projects found matching the filters
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {data.map((project) => (
                                <div
                                    key={project.id}
                                    className="border rounded-lg p-4 space-y-3 hover:bg-muted/50 transition-colors"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Link
                                                    href={`/dashboard/projects/${project.id}`}
                                                    className="font-semibold text-lg hover:underline"
                                                >
                                                    {project.name}
                                                </Link>
                                                <Badge variant="outline" className="text-xs">
                                                    {project.code}
                                                </Badge>
                                                <Badge>{project.status}</Badge>
                                                <Badge variant="secondary">{project.type}</Badge>
                                            </div>
                                            <p className="text-sm text-muted-foreground">
                                                PM: {project.projectManager}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-2xl font-bold">{project.progress}%</div>
                                            <p className="text-xs text-muted-foreground">Progress</p>
                                        </div>
                                    </div>

                                    <Progress value={project.progress} className="h-2" />

                                    <div className="grid grid-cols-4 gap-4 text-sm">
                                        <div>
                                            <p className="text-muted-foreground">Total Tasks</p>
                                            <p className="font-semibold">{project.totalTasks}</p>
                                        </div>
                                        <div>
                                            <p className="text-muted-foreground">Completed</p>
                                            <p className="font-semibold text-green-600">
                                                {project.completedTasks}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-muted-foreground">Blocked</p>
                                            <p className="font-semibold text-orange-600">
                                                {project.blockedTasks}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-muted-foreground">Overdue</p>
                                            <p className="font-semibold text-red-600">
                                                {project.overdueTasks}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}

