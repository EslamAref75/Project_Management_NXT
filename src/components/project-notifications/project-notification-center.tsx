"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  getProjectNotifications,
  markProjectNotificationAsRead,
  markAllProjectNotificationsAsRead,
} from "@/app/actions/project-notifications"
import { formatDistanceToNow } from "date-fns"
import { CheckCheck, Check, X, Filter } from "lucide-react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useToast } from "@/components/ui/use-toast"

interface ProjectNotificationCenterProps {
  projectId: number
}

export function ProjectNotificationCenter({
  projectId,
}: ProjectNotificationCenterProps) {
  const [notifications, setNotifications] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState({
    type: "all",
    isRead: "all",
    search: "",
  })
  const router = useRouter()
  const { toast } = useToast()

  const limit = 20

  useEffect(() => {
    fetchNotifications()
  }, [page, filters])

  const fetchNotifications = async () => {
    setLoading(true)
    const result = await getProjectNotifications(projectId, {
      type: filters.type !== "all" ? filters.type : undefined,
      isRead:
        filters.isRead === "all"
          ? undefined
          : filters.isRead === "read"
          ? true
          : false,
      limit,
      offset: (page - 1) * limit,
    })

    if (result.success && result.notifications) {
      // Apply search filter client-side
      let filtered = result.notifications
      if (filters.search) {
        const searchLower = filters.search.toLowerCase()
        filtered = filtered.filter(
          (n) =>
            n.title.toLowerCase().includes(searchLower) ||
            n.message.toLowerCase().includes(searchLower)
        )
      }
      setNotifications(filtered)
      setTotal(result.total || 0)
    }
    setLoading(false)
  }

  const handleMarkAsRead = async (notificationId: number) => {
    const result = await markProjectNotificationAsRead(projectId, notificationId)
    if (result.success) {
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, isRead: true } : n
        )
      )
      router.refresh()
      toast({
        title: "Success",
        description: "Notification marked as read",
      })
    }
  }

  const handleMarkAllAsRead = async () => {
    const result = await markAllProjectNotificationsAsRead(projectId)
    if (result.success) {
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
      router.refresh()
      toast({
        title: "Success",
        description: "All notifications marked as read",
      })
    }
  }

  const getNotificationLink = (notification: any) => {
    if (notification.entityType === "task" && notification.entityId) {
      return `/dashboard/projects/${projectId}/tasks/${notification.entityId}`
    }
    return `/dashboard/projects/${projectId}`
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

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Type</label>
              <Select
                value={filters.type}
                onValueChange={(value) => {
                  setFilters({ ...filters, type: value })
                  setPage(1)
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="task">Task</SelectItem>
                  <SelectItem value="dependency">Dependency</SelectItem>
                  <SelectItem value="today_task">Today's Task</SelectItem>
                  <SelectItem value="project_admin">Project Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Status</label>
              <Select
                value={filters.isRead}
                onValueChange={(value) => {
                  setFilters({ ...filters, isRead: value })
                  setPage(1)
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="unread">Unread</SelectItem>
                  <SelectItem value="read">Read</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-2">
              <label className="text-sm font-medium mb-2 block">Search</label>
              <Input
                placeholder="Search notifications..."
                value={filters.search}
                onChange={(e) => {
                  setFilters({ ...filters, search: e.target.value })
                  setPage(1)
                }}
              />
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <Button onClick={handleMarkAllAsRead} variant="outline">
              <CheckCheck className="h-4 w-4 mr-2" />
              Mark All as Read
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Notifications List */}
      <Card>
        <CardHeader>
          <CardTitle>
            Notifications ({total})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading...
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No notifications found
            </div>
          ) : (
            <div className="space-y-4">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 border rounded-lg hover:bg-muted/50 transition-colors ${
                    !notification.isRead ? "bg-blue-50/50 border-blue-200" : ""
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge
                          variant="outline"
                          className={`text-xs ${getTypeColor(notification.type)}`}
                        >
                          {notification.type}
                        </Badge>
                        {!notification.isRead && (
                          <div className="h-2 w-2 rounded-full bg-blue-500" />
                        )}
                        {notification.soundRequired && (
                          <Badge variant="destructive" className="text-xs">
                            Critical
                          </Badge>
                        )}
                      </div>
                      <Link
                        href={getNotificationLink(notification)}
                        className="block"
                      >
                        <p className="font-medium">{notification.title}</p>
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
                        onClick={() => handleMarkAsRead(notification.id)}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <Button
                variant="outline"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

