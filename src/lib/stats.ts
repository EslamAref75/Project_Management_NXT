import { prisma } from "@/lib/prisma"
import { startOfDay, subDays, startOfWeek, subWeeks, endOfDay } from "date-fns"

export type TrendDirection = "up" | "down" | "neutral"

export interface StatTrend {
    direction: TrendDirection
    value: number // Percentage or absolute difference
    percentage: number
}

export interface StatWithTrend {
    value: number
    trend: StatTrend | null
}

/**
 * Ensures a snapshot exists for the current day for the given metric.
 * If not, it calculates it and saves it.
 * NOTE: For this simple implementation, we'll assume the 'value' passed is the current live value.
 * In a more complex system, this function might calculate the value itself.
 */
export async function captureDailySnapshot(
    entityType: string,
    entityId: number | null,
    metricKey: string,
    currentValue: number
) {
    const today = startOfDay(new Date())

    // Check if snapshot exists for today
    const existing = await prisma.statSnapshot.findFirst({
        where: {
            entityType,
            entityId,
            metricKey,
            date: today,
        },
    })

    if (!existing) {
        await prisma.statSnapshot.create({
            data: {
                entityType,
                entityId,
                metricKey,
                value: currentValue,
                date: today,
            },
        })
    } else if (existing.value !== currentValue) {
        // Update if value changed today (optional, but good for accuracy)
        await prisma.statSnapshot.update({
            where: { id: existing.id },
            data: { value: currentValue },
        })
    }
}

/**
 * Calculates trend based on current value and a previous snapshot.
 */
export async function getStatTrend(
    entityType: string,
    entityId: number | null,
    metricKey: string,
    currentValue: number,
    period: "daily" | "weekly" = "daily"
): Promise<StatTrend | null> {
    const today = startOfDay(new Date())
    let compareDate: Date

    if (period === "daily") {
        compareDate = subDays(today, 1) // Yesterday
    } else {
        compareDate = subWeeks(today, 1) // Last week
    }

    // Capture current state if needed (side effect, or separate job)
    // We'll capture it here to ensure we have data for tomorrow
    await captureDailySnapshot(entityType, entityId, metricKey, currentValue)

    // Find the closest snapshot to the compare date
    // We look for one created on that day
    const snapshot = await prisma.statSnapshot.findFirst({
        where: {
            entityType,
            entityId,
            metricKey,
            date: compareDate, // Precise match for day
        },
    })

    if (!snapshot) {
        // Try to find ANY snapshot before today if exact match fails
        const lastSnapshot = await prisma.statSnapshot.findFirst({
            where: {
                entityType,
                entityId,
                metricKey,
                date: { lt: today }
            },
            orderBy: { date: 'desc' }
        })

        if (!lastSnapshot) return null // No historical data

        // Use the most recent prior snapshot for comparison if no exact match
        // This handles gaps in data
        return calculateTrend(currentValue, lastSnapshot.value)
    }

    return calculateTrend(currentValue, snapshot.value)
}

function calculateTrend(current: number, previous: number): StatTrend {
    if (previous === 0) {
        return {
            direction: current > 0 ? "up" : "neutral",
            value: current,
            percentage: current > 0 ? 100 : 0
        }
    }

    const diff = current - previous
    const percentage = Math.round((diff / previous) * 100)

    let direction: TrendDirection = "neutral"
    if (diff > 0) direction = "up"
    if (diff < 0) direction = "down"

    return {
        direction,
        value: Math.abs(diff),
        percentage: Math.abs(percentage),
    }
}
