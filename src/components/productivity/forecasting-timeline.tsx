
"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, differenceInDays, isValid, parseISO } from "date-fns";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertCircle, Calendar, CheckCircle2 } from "lucide-react";

interface ForecastingTimelineProps {
    tasks: any[];
    forecasts: Record<number, any>;
}

export function ForecastingTimeline({ tasks, forecasts }: ForecastingTimelineProps) {
    // Filter for active tasks that have forecasts and due dates
    const activeTasks = tasks
        .filter(t =>
            t.status !== 'completed' &&
            t.status !== 'cancelled' &&
            forecasts[t.id] &&
            t.dueDate
        )
        .sort((a, b) => {
            // Sort by risk (High first) then by due date
            const riskA = forecasts[a.id].riskLevel === 'high' ? 3 : forecasts[a.id].riskLevel === 'medium' ? 2 : 1;
            const riskB = forecasts[b.id].riskLevel === 'high' ? 3 : forecasts[b.id].riskLevel === 'medium' ? 2 : 1;
            return riskB - riskA || new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        })
        .slice(0, 5); // Show top 5 relevant tasks

    if (activeTasks.length === 0) {
        return (
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Forecast Timeline</CardTitle>
                    <CardDescription>Predicted completion dates</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-6 text-muted-foreground text-sm">
                        No active tasks with forecasts available.
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-lg">Forecast Timeline</CardTitle>
                <CardDescription>Projected delays & risks</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-4">
                {activeTasks.map(task => {
                    const forecast = forecasts[task.id];
                    const dueDate = new Date(task.dueDate);
                    const predictedDate = new Date(forecast.predictedDate);

                    const daysDiff = differenceInDays(predictedDate, dueDate);
                    const isLate = daysDiff > 0;

                    return (
                        <div key={task.id} className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                                <span className="font-medium truncate max-w-[150px]" title={task.title}>
                                    {task.title}
                                </span>
                                <div className="flex items-center gap-2">
                                    {isLate ? (
                                        <Badge variant="destructive" className="text-[10px] h-5 px-1.5">
                                            +{daysDiff}d Late
                                        </Badge>
                                    ) : (
                                        <Badge variant="outline" className="text-[10px] h-5 px-1.5 bg-green-500/10 text-green-600 border-green-200">
                                            On Track
                                        </Badge>
                                    )}
                                </div>
                            </div>

                            {/* Visual Timeline Bar */}
                            <div className="relative h-2 bg-muted rounded-full overflow-hidden w-full">
                                {/* Base progress (Just visual placeholder) */}
                                <div className="absolute left-0 top-0 bottom-0 w-full bg-muted" />

                                {/* Due Date Marker */}
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <div
                                                className="absolute top-0 bottom-0 w-1 bg-black/30 z-10 cursor-help"
                                                style={{ left: '60%' }} /* Arbitrary for visual relative positioning if we don't have start date context */
                                            />
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>Due: {format(dueDate, 'MMM d')}</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>

                                {/* Predicted Date Marker */}
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <div
                                                className={`absolute top-0 bottom-0 w-full rounded-l-full transition-all ${isLate ? 'bg-red-500' : 'bg-green-500'
                                                    }`}
                                                style={{
                                                    width: isLate ? '80%' : '50%', // Simplified visualization: Late goes past the "60%" due mark
                                                    opacity: 0.2
                                                }}
                                            />
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>Predicted: {format(predictedDate, 'MMM d')}</p>
                                            <p className="text-[10px] opacity-80">{forecast.explanation}</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            </div>

                            <div className="flex justify-between text-[10px] text-muted-foreground">
                                <span>Due: {format(dueDate, 'MMM d')}</span>
                                <span className={isLate ? "text-red-600 font-medium" : "text-green-600"}>
                                    Pred: {format(predictedDate, 'MMM d')}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </CardContent>
        </Card>
    );
}
