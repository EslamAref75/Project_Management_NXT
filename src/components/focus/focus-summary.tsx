"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { clearFocus } from "@/app/actions/focus"
import { Trash2, BarChart2, Clock } from "lucide-react"
import { useTransition } from "react"

export function FocusSummary({ tasks }: { tasks: any[] }) {
    const [isPending, startTransition] = useTransition()

    const totalTasks = tasks.length
    const estimatedTime = tasks.reduce((acc, task) => acc + (task.estimatedHours || 0), 0)
    const uniqueProjects = new Set(tasks.map(t => t.project?.name)).size

    function onClear() {
        if (confirm("Clear all tasks from today's focus?")) {
            startTransition(async () => {
                await clearFocus()
            })
        }
    }

    return (
        <div className="space-y-4 h-full">
            <div className="bg-card rounded-xl border shadow-sm p-4">
                <h3 className="font-semibold flex items-center gap-2 mb-4">
                    <BarChart2 className="h-4 w-4" /> Summary
                </h3>

                <div className="space-y-4">
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <p className="text-xs text-muted-foreground uppercase font-semibold">Selected Tasks</p>
                        <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{totalTasks}</p>
                    </div>

                    <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <p className="text-xs text-muted-foreground uppercase font-semibold">Estimated Time</p>
                        <p className="text-2xl font-bold text-green-600 dark:text-green-400">{estimatedTime}h</p>
                    </div>

                    <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                        <p className="text-xs text-muted-foreground uppercase font-semibold">Projects Involved</p>
                        <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{uniqueProjects}</p>
                    </div>
                </div>

                <div className="mt-6">
                    <Button
                        variant="destructive"
                        className="w-full bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 border-0"
                        onClick={onClear}
                        disabled={totalTasks === 0 || isPending}
                    >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Clear All
                    </Button>
                </div>
            </div>
        </div>
    )
}
