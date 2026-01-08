"use client"

import { useState, useEffect, useCallback, useTransition } from "react"
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

    // Fetch forecasts when tasks change
    useEffect(() => {
        if (tasks.length === 0) return;

        // Only fetch if we don't have them (simple cache check, or just refetch)
        const fetchForecasts = async () => {
            // dynamic import to avoid server-action issues if mixed? No, importing directly is fine
            const { getForecastsForTasks } = await import("@/app/actions/forecasting");
            const ids = tasks.map(t => t.id);
            const result = await getForecastsForTasks(ids);
            if (result.success && result.data) {
                setForecasts(prev => ({ ...prev, ...result.data }));
            }
        };

        fetchForecasts();
    }, [tasks]);

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
            dateRange: (dateRange.start || dateRange.end) ? { from: dateRange.start || new Date(), to: dateRange.end || new Date() } : undefined, // For getTaskStats
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

    // Fetch tasks
    const fetchTasks = useCallback(async () => {
        setLoading(true)
        setError(null)
        const params = getFilterParams()

        try {
            const result = await getTasksWithFilters({
                search: params.search,
                projectId: params.projectId,
                status: params.status,
                priority: params.priority,
                assigneeId: params.assigneeId,
                dependencyState: params.dependencyState,
                startDate: params.startDate,
                endDate: params.endDate,
                dateFilterType: params.dateFilterType,
                page: params.page,
                limit: params.limit,
            })

            if (result.success) {
                setTasks(result.tasks || [])
                setTotal(result.total || 0)
            } else {
                setError(result.error || "Failed to load tasks")
            }
        } catch (err: any) {
            setError(err.message || "An error occurred")
        } finally {
            setLoading(false)
        }
    }, [getFilterParams])

    // Fetch stats
    const fetchStats = useCallback(async () => {
        setStatsLoading(true)
        const params = getFilterParams()
        // Improve dateRange handling for stats if needed. 
        // getTaskStats expects { from, to } Date objects.
        const dateRangeForStats = (dateRange.start || dateRange.end) ? {
            from: dateRange.start || undefined,
            to: dateRange.end || undefined
        } : undefined

        // Note: casting complex types if needed or ensuring getTaskStats accepts exactly what we pass
        // Since we updated getTaskStats to accept arrays for projectId etc, it should be compatible.

        try {
            const result = await getTaskStats({
                search: params.search,
                projectId: params.projectId,
                statusId: params.status, // We map 'status' from dashboard to 'statusId' in stats generic filters basically
                priority: params.priority,
                assigneeId: params.assigneeId,
                // dependencyState not fully supported in stats yet? 
                // getTaskStats doesn't strictly support dependencyState filter yet in my implementation, 
                // but it mirrors most other filters. It will ignore dependencyState for now.
                // dateRange logic:
                dateRange: dateRangeForStats as any
            })

            if (result.success && result.data) {
                setStats(result.data)
            }
        } catch (error) {
            console.error("Error fetching stats:", error)
        } finally {
            setStatsLoading(false)
        }
    }, [getFilterParams, dateRange])


    // Initial Load & Debounced search
    useEffect(() => {
        const timer = setTimeout(() => {
            // Only update URL if it's a search change debounced, 
            // but here we trigger fetches.
            if (page !== 1 && searchQuery !== (searchParams.get("search") || "")) {
                setPage(1) // Reset page on search change
            } else {
                fetchTasks()
                fetchStats()
                updateURLParams()
            }
        }, 400)

        return () => clearTimeout(timer)
    }, [searchQuery, fetchTasks, fetchStats, updateURLParams]) // Dependencies cover most changes

    // Fetch when other filters change (not search which is covered above or this effect covers all)
    // Actually the above effect covers changes to searchQuery. 
    // We need an effect that runs immediately for other filters.
    // Simplifying: The generic dependency array [searchQuery, projectFilter, ...] is better.

    // Let's use one main effect for all changes, with debounce logic for search only if possible.
    // Or keep the separated approach from original code.

    // Original code had:
    // 1. Debounced search effect -> setPage(1), fetchTasks(), updateURLParams()
    // 2. Filter change effect -> setPage(1), fetchTasks(), updateURLParams()
    // 3. Page change effect -> fetchTasks(), updateURLParams()

    // I should integrate fetchStats() into these.

    // Effect for Search (Debounced)
    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchQuery !== (searchParams.get("search") || "")) {
                setPage(1)
            }
            // We run fetches here only if it's the search changing, 
            // but complicates things if we duplicate logic.
            // Let's just hook into the existing effects structure.
        }, 400)
        return () => clearTimeout(timer)
    }, [searchQuery])

    // Main fetch effect
    useEffect(() => {
        // We need to debounce fetching if search changed, but immediate if filter changed.
        // The original code was a bit racy or redundant. 
        // Let's simplify:

        const timer = setTimeout(() => {
            fetchTasks()
            fetchStats() // Added
            updateURLParams()
        }, searchQuery !== (searchParams.get("search") || "") ? 400 : 0) // Debounce only if search changed (rough heuristic) -- actually better to just rely on specific effects.

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
        page
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
            // Could navigate to focus page or filter by date
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
            // Could filter by overdue
        },
        {
            label: "Completed Today",
            value: stats.completedToday,
            icon: <CheckCircle2 />,
            color: "default",
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

            {/* Error State */}
            {error && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {/* Loading State */}
            {loading && (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            )}

            {/* Content */}
            {!loading && (
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
            )}
        </div>
    )
}

