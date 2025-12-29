"use client"

import { Input } from "@/components/ui/input"
import { Search, X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface TasksSearchBarProps {
    value: string
    onChange: (value: string) => void
    onClear: () => void
}

export function TasksSearchBar({ value, onChange, onClear }: TasksSearchBarProps) {
    return (
        <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
                type="text"
                placeholder="Search tasks by name, ID, project, or assignee..."
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="pl-10 pr-10"
            />
            {value && (
                <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
                    onClick={onClear}
                >
                    <X className="h-4 w-4" />
                </Button>
            )}
        </div>
    )
}

