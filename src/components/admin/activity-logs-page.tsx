"use client"

import { useState, useEffect } from "react"
import { getActivityLogs, getActivityLogStats } from "@/app/actions/activity-logs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { formatDistanceToNow, format } from "date-fns"
import { Search, Calendar, User, FolderKanban, Filter, RefreshCw } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

type ActionCategory = 
  | "auth" 
  | "project" 
  | "task" 
  | "dependency" 
  | "settings" 
  | "notification" 
  | "today_task"

export function ActivityLogsPage() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [limit] = useState(50)
  const [selectedLog, setSelectedLog] = useState<any | null>(null)

  // Filters
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState<string>("all")
  const [userId, setUserId] = useState<string>("all")
  const [projectId, setProjectId] = useState<string>("all")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")

  useEffect(() => {
    loadLogs()
  }, [page, search, category, userId, projectId, startDate, endDate])

  const loadLogs = async () => {
    setLoading(true)
    try {
      const params: any = {
        limit,
        offset: page * limit,
      }

      if (search) params.search = search
      if (category && category !== "all") params.category = category as ActionCategory
      if (userId && userId !== "all") params.userId = parseInt(userId)
      if (projectId && projectId !== "all") params.projectId = parseInt(projectId)
      if (startDate) params.startDate = new Date(startDate)
      if (endDate) params.endDate = new Date(endDate)

      const result = await getActivityLogs(params)
      if (result.success) {
        setLogs(result.logs || [])
        setTotal(result.total || 0)
      }
    } catch (error) {
      console.error("Error loading logs:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    setPage(0)
    loadLogs()
  }

  const handleReset = () => {
    setSearch("")
    setCategory("all")
    setUserId("all")
    setProjectId("all")
    setStartDate("")
    setEndDate("")
    setPage(0)
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "auth":
        return "bg-blue-100 text-blue-800"
      case "project":
        return "bg-green-100 text-green-800"
      case "task":
        return "bg-purple-100 text-purple-800"
      case "dependency":
        return "bg-orange-100 text-orange-800"
      case "settings":
        return "bg-yellow-100 text-yellow-800"
      case "notification":
        return "bg-pink-100 text-pink-800"
      case "today_task":
        return "bg-cyan-100 text-cyan-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const formatActionDetails = (details: string | null) => {
    if (!details) return null
    try {
      const parsed = JSON.parse(details)
      return JSON.stringify(parsed, null, 2)
    } catch {
      return details
    }
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Activity Logs</h1>
          <p className="text-muted-foreground mt-1">
            System-wide activity tracking and audit trail
          </p>
        </div>
        <Button onClick={loadLogs} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
          <CardDescription>Filter activity logs by various criteria</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <div className="flex gap-2">
                <Input
                  placeholder="Search actions..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
                <Button onClick={handleSearch} size="icon">
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Category</label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="auth">Authentication</SelectItem>
                  <SelectItem value="project">Project</SelectItem>
                  <SelectItem value="task">Task</SelectItem>
                  <SelectItem value="dependency">Dependency</SelectItem>
                  <SelectItem value="settings">Settings</SelectItem>
                  <SelectItem value="notification">Notification</SelectItem>
                  <SelectItem value="today_task">Today's Tasks</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Start Date</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">End Date</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <Button onClick={handleSearch}>Apply Filters</Button>
            <Button onClick={handleReset} variant="outline">
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Activity Logs</CardTitle>
          <CardDescription>
            Showing {logs.length} of {total} total logs
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No activity logs found
            </div>
          ) : (
            <ScrollArea className="h-[600px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Actor</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow
                      key={log.id}
                      className="cursor-pointer"
                      onClick={() => setSelectedLog(log)}
                    >
                      <TableCell className="text-sm">
                        {format(new Date(log.createdAt), "MMM dd, yyyy HH:mm:ss")}
                        <br />
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{log.actionSummary}</div>
                        <div className="text-xs text-muted-foreground">{log.actionType}</div>
                      </TableCell>
                      <TableCell>
                        {log.performedBy ? (
                          <div>
                            <div className="font-medium">{log.performedBy.username}</div>
                            <div className="text-xs text-muted-foreground">
                              {log.performedBy.email}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">System</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {log.affectedUser ? (
                          <div>
                            <div className="font-medium">{log.affectedUser.username}</div>
                            <div className="text-xs text-muted-foreground">
                              {log.affectedUser.email}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {log.project ? (
                          <div>
                            <div className="font-medium">{log.project.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {log.project.code}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={getCategoryColor(log.actionCategory)}>
                          {log.actionCategory}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {log.actionDetails && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedLog(log)
                            }}
                          >
                            View Details
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Page {page + 1} of {totalPages}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(Math.max(0, page - 1))}
                  disabled={page === 0}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                  disabled={page >= totalPages - 1}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Log Details Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Activity Log Details</DialogTitle>
            <DialogDescription>
              Full details for activity log #{selectedLog?.id}
            </DialogDescription>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Action Type</label>
                  <div className="font-medium">{selectedLog.actionType}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Category</label>
                  <div>
                    <Badge className={getCategoryColor(selectedLog.actionCategory)}>
                      {selectedLog.actionCategory}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Summary</label>
                  <div className="font-medium">{selectedLog.actionSummary}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Date & Time</label>
                  <div>
                    {format(new Date(selectedLog.createdAt), "MMM dd, yyyy HH:mm:ss")}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Performed By</label>
                  <div>
                    {selectedLog.performedBy ? (
                      <div>
                        <div className="font-medium">{selectedLog.performedBy.username}</div>
                        <div className="text-sm text-muted-foreground">
                          {selectedLog.performedBy.email} ({selectedLog.performedBy.role})
                        </div>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">System</span>
                    )}
                  </div>
                </div>
                {selectedLog.affectedUser && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Affected User</label>
                    <div>
                      <div className="font-medium">{selectedLog.affectedUser.username}</div>
                      <div className="text-sm text-muted-foreground">
                        {selectedLog.affectedUser.email}
                      </div>
                    </div>
                  </div>
                )}
                {selectedLog.project && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Project</label>
                    <div>
                      <div className="font-medium">{selectedLog.project.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {selectedLog.project.code}
                      </div>
                    </div>
                  </div>
                )}
                {selectedLog.entityType && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Entity</label>
                    <div>
                      {selectedLog.entityType} #{selectedLog.entityId}
                    </div>
                  </div>
                )}
                {selectedLog.ipAddress && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">IP Address</label>
                    <div className="font-mono text-sm">{selectedLog.ipAddress}</div>
                  </div>
                )}
                {selectedLog.userAgent && (
                  <div className="col-span-2">
                    <label className="text-sm font-medium text-muted-foreground">User Agent</label>
                    <div className="font-mono text-xs break-all">{selectedLog.userAgent}</div>
                  </div>
                )}
              </div>

              {selectedLog.actionDetails && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">
                    Action Details (JSON)
                  </label>
                  <pre className="bg-muted p-4 rounded-md overflow-auto text-xs">
                    {formatActionDetails(selectedLog.actionDetails)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

