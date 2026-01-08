"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import * as Icons from "lucide-react"
import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

interface StatCardProps {
    title: string
    value: number | string
    icon: keyof typeof Icons
    href?: string
    description?: string
    variant?: "default" | "success" | "warning" | "danger" | "info"
    className?: string
    trend?: {
        direction: "up" | "down" | "neutral"
        value: number | string
        label?: string
    }
}

const variantStyles = {
    default: "hover:bg-muted/50",
    success: "hover:bg-green-50 dark:hover:bg-green-950/20 border-green-200 dark:border-green-800",
    warning: "hover:bg-yellow-50 dark:hover:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800",
    danger: "hover:bg-red-50 dark:hover:bg-red-950/20 border-red-200 dark:border-red-800",
    info: "hover:bg-blue-50 dark:hover:bg-blue-950/20 border-blue-200 dark:border-blue-800",
}

const iconColors = {
    default: "text-muted-foreground",
    success: "text-green-600 dark:text-green-400",
    warning: "text-yellow-600 dark:text-yellow-400",
    danger: "text-red-600 dark:text-red-400",
    info: "text-blue-600 dark:text-blue-400",
}

export function StatCard({
    title,
    value,
    icon,
    href,
    description,
    variant = "default",
    className,
    trend
}: StatCardProps) {
    const Icon = Icons[icon] as React.ComponentType<{ className?: string }>

    const content = (
        <Card className={cn(
            "transition-all duration-200 cursor-pointer",
            href && variantStyles[variant],
            className
        )}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                {Icon && <Icon className={cn("h-4 w-4", iconColors[variant])} />}
            </CardHeader>
            <CardContent>
                <div className="flex items-center justify-between">
                    <div className="text-2xl font-bold">{value}</div>
                    {trend && (
                        <div className={cn(
                            "flex items-center text-xs font-medium",
                            trend.direction === "up" && "text-green-600",
                            trend.direction === "down" && "text-red-600",
                            trend.direction === "neutral" && "text-muted-foreground"
                        )}>
                            {trend.direction === "up" && <ArrowUpRight className="h-3 w-3 mr-1" />}
                            {trend.direction === "down" && <ArrowDownRight className="h-3 w-3 mr-1" />}
                            {trend.direction === "neutral" && <Minus className="h-3 w-3 mr-1" />}
                            <span>{trend.value}</span>
                        </div>
                    )}
                </div>
                {description && (
                    <p className="text-xs text-muted-foreground mt-1">
                        {description}
                    </p>
                )}
                {trend?.label && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                        {trend.label}
                    </p>
                )}
            </CardContent>
        </Card>
    )

    if (href) {
        return (
            <Link href={href} className="block">
                {content}
            </Link>
        )
    }

    return content
}

