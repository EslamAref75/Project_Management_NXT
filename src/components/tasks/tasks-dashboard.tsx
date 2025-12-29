"use client"

import { useState, useEffect, useCallback } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { TasksSearchBar } from "./tasks-search-bar"
import { TasksFilters } from "./tasks-filters"
import { TasksViewSwitcher } from "./tasks-view-switcher"
import { TasksCardView } from "./tasks-card-view"
import { TasksTableView } from "./tasks-table-view"
import { Button } from "@/components/ui/button"
import { Plus, Loader2, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { getTasksWithFilters } from "@/app/actions/tasks"
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

    // State
    const [tasks, setTasks] = useState(initialTasks)
    const [total, setTotal] = useState(initialTotal)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [viewMode, setViewMode] = useState<ViewMode>(
        (searchParams.get("view") as ViewMode) || "card"
    )

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

        router.push(`/dashboard/tasks?${params.toString()}`, { scroll: false })
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

    // Fetch tasks with filters
    const fetchTasks = useCallback(async () => {
        setLoading(true)
        setError(null)

        try {
            const result = await getTasksWithFilters({
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
        limit,
    ])

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => {
            setPage(1)
            fetchTasks()
            updateURLParams()
        }, 400)

        return () => clearTimeout(timer)
    }, [searchQuery, fetchTasks, updateURLParams])

    // Fetch when filters change
    useEffect(() => {
        setPage(1)
        fetchTasks()
        updateURLParams()
    }, [
        projectFilter,
        statusFilter,
        priorityFilter,
        assigneeFilter,
        dependencyState,
        dateRange,
        dateFilterType,
        viewMode,
    ])

    // Fetch when page changes
    useEffect(() => {
        fetchTasks()
        updateURLParams()
    }, [page])

    // Handle view mode change
    const handleViewChange = (mode: ViewMode) => {
        setViewMode(mode)
        updateURLParams()
    }

    // Clear all filters
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
                        />
                    ) : (
                        <TasksTableView
                            tasks={tasks}
                            total={total}
                            page={page}
                            limit={limit}
                            onPageChange={setPage}
                        />
                    )}
                </>
            )}
        </div>
    )
}

