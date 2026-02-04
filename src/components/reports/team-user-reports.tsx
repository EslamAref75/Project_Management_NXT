"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, Download, AlertCircle, Calendar as CalendarIcon } from "lucide-react"
import { getTeamUserReports } from "@/app/actions/reports"
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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

interface TeamUserReportsProps {
    userId: number
    userRole: string
}

export function TeamUserReports({ userId, userRole }: TeamUserReportsProps) {
    const [loading, setLoading] = useState(true)
    const [data, setData] = useState<any>(null)
    const [error, setError] = useState<string | null>(null)
    const [users, setUsers] = useState<any[]>([])
    const [projects, setProjects] = useState<any[]>([])
    const [userFilter, setUserFilter] = useState<string>("all")
    const [projectFilter, setProjectFilter] = useState<string>("all")
    const [dateRange, setDateRange] = useState<{ start?: Date; end?: Date }>({
        start: new Date(new Date().setMonth(new Date().getMonth() - 1)),
        end: new Date(),
    })

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

        const result = await getTeamUserReports({
            userId: userFilter !== "all" ? parseInt(userFilter) : undefined,
            projectId: projectFilter !== "all" ? parseInt(projectFilter) : undefined,
            startDate: dateRange.start,
            endDate: dateRange.end,
        })

        if (result.success) {
            setData(result.data)
        } else {
            setError(result.error || "Failed to load team/user reports")
        }
        setLoading(false)
    }

    useEffect(() => {
        if (userRole !== "admin") {
            setError("Unauthorized: Admin access required")
            setLoading(false)
            return
        }

        loadInitialData()
    }, [userRole])

    useEffect(() => {
        if (userRole === "admin") {
            fetchData()
        }
    }, [userFilter, projectFilter, dateRange])

    const exportToCSV = () => {
        if (!data) return

        const headers = [
            "User",
            "Total Tasks",
            "Completed",
            "Completion Rate %",
            "Overdue",
            "Overdue Rate %",
            "Blocked",
        ]
        const rows = data.users.map((user: any) => [
            user.username,
            user.total,
            user.completed,
            user.completionRate,
            user.overdue,
            user.overdueRate,
            user.blocked,
        ])

        const csv = [headers, ...rows]
            .map((row) => row.map((cell: any) => `"${cell}"`).join(","))
            .join("\n")

        const blob = new Blob([csv], { type: "text/csv" })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `team-user-reports-${format(new Date(), "yyyy-MM-dd")}.csv`
        a.click()
    }

    if (userRole !== "admin") {
        return (
            <Card>
                <CardContent className="pt-6">
                    <div className="text-center py-8">
                        <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">
                            Admin access required to view team and user reports
                        </p>
                    </div>
                </CardContent>
            </Card>
        )
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

                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    className={cn(
                                        "w-[240px] justify-start text-left font-normal",
                                        !dateRange.start && !dateRange.end && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className={cn("mr-2 h-4 w-4", (dateRange.start || dateRange.end) && "text-primary")} />
                                    {dateRange.start && dateRange.end ? (
                                        <>
                                            {format(dateRange.start, "MMM d")} -{" "}
                                            {format(dateRange.end, "MMM d")}
                                        </>
                                    ) : (
                                        <span>Pick a date range</span>
                                    )}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <CalendarComponent
                                    mode="range"
                                    selected={{
                                        from: dateRange.start,
                                        to: dateRange.end,
                                    }}
                                    onSelect={(range) =>
                                        setDateRange({
                                            start: range?.from,
                                            end: range?.to,
                                        })
                                    }
                                    numberOfMonths={2}
                                />
                            </PopoverContent>
                        </Popover>

                        <Button variant="outline" onClick={exportToCSV}>
                            <Download className="h-4 w-4 mr-2" />
                            Export CSV
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Performance Chart */}
            {data.users.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>User Productivity</CardTitle>
                        <CardDescription>Task completion rate by user</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={400}>
                            <BarChart data={data.users}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="username" />
                                <YAxis domain={[0, 100]} />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="completionRate" fill="#00C49F" name="Completion Rate %" />
                                <Bar dataKey="overdueRate" fill="#FF8042" name="Overdue Rate %" />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            )}

            {/* User Stats Table */}
            <Card>
                <CardHeader>
                    <CardTitle>User Statistics</CardTitle>
                    <CardDescription>Detailed productivity metrics per user</CardDescription>
                </CardHeader>
                <CardContent>
                    {data.users.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            No user data found for the selected filters
                        </div>
                    ) : (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>User</TableHead>
                                        <TableHead>Total Tasks</TableHead>
                                        <TableHead>Completed</TableHead>
                                        <TableHead>Completion Rate</TableHead>
                                        <TableHead>Overdue</TableHead>
                                        <TableHead>Overdue Rate</TableHead>
                                        <TableHead>Blocked</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {data.users.map((user: any) => (
                                        <TableRow key={user.userId}>
                                            <TableCell className="font-medium">
                                                {user.username}
                                            </TableCell>
                                            <TableCell>{user.total}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="text-green-600">
                                                    {user.completed}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-16 bg-secondary rounded-full h-2">
                                                        <div
                                                            className="bg-green-600 h-2 rounded-full"
                                                            style={{ width: `${user.completionRate}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-sm">{user.completionRate}%</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="text-red-600">
                                                    {user.overdue}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-16 bg-secondary rounded-full h-2">
                                                        <div
                                                            className="bg-red-600 h-2 rounded-full"
                                                            style={{ width: `${user.overdueRate}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-sm">{user.overdueRate}%</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="text-orange-600">
                                                    {user.blocked}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}

