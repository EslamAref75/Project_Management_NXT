import { getFocusData } from "@/app/actions/focus"
import { FocusSummary } from "@/components/focus/focus-summary"
import { FocusBoardWrapper } from "@/components/focus/focus-board-wrapper"

export default async function FocusPage() {
    const data = await getFocusData()

    if (data.error) {
        return (
            <div className="p-8 text-center text-red-500">
                <h3 className="text-lg font-bold">Error Loading Focus Board</h3>
                <p>Please try refreshing the page. ({data.error})</p>
            </div>
        )
    }

    // JSON parse/stringify is still a good safety net for Date objects if not using exact selection
    const focusTasks = JSON.parse(JSON.stringify(data.focusTasks))
    const libraryTasks = JSON.parse(JSON.stringify(data.libraryTasks))

    return (
        <div className="h-full flex flex-col space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Today's Focus</h2>
                    <p className="text-muted-foreground">Organize your day with a visual task board</p>
                </div>
            </div>

            <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg text-center text-blue-600 dark:text-blue-300 font-medium">
                Let's make today count! 💎
            </div>

            <div className="flex-1">
                <FocusBoardWrapper 
                    initialFocusTasks={focusTasks} 
                    initialLibraryTasks={libraryTasks}
                    summaryTasks={focusTasks}
                />
            </div>
        </div>
    )
}
