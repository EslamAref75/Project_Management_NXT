/**
 * Tasks API adapter: uses either server actions (default) or SDK (contract path).
 * - NEXT_PUBLIC_USE_TASKS_API=true → use same-origin /api/v1 (Next.js API routes).
 * - NEXT_PUBLIC_TASKS_BACKEND_URL=<url> → use standalone backend; requires USE_TASKS_API.
 * - NEXT_PUBLIC_TASKS_SHADOW_MODE=true → when using backend, also call monolith and log diffs (optional).
 */

const useTasksApi = process.env.NEXT_PUBLIC_USE_TASKS_API === "true"
const backendUrl = process.env.NEXT_PUBLIC_TASKS_BACKEND_URL
const shadowMode = process.env.NEXT_PUBLIC_TASKS_SHADOW_MODE === "true"

let cachedApi: ReturnType<typeof import("@pms/sdk").createTasksApi> | null = null

async function getTasksApi() {
  if (cachedApi) return cachedApi
  const { createTasksApi, tasksApi } = await import("@pms/sdk")
  if (backendUrl) {
    cachedApi = createTasksApi({
      baseUrl: backendUrl,
      getToken: async () => {
        const res = await fetch("/api/auth/token", { credentials: "include" })
        if (!res.ok) return null
        const data = await res.json().catch(() => ({}))
        return data.token ?? null
      },
    })
  } else {
    cachedApi = tasksApi
  }
  return cachedApi
}

export type ListTasksParams = {
  search?: string
  projectId?: string[]
  status?: string[]
  priority?: string[]
  assigneeId?: string
  dependencyState?: string
  startDate?: string
  endDate?: string
  dateFilterType?: "dueDate" | "createdDate"
  page?: number
  limit?: number
}

async function listTasks(params: ListTasksParams) {
  if (useTasksApi) {
    const api = await getTasksApi()
    const result = await api.listTasks(params)
    if (result.error) return { error: result.error.error ?? "Failed to fetch tasks" }
    if (!result.data) return { error: "No data" }
    if (backendUrl && shadowMode && typeof window !== "undefined") {
      try {
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
        const monolithRes = await fetch(`/api/v1/tasks?${q}`, { credentials: "include" })
        const monolithData = await monolithRes.json().catch(() => null)
        if (monolithRes.ok && monolithData) {
          const { compareAndLog } = await import("@/lib/api/shadow-compare")
          compareAndLog("listTasks", params as Record<string, unknown>, result.data, monolithData)
        }
      } catch (e) {
        if (typeof console !== "undefined" && console.warn) console.warn("[shadow] listTasks monolith fetch failed", e)
      }
    }
    return result.data
  }
  const { getTasksWithFilters } = await import("@/app/actions/tasks")
  return getTasksWithFilters(params)
}

async function getTask(id: number) {
  if (useTasksApi) {
    const api = await getTasksApi()
    const result = await api.getTask(id)
    if (result.error) return null
    return result.data ?? null
  }
  const { getTask: getOne } = await import("@/app/actions/tasks")
  return getOne(id)
}

async function getTaskStatuses(includeInactive = false) {
  if (useTasksApi) {
    const api = await getTasksApi()
    const result = await api.getTaskStatuses(includeInactive)
    if (result.error) return { error: result.error.error ?? "Failed to fetch task statuses" }
    if (!result.data) return { error: "No data" }
    return result.data
  }
  const { getTaskStatuses: getStatuses } = await import("@/app/actions/task-statuses")
  return getStatuses(includeInactive)
}

function formDataToCreateBody(formData: FormData): Record<string, unknown> {
  const projectId = formData.get("projectId")
  const assigneeIdsRaw = formData.get("assigneeIds")
  let assigneeIds: number[] = []
  if (assigneeIdsRaw && typeof assigneeIdsRaw === "string") {
    try {
      const parsed = JSON.parse(assigneeIdsRaw)
      assigneeIds = Array.isArray(parsed) ? parsed : []
    } catch {
      // ignore
    }
  }
  return {
    title: (formData.get("title") as string) ?? "",
    description: (formData.get("description") as string) || undefined,
    priority: (formData.get("priority") as string) || undefined,
    projectId: projectId ? parseInt(String(projectId), 10) : undefined,
    assigneeIds: assigneeIds.length ? assigneeIds : undefined,
    dueDate: (formData.get("dueDate") as string) || undefined,
  }
}

function formDataToUpdateBody(formData: FormData): Record<string, unknown> {
  const assigneeIdsRaw = formData.get("assigneeIds")
  let assigneeIds: number[] | undefined
  if (assigneeIdsRaw != null && assigneeIdsRaw !== "") {
    try {
      const parsed = JSON.parse(String(assigneeIdsRaw))
      assigneeIds = Array.isArray(parsed) ? parsed : []
    } catch {
      assigneeIds = []
    }
  }
  return {
    title: (formData.get("title") as string) ?? undefined,
    description: (formData.get("description") as string) ?? undefined,
    priority: (formData.get("priority") as string) ?? undefined,
    status: (formData.get("status") as string) ?? undefined,
    taskStatusId: formData.get("taskStatusId") ? parseInt(String(formData.get("taskStatusId")), 10) : undefined,
    assigneeIds,
    dueDate: (formData.get("dueDate") as string) ?? undefined,
  }
}

async function createTask(formData: FormData): Promise<{ success?: boolean; error?: string }> {
  if (useTasksApi) {
    const api = await getTasksApi()
    const result = await api.createTask(formDataToCreateBody(formData) as unknown as Parameters<typeof api.createTask>[0])
    if (result.error) return { error: result.error.error ?? "Failed to create task" }
    return { success: true }
  }
  const { createTask: create } = await import("@/app/actions/tasks")
  return create(formData)
}

async function updateTask(id: number, formData: FormData): Promise<{ success?: boolean; error?: string; details?: string }> {
  if (useTasksApi) {
    const api = await getTasksApi()
    const result = await api.updateTask(id, formDataToUpdateBody(formData) as Parameters<typeof api.updateTask>[1])
    if (result.error) return { error: result.error.error ?? "Failed to update task" }
    return { success: true }
  }
  const { updateTask: update } = await import("@/app/actions/tasks")
  return update(id, formData)
}

async function deleteTask(id: number): Promise<{ success?: boolean; error?: string }> {
  if (useTasksApi) {
    const api = await getTasksApi()
    const result = await api.deleteTask(id)
    if (result.error) return { error: result.error.error ?? "Failed to delete task" }
    return { success: true }
  }
  const { deleteTask: remove } = await import("@/app/actions/tasks")
  return remove(id)
}

export const tasksAdapter = {
  listTasks,
  getTask,
  getTaskStatuses,
  createTask,
  updateTask,
  deleteTask,
}
