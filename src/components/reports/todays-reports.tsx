"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, Download, Calendar as CalendarIcon, Target, CheckCircle2, XCircle } from "lucide-react"
import { getTodaysReports } from "@/app/actions/reports"
import { getUsers } from "@/app/actions/users"
import { getProjects } from "@/app/actions/reports"
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

interface TodaysReportsProps {
    userId: number
    userRole: string
}

export function TodaysReports({ userId, userRole }: TodaysReportsProps) {
    const [loading, setLoading] = useState(true)
    const [data, setData] = useState<any>(null)
    const [error, setError] = useState<string | null>(null)
    const [users, setUsers] = useState<any[]>([])
    const [projects, setProjects] = useState<any[]>([])
    const [selectedDate, setSelectedDate] = useState<Date>(new Date())
    const [userFilter, setUserFilter] = useState<string>("all")
    const [projectFilter, setProjectFilter] = useState<string>("all")

    useEffect(() => {
        loadInitialData()
    }, [])

    useEffect(() => {
        fetchData()
    }, [selectedDate, userFilter, projectFilter])

    const loadInitialData = async () => {
        const [usersResult, projectsResult] = await Promise.all([
            getUsers(),
            getProjects(),
        ])
        setUsers(usersResult)
        setProjects(projectsResult)
    }

    const fetchData = async () => {
        setLoading(true)
        setError(null)

        const result = await getTodaysReports({
            date: selectedDate,
            userId: userFilter !== "all" ? parseInt(userFilter) : undefined,
            projectId: projectFilter !== "all" ? parseInt(projectFilter) : undefined,
        })

        if (result.success) {
            setData(result.data)
        } else {
            setError(result.error || "Failed to load today's reports")
        }
        setLoading(false)
    }

    const exportToCSV = () => {
        if (!data) return

        const headers = ["Task", "Status", "Priority", "Project", "Assignees"]
        const rows = data.tasks.map((task: any) => [
            task.title,
            task.status,
            task.priority,
            task.project,
            task.assignees.join(", "),
        ])

        const csv = [headers, ...rows]
            .map((row) => row.map((cell) => `"${cell}"`).join(","))
            .join("\n")

        const blob = new Blob([csv], { type: "text/csv" })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `todays-reports-${format(selectedDate, "yyyy-MM-dd")}.csv`
        a.click()
    }

    if (loading && !data) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    if (error) {
        return (
            <Card>
                <CardContent className="pt-6">
                    <div className="text-center text-destructive">{error}</div>
                </CardContent>
            </Card>
        )
    }

    if (!data) {
        return null
    }

    return (
        <div className="space-y-6">
            {/* Filters */}
            <Card>
                <CardContent className="pt-6">
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="space-y-2">
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className={cn(
                                            "w-[240px] justify-start text-left font-normal",
                                            !selectedDate && "text-muted-foreground"
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {selectedDate ? (
                                            format(selectedDate, "PPP")
                                        ) : (
                                            <span>Pick a date</span>
                                        )}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <CalendarComponent
                                        mode="single"
                                        selected={selectedDate}
                                        onSelect={(date) => date && setSelectedDate(date)}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>

                        {userRole === "admin" && (
                            <div className="space-y-2">
                                <Select value={userFilter} onValueChange={setUserFilter}>
                                    <SelectTrigger className="w-[180px]">
                                        <SelectValue placeholder="All Users" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Users</SelectItem>
                                        {users.map((user) => (
                                            <SelectItem key={user.id} value={user.id.toString()}>
                                                {user.username}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

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

                        <Button variant="outline" onClick={exportToCSV}>
                            <Download className="h-4 w-4 mr-2" />
                            Export CSV
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
                        <Target className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data.total}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Tasks planned for {format(selectedDate, "MMM d")}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Completed</CardTitle>
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{data.completed}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {data.completionRate}% completion rate
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Incomplete</CardTitle>
                        <XCircle className="h-4 w-4 text-orange-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-orange-600">{data.incomplete}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Tasks not completed
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
                        <Target className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data.completionRate}%</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Daily focus efficiency
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* User Performance Chart */}
            {data.byUser && data.byUser.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>User Performance</CardTitle>
                        <CardDescription>Completion rate by user</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={data.byUser}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="username" />
                                <YAxis domain={[0, 100]} />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="total" fill="#0088FE" name="Total Tasks" />
                                <Bar dataKey="completed" fill="#00C49F" name="Completed" />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            )}

            {/* Tasks List */}
            <Card>
                <CardHeader>
                    <CardTitle>Today's Tasks</CardTitle>
                    <CardDescription>
                        All tasks planned for {format(selectedDate, "MMMM d, yyyy")}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {data.tasks.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            No tasks planned for this date
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {data.tasks.map((task: any) => (
                                <div
                                    key={task.id}
                                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                                >
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-medium">{task.title}</span>
                                            <Badge
                                                variant={
                                                    task.status === "completed"
                                                        ? "default"
                                                        : "secondary"
                                                }
                                            >
                                                {task.status}
                                            </Badge>
                                            <Badge variant="outline">{task.priority}</Badge>
                                        </div>
                                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                            <span>Project: {task.project}</span>
                                            <span>
                                                Assignees: {task.assignees.join(", ") || "Unassigned"}
                                            </span>
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

