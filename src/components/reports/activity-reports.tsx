"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, Download, AlertCircle, Calendar as CalendarIcon } from "lucide-react"
import { getActivityReports } from "@/app/actions/reports"
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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination"

interface ActivityReportsProps {
    userId: number
    userRole: string
}

const actionTypes = [
    "project_created",
    "project_updated",
    "project_deleted",
    "task_created",
    "task_updated",
    "task_deleted",
    "task_status_updated",
    "dependency_created",
    "dependency_removed",
    "today_task_assigned",
    "today_task_removed",
    "settings_updated",
]

const entityTypes = ["project", "task", "dependency", "settings", "user", "team"]

export function ActivityReports({ userId, userRole }: ActivityReportsProps) {
    const [loading, setLoading] = useState(true)
    const [data, setData] = useState<any>(null)
    const [error, setError] = useState<string | null>(null)
    const [users, setUsers] = useState<any[]>([])
    const [userFilter, setUserFilter] = useState<string>("all")
    const [actionTypeFilter, setActionTypeFilter] = useState<string>("all")
    const [entityTypeFilter, setEntityTypeFilter] = useState<string>("all")
    const [dateRange, setDateRange] = useState<{ start?: Date; end?: Date }>({
        start: new Date(new Date().setMonth(new Date().getMonth() - 1)),
        end: new Date(),
    })
    const [page, setPage] = useState(1)
    const limit = 50

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
    }, [userFilter, actionTypeFilter, entityTypeFilter, dateRange, page])

    const loadInitialData = async () => {
        const usersResult = await getUsers()
        setUsers(usersResult)
    }

    const fetchData = async () => {
        setLoading(true)
        setError(null)

        const result = await getActivityReports({
            userId: userFilter !== "all" ? parseInt(userFilter) : undefined,
            actionType: actionTypeFilter !== "all" ? actionTypeFilter : undefined,
            entityType: entityTypeFilter !== "all" ? entityTypeFilter : undefined,
            startDate: dateRange.start,
            endDate: dateRange.end,
            page,
            limit,
        })

        if (result.success) {
            setData(result.data)
        } else {
            setError(result.error || "Failed to load activity reports")
        }
        setLoading(false)
    }

    const exportToCSV = () => {
        if (!data) return

        const headers = [
            "Date",
            "Action",
            "Actor",
            "Entity Type",
            "Entity ID",
            "Summary",
        ]
        const rows = data.logs.map((log: any) => [
            format(new Date(log.createdAt), "yyyy-MM-dd HH:mm:ss"),
            log.actionType || log.action,
            log.performedBy?.username || "System",
            log.entityType || "N/A",
            log.entityId || "N/A",
            log.actionSummary || log.description || "",
        ])

        const csv = [headers, ...rows]
            .map((row) => row.map((cell: any) => `"${cell}"`).join(","))
            .join("\n")

        const blob = new Blob([csv], { type: "text/csv" })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `activity-reports-${format(new Date(), "yyyy-MM-dd")}.csv`
        a.click()
    }

    if (userRole !== "admin") {
        return (
            <Card>
                <CardContent className="pt-6">
                    <div className="text-center py-8">
                        <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">
                            Admin access required to view activity and audit reports
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

    const totalPages = Math.ceil(data.total / limit)

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
                            <Select value={actionTypeFilter} onValueChange={setActionTypeFilter}>
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="All Actions" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Actions</SelectItem>
                                    {actionTypes.map((type) => (
                                        <SelectItem key={type} value={type}>
                                            {type.replace(/_/g, " ")}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Select value={entityTypeFilter} onValueChange={setEntityTypeFilter}>
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="All Entities" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Entities</SelectItem>
                                    {entityTypes.map((type) => (
                                        <SelectItem key={type} value={type}>
                                            {type}
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

            {/* Action Type Distribution */}
            {data.byActionType && data.byActionType.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Action Type Distribution</CardTitle>
                        <CardDescription>Activity breakdown by action type</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={data.byActionType}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis
                                    dataKey="actionType"
                                    angle={-45}
                                    textAnchor="end"
                                    height={100}
                                    tick={{ fontSize: 12 }}
                                />
                                <YAxis />
                                <Tooltip />
                                <Bar dataKey="count" fill="#0088FE" />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            )}

            {/* Activity Log Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Activity Log</CardTitle>
                    <CardDescription>
                        Showing {data.logs.length} of {data.total} total activities
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {data.logs.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            No activity logs found for the selected filters
                        </div>
                    ) : (
                        <>
                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Date & Time</TableHead>
                                            <TableHead>Action</TableHead>
                                            <TableHead>Actor</TableHead>
                                            <TableHead>Entity</TableHead>
                                            <TableHead>Summary</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {data.logs.map((log: any) => (
                                            <TableRow key={log.id}>
                                                <TableCell className="text-sm">
                                                    {format(
                                                        new Date(log.createdAt),
                                                        "MMM d, yyyy HH:mm"
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline">
                                                        {log.actionType || log.action}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    {log.performedBy?.username || "System"}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="space-y-1">
                                                        <Badge variant="secondary">
                                                            {log.entityType || "N/A"}
                                                        </Badge>
                                                        {log.entityId && (
                                                            <span className="text-xs text-muted-foreground block">
                                                                ID: {log.entityId}
                                                            </span>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="max-w-md">
                                                    <p className="text-sm line-clamp-2">
                                                        {log.actionSummary || log.description || "—"}
                                                    </p>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="mt-4">
                                    <Pagination>
                                        <PaginationContent>
                                            <PaginationItem>
                                                <PaginationPrevious
                                                    onClick={() => page > 1 && setPage(page - 1)}
                                                    className={
                                                        page === 1
                                                            ? "pointer-events-none opacity-50"
                                                            : "cursor-pointer"
                                                    }
                                                />
                                            </PaginationItem>
                                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                                                (p) => (
                                                    <PaginationItem key={p}>
                                                        <PaginationLink
                                                            onClick={() => setPage(p)}
                                                            isActive={p === page}
                                                            className="cursor-pointer"
                                                        >
                                                            {p}
                                                        </PaginationLink>
                                                    </PaginationItem>
                                                )
                                            )}
                                            <PaginationItem>
                                                <PaginationNext
                                                    onClick={() =>
                                                        page < totalPages && setPage(page + 1)
                                                    }
                                                    className={
                                                        page === totalPages
                                                            ? "pointer-events-none opacity-50"
                                                            : "cursor-pointer"
                                                    }
                                                />
                                            </PaginationItem>
                                        </PaginationContent>
                                    </Pagination>
                                </div>
                            )}
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}

