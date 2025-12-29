import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ProjectTypesPanel } from "@/components/settings/project-types-panel"
import { ProjectStatusesPanel } from "@/components/settings/project-statuses-panel"
import { TaskStatusesPanel } from "@/components/settings/task-statuses-panel"

export default async function ProjectsSettingsPage() {
    const session = await getServerSession(authOptions)
    
    if (!session) {
        redirect("/login")
    }

    // Only admins and project managers can access
    const isAdmin = session.user.role === "admin"
    const isProjectManager = session.user.role === "project_manager"
    
    if (!isAdmin && !isProjectManager) {
        redirect("/dashboard")
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Project Metadata Settings</h2>
                <p className="text-muted-foreground">
                    Manage project types and statuses dynamically. Changes reflect across the entire system.
                </p>
            </div>

            <Tabs defaultValue="types" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="types">Project Types</TabsTrigger>
                    <TabsTrigger value="statuses">Project Statuses</TabsTrigger>
                    <TabsTrigger value="task-statuses">Task Statuses</TabsTrigger>
                </TabsList>
                
                <TabsContent value="types" className="space-y-4">
                    <div className="p-4 border rounded-lg bg-card">
                        <ProjectTypesPanel />
                    </div>
                </TabsContent>
                
                <TabsContent value="statuses" className="space-y-4">
                    <div className="p-4 border rounded-lg bg-card">
                        <ProjectStatusesPanel />
                    </div>
                </TabsContent>
                
                <TabsContent value="task-statuses" className="space-y-4">
                    <div className="p-4 border rounded-lg bg-card">
                        <TaskStatusesPanel />
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    )
}

