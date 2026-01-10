"use client"

import { useState, useEffect, useCallback } from "react"
import { format, subDays, startOfWeek, endOfWeek } from "date-fns"
import { Loader2, TrendingUp, TrendingDown, AlertTriangle, ArrowRight, Calendar as CalendarIcon } from "lucide-react"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getProgressReport, type ReportParams, type ProgressReportData } from "@/app/actions/progress-report"
import { useToast } from "@/components/ui/use-toast"

import { DatePickerWithRange } from "@/components/ui/date-range-picker"
import { DateRange } from "react-day-picker"

export function ProgressReportView() {
    const { toast } = useToast()
    const [loading, setLoading] = useState(false)
    const [data, setData] = useState<ProgressReportData | null>(null)

    // Filters
    const [entityType, setEntityType] = useState<ReportParams['entityType']>('global')
    const [entityId, setEntityId] = useState<string>("") // For now simple input, ideally a combobox

    // Default to "This Week"
    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: startOfWeek(new Date(), { weekStartsOn: 1 }),
        to: endOfWeek(new Date(), { weekStartsOn: 1 })
    })

    // Clear data when changing filter type
    useEffect(() => {
        setData(null)
    }, [entityType])

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            // Validate Entity ID if not global
            let eId: number | undefined = undefined
            if (entityType !== 'global') {
                if (!entityId) {
                    // Don't fetch if ID is missing for non-global
                    setLoading(false)
                    return
                }
                eId = parseInt(entityId)
                if (isNaN(eId)) {
                    toast({ title: "Invalid ID", variant: "destructive" })
                    setLoading(false)
                    return
                }
            }

            const result = await getProgressReport({
                entityType,
                entityId: eId,
                periodA: {
                    start: dateRange?.from || new Date(),
                    end: dateRange?.to || new Date()
                }
            })

            if ('error' in result) {
                toast({ title: "Error", description: result.error, variant: "destructive" })
                setData(null)
            } else {
                setData(result)
            }
        } catch (e) {
            toast({ title: "Failed to fetch report", variant: "destructive" })
        } finally {
            setLoading(false)
        }
    }, [entityType, entityId, dateRange])

    // Initial Fetch
    useEffect(() => {
        // Debounce fetching while typing ID
        const timer = setTimeout(() => {
            fetchData()
        }, 500)
        return () => clearTimeout(timer)
    }, [fetchData])

    // UI Helpers
    const renderTrend = (trend: 'up' | 'down' | 'neutral', badIfUp = false) => {
        if (trend === 'neutral') return <span className="text-muted-foreground ml-2">→ 0%</span>

        const isPositive = trend === 'up'
        const isGood = badIfUp ? !isPositive : isPositive
        const Icon = isPositive ? TrendingUp : TrendingDown
        const color = isGood ? "text-green-500" : "text-red-500"

        return (
            <span className={`flex items-center ml-2 ${color} text-sm font-medium`}>
                <Icon className="w-4 h-4 mr-1" />
            </span>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header & Controls */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center bg-card p-4 rounded-lg border shadow-sm">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Progress Comparison</h1>
                    <p className="text-muted-foreground text-sm">Analyze performance trends and risks.</p>
                </div>

                <div className="flex flex-wrap gap-2 items-center">
                    <Select value={entityType} onValueChange={(v: any) => setEntityType(v)}>
                        <SelectTrigger className="w-[140px]">
                            <SelectValue placeholder="Scope" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="global">Global</SelectItem>
                            <SelectItem value="project">Project</SelectItem>
                            <SelectItem value="team">Team</SelectItem>
                        </SelectContent>
                    </Select>

                    {entityType !== 'global' && (
                        <input
                            type="number"
                            placeholder={`${entityType} ID`}
                            className="h-10 w-20 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                            value={entityId}
                            onChange={(e) => setEntityId(e.target.value)}
                        />
                    )}

                    <DatePickerWithRange
                        date={dateRange}
                        setDate={setDateRange}
                        className="w-[260px]"
                    />

                    <Button onClick={fetchData} disabled={loading}>
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Refresh"}
                    </Button>
                </div>
            </div>

            {/* Content State */}
            {!data && loading && (
                <div className="min-h-[400px] flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            )}

            {!data && !loading && (
                <div className="min-h-[400px] flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed rounded-lg">
                    <TrendingUp className="h-12 w-12 mb-4 opacity-20" />
                    <p>
                        {entityType === 'global'
                            ? "Data is loading..."
                            : `Enter a ${entityType} ID to generate report.`}
                    </p>
                </div>
            )}

            {data && (
                <>
                    {/* Executive Summary */}
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Velocity</CardTitle>
                                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold flex items-baseline">
                                    {data.summary.velocity.value} {data.summary.velocity.unit}
                                    {renderTrend(data.summary.velocity.trend)}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    {data.summary.velocity.percentChange}% vs last period
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
                                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold flex items-baseline">
                                    {data.summary.completionRate.value}%
                                    {renderTrend(data.summary.completionRate.trend)}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    {data.summary.completionRate.percentChange}% vs last period
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Blocked Ratio</CardTitle>
                                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold flex items-baseline">
                                    {data.summary.blockedRatio.value}%
                                    {renderTrend(data.summary.blockedRatio.trend, true)}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    {data.summary.blockedRatio.percentChange}% vs last period
                                </p>
                            </CardContent>
                        </Card>

                        <Card className={data.summary.overallRisk === 'high' ? 'border-red-500 bg-red-50' : ''}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Risk Level</CardTitle>
                                <AlertTriangle className={`h-4 w-4 ${data.summary.overallRisk === 'high' ? 'text-red-500' : 'text-muted-foreground'}`} />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold capitalize">
                                    {data.summary.overallRisk}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Based on forecast confidence
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Analysis & Forecast Grid */}
                    <div className="grid gap-6 md:grid-cols-7">

                        {/* Cause Analysis (Left Col - 4) */}
                        <div className="md:col-span-4 space-y-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Cause Analysis</CardTitle>
                                    <CardDescription>Detected factors impacting performance</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {data.causes.length === 0 ? (
                                        <div className="text-center py-6 text-muted-foreground">
                                            No negative factors detected.
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {data.causes.map((cause, i) => (
                                                <div key={i} className="flex items-start gap-4 p-4 border rounded-lg bg-muted/30">
                                                    <div className={`p-2 rounded-full ${cause.severity === 'high' ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-600'}`}>
                                                        <AlertTriangle className="w-5 h-5" />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <h4 className="font-semibold text-sm">{cause.name}</h4>
                                                        <p className="text-sm text-muted-foreground">{cause.description}</p>
                                                        <div className="flex gap-2 mt-2">
                                                            {cause.impactedKpis.map(k => (
                                                                <Badge key={k} variant="secondary" className="text-xs">{k}</Badge>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        {/* Forecast & Actions (Right Col - 3) */}
                        <div className="md:col-span-3 space-y-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Forecast</CardTitle>
                                    <CardDescription>Projected completion based on velocity</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div>
                                        <div className="text-sm text-muted-foreground mb-1">Estimated Completion</div>
                                        <div className="text-3xl font-bold text-primary">
                                            {data.forecast.predictedCompletionDate
                                                ? format(new Date(data.forecast.predictedCompletionDate), "MMM d, yyyy")
                                                : "Indeterminate"}
                                        </div>
                                        {data.forecast.weeksRemaining && (
                                            <div className="text-sm font-medium mt-1">
                                                ~{data.forecast.weeksRemaining} weeks remaining
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span>Confidence Score</span>
                                            <span>{data.forecast.confidenceScore}%</span>
                                        </div>
                                        <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                                            <div
                                                className={`h-full ${data.forecast.confidenceScore > 70 ? 'bg-green-500' : data.forecast.confidenceScore > 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                                style={{ width: `${data.forecast.confidenceScore}%` }}
                                            />
                                        </div>
                                    </div>

                                    {data.forecast.riskFactors.length > 0 && (
                                        <div className="pt-2 border-t">
                                            <span className="text-xs font-semibold text-muted-foreground uppercase">Risk Factors</span>
                                            <ul className="list-disc list-inside text-sm text-red-600 mt-1">
                                                {data.forecast.riskFactors.map((f, i) => (
                                                    <li key={i}>{f}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Actions could go here */}
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}
