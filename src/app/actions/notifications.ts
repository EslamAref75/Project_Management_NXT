"use server"

import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { revalidatePath } from "next/cache"

// Get all notifications for the current user
export async function getNotifications() {
    const session = await getServerSession(authOptions)
    if (!session) {
        return { error: "Unauthorized" }
    }

    try {
        const userId = parseInt(session.user.id)
        const notifications = await prisma.notification.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" },
            take: 50
        })

        return { success: true, notifications }
    } catch (e: any) {
        console.error("getNotifications Error:", e)
        return { error: "Failed to fetch notifications", details: e.message }
    }
}

// Get unread notification count
export async function getUnreadNotificationCount() {
    const session = await getServerSession(authOptions)
    if (!session) {
        return { error: "Unauthorized" }
    }

    try {
        const userId = parseInt(session.user.id)
        const count = await prisma.notification.count({
            where: { 
                userId,
                isRead: false
            }
        })

        return { success: true, count }
    } catch (e: any) {
        console.error("getUnreadNotificationCount Error:", e)
        return { error: "Failed to fetch notification count", details: e.message }
    }
}

// Mark notification as read
export async function markNotificationAsRead(notificationId: number) {
    const session = await getServerSession(authOptions)
    if (!session) {
        return { error: "Unauthorized" }
    }

    try {
        const userId = parseInt(session.user.id)
        
        // Verify the notification belongs to the user
        const notification = await prisma.notification.findUnique({
            where: { id: notificationId }
        })

        if (!notification || notification.userId !== userId) {
            return { error: "Notification not found or unauthorized" }
        }

        await prisma.notification.update({
            where: { id: notificationId },
            data: { isRead: true }
        })

        revalidatePath("/dashboard")
        return { success: true }
    } catch (e: any) {
        console.error("markNotificationAsRead Error:", e)
        return { error: "Failed to mark notification as read", details: e.message }
    }
}

// Mark all notifications as read
export async function markAllNotificationsAsRead() {
    const session = await getServerSession(authOptions)
    if (!session) {
        return { error: "Unauthorized" }
    }

    try {
        const userId = parseInt(session.user.id)
        
        await prisma.notification.updateMany({
            where: { 
                userId,
                isRead: false
            },
            data: { isRead: true }
        })

        revalidatePath("/dashboard")
        return { success: true }
    } catch (e: any) {
        console.error("markAllNotificationsAsRead Error:", e)
        return { error: "Failed to mark all notifications as read", details: e.message }
    }
}

// Delete a notification
export async function deleteNotification(notificationId: number) {
    const session = await getServerSession(authOptions)
    if (!session) {
        return { error: "Unauthorized" }
    }

    try {
        const userId = parseInt(session.user.id)
        
        // Verify the notification belongs to the user
        const notification = await prisma.notification.findUnique({
            where: { id: notificationId }
        })

        if (!notification || notification.userId !== userId) {
            return { error: "Notification not found or unauthorized" }
        }

        await prisma.notification.delete({
            where: { id: notificationId }
        })

        revalidatePath("/dashboard")
        return { success: true }
    } catch (e: any) {
        console.error("deleteNotification Error:", e)
        return { error: "Failed to delete notification", details: e.message }
    }
}

