"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Info, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface ProductivityData {
    score: number;
    metrics: {
        completionRate: number;
        onTimeRate: number;
        focusRate: number;
        urgentRate: number;
        dependencyRate: number;
    };
}

interface ProductivityScoreCardProps {
    data: ProductivityData | null;
    periodLabel?: string;
    isLoading?: boolean;
}

export function ProductivityScoreCard({ data, periodLabel = "This Week", isLoading }: ProductivityScoreCardProps) {
    if (isLoading) {
        return <div className="h-64 animate-pulse bg-muted rounded-xl" />;
    }

    if (!data) return null;

    const getScoreColor = (score: number) => {
        if (score >= 85) return "text-emerald-500";
        if (score >= 70) return "text-blue-500";
        if (score >= 50) return "text-amber-500";
        return "text-red-500";
    };

    const getScoreLabel = (score: number) => {
        if (score >= 85) return "Excellent";
        if (score >= 70) return "Good";
        if (score >= 50) return "Needs Attention";
        return "Critical";
    };

    const metrics = [
        { label: "Task Completion", value: data.metrics.completionRate, desc: "% of assigned tasks completed" },
        { label: "On-Time Delivery", value: data.metrics.onTimeRate, desc: "% completed by due date" },
        { label: "Focus Adherence", value: data.metrics.focusRate, desc: "% tasks completed on planned day" },
        { label: "Urgent Response", value: data.metrics.urgentRate, desc: "Speed of starting urgent tasks" },
        { label: "Dependency Health", value: data.metrics.dependencyRate, desc: "Impact on downstream tasks" },
    ];

    return (
        <Card className="shadow-sm border-none bg-card/50">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                        Productivity Score
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger>
                                    <Info className="h-4 w-4 text-muted-foreground opacity-70" />
                                </TooltipTrigger>
                                <TooltipContent className="max-w-[250px]">
                                    <p>A unified score based on completion, timeliness, focus, urgent response, and dependency management.</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </CardTitle>
                    <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium bg-muted px-2 py-1 rounded">{periodLabel}</span>
                </div>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col md:flex-row gap-6 items-center">
                    {/* Main Score Circle */}
                    <div className="flex flex-col items-center justify-center min-w-[140px]">
                        <div className={cn("relative flex items-center justify-center w-32 h-32 rounded-full border-8",
                            data.score >= 85 ? "border-emerald-100 dark:border-emerald-900/30" :
                                data.score >= 70 ? "border-blue-100 dark:border-blue-900/30" :
                                    data.score >= 50 ? "border-amber-100 dark:border-amber-900/30" : "border-red-100 dark:border-red-900/30"
                        )}>
                            <div className="flex flex-col items-center">
                                <span className={cn("text-4xl font-bold", getScoreColor(data.score))}>
                                    {data.score}
                                </span>
                                <span className={cn("text-xs font-semibold uppercase mt-1", getScoreColor(data.score))}>
                                    {getScoreLabel(data.score)}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Metrics Breakdown */}
                    <div className="flex-1 w-full space-y-4">
                        {metrics.map((m) => (
                            <div key={m.label} className="space-y-1">
                                <div className="flex justify-between text-xs">
                                    <span className="flex items-center gap-1.5 text-muted-foreground font-medium">
                                        {m.label}
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger>
                                                    <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50" />
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p>{m.desc}</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    </span>
                                    <span className="font-mono font-medium">{m.value}%</span>
                                </div>
                                <Progress value={m.value} className="h-2" indicatorClassName={cn(
                                    m.value >= 80 ? "bg-emerald-500" : m.value >= 50 ? "bg-amber-500" : "bg-red-500"
                                )} />
                            </div>
                        ))}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
