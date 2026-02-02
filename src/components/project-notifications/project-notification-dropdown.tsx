"use client"

import { useState, useEffect, useRef } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  getProjectNotifications,
  markProjectNotificationAsRead,
} from "@/app/actions/project-notifications"
import { formatDistanceToNow } from "date-fns"
import Link from "next/link"
import { Check, CheckCheck, X, AlertTriangle } from "lucide-react"
import { useRouter } from "next/navigation"

interface ProjectNotificationDropdownProps {
  projectId: number
  onClose?: () => void
}

export function ProjectNotificationDropdown({
  projectId,
  onClose,
}: ProjectNotificationDropdownProps) {
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const previousNotificationIdsRef = useRef<Set<number>>(new Set())

  const playNotificationSound = async () => {
    try {
      // Check user preferences
      const { getProjectNotificationPreferences } = await import("@/app/actions/project-notifications")
      const prefsResult = await getProjectNotificationPreferences(projectId)

      if (prefsResult.success && prefsResult.preferences) {
        if (!prefsResult.preferences.soundEnabled) {
          return // User has disabled sound
        }
      }

      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const duration = 0.25
      const sampleRate = ctx.sampleRate
      const numSamples = duration * sampleRate

      const buffer = ctx.createBuffer(1, numSamples, sampleRate)
      const data = buffer.getChannelData(0)

      for (let i = 0; i < numSamples; i++) {
        const t = i / sampleRate
        const frequency = 800 + (200 * t) / duration
        const fadeIn = Math.min(1, t / 0.05)
        const fadeOut = Math.min(1, (duration - t) / 0.05)
        const envelope = fadeIn * fadeOut
        data[i] = Math.sin(2 * Math.PI * frequency * t) * envelope * 0.3
      }

      const source = ctx.createBufferSource()
      source.buffer = buffer
      source.connect(ctx.destination)
      source.start(0)
    } catch (error) {
      // Ignore sound errors
    }
  }

  useEffect(() => {
    // Only run on client-side
    if (typeof window === 'undefined') return

    const fetchNotifications = async () => {
      setLoading(true)
      const result = await getProjectNotifications(projectId, {
        limit: 15,
        offset: 0,
      })
      if (result.success && result.notifications) {
        // Check for new unread notifications using ref to avoid stale closure
        const previousIds = previousNotificationIdsRef.current
        const newUnread = result.notifications.filter(
          (n) => !n.isRead && !previousIds.has(n.id)
        )

        // Play sound for new notifications (critical/urgent always, others based on preferences)
        if (newUnread.length > 0) {
          newUnread.forEach((notification) => {
            if (notification.soundRequired || notification.isUrgent) {
              // Always play for critical/urgent notifications
              playNotificationSound()
            } else {
              // Check preferences for non-critical
              playNotificationSound()
            }
          })
        }

        // Sort notifications: urgent first, then by date
        const sorted = result.notifications.sort((a, b) => {
          if (a.isUrgent && !b.isUrgent) return -1
          if (!a.isUrgent && b.isUrgent) return 1
          if (a.requiresAcknowledgment && !b.requiresAcknowledgment) return -1
          if (!a.requiresAcknowledgment && b.requiresAcknowledgment) return 1
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        })

        setNotifications(sorted)

        // Update ref with current notification IDs
        previousNotificationIdsRef.current = new Set(sorted.map(n => n.id))
      }
      setLoading(false)
    }

    fetchNotifications()

    // Poll for new notifications every 30 seconds (reduced from 5s for better performance)
    const interval = setInterval(fetchNotifications, 30000)

    return () => clearInterval(interval)
  }, [projectId])

  const handleMarkAsRead = async (notificationId: number) => {
    const result = await markProjectNotificationAsRead(projectId, notificationId)
    if (result.success) {
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, isRead: true } : n
        )
      )
      router.refresh()
    }
  }

  const getNotificationLink = (notification: any) => {
    console.log("🔔 [NotificationLink] Processing:", {
      id: notification.id,
      type: notification.type,
      entityType: notification.entityType,
      entityId: notification.entityId
    })

    // Check either entityType or type for robustness
    const isTask = notification.entityType === "task" || notification.type === "task"
    const isMention = notification.entityType === "comment_mention" || notification.type === "comment_mention"

    if ((isTask || isMention) && notification.entityId) {
      const link = `/dashboard/projects/${projectId}/tasks/${notification.entityId}`
      console.log("🔗 [NotificationLink] Generated Task Link:", link)
      return link
    }

    console.log("🔗 [NotificationLink] Fallback to List. Reason:", { isTask, isMention, entityId: notification.entityId })
    return `/dashboard/projects/${projectId}/notifications`
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case "task":
        return "bg-blue-100 text-blue-800"
      case "dependency":
        return "bg-orange-100 text-orange-800"
      case "today_task":
        return "bg-green-100 text-green-800"
      case "project_admin":
        return "bg-purple-100 text-purple-800"
      case "comment_mention":
        return "bg-indigo-100 text-indigo-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <div className="flex flex-col">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Project Notifications (Debug)</h3>
          <Link
            href={`/dashboard/projects/${projectId}/notifications`}
            onClick={onClose}
          >
            <Button variant="ghost" size="sm">
              View All
            </Button>
          </Link>
        </div>
      </div>

      <ScrollArea className="h-[400px]">
        {loading ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            Loading...
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            No notifications
          </div>
        ) : (
          <div className="divide-y">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 hover:bg-muted/50 transition-colors ${notification.isUrgent
                  ? "bg-red-50 dark:bg-red-950/20 border-l-4 border-red-500"
                  : !notification.isRead
                    ? "bg-blue-50/50"
                    : ""
                  }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {notification.isUrgent && (
                        <AlertTriangle className="h-4 w-4 text-red-600 animate-pulse" />
                      )}
                      <Badge
                        variant={notification.isUrgent ? "destructive" : "outline"}
                        className={`text-xs ${notification.isUrgent ? "" : getTypeColor(notification.type)}`}
                      >
                        {notification.isUrgent ? "🚨 URGENT" : `${notification.type} [${notification.entityType}]`}
                      </Badge>
                      {!notification.isRead && !notification.isUrgent && (
                        <div className="h-2 w-2 rounded-full bg-blue-500" />
                      )}
                      {notification.requiresAcknowledgment && !notification.acknowledgedAt && (
                        <Badge variant="outline" className="text-xs border-yellow-500 text-yellow-700">
                          Requires Acknowledgment
                        </Badge>
                      )}
                    </div>
                    <a
                      href={getNotificationLink(notification)}
                      onClick={() => {
                        if (!notification.isRead) {
                          handleMarkAsRead(notification.id)
                        }
                        onClose?.()
                      }}
                      className="block hover:bg-muted/50 rounded p-1"
                    >
                      <p className="font-medium text-sm">
                        {notification.title} {notification.entityId ? `(ID: ${notification.entityId})` : "(No ID)"}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {notification.message}
                      </p>
                    </a>
                    <p className="text-xs text-muted-foreground mt-2">
                      {formatDistanceToNow(new Date(notification.createdAt), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                  {!notification.isRead && !notification.requiresAcknowledgment && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleMarkAsRead(notification.id)
                      }}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                  )}
                  {notification.requiresAcknowledgment && !notification.acknowledgedAt && (
                    <Badge variant="outline" className="text-xs border-red-500 text-red-700">
                      Action Required
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}

