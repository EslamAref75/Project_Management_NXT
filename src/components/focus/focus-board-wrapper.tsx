"use client"

import dynamic from "next/dynamic"

const FocusBoard = dynamic(() => import("./focus-board").then(mod => mod.FocusBoard), {
    ssr: false,
    loading: () => <div className="h-full flex items-center justify-center">Loading board...</div>
})

export function FocusBoardWrapper({ initialFocusTasks, initialLibraryTasks, summaryTasks }: any) {
    return (
        <FocusBoard 
            initialFocusTasks={initialFocusTasks}
            initialLibraryTasks={initialLibraryTasks}
            summaryTasks={summaryTasks || initialFocusTasks}
        />
    )
}
