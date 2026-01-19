"use client"

import { useState, useEffect, useCallback, useTransition, useRef, useMemo } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { TasksSearchBar } from "./tasks-search-bar"
import { TasksFilters } from "./tasks-filters"
import { TasksViewSwitcher } from "./tasks-view-switcher"
import { TasksCardView } from "./tasks-card-view"
import { TasksTableView } from "./tasks-table-view"
import { Button } from "@/components/ui/button"
import { Plus, Loader2, AlertCircle, ListTodo, User, CalendarCheck, Ban, CheckCircle2 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { getTasksWithFilters } from "@/app/actions/tasks"
import { getTaskStats, TaskStats } from "@/app/actions/stats"
import { SummaryStatsCards, StatCardData } from "@/components/dashboard/summary-stats-cards"
import Link from "next/link"

type ViewMode = "card" | "table"

interface TasksDashboardProps {
    initialTasks: any[]
    initialTotal: number
    users: any[]
    projects: any[]
    currentUserId: number
}

export function TasksDashboard({
    initialTasks,
    initialTotal,
    users,
    projects,
    currentUserId,
}: TasksDashboardProps) {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [isPending, startTransition] = useTransition()

    // State
    const [tasks, setTasks] = useState(initialTasks)
    const [total, setTotal] = useState(initialTotal)
    const [loading, setLoading] = useState(false)
    const [stats, setStats] = useState<TaskStats | null>(null)
    const [statsLoading, setStatsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [viewMode, setViewMode] = useState<ViewMode>(
        (searchParams.get("view") as ViewMode) || "card"
    )

    // Forecasting
    const [forecasts, setForecasts] = useState<Record<number, any>>({})

    // Fetch forecasts when tasks change - memoize to prevent redundant calls
    const taskIdString = useMemo(() => {
        if (tasks.length === 0) return ""
        return tasks.map(t => t.id).sort().join(",")
    }, [tasks])

    useEffect(() => {
        if (!taskIdString) return;

        const fetchForecasts = async () => {
            const { getForecastsForTasks } = await import("@/app/actions/forecasting");
            const ids = tasks.map(t => t.id);
            const result = await getForecastsForTasks(ids);
            if (result.success && result.data) {
                setForecasts(prev => ({ ...prev, ...result.data }));
            }
        };

        fetchForecasts();
    }, [taskIdString, tasks]);

    // Filters state
    const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "")
    const [projectFilter, setProjectFilter] = useState<string[]>(
        searchParams.get("project")?.split(",").filter(Boolean) || []
    )
    const [statusFilter, setStatusFilter] = useState<string[]>(
        searchParams.get("status")?.split(",").filter(Boolean) || []
    )
    const [priorityFilter, setPriorityFilter] = useState<string[]>(
        searchParams.get("priority")?.split(",").filter(Boolean) || []
    )
    const [assigneeFilter, setAssigneeFilter] = useState<string>(
        searchParams.get("assignee") || "all"
    )
    const [dependencyState, setDependencyState] = useState<string>(
        searchParams.get("dependencyState") || "all"
    )
    const [dateRange, setDateRange] = useState<{ start?: Date; end?: Date }>({
        start: searchParams.get("startDate") ? new Date(searchParams.get("startDate")!) : undefined,
        end: searchParams.get("endDate") ? new Date(searchParams.get("endDate")!) : undefined,
    })
    const [dateFilterType, setDateFilterType] = useState<"dueDate" | "createdDate">(
        (searchParams.get("dateFilterType") as "dueDate" | "createdDate") || "dueDate"
    )
    const [page, setPage] = useState(parseInt(searchParams.get("page") || "1"))
    const [limit] = useState(20)

    // Update URL params when filters change
    const updateURLParams = useCallback(() => {
        const params = new URLSearchParams()
        if (searchQuery) params.set("search", searchQuery)
        if (projectFilter.length > 0) params.set("project", projectFilter.join(","))
        if (statusFilter.length > 0) params.set("status", statusFilter.join(","))
        if (priorityFilter.length > 0) params.set("priority", priorityFilter.join(","))
        if (assigneeFilter !== "all") params.set("assignee", assigneeFilter)
        if (dependencyState !== "all") params.set("dependencyState", dependencyState)
        if (dateRange.start) params.set("startDate", dateRange.start.toISOString().split("T")[0])
        if (dateRange.end) params.set("endDate", dateRange.end.toISOString().split("T")[0])
        if (dateFilterType !== "dueDate") params.set("dateFilterType", dateFilterType)
        if (viewMode !== "card") params.set("view", viewMode)
        if (page > 1) params.set("page", page.toString())

        startTransition(() => {
            router.push(`/dashboard/tasks?${params.toString()}`, { scroll: false })
        })
    }, [
        searchQuery,
        projectFilter,
        statusFilter,
        priorityFilter,
        assigneeFilter,
        dependencyState,
        dateRange,
        dateFilterType,
        viewMode,
        page,
        router,
    ])

    // Common filters object used for both fetching tasks and stats
    const getFilterParams = useCallback(() => {
        return {
            search: searchQuery,
            projectId: projectFilter.length > 0 ? projectFilter : undefined,
            statusId: statusFilter.length > 0 ? statusFilter : undefined,
            status: statusFilter.length > 0 ? statusFilter : undefined, // For getTasksWithFilters
            priority: priorityFilter.length > 0 ? priorityFilter : undefined,
            assigneeId: assigneeFilter !== "all" ? assigneeFilter : undefined,
            dependencyState: dependencyState !== "all" ? dependencyState : undefined,
            startDate: dateRange.start?.toISOString(),
            endDate: dateRange.end?.toISOString(),
            dateRange: (dateRange.start && dateRange.end) ? { from: dateRange.start, to: dateRange.end } : undefined, // For getTaskStats
            dateFilterType,
            page,
            limit,
        }
    }, [
        searchQuery,
        projectFilter,
        statusFilter,
        priorityFilter,
        assigneeFilter,
        dependencyState,
        dateRange,
        dateFilterType,
        page,
        limit
    ])


    // Handlers
    // Debounce only search queries, other filters are immediate
    useEffect(() => {
        const isSearchChange = searchQuery !== (searchParams.get("search") || "")
        const debounceTime = isSearchChange && searchQuery !== "" ? 400 : 0

        const timer = setTimeout(async () => {
            // Fetch data in parallel
            setLoading(true)
            setStatsLoading(true)
            try {
                const [tasksResult, statsResult] = await Promise.all([
                    getTasksWithFilters({
                        search: searchQuery,
                        projectId: projectFilter.length > 0 ? projectFilter : undefined,
                        status: statusFilter.length > 0 ? statusFilter : undefined,
                        priority: priorityFilter.length > 0 ? priorityFilter : undefined,
                        assigneeId: assigneeFilter !== "all" ? assigneeFilter : undefined,
                        dependencyState: dependencyState !== "all" ? dependencyState : undefined,
                        startDate: dateRange.start?.toISOString(),
                        endDate: dateRange.end?.toISOString(),
                        dateFilterType,
                        page,
                        limit,
                    }),
                    getTaskStats({
                        search: searchQuery,
                        projectId: projectFilter.length > 0 ? projectFilter : undefined,
                        statusId: statusFilter.length > 0 ? statusFilter : undefined,
                        priority: priorityFilter.length > 0 ? priorityFilter : undefined,
                        assigneeId: assigneeFilter !== "all" ? assigneeFilter : undefined,
                        dateRange: (dateRange.start && dateRange.end) ? { from: dateRange.start, to: dateRange.end } : undefined
                    })
                ])

                if (tasksResult.success) {
                    setTasks(tasksResult.tasks || [])
                    setTotal(tasksResult.total || 0)
                } else {
                    setError(tasksResult.error || "Failed to load tasks")
                }

                if (statsResult.success && statsResult.data) {
                    setStats(statsResult.data)
                }
            } catch (err: any) {
                setError(err.message || "An error occurred")
            } finally {
                setLoading(false)
                setStatsLoading(false)
            }
        }, debounceTime)

        return () => clearTimeout(timer)
    }, [
        searchQuery,
        projectFilter,
        statusFilter,
        priorityFilter,
        assigneeFilter,
        dependencyState,
        dateRange,
        dateFilterType,
        page,
        limit
    ])

    // Separate effect for URL updates - debounced to prevent excessive history pushes
    useEffect(() => {
        const timer = setTimeout(() => {
            const params = new URLSearchParams()
            if (searchQuery) params.set("search", searchQuery)
            if (projectFilter.length > 0) params.set("project", projectFilter.join(","))
            if (statusFilter.length > 0) params.set("status", statusFilter.join(","))
            if (priorityFilter.length > 0) params.set("priority", priorityFilter.join(","))
            if (assigneeFilter !== "all") params.set("assignee", assigneeFilter)
            if (dependencyState !== "all") params.set("dependencyState", dependencyState)
            if (dateRange.start) params.set("startDate", dateRange.start.toISOString().split("T")[0])
            if (dateRange.end) params.set("endDate", dateRange.end.toISOString().split("T")[0])
            if (dateFilterType !== "dueDate") params.set("dateFilterType", dateFilterType)
            if (viewMode !== "card") params.set("view", viewMode)
            if (page > 1) params.set("page", page.toString())

            startTransition(() => {
                router.push(`/dashboard/tasks?${params.toString()}`, { scroll: false })
            })
        }, 100) // Debounce URL updates by 100ms

        return () => clearTimeout(timer)
    }, [
        searchQuery,
        projectFilter,
        statusFilter,
        priorityFilter,
        assigneeFilter,
        dependencyState,
        dateRange,
        dateFilterType,
        viewMode,
        page,
        router
    ])

    // Handlers
    const handleViewChange = (mode: ViewMode) => {
        setViewMode(mode)
        // updateURLParams will resolve in effect
    }

    const handleClearFilters = () => {
        setSearchQuery("")
        setProjectFilter([])
        setStatusFilter([])
        setPriorityFilter([])
        setAssigneeFilter("all")
        setDependencyState("all")
        setDateRange({})
        setDateFilterType("dueDate")
        setPage(1)
    }

    // Stats Cards Configuration
    const statCards: StatCardData[] = stats ? [
        {
            label: "Total Tasks",
            value: stats.totalTasks,
            icon: <ListTodo />,
            color: "default",
            onClick: handleClearFilters // Click total resets filters usually
        },
        {
            label: "My Tasks",
            value: stats.myTasks,
            icon: <User />,
            color: "blue",
            onClick: () => setAssigneeFilter(currentUserId.toString())
        },
        {
            label: "Today's Focus",
            value: stats.todayTasks,
            icon: <CalendarCheck />,
            color: "green",
            onClick: () => {
                const today = new Date()
                const tomorrow = new Date(today)
                tomorrow.setDate(tomorrow.getDate() + 1)
                setDateRange({ start: today, end: tomorrow })
                setDateFilterType("dueDate")
            }
        },
        {
            label: "Blocked",
            value: stats.blockedTasks,
            icon: <Ban />,
            color: stats.blockedTasks > 0 ? "red" : "default",
            onClick: () => setDependencyState("blocked")
        },
        {
            label: "Overdue",
            value: stats.overdueTasks,
            icon: <AlertCircle />,
            color: stats.overdueTasks > 0 ? "orange" : "default",
            onClick: () => {
                const today = new Date()
                setDateRange({ start: undefined, end: today })
                setDateFilterType("dueDate")
            }
        },
        {
            label: "Completed Today",
            value: stats.completedToday,
            icon: <CheckCircle2 />,
            color: "default",
            onClick: () => {
                const today = new Date()
                const tomorrow = new Date(today)
                tomorrow.setDate(tomorrow.getDate() + 1)
                setDateRange({ start: today, end: tomorrow })
                setStatusFilter(["completed"])
            }
        }
    ] : []

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">All Tasks</h2>
                    <p className="text-muted-foreground">
                        View and manage tasks across all projects
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <TasksViewSwitcher viewMode={viewMode} onViewChange={handleViewChange} />
                </div>
            </div>

            {/* Stats Cards */}
            <SummaryStatsCards cards={statCards} isLoading={statsLoading} />

            {/* Search Bar */}
            <TasksSearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                onClear={() => {
                    setSearchQuery("")
                    handleClearFilters()
                }}
            />

            {/* Filters Panel */}
            <TasksFilters
                projectFilter={projectFilter}
                onProjectChange={setProjectFilter}
                statusFilter={statusFilter}
                onStatusChange={setStatusFilter}
                priorityFilter={priorityFilter}
                onPriorityChange={setPriorityFilter}
                assigneeFilter={assigneeFilter}
                onAssigneeChange={setAssigneeFilter}
                dependencyState={dependencyState}
                onDependencyStateChange={setDependencyState}
                dateRange={dateRange}
                onDateRangeChange={setDateRange}
                dateFilterType={dateFilterType}
                onDateFilterTypeChange={setDateFilterType}
                projects={projects}
                users={users}
                currentUserId={currentUserId}
                onClear={handleClearFilters}
            />

            {/* Loading State */}
            {error && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {/* Content - Keep old data visible while loading with reduced opacity */}
            <div className={loading && tasks.length > 0 ? "opacity-50 pointer-events-none transition-opacity" : "opacity-100 transition-opacity"}>
                {tasks.length === 0 && !loading ? (
                    <div className="flex items-center justify-center py-12">
                        <p className="text-muted-foreground">No tasks found. Try adjusting your filters.</p>
                    </div>
                ) : tasks.length > 0 ? (
                    <>
                        {viewMode === "card" ? (
                            <TasksCardView
                                tasks={tasks}
                                total={total}
                                page={page}
                                limit={limit}
                                onPageChange={setPage}
                                forecasts={forecasts}
                            />
                        ) : (
                            <TasksTableView
                                tasks={tasks}
                                total={total}
                                page={page}
                                limit={limit}
                                onPageChange={setPage}
                                forecasts={forecasts}
                            />
                        )}
                    </>
                ) : (
                    /* Skeleton loading state - only shown on initial load when no tasks exist */
                    <div className="space-y-4">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="h-24 bg-muted/50 rounded-lg animate-pulse" />
                        ))}
                    </div>
                )}
            </div>

            {/* Loading indicator overlay - non-blocking */}
            {loading && tasks.length > 0 && (
                <div className="fixed bottom-6 right-6 flex items-center gap-2 bg-background border border-border rounded-lg px-4 py-2 shadow-lg z-50">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Updating...</span>
                </div>
            )}
        </div>
    )
}

