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

interface ProjectNotificationBellProps {
  projectId: number
}

export function ProjectNotificationBell({ projectId }: ProjectNotificationBellProps) {
  // Simple notification sound (short beep/bell)
  const NOTIFICATION_SOUND = "data:audio/mp3;base64,//uQRAAAAWMSLwUIYAAsYkXgoQwAEaYLWfkWgAI0wWs/ItAAAG84AAAAAABwAAAAAAAAAAAA6gAAAAADgAAAAAAAAAApGOD6f////////7zmO9HOsp8///6zynv//////4z0f/////7z8/////4z///4z////95/wAAAAAABwAAAAAA4AAAAAAOAAAAAAAAAAABwAAAAAA4AAAAAAOAAAAAAAAAAABwAAAAAA4AAAAAAOAAAAAAAAAAABwAAAAAA4AAAAAAOAAAAAAAAAAABwAAAAAA4AAAAAAOAAAAAAAAAAABwAAAAAA4AAAAAAOAAAAAAAAAAABwAAAAAA4AAAAAAOAAAAAAAAAAABvOAA="

  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const prevCountRef = useRef(0)
  const POLL_INTERVAL_MS = 30000

  useEffect(() => {
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
          try {
            const audio = new Audio(NOTIFICATION_SOUND)
            audio.play().catch(e => console.error("Error playing notification sound:", e))
          } catch (e) {
            console.error("Audio error:", e)
          }
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
    scheduleNext()
    document.addEventListener("visibilitychange", handleVisibilityChange)

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
