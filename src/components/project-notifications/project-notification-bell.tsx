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
import { getProjectUnreadNotificationCount } from "@/app/actions/project-notifications"
import { ProjectNotificationDropdown } from "./project-notification-dropdown"
import { playNotificationSound } from "@/lib/notification-sound"

interface ProjectNotificationBellProps {
  projectId: number
}

export function ProjectNotificationBell({ projectId }: ProjectNotificationBellProps) {
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const prevCountRef = useRef(0)
  const POLL_INTERVAL_MS = 30000

  useEffect(() => {
    // Only run on client-side
    if (typeof window === 'undefined') return

    // Fetch unread count on mount
    let isActive = true
    let timeoutId: ReturnType<typeof setTimeout> | null = null

    const fetchUnreadCount = async () => {
      if (!isActive || document.visibilityState !== "visible") return
      const result = await getProjectUnreadNotificationCount(projectId)
      if (!isActive) return
      if (result.success && result.count !== undefined) {
        // Play sound if count increased and it's not the initial load (prevCount > 0 or handled differently)
        // logic: if new count > old count, and old count was tracked (or just simple increase)
        if (result.count > prevCountRef.current) {
          void playNotificationSound()
        }

        setUnreadCount(result.count)
        prevCountRef.current = result.count
      }
    }

    const scheduleNext = () => {
      if (!isActive) return
      timeoutId = setTimeout(async () => {
        await fetchUnreadCount()
        scheduleNext()
      }, POLL_INTERVAL_MS)
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchUnreadCount()
      }
    }

    fetchUnreadCount()

    // Poll for new notifications every 5 seconds
    const interval = setInterval(fetchUnreadCount, 5000)

    return () => {
      isActive = false
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [projectId])

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
        <ProjectNotificationDropdown
          projectId={projectId}
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
        />
      </PopoverContent>
    </Popover>
  )
}
