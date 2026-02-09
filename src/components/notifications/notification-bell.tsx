"use client"

import { useState, useEffect } from "react"
import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { NotificationList } from "./notification-list"
import { getUnreadNotificationCount } from "@/app/actions/notifications"
import { useSession } from "next-auth/react"
import { usePollWhenVisible } from "@/hooks/use-poll-when-visible"

export function NotificationBell() {
    const { data: session } = useSession()
    const [unreadCount, setUnreadCount] = useState(0)
    const [isOpen, setIsOpen] = useState(false)

    const fetchCount = async (): Promise<boolean> => {
        if (!session) return true
        const result = await getUnreadNotificationCount()
        if (result.success) {
            setUnreadCount(result.count)
            return true
        }
        return false
    }

    usePollWhenVisible(fetchCount, { intervalMs: 30000 })

    // Listen for custom notification events
    useEffect(() => {
        const handleNewNotification = () => {
            const fetchCount = async () => {
                const result = await getUnreadNotificationCount()
                if (result.success) {
                    setUnreadCount(result.count)
                }
            }
            fetchCount()
        }

        window.addEventListener("new-notification", handleNewNotification)
        return () => window.removeEventListener("new-notification", handleNewNotification)
    }, [])

    if (!session) return null

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500" />
                    )}
                    {unreadCount > 0 && (
                        <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                            {unreadCount > 9 ? "9+" : unreadCount}
                        </span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
                <NotificationList
                    onClose={() => setIsOpen(false)}
                    onCountChange={(count) => setUnreadCount(count)}
                />
            </PopoverContent>
        </Popover>
    )
}

