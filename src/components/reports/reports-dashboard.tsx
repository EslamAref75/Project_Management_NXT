"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { OverviewReports } from "./overview-reports"
import { ProjectReports } from "./project-reports"
import { TaskReports } from "./task-reports"
import { TodaysReports } from "./todays-reports"
import { TeamUserReports } from "./team-user-reports"
import { ActivityReports } from "./activity-reports"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart3 } from "lucide-react"

interface ReportsDashboardProps {
    userId: number
    userRole: string
}

export function ReportsDashboard({ userId, userRole }: ReportsDashboardProps) {
    const isAdmin = userRole === "admin"
    const isProjectManager = userRole === "admin" || userRole === "team_lead"
    const canViewAllReports = isAdmin

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <div className="flex items-center gap-2 mb-2">
                    <BarChart3 className="h-8 w-8 text-primary" />
                    <h2 className="text-3xl font-bold tracking-tight">Reports & Analytics</h2>
                </div>
                <p className="text-muted-foreground">
                    Comprehensive insights into projects, tasks, teams, and system performance
                </p>
            </div>

            {/* Reports Tabs */}
            <Tabs defaultValue="overview" className="space-y-6">
                <TabsList className="grid w-full grid-cols-6">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="projects">Projects</TabsTrigger>
                    <TabsTrigger value="tasks">Tasks</TabsTrigger>
                    <TabsTrigger value="today">Today's Focus</TabsTrigger>
                    {canViewAllReports && (
                        <>
                            <TabsTrigger value="team">Team & Users</TabsTrigger>
                            <TabsTrigger value="activity">Activity & Audit</TabsTrigger>
                        </>
                    )}
                </TabsList>

                <TabsContent value="overview" className="space-y-6">
                    <OverviewReports userId={userId} userRole={userRole} />
                </TabsContent>

                <TabsContent value="projects" className="space-y-6">
                    <ProjectReports userId={userId} userRole={userRole} />
                </TabsContent>

                <TabsContent value="tasks" className="space-y-6">
                    <TaskReports userId={userId} userRole={userRole} />
                </TabsContent>

                <TabsContent value="today" className="space-y-6">
                    <TodaysReports userId={userId} userRole={userRole} />
                </TabsContent>

                {canViewAllReports && (
                    <>
                        <TabsContent value="team" className="space-y-6">
                            <TeamUserReports userId={userId} userRole={userRole} />
                        </TabsContent>

                        <TabsContent value="activity" className="space-y-6">
                            <ActivityReports userId={userId} userRole={userRole} />
                        </TabsContent>
                    </>
                )}
            </Tabs>
        </div>
    )
}

