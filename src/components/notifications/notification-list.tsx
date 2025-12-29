"use client"

import { useState, useEffect } from "react"
import { getNotifications, markNotificationAsRead, markAllNotificationsAsRead, deleteNotification } from "@/app/actions/notifications"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { formatDistanceToNow } from "date-fns"
import { Check, CheckCheck, Trash2, Bell } from "lucide-react"
import { useNotificationSound } from "@/hooks/use-notification-sound"

interface NotificationListProps {
    onClose?: () => void
    onCountChange?: (count: number) => void
}

export function NotificationList({ onClose, onCountChange }: NotificationListProps) {
    const [notifications, setNotifications] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const { playSound } = useNotificationSound()

    useEffect(() => {
        loadNotifications()
        
        // Poll for new notifications every 10 seconds when open
        const interval = setInterval(loadNotifications, 10000)
        return () => clearInterval(interval)
    }, [])

    const loadNotifications = async () => {
        const result = await getNotifications()
        if (result.success) {
            const prevUnreadCount = notifications.filter(n => !n.isRead).length
            const prevNotificationIds = new Set(notifications.map(n => n.id))
            
            setNotifications(result.notifications)
            const newUnreadCount = result.notifications.filter((n: any) => !n.isRead).length
            
            // Check if there are new unread notifications
            const newUnreadNotifications = result.notifications.filter(
                (n: any) => !n.isRead && !prevNotificationIds.has(n.id)
            )
            
            // Play sound for new notifications
            if (newUnreadNotifications.length > 0) {
                playSound()
            }
            
            // Update count if it changed
            if (onCountChange && newUnreadCount !== prevUnreadCount) {
                onCountChange(newUnreadCount)
            }
        }
        setLoading(false)
    }

    const handleMarkAsRead = async (id: number) => {
        const result = await markNotificationAsRead(id)
        if (result.success) {
            setNotifications(prev => 
                prev.map(n => n.id === id ? { ...n, isRead: true } : n)
            )
            const unreadCount = notifications.filter(n => !n.id !== id && !n.isRead).length
            onCountChange?.(unreadCount)
        }
    }

    const handleMarkAllAsRead = async () => {
        const result = await markAllNotificationsAsRead()
        if (result.success) {
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
            onCountChange?.(0)
        }
    }

    const handleDelete = async (id: number) => {
        const result = await deleteNotification(id)
        if (result.success) {
            setNotifications(prev => prev.filter(n => n.id !== id))
            const unreadCount = notifications.filter(n => n.id !== id && !n.isRead).length
            onCountChange?.(unreadCount)
        }
    }

    const unreadCount = notifications.filter(n => !n.isRead).length

    return (
        <div className="flex flex-col">
            <div className="flex items-center justify-between border-b p-4">
                <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4" />
                    <h3 className="font-semibold">Notifications</h3>
                    {unreadCount > 0 && (
                        <Badge variant="destructive" className="ml-2">
                            {unreadCount}
                        </Badge>
                    )}
                </div>
                {unreadCount > 0 && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleMarkAllAsRead}
                        className="h-8 text-xs"
                    >
                        <CheckCheck className="mr-1 h-3 w-3" />
                        Mark all read
                    </Button>
                )}
            </div>

            <ScrollArea className="h-[400px]">
                {loading ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                        Loading notifications...
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="p-8 text-center text-sm text-muted-foreground">
                        <Bell className="mx-auto mb-2 h-8 w-8 opacity-50" />
                        <p>No notifications</p>
                    </div>
                ) : (
                    <div className="divide-y">
                        {notifications.map((notification) => (
                            <div
                                key={notification.id}
                                className={`p-4 hover:bg-accent transition-colors ${
                                    !notification.isRead ? "bg-blue-50/50 dark:bg-blue-950/20" : ""
                                }`}
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <p className={`text-sm font-medium ${
                                                !notification.isRead ? "font-semibold" : ""
                                            }`}>
                                                {notification.title}
                                            </p>
                                            {!notification.isRead && (
                                                <span className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0" />
                                            )}
                                        </div>
                                        <p className="text-xs text-muted-foreground mb-2">
                                            {notification.message}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-1 flex-shrink-0">
                                        {!notification.isRead && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6"
                                                onClick={() => handleMarkAsRead(notification.id)}
                                            >
                                                <Check className="h-3 w-3" />
                                            </Button>
                                        )}
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6"
                                            onClick={() => handleDelete(notification.id)}
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </ScrollArea>
        </div>
    )
}

