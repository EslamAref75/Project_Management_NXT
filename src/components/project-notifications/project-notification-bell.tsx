"use client"

import { useState, useEffect } from "react"
import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { getProjectUnreadNotificationCount, getProjectNotifications } from "@/app/actions/project-notifications"
import { ProjectNotificationDropdown } from "./project-notification-dropdown"
import { useRouter } from "next/navigation"
import Link from "next/link"

interface ProjectNotificationBellProps {
  projectId: number
}

export function ProjectNotificationBell({ projectId }: ProjectNotificationBellProps) {
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Fetch unread count on mount
    const fetchUnreadCount = async () => {
      const result = await getProjectUnreadNotificationCount(projectId)
      if (result.success && result.count !== undefined) {
        setUnreadCount(result.count)
      }
    }

    fetchUnreadCount()

    // Poll for new notifications every 10 seconds
    const interval = setInterval(fetchUnreadCount, 10000)

    return () => clearInterval(interval)
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
          onClose={() => setIsOpen(false)}
        />
      </PopoverContent>
    </Popover>
  )
}

