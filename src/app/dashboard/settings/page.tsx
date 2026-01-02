import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { ProfileForm } from "@/components/settings/profile-form"
import { PasswordForm } from "@/components/settings/password-form"
import { RBACPermissionsViewServer } from "@/components/settings/rbac-permissions-view-server"
import { RBACInitializeButton } from "@/components/settings/rbac-initialize-button"
import { UserSettingsPanel } from "@/components/settings/user-settings-panel"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getUserSettings, getResolvedUserSettings } from "@/app/actions/user-settings"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Shield, FolderKanban } from "lucide-react"
import { getRoles } from "@/app/actions/rbac"

export default async function SettingsPage() {
    const session = await getServerSession(authOptions)
    if (!session) return null

    const user = await prisma.user.findUnique({
        where: { id: parseInt(session.user.id) }
    })

    if (!user) return null

    // Get user settings
    const [settingsResult, resolvedResult] = await Promise.all([
        getUserSettings(parseInt(session.user.id)),
        getResolvedUserSettings(parseInt(session.user.id))
    ])

    const userSettings = settingsResult.success ? settingsResult.settings : {}
    const resolvedSettings = resolvedResult.success ? resolvedResult.settings : {}

    const isAdmin = session.user.role === "admin"
    
    // Check if RBAC is initialized
    const roles = await getRoles().catch(() => [])
    const isRBACInitialized = Array.isArray(roles) && roles.length > 0

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
                    <p className="text-muted-foreground">
                        Manage your account settings and preferences.
                    </p>
                </div>
                {isAdmin && (
                    <div className="flex gap-2">
                        <Link href="/dashboard/admin/roles">
                            <Button variant="outline">
                                <Shield className="h-4 w-4 mr-2" />
                                Manage Roles
                            </Button>
                        </Link>
                    </div>
                )}
            </div>

            <Tabs defaultValue="profile" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="profile">Profile</TabsTrigger>
                    <TabsTrigger value="security">Security</TabsTrigger>
                    <TabsTrigger value="preferences">Preferences</TabsTrigger>
                    {isAdmin && <TabsTrigger value="roles">Roles & RBAC</TabsTrigger>}
                    {isAdmin && <TabsTrigger value="project-metadata">Project Metadata Settings</TabsTrigger>}
                </TabsList>
                <TabsContent value="profile" className="space-y-4">
                    <div className="p-4 border rounded-lg bg-card">
                        <h3 className="text-lg font-medium mb-4">Profile Information</h3>
                        <ProfileForm user={user} />
                    </div>
                </TabsContent>
                <TabsContent value="security" className="space-y-4">
                    <div className="p-4 border rounded-lg bg-card">
                        <h3 className="text-lg font-medium mb-4">Change Password</h3>
                        <PasswordForm />
                    </div>
                </TabsContent>
                <TabsContent value="preferences" className="space-y-4">
                    {settingsResult.error ? (
                        <div className="p-4 border rounded-lg bg-card">
                            <p className="text-destructive">{settingsResult.error}</p>
                        </div>
                    ) : (
                        <UserSettingsPanel
                            userId={parseInt(session.user.id)}
                            userSettings={userSettings}
                            resolvedSettings={resolvedSettings}
                        />
                    )}
                </TabsContent>
                {isAdmin && (
                    <TabsContent value="roles" className="space-y-4">
                        <div className="p-4 border rounded-lg bg-card space-y-4">
                            {!isRBACInitialized && (
                                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                                    <h3 className="text-lg font-medium mb-2 text-yellow-800 dark:text-yellow-200">
                                        RBAC System Not Initialized
                                    </h3>
                                    <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-4">
                                        The Role-Based Access Control system needs to be initialized. 
                                        This will create default roles and permissions in the database.
                                    </p>
                                    <RBACInitializeButton />
                                </div>
                            )}
                            {isRBACInitialized && (
                                <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg mb-4">
                                    <p className="text-sm text-green-700 dark:text-green-300">
                                        ✓ RBAC system is initialized. {roles.length} role(s) available.
                                    </p>
                                </div>
                            )}
                            <div>
                                <h3 className="text-lg font-medium mb-4">Your Roles & Permissions</h3>
                                <RBACPermissionsViewServer userId={parseInt(session.user.id)} />
                            </div>
                        </div>
                    </TabsContent>
                )}
                {isAdmin && (
                    <TabsContent value="project-metadata" className="space-y-4">
                        <div className="p-4 border rounded-lg bg-card">
                            <div className="space-y-4">
                                <div>
                                    <h3 className="text-lg font-medium mb-2">Project Metadata Settings</h3>
                                    <p className="text-sm text-muted-foreground mb-4">
                                        Manage project types, project statuses, and task statuses dynamically. 
                                        Configure workflows and metadata that apply across all projects.
                                    </p>
                                </div>
                                <Link href="/dashboard/settings/projects">
                                    <Button className="w-full sm:w-auto">
                                        <FolderKanban className="h-4 w-4 mr-2" />
                                        Open Project Metadata Settings
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    </TabsContent>
                )}
            </Tabs>
        </div>
    )
}
