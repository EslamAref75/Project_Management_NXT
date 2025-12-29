"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { X, Calendar, Filter } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

interface TasksFiltersProps {
    projectFilter: string[]
    onProjectChange: (projects: string[]) => void
    statusFilter: string[]
    onStatusChange: (statuses: string[]) => void
    priorityFilter: string[]
    onPriorityChange: (priorities: string[]) => void
    assigneeFilter: string
    onAssigneeChange: (assignee: string) => void
    dependencyState: string
    onDependencyStateChange: (state: string) => void
    dateRange: { start?: Date; end?: Date }
    onDateRangeChange: (range: { start?: Date; end?: Date }) => void
    dateFilterType: "dueDate" | "createdDate"
    onDateFilterTypeChange: (type: "dueDate" | "createdDate") => void
    projects: any[]
    users: any[]
    currentUserId: number
    onClear: () => void
}

const statuses = ["pending", "in_progress", "review", "waiting", "completed"]
const priorities = ["low", "normal", "high", "urgent"]
const dependencyStates = [
    { value: "all", label: "All Tasks" },
    { value: "blocked", label: "Blocked" },
    { value: "free", label: "Free" },
    { value: "blocking", label: "Blocking Others" },
]

export function TasksFilters({
    projectFilter,
    onProjectChange,
    statusFilter,
    onStatusChange,
    priorityFilter,
    onPriorityChange,
    assigneeFilter,
    onAssigneeChange,
    dependencyState,
    onDependencyStateChange,
    dateRange,
    onDateRangeChange,
    dateFilterType,
    onDateFilterTypeChange,
    projects,
    users,
    currentUserId,
    onClear,
}: TasksFiltersProps) {
    const hasActiveFilters =
        projectFilter.length > 0 ||
        statusFilter.length > 0 ||
        priorityFilter.length > 0 ||
        assigneeFilter !== "all" ||
        dependencyState !== "all" ||
        dateRange.start ||
        dateRange.end

    const toggleProject = (projectId: string) => {
        if (projectFilter.includes(projectId)) {
            onProjectChange(projectFilter.filter((p) => p !== projectId))
        } else {
            onProjectChange([...projectFilter, projectId])
        }
    }

    const toggleStatus = (status: string) => {
        if (statusFilter.includes(status)) {
            onStatusChange(statusFilter.filter((s) => s !== status))
        } else {
            onStatusChange([...statusFilter, status])
        }
    }

    const togglePriority = (priority: string) => {
        if (priorityFilter.includes(priority)) {
            onPriorityChange(priorityFilter.filter((p) => p !== priority))
        } else {
            onPriorityChange([...priorityFilter, priority])
        }
    }

    const applyDatePreset = (preset: "today" | "week" | "month" | "overdue") => {
        const now = new Date()
        let start: Date
        let end: Date | undefined

        switch (preset) {
            case "today":
                start = new Date(now.setHours(0, 0, 0, 0))
                end = new Date(now.setHours(23, 59, 59, 999))
                break
            case "week":
                start = new Date(now.setDate(now.getDate() - 7))
                end = new Date()
                break
            case "month":
                start = new Date(now.setMonth(now.getMonth() - 1))
                end = new Date()
                break
            case "overdue":
                start = new Date(0) // Beginning of time
                end = new Date(now.setHours(0, 0, 0, 0))
                break
        }

        onDateRangeChange({ start, end })
    }

    return (
        <Card>
            <CardContent className="pt-6">
                <div className="flex flex-wrap items-center gap-4">
                    {/* Project Filter */}
                    <div className="space-y-2">
                        <Label className="text-xs">Project</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" size="sm" className="h-9">
                                    <Filter className="h-4 w-4 mr-2" />
                                    Project
                                    {projectFilter.length > 0 && (
                                        <Badge variant="secondary" className="ml-2">
                                            {projectFilter.length}
                                        </Badge>
                                    )}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-56" align="start">
                                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                                    {projects.map((project) => (
                                        <div key={project.id} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={`proj-${project.id}`}
                                                checked={projectFilter.includes(project.id.toString())}
                                                onCheckedChange={() => toggleProject(project.id.toString())}
                                            />
                                            <label
                                                htmlFor={`proj-${project.id}`}
                                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                            >
                                                {project.name}
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </PopoverContent>
                        </Popover>
                    </div>

                    {/* Status Filter */}
                    <div className="space-y-2">
                        <Label className="text-xs">Status</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" size="sm" className="h-9">
                                    <Filter className="h-4 w-4 mr-2" />
                                    Status
                                    {statusFilter.length > 0 && (
                                        <Badge variant="secondary" className="ml-2">
                                            {statusFilter.length}
                                        </Badge>
                                    )}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-56" align="start">
                                <div className="space-y-2">
                                    {statuses.map((status) => (
                                        <div key={status} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={`status-${status}`}
                                                checked={statusFilter.includes(status)}
                                                onCheckedChange={() => toggleStatus(status)}
                                            />
                                            <label
                                                htmlFor={`status-${status}`}
                                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 capitalize cursor-pointer"
                                            >
                                                {status.replace("_", " ")}
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </PopoverContent>
                        </Popover>
                    </div>

                    {/* Priority Filter */}
                    <div className="space-y-2">
                        <Label className="text-xs">Priority</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" size="sm" className="h-9">
                                    <Filter className="h-4 w-4 mr-2" />
                                    Priority
                                    {priorityFilter.length > 0 && (
                                        <Badge variant="secondary" className="ml-2">
                                            {priorityFilter.length}
                                        </Badge>
                                    )}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-56" align="start">
                                <div className="space-y-2">
                                    {priorities.map((priority) => (
                                        <div key={priority} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={`prio-${priority}`}
                                                checked={priorityFilter.includes(priority)}
                                                onCheckedChange={() => togglePriority(priority)}
                                            />
                                            <label
                                                htmlFor={`prio-${priority}`}
                                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 capitalize cursor-pointer"
                                            >
                                                {priority}
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </PopoverContent>
                        </Popover>
                    </div>

                    {/* Assignee Filter */}
                    <div className="space-y-2">
                        <Label className="text-xs">Assignee</Label>
                        <Select value={assigneeFilter} onValueChange={onAssigneeChange}>
                            <SelectTrigger className="w-[150px] h-9">
                                <SelectValue placeholder="All Users" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Users</SelectItem>
                                <SelectItem value="me">Me</SelectItem>
                                {users.map((user) => (
                                    <SelectItem key={user.id} value={user.id.toString()}>
                                        {user.username}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Dependency State Filter */}
                    <div className="space-y-2">
                        <Label className="text-xs">Dependency</Label>
                        <Select value={dependencyState} onValueChange={onDependencyStateChange}>
                            <SelectTrigger className="w-[160px] h-9">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {dependencyStates.map((state) => (
                                    <SelectItem key={state.value} value={state.value}>
                                        {state.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Date Range Filter */}
                    <div className="space-y-2">
                        <Label className="text-xs">Date</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className={cn(
                                        "h-9 justify-start text-left font-normal",
                                        !dateRange.start && !dateRange.end && "text-muted-foreground"
                                    )}
                                >
                                    <Calendar className="mr-2 h-4 w-4" />
                                    {dateRange.start && dateRange.end ? (
                                        <>
                                            {format(dateRange.start, "MMM d")} -{" "}
                                            {format(dateRange.end, "MMM d")}
                                        </>
                                    ) : dateRange.start ? (
                                        format(dateRange.start, "MMM d")
                                    ) : (
                                        <span>Pick a date range</span>
                                    )}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <div className="p-3 space-y-3 border-b">
                                    <div className="space-y-2">
                                        <Label className="text-xs">Filter by</Label>
                                        <RadioGroup
                                            value={dateFilterType}
                                            onValueChange={(value) =>
                                                onDateFilterTypeChange(value as "dueDate" | "createdDate")
                                            }
                                        >
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="dueDate" id="dueDate" />
                                                <label htmlFor="dueDate" className="text-sm cursor-pointer">
                                                    Due Date
                                                </label>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="createdDate" id="createdDate" />
                                                <label htmlFor="createdDate" className="text-sm cursor-pointer">
                                                    Created Date
                                                </label>
                                            </div>
                                        </RadioGroup>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => applyDatePreset("today")}
                                        >
                                            Today
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => applyDatePreset("week")}
                                        >
                                            This Week
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => applyDatePreset("month")}
                                        >
                                            This Month
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => applyDatePreset("overdue")}
                                        >
                                            Overdue
                                        </Button>
                                    </div>
                                </div>
                                <CalendarComponent
                                    mode="range"
                                    selected={{
                                        from: dateRange.start,
                                        to: dateRange.end,
                                    }}
                                    onSelect={(range) =>
                                        onDateRangeChange({
                                            start: range?.from,
                                            end: range?.to,
                                        })
                                    }
                                    numberOfMonths={2}
                                />
                            </PopoverContent>
                        </Popover>
                    </div>

                    {/* Clear Filters */}
                    {hasActiveFilters && (
                        <div className="flex items-end">
                            <Button variant="ghost" size="sm" onClick={onClear}>
                                <X className="h-4 w-4 mr-2" />
                                Clear All
                            </Button>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}

