"use client"

import { useState, useEffect, useRef } from "react"
import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  getAllProjectsUnreadNotificationCount,
  getAllProjectsNotifications,
  markProjectNotificationAsRead
} from "@/app/actions/project-notifications"
import { formatDistanceToNow } from "date-fns"
import Link from "next/link"
import { Check } from "lucide-react"
import { useRouter } from "next/navigation"

// Sound generation function
function playNotificationSound() {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)

    // First tone
    oscillator.frequency.value = 800
    oscillator.type = "sine"
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1)

    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + 0.1)

    // Second tone after a short delay
    setTimeout(() => {
      const oscillator2 = audioContext.createOscillator()
      const gainNode2 = audioContext.createGain()

      oscillator2.connect(gainNode2)
      gainNode2.connect(audioContext.destination)

      oscillator2.frequency.value = 1000
      oscillator2.type = "sine"
      gainNode2.gain.setValueAtTime(0.3, audioContext.currentTime)
      gainNode2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1)

      oscillator2.start(audioContext.currentTime)
      oscillator2.stop(audioContext.currentTime + 0.1)
    }, 150)
  } catch (error) {
    console.error("Error playing notification sound:", error)
  }
}

export function ProjectNotificationsHeader() {
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifications, setNotifications] = useState<any[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const previousUnreadCountRef = useRef(0)
  const previousNotificationIdsRef = useRef<Set<number>>(new Set())

  useEffect(() => {
    // Only run on client-side
    if (typeof window === 'undefined') return

    let isMounted = true
    let intervalId: NodeJS.Timeout | null = null

    const fetchData = async () => {
      if (!isMounted) return

      try {
        // Only show loading on initial load
        if (notifications.length === 0 && unreadCount === 0) {
          setLoading(true)
        }

        const [countResult, notificationsResult] = await Promise.all([
          getAllProjectsUnreadNotificationCount(),
          getAllProjectsNotifications(15),
        ])

        if (!isMounted) return

        if (countResult.success && countResult.count !== undefined) {
          const newUnreadCount = countResult.count
          const previousCount = previousUnreadCountRef.current

          // Check if there are new unread notifications
          if (newUnreadCount > previousCount) {
            // Check if there are actually new notifications (not just a count change)
            if (notificationsResult.success && notificationsResult.notifications) {
              const currentNotificationIds = new Set(
                notificationsResult.notifications
                  .filter((n: any) => !n.isRead)
                  .map((n: any) => n.id)
              )

              // Find new notifications that weren't in the previous set
              const newNotifications = notificationsResult.notifications.filter(
                (n: any) => !n.isRead && !previousNotificationIdsRef.current.has(n.id)
              )

              // Play sound if there are new critical notifications
              const hasCriticalNotification = newNotifications.some(
                (n: any) => n.soundRequired
              )

              if (hasCriticalNotification || newNotifications.length > 0) {
                playNotificationSound()
              }
            }
          }

          // Only update state if count actually changed
          if (newUnreadCount !== unreadCount) {
            setUnreadCount(newUnreadCount)
          }
          previousUnreadCountRef.current = newUnreadCount
        }

        if (notificationsResult.success && notificationsResult.notifications) {
          // Update the set of notification IDs
          const currentNotificationIds = new Set(
            notificationsResult.notifications.map((n: any) => n.id)
          )

          // Only update notifications if they actually changed
          const currentIdsString = JSON.stringify([...currentNotificationIds].sort())
          const previousIdsString = JSON.stringify([...previousNotificationIdsRef.current].sort())

          if (currentIdsString !== previousIdsString) {
            previousNotificationIdsRef.current = currentNotificationIds
            setNotifications(notificationsResult.notifications)
          }
        }
      } catch (error) {
        console.error('[Notifications] Error in fetchData:', error)
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    // Fetch immediately
    fetchData()

    // Poll for new notifications every 30 seconds (standardized interval)
    intervalId = setInterval(() => {
      if (isMounted) {
        fetchData()
      }
    }, 30000)

    return () => {
      isMounted = false
      if (intervalId) {
        clearInterval(intervalId)
      }
    }
  }, []) // Empty dependency array - only run on mount

  const handleMarkAsRead = async (projectId: number, notificationId: number) => {
    const result = await markProjectNotificationAsRead(projectId, notificationId)
    if (result.success) {
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, isRead: true } : n
        )
      )
      // Update unread count
      setUnreadCount((prev) => Math.max(0, prev - 1))
      // Don't refresh the router to prevent blinking
    }
  }

  const getNotificationLink = (notification: any) => {
    if (notification.entityType === "task" && notification.entityId) {
      return `/dashboard/projects/${notification.projectId}/tasks/${notification.entityId}`
    }
    return `/dashboard/projects/${notification.projectId}/notifications`
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
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          onClick={() => setIsOpen(!isOpen)}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="flex flex-col">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Project Notifications</h3>
              <Link href="/dashboard/projects" onClick={() => setIsOpen(false)}>
                <Button variant="ghost" size="sm">
                  View Projects
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
                No project notifications
              </div>
            ) : (
              <div className="divide-y">
                {notifications.map((notification) => (
                  <div
                    key={`${notification.projectId}-${notification.id}`}
                    className={`p-4 hover:bg-muted/50 transition-colors ${!notification.isRead ? "bg-blue-50/50" : ""
                      }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge
                            variant="outline"
                            className={`text-xs ${getTypeColor(notification.type)}`}
                          >
                            {notification.type}
                          </Badge>
                          {notification.project && (
                            <span className="text-xs text-muted-foreground">
                              {notification.project.code}
                            </span>
                          )}
                          {!notification.isRead && (
                            <div className="h-2 w-2 rounded-full bg-blue-500" />
                          )}
                        </div>
                        <Link
                          href={getNotificationLink(notification)}
                          onClick={() => {
                            if (!notification.isRead) {
                              handleMarkAsRead(notification.projectId, notification.id)
                            }
                            setIsOpen(false)
                          }}
                          className="block"
                        >
                          <p className="font-medium text-sm">{notification.title}</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {notification.message}
                          </p>
                        </Link>
                        <p className="text-xs text-muted-foreground mt-2">
                          {formatDistanceToNow(new Date(notification.createdAt), {
                            addSuffix: true,
                          })}
                        </p>
                      </div>
                      {!notification.isRead && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleMarkAsRead(notification.projectId, notification.id)
                          }}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </PopoverContent>
    </Popover>
  )
}

