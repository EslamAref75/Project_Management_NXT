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
import { DatePickerWithRange } from "@/components/ui/date-range-picker"
import { DateRange } from "react-day-picker"
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

    const handleDateRangeChange = (range: DateRange | undefined) => {
        onDateRangeChange({
            start: range?.from,
            end: range?.to
        })
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
                            <DatePickerWithRange
                                date={{
                                    from: dateRange.start,
                                    to: dateRange.end
                                }}
                                setDate={handleDateRangeChange}
                                className="w-[240px]"
                            />
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

