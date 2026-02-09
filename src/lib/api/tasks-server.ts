/**
 * Server-side tasks data (for RSC). When backend is configured, fetches from backend with
 * server auth token; otherwise delegates to existing server actions.
 */

import { getServerAuthToken } from "./server-auth-token"

const useTasksApi = process.env.NEXT_PUBLIC_USE_TASKS_API === "true"
const backendUrl = process.env.NEXT_PUBLIC_TASKS_BACKEND_URL?.replace(/\/$/, "") ?? ""

export type ListTasksParams = {
  search?: string
  projectId?: string[]
  status?: string[]
  priority?: string[]
  assigneeId?: string
  startDate?: string
  endDate?: string
  dateFilterType?: "dueDate" | "createdDate"
  page?: number
  limit?: number
}

function buildListQuery(params: ListTasksParams): string {
  const q = new URLSearchParams()
  if (params.search) q.set("search", params.search)
  params.projectId?.forEach((id) => q.append("projectId", id))
  params.status?.forEach((s) => q.append("status", s))
  params.priority?.forEach((p) => q.append("priority", p))
  if (params.assigneeId) q.set("assigneeId", params.assigneeId)
  if (params.startDate) q.set("startDate", params.startDate)
  if (params.endDate) q.set("endDate", params.endDate)
  if (params.dateFilterType) q.set("dateFilterType", params.dateFilterType)
  if (params.page != null) q.set("page", String(params.page))
  if (params.limit != null) q.set("limit", String(params.limit))
  const s = q.toString()
  return s ? `?${s}` : ""
}

/**
 * Server-side: list tasks. Same return shape as getTasksWithFilters from actions.
 */
export async function getTasksWithFiltersServer(params: ListTasksParams) {
  if (useTasksApi && backendUrl) {
    const token = await getServerAuthToken()
    if (!token) return { error: "Unauthorized" }
    const query = buildListQuery(params)
    const res = await fetch(`${backendUrl}/api/v1/tasks${query}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) return { error: (data as { error?: string }).error ?? "Failed to fetch tasks" }
    return data as { success: true; tasks: unknown[]; total: number; page: number; limit: number }
  }
  const { getTasksWithFilters } = await import("@/app/actions/tasks")
  return getTasksWithFilters(params)
}

/**
 * Server-side: get one task by id. Same return shape as getTask from actions (object or null).
 */
export async function getTaskServer(id: number) {
  if (useTasksApi && backendUrl) {
    const token = await getServerAuthToken()
    if (!token) return null
    const res = await fetch(`${backendUrl}/api/v1/tasks/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    })
    if (!res.ok) return null
    const data = await res.json().catch(() => null)
    return data as unknown
  }
  const { getTask } = await import("@/app/actions/tasks")
  return getTask(id)
}
