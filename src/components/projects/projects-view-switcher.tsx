"use client"

import { Button } from "@/components/ui/button"
import { LayoutGrid, Table } from "lucide-react"
import { cn } from "@/lib/utils"

type ViewMode = "card" | "table"

interface ProjectsViewSwitcherProps {
    viewMode: ViewMode
    onViewChange: (mode: ViewMode) => void
}

export function ProjectsViewSwitcher({ viewMode, onViewChange }: ProjectsViewSwitcherProps) {
    return (
        <div className="flex items-center gap-1 border rounded-lg p-1">
            <Button
                variant={viewMode === "card" ? "default" : "ghost"}
                size="sm"
                onClick={() => onViewChange("card")}
                className={cn(
                    "h-8",
                    viewMode === "card" && "bg-primary text-primary-foreground"
                )}
            >
                <LayoutGrid className="h-4 w-4 mr-2" />
                Cards
            </Button>
            <Button
                variant={viewMode === "table" ? "default" : "ghost"}
                size="sm"
                onClick={() => onViewChange("table")}
                className={cn(
                    "h-8",
                    viewMode === "table" && "bg-primary text-primary-foreground"
                )}
            >
                <Table className="h-4 w-4 mr-2" />
                Table
            </Button>
        </div>
    )
}

