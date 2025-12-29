"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { 
    updateUserSetting, 
    resetUserSetting 
} from "@/app/actions/user-settings"
import { useTransition } from "react"
import { Loader2, Save, RotateCcw } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { useRouter } from "next/navigation"

interface UserSettingsPanelProps {
    userId: number
    userSettings: Record<string, any[]>
    resolvedSettings: Record<string, any>
}

export function UserSettingsPanel({
    userId,
    userSettings,
    resolvedSettings
}: UserSettingsPanelProps) {
    const [activeTab, setActiveTab] = useState("preferences")
    const [isPending, startTransition] = useTransition()
    const { toast } = useToast()
    const router = useRouter()

    const handleSave = async (category: string, data: any) => {
        startTransition(async () => {
            const result = await updateUserSetting(userId, category, data)
            if (result.success) {
                toast({
                    title: "Success",
                    description: "Settings saved successfully"
                })
                router.refresh()
            } else {
                toast({
                    title: "Error",
                    description: result.error || "Failed to save settings",
                    variant: "destructive"
                })
            }
        })
    }

    const handleReset = async (category: string) => {
        startTransition(async () => {
            const result = await resetUserSetting(userId, category)
            if (result.success) {
                toast({
                    title: "Success",
                    description: "Settings reset to default"
                })
                router.refresh()
            } else {
                toast({
                    title: "Error",
                    description: result.error || "Failed to reset settings",
                    variant: "destructive"
                })
            }
        })
    }

    const getSetting = (category: string) => {
        const settings = userSettings[category]
        if (!settings || settings.length === 0) return null
        return settings.find((s: any) => s.key === category) || settings[0] || null
    }

    const getResolvedValue = (category: string) => {
        const resolved = resolvedSettings[category]
        if (!resolved) return null
        return resolved.value || null
    }

    return (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="preferences">Personal</TabsTrigger>
                <TabsTrigger value="todayTasks">Today's Tasks</TabsTrigger>
                <TabsTrigger value="notifications">Notifications</TabsTrigger>
                <TabsTrigger value="workflow">Workflow</TabsTrigger>
            </TabsList>

            {/* Personal Preferences */}
            <TabsContent value="preferences">
                <PersonalPreferences
                    userId={userId}
                    setting={getSetting("preferences")}
                    resolvedValue={getResolvedValue("preferences")}
                    onSave={handleSave}
                    onReset={handleReset}
                    isPending={isPending}
                />
            </TabsContent>

            {/* Today's Tasks */}
            <TabsContent value="todayTasks">
                <TodayTasksSettings
                    userId={userId}
                    setting={getSetting("todayTasks")}
                    resolvedValue={getResolvedValue("todayTasks")}
                    onSave={handleSave}
                    onReset={handleReset}
                    isPending={isPending}
                />
            </TabsContent>

            {/* Notifications */}
            <TabsContent value="notifications">
                <NotificationSettings
                    userId={userId}
                    setting={getSetting("notifications")}
                    resolvedValue={getResolvedValue("notifications")}
                    onSave={handleSave}
                    onReset={handleReset}
                    isPending={isPending}
                />
            </TabsContent>

            {/* Workflow */}
            <TabsContent value="workflow">
                <WorkflowSettings
                    userId={userId}
                    setting={getSetting("workflow")}
                    resolvedValue={getResolvedValue("workflow")}
                    onSave={handleSave}
                    onReset={handleReset}
                    isPending={isPending}
                />
            </TabsContent>
        </Tabs>
    )
}

// Personal Preferences Component
function PersonalPreferences({ userId, setting, resolvedValue, onSave, onReset, isPending }: any) {
    const [timezone, setTimezone] = useState(setting?.value?.timezone || resolvedValue?.timezone || "Africa/Cairo")
    const [workingHours, setWorkingHours] = useState(setting?.value?.workingHours || resolvedValue?.workingHours || { start: "09:00", end: "17:00" })

    const handleSave = () => {
        onSave("preferences", {
            timezone,
            workingHours
        })
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Personal Preferences</CardTitle>
                <CardDescription>Configure your timezone and working hours</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2">
                    <Label>Display Timezone</Label>
                    <Select value={timezone} onValueChange={setTimezone}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Africa/Cairo">Cairo, Egypt (GMT+2)</SelectItem>
                            <SelectItem value="UTC">UTC</SelectItem>
                            <SelectItem value="America/New_York">America/New_York</SelectItem>
                            <SelectItem value="America/Los_Angeles">America/Los_Angeles</SelectItem>
                            <SelectItem value="Europe/London">Europe/London</SelectItem>
                            <SelectItem value="Asia/Dubai">Asia/Dubai</SelectItem>
                        </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">This only affects how dates/times are displayed to you</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Start Time</Label>
                        <Input
                            type="time"
                            value={workingHours.start}
                            onChange={(e) => setWorkingHours({ ...workingHours, start: e.target.value })}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>End Time</Label>
                        <Input
                            type="time"
                            value={workingHours.end}
                            onChange={(e) => setWorkingHours({ ...workingHours, end: e.target.value })}
                        />
                    </div>
                </div>

                <div className="flex gap-2">
                    <Button onClick={handleSave} disabled={isPending}>
                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        <Save className="mr-2 h-4 w-4" />
                        Save Changes
                    </Button>
                    {setting && (
                        <Button variant="outline" onClick={() => onReset("preferences")} disabled={isPending}>
                            <RotateCcw className="mr-2 h-4 w-4" />
                            Reset to Default
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}

// Today's Tasks Settings Component
function TodayTasksSettings({ userId, setting, resolvedValue, onSave, onReset, isPending }: any) {
    const [autoOpenOnLogin, setAutoOpenOnLogin] = useState(setting?.value?.autoOpenOnLogin ?? resolvedValue?.autoOpenOnLogin ?? false)
    const [defaultView, setDefaultView] = useState(setting?.value?.defaultView || resolvedValue?.defaultView || "compact")
    const [highlightBlocked, setHighlightBlocked] = useState(setting?.value?.highlightBlocked ?? resolvedValue?.highlightBlocked ?? true)
    const [showDependencyDetails, setShowDependencyDetails] = useState(setting?.value?.showDependencyDetails ?? resolvedValue?.showDependencyDetails ?? false)

    const handleSave = () => {
        onSave("todayTasks", {
            autoOpenOnLogin,
            defaultView,
            highlightBlocked,
            showDependencyDetails
        })
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Today's Tasks Display</CardTitle>
                <CardDescription>Configure how Today's Tasks are displayed</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                        <Label>Auto-Open Today's Tasks on Login</Label>
                        <p className="text-sm text-muted-foreground">Automatically navigate to Today's Focus after login</p>
                    </div>
                    <Switch
                        checked={autoOpenOnLogin}
                        onCheckedChange={setAutoOpenOnLogin}
                    />
                </div>

                <div className="space-y-2">
                    <Label>Default View</Label>
                    <Select value={defaultView} onValueChange={setDefaultView}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="compact">Compact</SelectItem>
                            <SelectItem value="detailed">Detailed</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                        <Label>Highlight Blocked Tasks</Label>
                        <p className="text-sm text-muted-foreground">Apply visual emphasis to blocked tasks</p>
                    </div>
                    <Switch
                        checked={highlightBlocked}
                        onCheckedChange={setHighlightBlocked}
                    />
                </div>

                <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                        <Label>Show Dependency Details Inline</Label>
                        <p className="text-sm text-muted-foreground">Show prerequisite task information in task cards</p>
                    </div>
                    <Switch
                        checked={showDependencyDetails}
                        onCheckedChange={setShowDependencyDetails}
                    />
                </div>

                <div className="flex gap-2">
                    <Button onClick={handleSave} disabled={isPending}>
                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        <Save className="mr-2 h-4 w-4" />
                        Save Changes
                    </Button>
                    {setting && (
                        <Button variant="outline" onClick={() => onReset("todayTasks")} disabled={isPending}>
                            <RotateCcw className="mr-2 h-4 w-4" />
                            Reset to Default
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}

// Notification Settings Component
function NotificationSettings({ userId, setting, resolvedValue, onSave, onReset, isPending }: any) {
    const [channels, setChannels] = useState(setting?.value?.channels || resolvedValue?.channels || { inApp: true, email: true })
    const [grouping, setGrouping] = useState(setting?.value?.grouping || resolvedValue?.grouping || "realtime")
    const [priorityFilter, setPriorityFilter] = useState(setting?.value?.priorityFilter || resolvedValue?.priorityFilter || ["low", "normal", "high", "urgent"])
    const [soundEnabled, setSoundEnabled] = useState(setting?.value?.soundEnabled ?? resolvedValue?.soundEnabled ?? true)

    const handleSave = () => {
        onSave("notifications", {
            channels,
            grouping,
            priorityFilter,
            soundEnabled
        })
    }

    const togglePriority = (priority: string) => {
        if (priority === "high" || priority === "urgent") {
            // Cannot remove high or urgent
            return
        }
        if (priorityFilter.includes(priority)) {
            setPriorityFilter(priorityFilter.filter((p: string) => p !== priority))
        } else {
            setPriorityFilter([...priorityFilter, priority].sort())
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>Configure how you receive notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-4">
                    <Label>Notification Channels</Label>
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label>In-App Notifications</Label>
                            <p className="text-sm text-muted-foreground">Critical notifications always enabled</p>
                        </div>
                        <Switch
                            checked={channels.inApp}
                            onCheckedChange={(checked) => setChannels({ ...channels, inApp: checked })}
                        />
                    </div>
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label>Email Notifications</Label>
                        </div>
                        <Switch
                            checked={channels.email}
                            onCheckedChange={(checked) => setChannels({ ...channels, email: checked })}
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label>Notification Grouping</Label>
                    <Select value={grouping} onValueChange={setGrouping}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="realtime">Real-time</SelectItem>
                            <SelectItem value="dailyDigest">Daily Digest</SelectItem>
                        </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">Critical notifications are always real-time</p>
                </div>

                <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                        <Label>Notification Sound</Label>
                        <p className="text-sm text-muted-foreground">Play sound when notifications arrive</p>
                    </div>
                    <Switch
                        checked={soundEnabled}
                        onCheckedChange={setSoundEnabled}
                    />
                </div>

                <div className="space-y-2">
                    <Label>Priority Filter</Label>
                    <div className="flex flex-wrap gap-2">
                        {["low", "normal", "high", "urgent"].map((priority) => (
                            <Button
                                key={priority}
                                variant={priorityFilter.includes(priority) ? "default" : "outline"}
                                size="sm"
                                onClick={() => togglePriority(priority)}
                                disabled={priority === "high" || priority === "urgent"}
                            >
                                {priority.charAt(0).toUpperCase() + priority.slice(1)}
                            </Button>
                        ))}
                    </div>
                    <p className="text-xs text-muted-foreground">High and Urgent priority notifications cannot be disabled</p>
                </div>

                <div className="flex gap-2">
                    <Button onClick={handleSave} disabled={isPending}>
                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        <Save className="mr-2 h-4 w-4" />
                        Save Changes
                    </Button>
                    {setting && (
                        <Button variant="outline" onClick={() => onReset("notifications")} disabled={isPending}>
                            <RotateCcw className="mr-2 h-4 w-4" />
                            Reset to Default
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}

// Workflow Settings Component
function WorkflowSettings({ userId, setting, resolvedValue, onSave, onReset, isPending }: any) {
    const [defaultLandingPage, setDefaultLandingPage] = useState(setting?.value?.defaultLandingPage || resolvedValue?.defaultLandingPage || "dashboard")
    const [defaultProjectContext, setDefaultProjectContext] = useState(setting?.value?.defaultProjectContext || resolvedValue?.defaultProjectContext || null)
    const [standupSummaryDisplay, setStandupSummaryDisplay] = useState(setting?.value?.standupSummaryDisplay || resolvedValue?.standupSummaryDisplay || { enabled: false, format: "compact" })

    const handleSave = () => {
        onSave("workflow", {
            defaultLandingPage,
            defaultProjectContext: defaultProjectContext || null,
            standupSummaryDisplay
        })
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Daily Workflow Preferences</CardTitle>
                <CardDescription>Configure your default workflow and landing page</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2">
                    <Label>Default Landing Page</Label>
                    <Select value={defaultLandingPage} onValueChange={setDefaultLandingPage}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="dashboard">Dashboard</SelectItem>
                            <SelectItem value="todayFocus">Today's Focus</SelectItem>
                            <SelectItem value="projects">Projects</SelectItem>
                            <SelectItem value="tasks">Tasks</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label>Default Project Context</Label>
                    <Select value={defaultProjectContext ? defaultProjectContext.toString() : "all"} onValueChange={(value) => setDefaultProjectContext(value === "all" ? null : parseInt(value))}>
                        <SelectTrigger>
                            <SelectValue placeholder="All Projects" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Projects</SelectItem>
                            {/* Project list would be fetched and populated here */}
                        </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">Pre-select a project context for task creation</p>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label>Show Stand-up Summary</Label>
                            <p className="text-sm text-muted-foreground">Display daily stand-up summary widget</p>
                        </div>
                        <Switch
                            checked={standupSummaryDisplay.enabled}
                            onCheckedChange={(checked) => setStandupSummaryDisplay({ ...standupSummaryDisplay, enabled: checked })}
                        />
                    </div>
                    {standupSummaryDisplay.enabled && (
                        <div className="space-y-2">
                            <Label>Summary Format</Label>
                            <Select 
                                value={standupSummaryDisplay.format} 
                                onValueChange={(value) => setStandupSummaryDisplay({ ...standupSummaryDisplay, format: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="compact">Compact</SelectItem>
                                    <SelectItem value="detailed">Detailed</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                </div>

                <div className="flex gap-2">
                    <Button onClick={handleSave} disabled={isPending}>
                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        <Save className="mr-2 h-4 w-4" />
                        Save Changes
                    </Button>
                    {setting && (
                        <Button variant="outline" onClick={() => onReset("workflow")} disabled={isPending}>
                            <RotateCcw className="mr-2 h-4 w-4" />
                            Reset to Default
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}

