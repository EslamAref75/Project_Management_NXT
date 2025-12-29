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

interface ProjectType {
    id: number
    name: string
    description: string | null
    isActive: boolean
    displayOrder: number
    color: string | null
    icon: string | null
}

interface ProjectsFiltersProps {
    categoryFilter: string[]
    onCategoryChange: (categories: string[]) => void
    statusFilter: string[]
    onStatusChange: (statuses: string[]) => void
    dateRange: { start?: Date; end?: Date }
    onDateRangeChange: (range: { start?: Date; end?: Date }) => void
    projectManagerFilter: string
    onProjectManagerChange: (manager: string) => void
    users: any[]
    projectTypes?: ProjectType[]
    onClear: () => void
}

const statuses = ["planned", "active", "on_hold", "completed", "cancelled"]

export function ProjectsFilters({
    categoryFilter,
    onCategoryChange,
    statusFilter,
    onStatusChange,
    dateRange,
    onDateRangeChange,
    projectManagerFilter,
    onProjectManagerChange,
    users,
    projectTypes = [],
    onClear,
}: ProjectsFiltersProps) {
    const hasActiveFilters =
        categoryFilter.length > 0 ||
        statusFilter.length > 0 ||
        dateRange.start ||
        dateRange.end ||
        projectManagerFilter !== "all"

    const toggleCategory = (category: string) => {
        if (categoryFilter.includes(category)) {
            onCategoryChange(categoryFilter.filter((c) => c !== category))
        } else {
            onCategoryChange([...categoryFilter, category])
        }
    }

    const toggleStatus = (status: string) => {
        if (statusFilter.includes(status)) {
            onStatusChange(statusFilter.filter((s) => s !== status))
        } else {
            onStatusChange([...statusFilter, status])
        }
    }

    const applyDatePreset = (preset: "today" | "week" | "month") => {
        const now = new Date()
        let start: Date
        let end: Date = now

        switch (preset) {
            case "today":
                start = new Date(now.setHours(0, 0, 0, 0))
                break
            case "week":
                start = new Date(now.setDate(now.getDate() - 7))
                break
            case "month":
                start = new Date(now.setMonth(now.getMonth() - 1))
                break
        }

        onDateRangeChange({ start, end })
    }

    return (
        <Card>
            <CardContent className="pt-6">
                <div className="flex flex-wrap items-center gap-4">
                    {/* Category Filter */}
                    <div className="space-y-2">
                        <Label className="text-xs">Category</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" size="sm" className="h-9">
                                    <Filter className="h-4 w-4 mr-2" />
                                    Category
                                    {categoryFilter.length > 0 && (
                                        <Badge variant="secondary" className="ml-2">
                                            {categoryFilter.length}
                                        </Badge>
                                    )}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-56" align="start">
                                <div className="space-y-2">
                                    {projectTypes.length === 0 ? (
                                        <p className="text-sm text-muted-foreground p-2">
                                            No project types available
                                        </p>
                                    ) : (
                                        projectTypes.map((type) => (
                                            <div key={type.id} className="flex items-center space-x-2">
                                                <Checkbox
                                                    id={`cat-${type.id}`}
                                                    checked={categoryFilter.includes(type.name)}
                                                    onCheckedChange={() => toggleCategory(type.name)}
                                                />
                                                <label
                                                    htmlFor={`cat-${type.id}`}
                                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex items-center gap-2"
                                                >
                                                    {type.color && (
                                                        <div
                                                            className="h-3 w-3 rounded-full"
                                                            style={{ backgroundColor: type.color }}
                                                        />
                                                    )}
                                                    {type.name}
                                                </label>
                                            </div>
                                        ))
                                    )}
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

                    {/* Date Range Filter */}
                    <div className="space-y-2">
                        <Label className="text-xs">Date Range</Label>
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
                                <div className="p-3 space-y-2 border-b">
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

                    {/* Project Manager Filter */}
                    <div className="space-y-2">
                        <Label className="text-xs">Project Manager</Label>
                        <Select value={projectManagerFilter} onValueChange={onProjectManagerChange}>
                            <SelectTrigger className="w-[180px] h-9">
                                <SelectValue placeholder="All Managers" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Managers</SelectItem>
                                {users.map((user) => (
                                    <SelectItem key={user.id} value={user.id.toString()}>
                                        {user.username}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
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

