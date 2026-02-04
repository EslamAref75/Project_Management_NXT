"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, Download, Filter } from "lucide-react"
import { getTaskReports } from "@/app/actions/reports"
import { DatePickerWithRange } from "@/components/ui/date-range-picker"
import { DateRange } from "react-day-picker"
import { getProjects } from "@/app/actions/reports"
import { getUsers } from "@/app/actions/users"
import {
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from "recharts"
import { format } from "date-fns"

interface TaskReportsProps {
    userId: number
    userRole: string
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8"]

export function TaskReports({ userId, userRole }: TaskReportsProps) {
    const [loading, setLoading] = useState(true)
    const [data, setData] = useState<any>(null)
    const [error, setError] = useState<string | null>(null)

    const [dateRange, setDateRange] = useState<{ start?: Date; end?: Date }>({})

    const fetchData = async () => {
        setLoading(true)
        setError(null)
        const result = await getTaskReports({
            startDate: dateRange.start,
            endDate: dateRange.end,
        })
        if (result.success) {
            setData(result.data)
        } else {
            setError(result.error || "Failed to load task reports")
        }
        setLoading(false)
    }

    useEffect(() => {
        fetchData()
    }, [dateRange])

    const exportToCSV = () => {
        if (!data) return

        const headers = ["Status", "Count"]
        const rows = data.byStatus.map((item: any) => [item.status, item.count])

        const csv = [headers, ...rows]
            .map((row) => row.map((cell: any) => `"${cell}"`).join(","))
            .join("\n")

        const blob = new Blob([csv], { type: "text/csv" })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `task-reports-${format(new Date(), "yyyy-MM-dd")}.csv`
        a.click()
    }

    if (loading) {
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

    const avgCompletionDays = data.averageCompletionTime
        ? Math.round(data.averageCompletionTime / (1000 * 60 * 60 * 24))
        : 0

    return (
        <div className="space-y-6">
            {/* Filters */}
            <Card>
                <CardContent className="pt-6">
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="space-y-2">
                            <DatePickerWithRange
                                date={{
                                    from: dateRange.start,
                                    to: dateRange.end
                                }}
                                setDate={(range) => setDateRange({
                                    start: range?.from,
                                    end: range?.to
                                })}
                                className="w-[240px]"
                            />
                        </div>
                        <Button variant="outline" onClick={exportToCSV}>
                            <Download className="h-4 w-4 mr-2" />
                            Export CSV
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data.total}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Completed</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{data.completed}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Overdue</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">{data.overdue}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Blocked</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-orange-600">
                            {data.blockedByDependencies}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Charts */}
            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Tasks by Status</CardTitle>
                        <CardDescription>Distribution of tasks across statuses</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={data.byStatus}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={(entry: any) => `${entry.status}: ${entry.count}`}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="count"
                                >
                                    {data.byStatus.map((entry: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Tasks by Priority</CardTitle>
                        <CardDescription>Distribution of tasks by priority level</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={data.byPriority}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="priority" />
                                <YAxis />
                                <Tooltip />
                                <Bar dataKey="count" fill="#0088FE" />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* Metrics */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm">Average Completion Time</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{avgCompletionDays} days</div>
                        <p className="text-xs text-muted-foreground mt-2">
                            Average time from creation to completion
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm">Completion Rate</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {data.total > 0
                                ? Math.round((data.completed / data.total) * 100)
                                : 0}
                            %
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                            {data.completed} of {data.total} tasks completed
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm">Dependency Impact</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-orange-600">
                            {data.blockedByDependencies}
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                            Tasks blocked by dependencies
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Export section removed as it is now in filters */}
        </div>
    )
}

