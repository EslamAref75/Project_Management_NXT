"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ProjectOverviewTab } from "./project-overview-tab"
import { ProjectTasksTab } from "./project-tasks-tab"
import { ProjectBoardTab } from "./project-board-tab"
import { ProjectTeamTab } from "./project-team-tab"
import { ProjectTodaysTasksTab } from "./project-todays-tasks-tab"
import { ProjectFilesTab } from "./project-files-tab"
import { ProjectActivityTab } from "./project-activity-tab"
import { ProjectReportsTab } from "./project-reports-tab"
import { useSearchParams, useRouter } from "next/navigation"
import { useEffect } from "react"

interface ProjectTabsProps {
    project: any
    users: any[]
    stats: any
}

export function ProjectTabs({ project, users, stats }: ProjectTabsProps) {
    const searchParams = useSearchParams()
    const router = useRouter()
    const tab = searchParams.get("tab") || "overview"

    const handleTabChange = (value: string) => {
        const params = new URLSearchParams(searchParams.toString())
        params.set("tab", value)
        router.push(`?${params.toString()}`, { scroll: false })
    }

    return (
        <Tabs value={tab} onValueChange={handleTabChange} className="space-y-6">
            <TabsList className="grid w-full grid-cols-4 lg:grid-cols-9">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="tasks">Tasks</TabsTrigger>
                <TabsTrigger value="board">Board</TabsTrigger>
                <TabsTrigger value="team">Team</TabsTrigger>
                <TabsTrigger value="todays-tasks">Today's Tasks</TabsTrigger>
                <TabsTrigger value="files">Files</TabsTrigger>
                <TabsTrigger value="activity">Activity</TabsTrigger>
                <TabsTrigger value="reports">Reports</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
                <ProjectOverviewTab project={project} stats={stats} users={users} />
            </TabsContent>

            <TabsContent value="tasks" className="space-y-6">
                <ProjectTasksTab project={project} users={users} />
            </TabsContent>

            <TabsContent value="board" className="space-y-6">
                <ProjectBoardTab project={project} users={users} />
            </TabsContent>

            <TabsContent value="team" className="space-y-6">
                <ProjectTeamTab project={project} />
            </TabsContent>

            <TabsContent value="todays-tasks" className="space-y-6">
                <ProjectTodaysTasksTab project={project} users={users} />
            </TabsContent>

            <TabsContent value="files" className="space-y-6">
                <ProjectFilesTab project={project} />
            </TabsContent>

            <TabsContent value="activity" className="space-y-6">
                <ProjectActivityTab project={project} />
            </TabsContent>

            <TabsContent value="reports" className="space-y-6">
                <ProjectReportsTab project={project} stats={stats} />
            </TabsContent>
        </Tabs>
    )
}

