/**
 * Automatic reset helper - No cron required
 * Uses file-based tracking to avoid database constraints
 */

import { prisma } from '@/lib/prisma'
import { startOfDay, endOfDay } from 'date-fns'
import { formatInTimeZone } from 'date-fns-tz'
import * as fs from 'fs'
import * as path from 'path'

const CAIRO_TIMEZONE = 'Africa/Cairo'
const TRACKER_FILE = path.join(process.cwd(), '.last-focus-reset')

/**
 * Get current date in Cairo timezone (YYYY-MM-DD format)
 */
function getCairoDateString(): string {
    return formatInTimeZone(new Date(), CAIRO_TIMEZONE, 'yyyy-MM-dd')
}

/**
 * Get last reset date from file
 */
function getLastResetDate(): string | null {
    try {
        if (!fs.existsSync(TRACKER_FILE)) {
            return null
        }
        return fs.readFileSync(TRACKER_FILE, 'utf-8').trim()
    } catch {
        return null
    }
}

/**
 * Save last reset date to file
 */
function saveLastResetDate(date: string): void {
    try {
        fs.writeFileSync(TRACKER_FILE, date, 'utf-8')
    } catch (error) {
        console.error('Failed to save reset date:', error)
    }
}

/**
 * Check if we need to reset today's focus
 */
export async function shouldResetFocus(): Promise<boolean> {
    try {
        const todayCairo = getCairoDateString()
        const lastReset = getLastResetDate()

        if (!lastReset) {
            return true // Never reset before
        }

        return lastReset !== todayCairo
    } catch (error) {
        console.error('Error checking if reset needed:', error)
        return false
    }
}

/**
 * Clear all users' today's focus tasks
 */
export async function clearAllUsersFocus() {
    try {
        const todayStart = startOfDay(new Date())
        const todayEnd = endOfDay(new Date())

        // Find all tasks scheduled for today
        const tasksToClear = await prisma.task.findMany({
            where: {
                plannedDate: {
                    gte: todayStart,
                    lte: todayEnd
                }
            },
            select: { id: true }
        })

        if (tasksToClear.length > 0) {
            // Clear plannedDate
            await prisma.task.updateMany({
                where: {
                    id: { in: tasksToClear.map(t => t.id) }
                },
                data: { plannedDate: null }
            })

            // Log activity
            await prisma.activityLog.create({
                data: {
                    actionType: "system_reset_focus",
                    actionCategory: "today_task",
                    actionSummary: `Automatic daily reset cleared ${tasksToClear.length} tasks from today's focus`,
                    actionDetails: JSON.stringify({
                        resetTime: new Date().toISOString(),
                        cairoDate: getCairoDateString(),
                        tasksCleared: tasksToClear.length,
                        timezone: CAIRO_TIMEZONE
                    }),
                    entityType: "system",
                    entityId: 0
                }
            })
        }

        // Update tracker file
        saveLastResetDate(getCairoDateString())

        console.log(`✅ Auto-reset: Cleared ${tasksToClear.length} tasks from today's focus`)

        return {
            success: true,
            message: `Cleared ${tasksToClear.length} tasks from today's focus`,
            tasksCleared: tasksToClear.length
        }
    } catch (e: any) {
        console.error("clearAllUsersFocus Error:", e)
        return { error: "Failed to clear all users' focus", details: e.message }
    }
}

/**
 * Automatically check and reset if needed
 */
export async function autoCheckAndReset(): Promise<void> {
    try {
        const needsReset = await shouldResetFocus()

        if (needsReset) {
            const cairoTime = formatInTimeZone(new Date(), CAIRO_TIMEZONE, 'PPpp')
            console.log(`🔄 New day detected in Cairo timezone: ${cairoTime}`)
            console.log('Triggering automatic reset of today\'s focus...')
            await clearAllUsersFocus()
        }
    } catch (error) {
        console.error('Error in autoCheckAndReset:', error)
    }
}
