"use server"

import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { startOfDay, endOfDay } from "date-fns"

export async function getFocusData() {
    try {
        const session = await getServerSession(authOptions)
        if (!session) {
            console.error("getFocusData: No session")
            return { focusTasks: [], libraryTasks: [], error: "Unauthorized" }
        }

        const userId = parseInt(session.user.id)
        const todayStart = startOfDay(new Date())
        const todayEnd = endOfDay(new Date())

        // Tasks specifically planned for today
        const focusTasks = await prisma.task.findMany({
            where: {
                assignees: { some: { id: userId } },
                plannedDate: {
                    gte: todayStart,
                    lte: todayEnd
                },
                status: { not: "completed" }
            },
            select: {
                id: true,
                title: true,
                status: true,
                priority: true,
                estimatedHours: true,
                project: { select: { name: true } }
            },
            orderBy: { priority: "desc" }
        })

        // Tasks available in the "Library"
        const libraryTasks = await prisma.task.findMany({
            where: {
                assignees: { some: { id: userId } },
                status: { not: "completed" },
                OR: [
                    { plannedDate: null },
                    { plannedDate: { lt: todayStart } },
                    { plannedDate: { gt: todayEnd } }
                ]
            },
            select: {
                id: true,
                title: true,
                status: true,
                priority: true,
                estimatedHours: true,
                project: { select: { name: true } }
            },
            orderBy: { updatedAt: "desc" }
        })

        return { focusTasks, libraryTasks }
    } catch (e: any) {
        console.error("getFocusData Error:", e)
        return { focusTasks: [], libraryTasks: [], error: e.message }
    }
}

export async function setFocusDate(taskId: number, date: Date | null) {
    const session = await getServerSession(authOptions)
    if (!session) return { error: "Unauthorized" }

    try {
        await prisma.task.update({
            where: { id: taskId },
            data: { plannedDate: date }
        })
        revalidatePath("/dashboard/focus")
        return { success: true }
    } catch (e) {
        return { error: "Failed to update task" }
    }
}

export async function clearFocus() {
    const session = await getServerSession(authOptions)
    if (!session) return { error: "Unauthorized" }

    try {
        const userId = parseInt(session.user.id)
        const todayStart = startOfDay(new Date())
        const todayEnd = endOfDay(new Date())

        const tasksToClear = await prisma.task.findMany({
            where: {
                assignees: { some: { id: userId } },
                plannedDate: {
                    gte: todayStart,
                    lte: todayEnd
                }
            },
            select: { id: true }
        })

        if (tasksToClear.length > 0) {
            await prisma.task.updateMany({
                where: {
                    id: { in: tasksToClear.map(t => t.id) }
                },
                data: { plannedDate: null }
            })
        }
        revalidatePath("/dashboard/focus")
        return { success: true }
    } catch (e) {
        return { error: "Failed to clear focus" }
    }
}
