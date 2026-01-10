"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, TrendingUp, AlertCircle, CheckCircle2, Clock, Lock } from "lucide-react"
import { getOverviewReports } from "@/app/actions/reports"
import {
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from "recharts"
import { format } from "date-fns"

interface OverviewReportsProps {
    userId: number
    userRole: string
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8"]

export function OverviewReports({ userId, userRole }: OverviewReportsProps) {
    const [loading, setLoading] = useState(true)
    const [data, setData] = useState<any>(null)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        setLoading(true)
        setError(null)
        const result = await getOverviewReports({})
        if (result.success) {
            setData(result.data)
        } else {
            setError(result.error || "Failed to load overview reports")
        }
        setLoading(false)
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

    return (
        <div className="space-y-6">
            {/* KPI Widgets */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data.projects.total}</div>
                        <div className="flex gap-2 mt-2 text-xs text-muted-foreground">
                            <span>Active: {data.projects.active}</span>
                            <span>•</span>
                            <span>Completed: {data.projects.completed}</span>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
                        <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data.tasks.total}</div>
                        <div className="flex gap-2 mt-2 text-xs text-muted-foreground">
                            <span>Open: {data.tasks.open}</span>
                            <span>•</span>
                            <span>Completed: {data.tasks.completed}</span>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Blocked Tasks</CardTitle>
                        <Lock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-orange-600">{data.tasks.blocked}</div>
                        <p className="text-xs text-muted-foreground mt-2">
                            Waiting on dependencies
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Overdue Tasks</CardTitle>
                        <AlertCircle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">{data.tasks.overdue}</div>
                        <p className="text-xs text-muted-foreground mt-2">
                            Past due date
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Today's Tasks Completion */}
            <Card>
                <CardHeader>
                    <CardTitle>Today's Tasks Completion</CardTitle>
                    <CardDescription>Daily focus task completion rate</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-3xl font-bold">{data.todaysTasks.completionRate}%</div>
                                <p className="text-sm text-muted-foreground">
                                    {data.todaysTasks.completed} of {data.todaysTasks.total} tasks completed
                                </p>
                            </div>
                        </div>
                        <div className="w-full bg-secondary rounded-full h-2">
                            <div
                                className="bg-primary h-2 rounded-full transition-all"
                                style={{ width: `${data.todaysTasks.completionRate}%` }}
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Charts Row */}
            <div className="grid gap-4 md:grid-cols-2">
                {/* Project Status Distribution */}
                <Card>
                    <CardHeader>
                        <CardTitle>Project Status</CardTitle>
                        <CardDescription>Distribution of projects by status</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={data.projects.statusDistribution}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={(entry: any) => `${entry.status}: ${entry.count}`}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="count"
                                >
                                    {data.projects.statusDistribution.map((entry: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Task Status Distribution */}
                <Card>
                    <CardHeader>
                        <CardTitle>Task Status</CardTitle>
                        <CardDescription>Distribution of tasks by status</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={data.tasks.statusDistribution}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={(entry: any) => `${entry.status}: ${entry.count}`}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="count"
                                >
                                    {data.tasks.statusDistribution.map((entry: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* Weekly Trend */}
            <Card>
                <CardHeader>
                    <CardTitle>Weekly Task Trend</CardTitle>
                    <CardDescription>Tasks created vs completed over the last 7 days</CardDescription>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={data.weeklyTrend}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis
                                dataKey="date"
                                tickFormatter={(value) => format(new Date(value), "MMM d")}
                            />
                            <YAxis />
                            <Tooltip
                                labelFormatter={(value) => format(new Date(value), "MMM d, yyyy")}
                            />
                            <Legend />
                            <Line
                                type="monotone"
                                dataKey="created"
                                stroke="#0088FE"
                                name="Created"
                                strokeWidth={2}
                            />
                            <Line
                                type="monotone"
                                dataKey="completed"
                                stroke="#00C49F"
                                name="Completed"
                                strokeWidth={2}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </div>
    )
}

