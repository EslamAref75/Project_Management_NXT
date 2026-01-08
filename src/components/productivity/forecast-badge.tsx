"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { AlertCircle, CheckCircle2, Clock, HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export interface ForecastData {
    predictedDate: string; // ISO string
    riskLevel: "low" | "medium" | "high";
    confidence: number;
    explanation: string;
}

interface ForecastBadgeProps {
    forecast: ForecastData | null;
    dueDate?: string | null;
    compact?: boolean;
}

export function ForecastBadge({ forecast, dueDate, compact = false }: ForecastBadgeProps) {
    if (!forecast) return null;

    const getRiskConfig = (level: string) => {
        switch (level) {
            case "high": return {
                style: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-900",
                icon: AlertCircle
            };
            case "medium": return {
                style: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-900",
                icon: Clock
            };
            case "low": return {
                style: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-900",
                icon: CheckCircle2
            };
            default: return {
                style: "bg-muted text-muted-foreground",
                icon: HelpCircle
            };
        }
    };

    const { style: styles, icon: Icon } = getRiskConfig(forecast.riskLevel);

    const formattedDate = new Date(forecast.predictedDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    const isLate = dueDate && new Date(forecast.predictedDate) > new Date(dueDate);

    if (compact) {
        return (
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <div className={cn("flex items-center justify-center p-1 rounded-full w-6 h-6", styles)}>
                            <Icon className="w-3.5 h-3.5" />
                        </div>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p className="font-semibold">{forecast.riskLevel === 'high' ? 'High Risk' : 'Forecast'}</p>
                        <p className="text-xs">Pred: {formattedDate} ({forecast.confidence}% conf)</p>
                        <p className="text-xs opacity-70 mt-1">{forecast.explanation}</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );
    }

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Badge variant="outline" className={cn("gap-1.5 cursor-help pl-1.5 pr-2.5 py-0.5", styles)}>
                        <Icon className="w-3.5 h-3.5" />
                        <span className="flex flex-col items-start leading-tight">
                            <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">
                                {forecast.riskLevel === 'high' ? 'At Risk' : 'Forecast'}
                            </span>
                            <span className="text-xs font-semibold">
                                {isLate ? `Late by ${formattedDate}` : `On Track (${formattedDate})`}
                            </span>
                        </span>
                    </Badge>
                </TooltipTrigger>
                <TooltipContent className="max-w-[200px] text-xs">
                    <p className="font-semibold mb-1">Why this forecast?</p>
                    <p>{forecast.explanation}</p>
                    <div className="mt-2 pt-2 border-t flex justify-between opacity-70">
                        <span>Confidence:</span>
                        <span>{forecast.confidence}%</span>
                    </div>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}
