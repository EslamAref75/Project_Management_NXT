import React from "react"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react"
import Link from "next/link"

export type StatCardData = {
    label: string
    value: number | string
    icon: React.ReactNode
    description?: string
    color?: "default" | "blue" | "green" | "yellow" | "red" | "orange"
    onClick?: () => void
    href?: string
    active?: boolean // To highlight if a filter corresponding to this card is active
    trend?: {
        direction: "up" | "down" | "neutral"
        value: string | number
        label?: string
    }
}

interface SummaryStatsCardsProps {
    cards: StatCardData[]
    isLoading?: boolean
}

export function SummaryStatsCards({ cards, isLoading = false }: SummaryStatsCardsProps) {
    if (isLoading) {
        return (
            <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4 mb-6">
                {[...Array(4)].map((_, i) => (
                    <Card key={i} className="p-4 h-24 animate-pulse bg-muted/50" />
                ))}
            </div>
        )
    }

    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 mb-6">
            {cards.map((card, index) => {
                // Color variants
                const colorStyles = {
                    default: "text-muted-foreground",
                    blue: "text-blue-500 bg-blue-500/10",
                    green: "text-green-500 bg-green-500/10",
                    yellow: "text-yellow-500 bg-yellow-500/10",
                    red: "text-red-500 bg-red-500/10",
                    orange: "text-orange-500 bg-orange-500/10",
                }

                const activeStyle = card.active ? "ring-2 ring-primary" : ""
                const clickableStyle = (card.onClick || card.href) ? "cursor-pointer hover:bg-muted/50 transition-colors" : ""

                // Prepare styled icon
                const iconClasses = cn(
                    "h-4 w-4 opacity-70",
                    card.color === "blue" && "text-blue-700",
                    card.color === "green" && "text-green-700",
                    card.color === "yellow" && "text-yellow-700",
                    card.color === "red" && "text-red-700",
                    card.color === "orange" && "text-orange-700"
                )

                const StyledIcon = React.isValidElement(card.icon)
                    ? React.cloneElement(card.icon as React.ReactElement, { className: iconClasses })
                    : card.icon

                const CardContentWrapper = (
                    <Card
                        className={cn("p-4 flex flex-col justify-between h-full", activeStyle, clickableStyle)}
                        onClick={card.onClick}
                    >
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-muted-foreground truncate" title={card.label}>
                                {card.label}
                            </span>
                            <div className={cn("p-2 rounded-full", colorStyles[card.color || "default"])}>
                                {StyledIcon}
                            </div>
                        </div>
                        <div className="flex items-baseline justify-between">
                            <div className="flex items-baseline space-x-2">
                                <span className="text-2xl font-bold">{card.value}</span>
                                {card.description && (
                                    <span className="text-xs text-muted-foreground truncate">
                                        {card.description}
                                    </span>
                                )}
                            </div>
                            {card.trend && (
                                <div className={cn(
                                    "flex items-center text-xs font-medium",
                                    card.trend.direction === "up" && "text-green-600",
                                    card.trend.direction === "down" && "text-red-600",
                                    card.trend.direction === "neutral" && "text-muted-foreground"
                                )}>
                                    {card.trend.direction === "up" && <ArrowUpRight className="h-3 w-3 mr-1" />}
                                    {card.trend.direction === "down" && <ArrowDownRight className="h-3 w-3 mr-1" />}
                                    {card.trend.direction === "neutral" && <Minus className="h-3 w-3 mr-1" />}

                                    <span>{card.trend.value}</span>
                                    {card.trend.label && (
                                        <span className="text-muted-foreground ml-1 hidden xl:inline">
                                            {card.trend.label}
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                    </Card>
                )

                if (card.href) {
                    return (
                        <Link key={index} href={card.href} className="block h-full">
                            {CardContentWrapper}
                        </Link>
                    )
                }

                return (
                    <div key={index} className="h-full">
                        {CardContentWrapper}
                    </div>
                )
            })}
        </div >
    )
}
