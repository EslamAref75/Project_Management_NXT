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
import { Badge } from "@/components/ui/badge"
import {
    updateProjectSetting,
    resetProjectSetting
} from "@/app/actions/project-settings"
import { useTransition } from "react"
import { Loader2, Save, RotateCcw } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { useRouter } from "next/navigation"

interface ProjectSettingsPanelProps {
    projectId: number
    projectName: string
    projectSettings: Record<string, any[]>
    resolvedSettings: Record<string, any>
    isAdmin: boolean
}

export function ProjectSettingsPanel({
    projectId,
    projectName,
    projectSettings,
    resolvedSettings,
    isAdmin
}: ProjectSettingsPanelProps) {
    const [activeTab, setActiveTab] = useState("general")
    const [isPending, startTransition] = useTransition()
    const { toast } = useToast()
    const router = useRouter()

    const handleSave = async (category: string, data: any, enabled: boolean = true) => {
        startTransition(async () => {
            const result = await updateProjectSetting(projectId, category, data, enabled)
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
            const result = await resetProjectSetting(projectId, category)
            if (result.success) {
                toast({
                    title: "Success",
                    description: "Settings reset to global default"
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
        const settings = projectSettings[category]
        if (!settings || settings.length === 0) return null
        // Find setting with matching key (category)
        return settings.find((s: any) => s.key === category) || settings[0] || null
    }

    const getResolvedValue = (category: string) => {
        const resolved = resolvedSettings[category]
        if (!resolved) return null
        return resolved.value || null
    }

    const isOverrideEnabled = (category: string) => {
        const setting = getSetting(category)
        return setting?.enabled || false
    }

    return (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-7">
                <TabsTrigger value="general">General</TabsTrigger>
                <TabsTrigger value="tasks">Tasks</TabsTrigger>
                <TabsTrigger value="dependencies">Dependencies</TabsTrigger>
                <TabsTrigger value="today_tasks">Today&apos;s Tasks</TabsTrigger>
                <TabsTrigger value="workflow">Workflow</TabsTrigger>
                <TabsTrigger value="permissions">Permissions</TabsTrigger>
                <TabsTrigger value="notifications">Notifications</TabsTrigger>
            </TabsList>

            {/* General Settings */}
            <TabsContent value="general">
                <GeneralSettings
                    projectId={projectId}
                    setting={getSetting("general")}
                    resolvedValue={getResolvedValue("general")}
                    isOverrideEnabled={isOverrideEnabled("general")}
                    onSave={handleSave}
                    onReset={handleReset}
                    isPending={isPending}
                />
            </TabsContent>

            {/* Task Rules */}
            <TabsContent value="tasks">
                <TaskRulesSettings
                    projectId={projectId}
                    setting={getSetting("tasks")}
                    resolvedValue={getResolvedValue("tasks")}
                    isOverrideEnabled={isOverrideEnabled("tasks")}
                    onSave={handleSave}
                    onReset={handleReset}
                    isPending={isPending}
                />
            </TabsContent>

            {/* Dependencies */}
            <TabsContent value="dependencies">
                <DependencySettings
                    projectId={projectId}
                    setting={getSetting("dependencies")}
                    resolvedValue={getResolvedValue("dependencies")}
                    isOverrideEnabled={isOverrideEnabled("dependencies")}
                    onSave={handleSave}
                    onReset={handleReset}
                    isPending={isPending}
                />
            </TabsContent>

            {/* Today&apos;s Tasks */}
            <TabsContent value="today_tasks">
                <TodayTasksSettings
                    projectId={projectId}
                    setting={getSetting("today_tasks")}
                    resolvedValue={getResolvedValue("today_tasks")}
                    isOverrideEnabled={isOverrideEnabled("today_tasks")}
                    onSave={handleSave}
                    onReset={handleReset}
                    isPending={isPending}
                />
            </TabsContent>

            {/* Workflow */}
            <TabsContent value="workflow">
                <WorkflowSettings
                    projectId={projectId}
                    setting={getSetting("workflow")}
                    resolvedValue={getResolvedValue("workflow")}
                    isOverrideEnabled={isOverrideEnabled("workflow")}
                    onSave={handleSave}
                    onReset={handleReset}
                    isPending={isPending}
                />
            </TabsContent>

            {/* Permissions */}
            <TabsContent value="permissions">
                <PermissionsSettings
                    projectId={projectId}
                    setting={getSetting("permissions")}
                    resolvedValue={getResolvedValue("permissions")}
                    isOverrideEnabled={isOverrideEnabled("permissions")}
                    onSave={handleSave}
                    onReset={handleReset}
                    isPending={isPending}
                    isAdmin={isAdmin}
                />
            </TabsContent>

            {/* Notifications */}
            <TabsContent value="notifications">
                <NotificationsSettings
                    projectId={projectId}
                    setting={getSetting("notifications")}
                    resolvedValue={getResolvedValue("notifications")}
                    isOverrideEnabled={isOverrideEnabled("notifications")}
                    onSave={handleSave}
                    onReset={handleReset}
                    isPending={isPending}
                />
            </TabsContent>
        </Tabs>
    )
}

// General Settings Component
function GeneralSettings({ projectId, setting, resolvedValue, isOverrideEnabled, onSave, onReset, isPending }: any) {
    const [timezone, setTimezone] = useState(setting?.value?.timezone || resolvedValue?.timezone || "UTC")
    const [workingDays, setWorkingDays] = useState(setting?.value?.workingDays || resolvedValue?.workingDays || [1, 2, 3, 4, 5])
    const [workingHours, setWorkingHours] = useState(setting?.value?.workingHours || resolvedValue?.workingHours || { start: "09:00", end: "17:00" })
    const [visibility, setVisibility] = useState(setting?.value?.visibility || resolvedValue?.visibility || "internal")
    const [allowOverride, setAllowOverride] = useState(isOverrideEnabled)

    const handleSave = () => {
        onSave("general", {
            timezone,
            workingDays,
            workingHours,
            visibility,
            allowOverride
        }, allowOverride)
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>General Settings</CardTitle>
                        <CardDescription>Configure project timezone, working days, and visibility</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        <Switch
                            checked={allowOverride}
                            onCheckedChange={setAllowOverride}
                        />
                        <Label>Override Global</Label>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2">
                    <Label>Project Timezone</Label>
                    <Select value={timezone} onValueChange={setTimezone}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="UTC">UTC</SelectItem>
                            <SelectItem value="America/New_York">America/New_York</SelectItem>
                            <SelectItem value="America/Los_Angeles">America/Los_Angeles</SelectItem>
                            <SelectItem value="Europe/London">Europe/London</SelectItem>
                            <SelectItem value="Asia/Dubai">Asia/Dubai</SelectItem>
                        </SelectContent>
                    </Select>
                    {!allowOverride && (
                        <p className="text-xs text-muted-foreground">Using global default: {resolvedValue?.timezone || "UTC"}</p>
                    )}
                </div>

                <div className="space-y-2">
                    <Label>Working Days</Label>
                    <div className="flex gap-2 flex-wrap">
                        {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((day, index) => (
                            <Button
                                key={day}
                                variant={workingDays.includes(index) ? "default" : "outline"}
                                size="sm"
                                onClick={() => {
                                    if (workingDays.includes(index)) {
                                        setWorkingDays(workingDays.filter((d: number) => d !== index))
                                    } else {
                                        setWorkingDays([...workingDays, index].sort())
                                    }
                                }}
                                disabled={!allowOverride}
                            >
                                {day.substring(0, 3)}
                            </Button>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Start Time</Label>
                        <Input
                            type="time"
                            value={workingHours.start}
                            onChange={(e) => setWorkingHours({ ...workingHours, start: e.target.value })}
                            disabled={!allowOverride}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>End Time</Label>
                        <Input
                            type="time"
                            value={workingHours.end}
                            onChange={(e) => setWorkingHours({ ...workingHours, end: e.target.value })}
                            disabled={!allowOverride}
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label>Project Visibility</Label>
                    <Select value={visibility} onValueChange={setVisibility} disabled={!allowOverride}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="internal">Internal</SelectItem>
                            <SelectItem value="restricted">Restricted</SelectItem>
                            <SelectItem value="public">Public</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex gap-2">
                    <Button onClick={handleSave} disabled={isPending || !allowOverride}>
                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        <Save className="mr-2 h-4 w-4" />
                        Save Changes
                    </Button>
                    {setting && (
                        <Button variant="outline" onClick={() => onReset("general")} disabled={isPending}>
                            <RotateCcw className="mr-2 h-4 w-4" />
                            Reset to Global
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}

// Task Rules Settings Component
function TaskRulesSettings({ projectId, setting, resolvedValue, isOverrideEnabled, onSave, onReset, isPending }: any) {
    const [allowOverride, setAllowOverride] = useState(isOverrideEnabled)
    const [allowedStatuses, setAllowedStatuses] = useState(setting?.value?.allowedStatuses || resolvedValue?.allowedStatuses || [])
    const [defaultPriority, setDefaultPriority] = useState(setting?.value?.defaultPriority || resolvedValue?.defaultPriority || "normal")
    const [allowSubtasks, setAllowSubtasks] = useState(setting?.value?.allowSubtasks ?? resolvedValue?.allowSubtasks ?? true)
    const [estimationUnit, setEstimationUnit] = useState(setting?.value?.estimationUnit || resolvedValue?.estimationUnit || "hours")

    // Get available statuses from global settings (would need to fetch)
    const availableStatuses = resolvedValue?.statuses || [
        { key: "pending", name: "Pending" },
        { key: "waiting", name: "Waiting" },
        { key: "in_progress", name: "In Progress" },
        { key: "review", name: "Review" },
        { key: "completed", name: "Completed" }
    ]

    const handleSave = () => {
        onSave("tasks", {
            allowedStatuses,
            defaultPriority,
            allowSubtasks,
            estimationUnit
        }, allowOverride)
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Task Rules</CardTitle>
                        <CardDescription>Configure task statuses, priorities, and estimation</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        <Switch
                            checked={allowOverride}
                            onCheckedChange={setAllowOverride}
                        />
                        <Label>Override Global</Label>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2">
                    <Label>Allowed Task Statuses</Label>
                    <div className="flex flex-wrap gap-2">
                        {availableStatuses.map((status: any) => (
                            <Button
                                key={status.key}
                                variant={allowedStatuses.includes(status.key) ? "default" : "outline"}
                                size="sm"
                                onClick={() => {
                                    if (allowedStatuses.includes(status.key)) {
                                        setAllowedStatuses(allowedStatuses.filter((s: string) => s !== status.key))
                                    } else {
                                        setAllowedStatuses([...allowedStatuses, status.key])
                                    }
                                }}
                                disabled={!allowOverride}
                            >
                                {status.name}
                            </Button>
                        ))}
                    </div>
                </div>

                <div className="space-y-2">
                    <Label>Default Priority</Label>
                    <Select value={defaultPriority} onValueChange={setDefaultPriority} disabled={!allowOverride}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="normal">Normal</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                        <Label>Allow Subtasks</Label>
                        <p className="text-sm text-muted-foreground">Enable subtask creation for this project</p>
                    </div>
                    <Switch
                        checked={allowSubtasks}
                        onCheckedChange={setAllowSubtasks}
                        disabled={!allowOverride}
                    />
                </div>

                <div className="space-y-2">
                    <Label>Estimation Unit</Label>
                    <Select value={estimationUnit} onValueChange={setEstimationUnit} disabled={!allowOverride}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="hours">Hours</SelectItem>
                            <SelectItem value="points">Points</SelectItem>
                            <SelectItem value="days">Days</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex gap-2">
                    <Button onClick={handleSave} disabled={isPending || !allowOverride}>
                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        <Save className="mr-2 h-4 w-4" />
                        Save Changes
                    </Button>
                    {setting && (
                        <Button variant="outline" onClick={() => onReset("tasks")} disabled={isPending}>
                            <RotateCcw className="mr-2 h-4 w-4" />
                            Reset to Global
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}

// Dependency Settings Component
function DependencySettings({ projectId, setting, resolvedValue, isOverrideEnabled, onSave, onReset, isPending }: any) {
    const [allowOverride, setAllowOverride] = useState(isOverrideEnabled)
    const [enableDependencies, setEnableDependencies] = useState(setting?.value?.enableDependencies ?? resolvedValue?.enableDependencies ?? true)
    const [allowMultiple, setAllowMultiple] = useState(setting?.value?.allowMultipleDependencies ?? resolvedValue?.allowMultipleDependencies ?? true)
    const [restrictToSameProject, setRestrictToSameProject] = useState(setting?.value?.restrictToSameProject ?? resolvedValue?.restrictToSameProject ?? false)
    const [allowCrossTeam, setAllowCrossTeam] = useState(setting?.value?.allowCrossTeamDependencies ?? resolvedValue?.allowCrossTeamDependencies ?? true)
    const [autoBlock, setAutoBlock] = useState(setting?.value?.autoBlockTasks ?? resolvedValue?.autoBlockTasks ?? true)
    const [allowManualUnblock, setAllowManualUnblock] = useState(setting?.value?.allowManualUnblock ?? resolvedValue?.allowManualUnblock ?? true)

    const handleSave = () => {
        onSave("dependencies", {
            enableDependencies,
            allowMultipleDependencies: allowMultiple,
            restrictToSameProject,
            allowCrossTeamDependencies: allowCrossTeam,
            autoBlockTasks: autoBlock,
            allowManualUnblock
        }, allowOverride)
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Dependency Rules</CardTitle>
                        <CardDescription>Configure task dependency behavior for this project</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        <Switch
                            checked={allowOverride}
                            onCheckedChange={setAllowOverride}
                        />
                        <Label>Override Global</Label>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                        <Label>Enable Task Dependencies</Label>
                        <p className="text-sm text-muted-foreground">Allow dependencies in this project</p>
                    </div>
                    <Switch
                        checked={enableDependencies}
                        onCheckedChange={setEnableDependencies}
                        disabled={!allowOverride}
                    />
                </div>

                <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                        <Label>Allow Multiple Dependencies</Label>
                        <p className="text-sm text-muted-foreground">A task can depend on multiple tasks</p>
                    </div>
                    <Switch
                        checked={allowMultiple}
                        onCheckedChange={setAllowMultiple}
                        disabled={!allowOverride || !enableDependencies}
                    />
                </div>

                <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                        <Label>Restrict to Same Project</Label>
                        <p className="text-sm text-muted-foreground">Only allow dependencies within this project</p>
                    </div>
                    <Switch
                        checked={restrictToSameProject}
                        onCheckedChange={setRestrictToSameProject}
                        disabled={!allowOverride || !enableDependencies}
                    />
                </div>

                <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                        <Label>Allow Cross-Team Dependencies</Label>
                        <p className="text-sm text-muted-foreground">Allow dependencies across teams</p>
                    </div>
                    <Switch
                        checked={allowCrossTeam}
                        onCheckedChange={setAllowCrossTeam}
                        disabled={!allowOverride || !enableDependencies || restrictToSameProject}
                    />
                </div>

                <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                        <Label>Auto-Block Tasks</Label>
                        <p className="text-sm text-muted-foreground">Automatically set status to waiting when dependencies incomplete</p>
                    </div>
                    <Switch
                        checked={autoBlock}
                        onCheckedChange={setAutoBlock}
                        disabled={!allowOverride || !enableDependencies}
                    />
                </div>

                <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                        <Label>Allow Manual Unblock</Label>
                        <p className="text-sm text-muted-foreground">Allow admins to manually unblock tasks</p>
                    </div>
                    <Switch
                        checked={allowManualUnblock}
                        onCheckedChange={setAllowManualUnblock}
                        disabled={!allowOverride || !enableDependencies}
                    />
                </div>

                <div className="flex gap-2">
                    <Button onClick={handleSave} disabled={isPending || !allowOverride}>
                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        <Save className="mr-2 h-4 w-4" />
                        Save Changes
                    </Button>
                    {setting && (
                        <Button variant="outline" onClick={() => onReset("dependencies")} disabled={isPending}>
                            <RotateCcw className="mr-2 h-4 w-4" />
                            Reset to Global
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}

// Today&apos;s Tasks Settings Component
function TodayTasksSettings({ projectId, setting, resolvedValue, isOverrideEnabled, onSave, onReset, isPending }: any) {
    const [allowOverride, setAllowOverride] = useState(isOverrideEnabled)
    const [enableTodayTasks, setEnableTodayTasks] = useState(setting?.value?.enableTodayTasks ?? resolvedValue?.enableTodayTasks ?? true)
    const [maxTasksPerUser, setMaxTasksPerUser] = useState(setting?.value?.maxTasksPerUser ?? resolvedValue?.maxTasksPerUser ?? 0)
    const [allowAdminModification, setAllowAdminModification] = useState(setting?.value?.allowAdminModification ?? resolvedValue?.allowAdminModification ?? true)
    const [enableAutoCarryOver, setEnableAutoCarryOver] = useState(setting?.value?.enableAutoCarryOver ?? resolvedValue?.enableAutoCarryOver ?? true)
    const [excludeBlockedTasks, setExcludeBlockedTasks] = useState(setting?.value?.excludeBlockedTasks ?? resolvedValue?.excludeBlockedTasks ?? true)
    const [resetTimeOverride, setResetTimeOverride] = useState(setting?.value?.resetTimeOverride || resolvedValue?.resetTimeOverride || "")

    const handleSave = () => {
        onSave("today_tasks", {
            enableTodayTasks,
            maxTasksPerUser: maxTasksPerUser || 0,
            allowAdminModification,
            enableAutoCarryOver,
            excludeBlockedTasks,
            resetTimeOverride: resetTimeOverride || null
        }, allowOverride)
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Today&apos;s Tasks Rules</CardTitle>
                        <CardDescription>Configure daily focus task behavior for this project</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        <Switch
                            checked={allowOverride}
                            onCheckedChange={setAllowOverride}
                        />
                        <Label>Override Global</Label>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                        <Label>Enable Today&apos;s Tasks</Label>
                        <p className="text-sm text-muted-foreground">Allow Today&apos;s Tasks for this project</p>
                    </div>
                    <Switch
                        checked={enableTodayTasks}
                        onCheckedChange={setEnableTodayTasks}
                        disabled={!allowOverride}
                    />
                </div>

                <div className="space-y-2">
                    <Label>Maximum Today&apos;s Tasks Per User</Label>
                    <Input
                        type="number"
                        min="0"
                        value={maxTasksPerUser}
                        onChange={(e) => setMaxTasksPerUser(parseInt(e.target.value) || 0)}
                        disabled={!allowOverride || !enableTodayTasks}
                        placeholder="0 = unlimited"
                    />
                    <p className="text-xs text-muted-foreground">0 means unlimited (uses global default)</p>
                </div>

                <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                        <Label>Allow Admin Modification</Label>
                        <p className="text-sm text-muted-foreground">Allow admins to modify during the day</p>
                    </div>
                    <Switch
                        checked={allowAdminModification}
                        onCheckedChange={setAllowAdminModification}
                        disabled={!allowOverride || !enableTodayTasks}
                    />
                </div>

                <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                        <Label>Enable Auto Carry-Over</Label>
                        <p className="text-sm text-muted-foreground">Automatically carry incomplete tasks to next day</p>
                    </div>
                    <Switch
                        checked={enableAutoCarryOver}
                        onCheckedChange={setEnableAutoCarryOver}
                        disabled={!allowOverride || !enableTodayTasks}
                    />
                </div>

                <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                        <Label>Exclude Blocked Tasks</Label>
                        <p className="text-sm text-muted-foreground">Don&apos;t include blocked tasks in Today&apos;s Tasks</p>
                    </div>
                    <Switch
                        checked={excludeBlockedTasks}
                        onCheckedChange={setExcludeBlockedTasks}
                        disabled={!allowOverride || !enableTodayTasks}
                    />
                </div>

                <div className="space-y-2">
                    <Label>Reset Time Override</Label>
                    <Input
                        type="time"
                        value={resetTimeOverride}
                        onChange={(e) => setResetTimeOverride(e.target.value)}
                        disabled={!allowOverride || !enableTodayTasks}
                        placeholder="Leave empty to use global"
                    />
                    <p className="text-xs text-muted-foreground">Override global reset time (leave empty to use global)</p>
                </div>

                <div className="flex gap-2">
                    <Button onClick={handleSave} disabled={isPending || !allowOverride}>
                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        <Save className="mr-2 h-4 w-4" />
                        Save Changes
                    </Button>
                    {setting && (
                        <Button variant="outline" onClick={() => onReset("today_tasks")} disabled={isPending}>
                            <RotateCcw className="mr-2 h-4 w-4" />
                            Reset to Global
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}

// Workflow Settings Component (Simplified)
function WorkflowSettings({ projectId, setting, resolvedValue, isOverrideEnabled, onSave, onReset, isPending }: any) {
    const [allowOverride, setAllowOverride] = useState(isOverrideEnabled)
    const [template, setTemplate] = useState(setting?.value?.template || resolvedValue?.template || "kanban")

    const handleSave = () => {
        onSave("workflow", {
            template
        }, allowOverride)
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Workflow & Board Configuration</CardTitle>
                        <CardDescription>Configure workflow template and board settings</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        <Switch
                            checked={allowOverride}
                            onCheckedChange={setAllowOverride}
                        />
                        <Label>Override Global</Label>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2">
                    <Label>Workflow Template</Label>
                    <Select value={template} onValueChange={setTemplate} disabled={!allowOverride}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="kanban">Kanban</SelectItem>
                            <SelectItem value="scrum">Scrum</SelectItem>
                            <SelectItem value="custom">Custom</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex gap-2">
                    <Button onClick={handleSave} disabled={isPending || !allowOverride}>
                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        <Save className="mr-2 h-4 w-4" />
                        Save Changes
                    </Button>
                    {setting && (
                        <Button variant="outline" onClick={() => onReset("workflow")} disabled={isPending}>
                            <RotateCcw className="mr-2 h-4 w-4" />
                            Reset to Global
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}

// Permissions Settings Component (Simplified)
function PermissionsSettings({ projectId, setting, resolvedValue, isOverrideEnabled, onSave, onReset, isPending, isAdmin }: any) {
    const [allowOverride, setAllowOverride] = useState(isOverrideEnabled)

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Project Permissions</CardTitle>
                        <CardDescription>Configure project-specific role permissions</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        <Switch
                            checked={allowOverride}
                            onCheckedChange={setAllowOverride}
                        />
                        <Label>Override Global</Label>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground">
                    Project-specific permissions configuration coming soon. For now, global permissions apply.
                </p>
            </CardContent>
        </Card>
    )
}

// Notifications Settings Component
function NotificationsSettings({ projectId, setting, resolvedValue, isOverrideEnabled, onSave, onReset, isPending }: any) {
    const [allowOverride, setAllowOverride] = useState(isOverrideEnabled)
    const [enableNotifications, setEnableNotifications] = useState(setting?.value?.enableProjectNotifications ?? resolvedValue?.enableProjectNotifications ?? true)
    const [notifyOnTaskAssignment, setNotifyOnTaskAssignment] = useState(setting?.value?.notifyOnTaskAssignment ?? resolvedValue?.notifyOnTaskAssignment ?? true)
    const [notifyOnDependencyBlocked, setNotifyOnDependencyBlocked] = useState(setting?.value?.notifyOnDependencyBlocked ?? resolvedValue?.notifyOnDependencyBlocked ?? true)
    const [notifyOnDependencyResolved, setNotifyOnDependencyResolved] = useState(setting?.value?.notifyOnDependencyResolved ?? resolvedValue?.notifyOnDependencyResolved ?? true)
    const [notifyOnTodayTaskAssignment, setNotifyOnTodayTaskAssignment] = useState(setting?.value?.notifyOnTodayTaskAssignment ?? resolvedValue?.notifyOnTodayTaskAssignment ?? true)

    const handleSave = () => {
        onSave("notifications", {
            enableProjectNotifications: enableNotifications,
            notifyOnTaskAssignment,
            notifyOnDependencyBlocked,
            notifyOnDependencyResolved,
            notifyOnTodayTaskAssignment
        }, allowOverride)
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Project Notifications</CardTitle>
                        <CardDescription>Configure project-specific notification preferences</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        <Switch
                            checked={allowOverride}
                            onCheckedChange={setAllowOverride}
                        />
                        <Label>Override Global</Label>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                        <Label>Enable Project Notifications</Label>
                        <p className="text-sm text-muted-foreground">Enable project-specific notifications</p>
                    </div>
                    <Switch
                        checked={enableNotifications}
                        onCheckedChange={setEnableNotifications}
                        disabled={!allowOverride}
                    />
                </div>

                <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                        <Label>Notify on Task Assignment</Label>
                    </div>
                    <Switch
                        checked={notifyOnTaskAssignment}
                        onCheckedChange={setNotifyOnTaskAssignment}
                        disabled={!allowOverride || !enableNotifications}
                    />
                </div>

                <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                        <Label>Notify on Dependency Blocked</Label>
                    </div>
                    <Switch
                        checked={notifyOnDependencyBlocked}
                        onCheckedChange={setNotifyOnDependencyBlocked}
                        disabled={!allowOverride || !enableNotifications}
                    />
                </div>

                <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                        <Label>Notify on Dependency Resolved</Label>
                    </div>
                    <Switch
                        checked={notifyOnDependencyResolved}
                        onCheckedChange={setNotifyOnDependencyResolved}
                        disabled={!allowOverride || !enableNotifications}
                    />
                </div>

                <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                        <Label>Notify on Today&apos;s Task Assignment</Label>
                    </div>
                    <Switch
                        checked={notifyOnTodayTaskAssignment}
                        onCheckedChange={setNotifyOnTodayTaskAssignment}
                        disabled={!allowOverride || !enableNotifications}
                    />
                </div>

                <div className="flex gap-2">
                    <Button onClick={handleSave} disabled={isPending || !allowOverride}>
                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        <Save className="mr-2 h-4 w-4" />
                        Save Changes
                    </Button>
                    {setting && (
                        <Button variant="outline" onClick={() => onReset("notifications")} disabled={isPending}>
                            <RotateCcw className="mr-2 h-4 w-4" />
                            Reset to Global
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}

