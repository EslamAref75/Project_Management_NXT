"use client"

import { useState, useEffect, useCallback } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { ProjectsSearchBar } from "./projects-search-bar"
import { ProjectsFilters } from "./projects-filters"
import { ProjectsViewSwitcher } from "./projects-view-switcher"
import { ProjectsCardView } from "./projects-card-view"
import { ProjectsTableView } from "./projects-table-view"
import { ProjectDialog } from "./project-dialog"
import { Button } from "@/components/ui/button"
import { Plus, Loader2, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { getProjectsWithFilters } from "@/app/actions/projects"
import { getProjectTypes } from "@/app/actions/project-types"

type ViewMode = "card" | "table"

interface ProjectsDashboardProps {
    initialProjects: any[]
    initialTotal: number
    users: any[]
}

export function ProjectsDashboard({ initialProjects, initialTotal, users }: ProjectsDashboardProps) {
    const router = useRouter()
    const searchParams = useSearchParams()
    
    // State
    const [projects, setProjects] = useState(initialProjects)
    const [total, setTotal] = useState(initialTotal)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [viewMode, setViewMode] = useState<ViewMode>(
        (searchParams.get("view") as ViewMode) || "card"
    )
    const [projectTypes, setProjectTypes] = useState<any[]>([])

    // Filters state
    const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "")
    const [categoryFilter, setCategoryFilter] = useState<string[]>(
        searchParams.get("category")?.split(",").filter(Boolean) || []
    )
    const [statusFilter, setStatusFilter] = useState<string[]>(
        searchParams.get("status")?.split(",").filter(Boolean) || []
    )
    const [dateRange, setDateRange] = useState<{ start?: Date; end?: Date }>({
        start: searchParams.get("startDate") ? new Date(searchParams.get("startDate")!) : undefined,
        end: searchParams.get("endDate") ? new Date(searchParams.get("endDate")!) : undefined,
    })
    const [projectManagerFilter, setProjectManagerFilter] = useState<string>(
        searchParams.get("projectManager") || "all"
    )
    const [page, setPage] = useState(parseInt(searchParams.get("page") || "1"))
    const [limit] = useState(12)

    // Load project types on mount
    useEffect(() => {
        async function loadProjectTypes() {
            const result = await getProjectTypes(false) // Only active types
            if (result.success) {
                setProjectTypes(result.projectTypes || [])
            }
        }
        loadProjectTypes()
    }, [])

    // Update URL params when filters change
    const updateURLParams = useCallback(() => {
        const params = new URLSearchParams()
        if (searchQuery) params.set("search", searchQuery)
        if (categoryFilter.length > 0) params.set("category", categoryFilter.join(","))
        if (statusFilter.length > 0) params.set("status", statusFilter.join(","))
        if (dateRange.start) params.set("startDate", dateRange.start.toISOString().split("T")[0])
        if (dateRange.end) params.set("endDate", dateRange.end.toISOString().split("T")[0])
        if (projectManagerFilter !== "all") params.set("projectManager", projectManagerFilter)
        if (viewMode !== "card") params.set("view", viewMode)
        if (page > 1) params.set("page", page.toString())
        
        router.push(`/dashboard/projects?${params.toString()}`, { scroll: false })
    }, [searchQuery, categoryFilter, statusFilter, dateRange, projectManagerFilter, viewMode, page, router])

    // Fetch projects with filters
    const fetchProjects = useCallback(async () => {
        setLoading(true)
        setError(null)
        
        try {
            const result = await getProjectsWithFilters({
                search: searchQuery,
                category: categoryFilter,
                status: statusFilter,
                startDate: dateRange.start?.toISOString(),
                endDate: dateRange.end?.toISOString(),
                projectManager: projectManagerFilter !== "all" ? projectManagerFilter : undefined,
                page,
                limit,
            })

            if (result.success) {
                setProjects(result.projects || [])
                setTotal(result.total || 0)
            } else {
                setError(result.error || "Failed to load projects")
            }
        } catch (err: any) {
            setError(err.message || "An error occurred")
        } finally {
            setLoading(false)
        }
    }, [searchQuery, categoryFilter, statusFilter, dateRange, projectManagerFilter, page, limit])

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => {
            setPage(1) // Reset to first page on search
            fetchProjects()
            updateURLParams()
        }, 400)

        return () => clearTimeout(timer)
    }, [searchQuery, fetchProjects, updateURLParams])

    // Fetch when filters change
    useEffect(() => {
        setPage(1)
        fetchProjects()
        updateURLParams()
    }, [categoryFilter, statusFilter, dateRange, projectManagerFilter, viewMode])

    // Fetch when page changes
    useEffect(() => {
        fetchProjects()
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
        setCategoryFilter([])
        setStatusFilter([])
        setDateRange({})
        setProjectManagerFilter("all")
        setPage(1)
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Projects</h2>
                    <p className="text-muted-foreground">
                        Manage your projects and track progress
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <ProjectsViewSwitcher
                        viewMode={viewMode}
                        onViewChange={handleViewChange}
                    />
                            <ProjectDialog onProjectCreated={fetchProjects} />
                </div>
            </div>

            {/* Search Bar */}
            <ProjectsSearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                onClear={() => {
                    setSearchQuery("")
                    handleClearFilters()
                }}
            />

                    {/* Filters Panel */}
                    <ProjectsFilters
                        categoryFilter={categoryFilter}
                        onCategoryChange={setCategoryFilter}
                        statusFilter={statusFilter}
                        onStatusChange={setStatusFilter}
                        dateRange={dateRange}
                        onDateRangeChange={setDateRange}
                        projectManagerFilter={projectManagerFilter}
                        onProjectManagerChange={setProjectManagerFilter}
                        users={users}
                        projectTypes={projectTypes}
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
                        <ProjectsCardView
                            projects={projects}
                            total={total}
                            page={page}
                            limit={limit}
                            onPageChange={setPage}
                            onProjectDeleted={fetchProjects}
                        />
                    ) : (
                        <ProjectsTableView
                            projects={projects}
                            total={total}
                            page={page}
                            limit={limit}
                            onPageChange={setPage}
                            users={users}
                            onProjectDeleted={fetchProjects}
                        />
                    )}
                </>
            )}
        </div>
    )
}

