"use client"

import { useState, useEffect, useTransition } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { UserTaskCard } from "./user-task-card"
import { ProjectTaskCard } from "./project-task-card"
import { AssignmentModal } from "./assignment-modal"
import { Search, RefreshCw } from "lucide-react"
import { getUsersTaskCounts, getProjectsWithUserTasks } from "@/app/actions/today-tasks-assignment"
import { format } from "date-fns"

interface User {
    id: number
    username: string
    email: string
    role: string
    avatarUrl: string | null
    team: { id: number; name: string } | null
    activeProjectsCount: number
}

interface TasksManagementPageProps {
    users: User[]
    teams: Array<{ id: number; name: string }>
    initialCounts?: Record<number, { today: number; total: number }>
}

export function TasksManagementPage({ users, teams, initialCounts = {} }: TasksManagementPageProps) {
    const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), "yyyy-MM-dd"))
    const [searchQuery, setSearchQuery] = useState("")
    const [viewMode, setViewMode] = useState<"user" | "project">("user")
    const [selectedTeamId, setSelectedTeamId] = useState<string>("all")
    const [selectedUserId, setSelectedUserId] = useState<number | null>(null)
    const [modalOpen, setModalOpen] = useState(false)
    const [userTaskCounts, setUserTaskCounts] = useState<Record<number, { today: number; total: number }>>(initialCounts)
    const [projects, setProjects] = useState<any[]>([])
    const [isPending, startTransition] = useTransition()
    const [loading, setLoading] = useState(false)

    // Load task counts when date changes (for user view)
    useEffect(() => {
        if (viewMode === "user") {
            const loadTaskCounts = async () => {
                setLoading(true)
                try {
                    const date = selectedDate ? new Date(selectedDate) : new Date()
                    const result = await getUsersTaskCounts(date)
                    if (result.success && result.counts) {
                        setUserTaskCounts(result.counts)
                    }
                } catch (e) {
                    console.error("Failed to load task counts:", e)
                } finally {
                    setLoading(false)
                }
            }
            loadTaskCounts()
        }
    }, [selectedDate, viewMode])

    // Load projects with tasks when date changes (for project view)
    useEffect(() => {
        if (viewMode === "project") {
            const loadProjects = async () => {
                setLoading(true)
                try {
                    const date = selectedDate ? new Date(selectedDate) : new Date()
                    const result = await getProjectsWithUserTasks(date)
                    if (result.success && result.projects) {
                        setProjects(result.projects)
                    }
                } catch (e) {
                    console.error("Failed to load projects:", e)
                } finally {
                    setLoading(false)
                }
            }
            loadProjects()
        }
    }, [selectedDate, viewMode])

    // Filter users based on search, team, and view mode
    const filteredUsers = users.filter(user => {
        // Search filter
        const matchesSearch = searchQuery === "" ||
            user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (user.team && user.team.name.toLowerCase().includes(searchQuery.toLowerCase()))

        // Team filter
        const matchesTeam = selectedTeamId === "all" ||
            (selectedTeamId === "none" && !user.team) ||
            (user.team && user.team.id.toString() === selectedTeamId)

        return matchesSearch && matchesTeam
    })

    // Filter projects based on search
    const filteredProjects = projects.filter((project: any) => {
        if (searchQuery === "") return true

        const query = searchQuery.toLowerCase()
        const matchesName = project.name?.toLowerCase().includes(query) || false

        const matchesTask = (project.todayTasks || []).some((task: any) =>
            task.title?.toLowerCase().includes(query) ||
            (task.assignees || []).some((a: any) =>
                a.username?.toLowerCase().includes(query) ||
                a.email?.toLowerCase().includes(query)
            )
        )

        return matchesName || matchesTask
    })

    const handleEditClick = (userId: number) => {
        setSelectedUserId(userId)
        setModalOpen(true)
    }

    const handleRefresh = () => {
        startTransition(async () => {
            setLoading(true)
            try {
                const date = selectedDate ? new Date(selectedDate) : new Date()
                if (viewMode === "user") {
                    const result = await getUsersTaskCounts(date)
                    if (result.success && result.counts) {
                        setUserTaskCounts(result.counts)
                    }
                } else {
                    const result = await getProjectsWithUserTasks(date)
                    if (result.success && result.projects) {
                        setProjects(result.projects)
                    }
                }
            } catch (e) {
                console.error("Failed to refresh:", e)
            } finally {
                setLoading(false)
            }
        })
    }

    const selectedUser = users.find(u => u.id === selectedUserId)

    return (
        <>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight">Today&apos;s Tasks Management</h2>
                        <p className="text-muted-foreground mt-1">
                            Manage daily tasks for all users
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="w-[160px]"
                        />
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={handleRefresh}
                            disabled={loading || isPending}
                        >
                            <RefreshCw className={`h-4 w-4 ${loading || isPending ? 'animate-spin' : ''}`} />
                        </Button>
                    </div>
                </div>

                {/* Search and Filter Section */}
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by username, task, or project..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant={viewMode === "user" ? "default" : "outline"}
                            onClick={() => setViewMode("user")}
                            size="sm"
                        >
                            By User
                        </Button>
                        <Button
                            variant={viewMode === "project" ? "default" : "outline"}
                            onClick={() => setViewMode("project")}
                            size="sm"
                        >
                            By Project
                        </Button>
                        <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
                            <SelectTrigger className="w-[140px]">
                                <SelectValue placeholder="All Teams" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Teams</SelectItem>
                                <SelectItem value="none">No Team</SelectItem>
                                {teams.map((team) => (
                                    <SelectItem key={team.id} value={team.id.toString()}>
                                        {team.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Content based on view mode */}
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <p className="text-muted-foreground">Loading...</p>
                    </div>
                ) : viewMode === "user" ? (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredUsers.map((user) => (
                                <UserTaskCard
                                    key={user.id}
                                    user={user}
                                    todayTasksCount={userTaskCounts[user.id]?.today || 0}
                                    totalTasksCount={userTaskCounts[user.id]?.total || 0}
                                    onEditClick={() => handleEditClick(user.id)}
                                />
                            ))}
                        </div>
                        {filteredUsers.length === 0 && (
                            <div className="text-center py-12 text-muted-foreground">
                                <p>No users found matching your filters</p>
                            </div>
                        )}
                    </>
                ) : (
                    <>
                        <div className="space-y-4">
                            {filteredProjects.map((project) => (
                                <ProjectTaskCard
                                    key={project.id}
                                    project={project}
                                />
                            ))}
                        </div>
                        {filteredProjects.length === 0 && (
                            <div className="text-center py-12 text-muted-foreground">
                                <p>No projects found matching your filters</p>
                            </div>
                        )}
                    </>
                )}
            </div>

            {selectedUser && (
                <AssignmentModal
                    userId={selectedUser.id}
                    userName={selectedUser.username}
                    open={modalOpen}
                    onOpenChange={(open) => {
                        setModalOpen(open)
                        if (!open) {
                            setSelectedUserId(null)
                        }
                    }}
                    selectedDate={selectedDate ? new Date(selectedDate) : undefined}
                />
            )}
        </>
    )
}

// Helper function to get user projects (we'll need to import this)
async function getUserProjects(userId: number) {
    const { getUserProjects } = await import("@/app/actions/today-tasks-assignment")
    return getUserProjects(userId)
}

