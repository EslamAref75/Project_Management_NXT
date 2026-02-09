import type {
  TaskListResponse,
  TaskDetail,
  TaskCreateInput,
  TaskUpdateInput,
  TaskMutationResponse,
  TaskStatusesResponse,
  ErrorResponse,
  ListTasksParams,
} from "./types"

function buildTasksQuery(params: ListTasksParams): string {
  const search = new URLSearchParams()
  if (params.search) search.set("search", params.search)
  if (params.projectId?.length) params.projectId.forEach((id) => search.append("projectId", id))
  if (params.status?.length) params.status.forEach((s) => search.append("status", s))
  if (params.priority?.length) params.priority.forEach((p) => search.append("priority", p))
  if (params.assigneeId) search.set("assigneeId", params.assigneeId)
  if (params.startDate) search.set("startDate", params.startDate)
  if (params.endDate) search.set("endDate", params.endDate)
  if (params.dateFilterType) search.set("dateFilterType", params.dateFilterType)
  if (params.page != null) search.set("page", String(params.page))
  if (params.limit != null) search.set("limit", String(params.limit))
  const q = search.toString()
  return q ? `?${q}` : ""
}

export interface TasksApiOptions {
  baseUrl?: string
  getToken?: () => Promise<string | null>
}

async function request<T>(
  baseUrl: string,
  path: string,
  options: RequestInit & { getToken?: () => Promise<string | null> } = {}
): Promise<{ data?: T; error?: ErrorResponse; status: number }> {
  const { getToken: getTokenFn, ...fetchOptions } = options
  const url = `${baseUrl.replace(/\/$/, "")}${path}`
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(fetchOptions.headers as Record<string, string>),
  }
  if (getTokenFn) {
    const token = await getTokenFn()
    if (token) headers.Authorization = `Bearer ${token}`
  }
  const res = await fetch(url, {
    ...fetchOptions,
    headers,
    credentials: baseUrl && typeof window !== "undefined" && url.startsWith("http") ? "include" : "same-origin",
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    return {
      status: res.status,
      error: (json as ErrorResponse)?.error ? (json as ErrorResponse) : { error: res.statusText },
    }
  }
  return { status: res.status, data: json as T }
}

export function createTasksApi(options: TasksApiOptions = {}) {
  const baseUrl =
    options.baseUrl ??
    (typeof window !== "undefined" ? "" : process.env.NEXTAUTH_URL ?? "http://localhost:3000")
  const prefix = "/api/v1"
  const getToken = options.getToken

  const reqOpts = () => (getToken ? { getToken } : {})

  return {
    async listTasks(params: ListTasksParams = {}): Promise<{ data?: TaskListResponse; error?: ErrorResponse; status: number }> {
      return request<TaskListResponse>(baseUrl, `${prefix}/tasks${buildTasksQuery(params)}`, reqOpts())
    },

    async getTask(id: number): Promise<{ data: TaskDetail | null; error?: ErrorResponse; status: number }> {
      const result = await request<TaskDetail | null>(baseUrl, `${prefix}/tasks/${id}`, reqOpts())
      return { data: result.data ?? null, error: result.error, status: result.status }
    },

    async createTask(body: TaskCreateInput): Promise<{ data?: TaskMutationResponse; error?: ErrorResponse; status: number }> {
      return request<TaskMutationResponse>(baseUrl, `${prefix}/tasks`, {
        method: "POST",
        body: JSON.stringify(body),
        ...reqOpts(),
      })
    },

    async updateTask(id: number, body: TaskUpdateInput): Promise<{ data?: TaskMutationResponse; error?: ErrorResponse; status: number }> {
      return request<TaskMutationResponse>(baseUrl, `${prefix}/tasks/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
        ...reqOpts(),
      })
    },

    async deleteTask(id: number): Promise<{ data?: TaskMutationResponse; error?: ErrorResponse; status: number }> {
      return request<TaskMutationResponse>(baseUrl, `${prefix}/tasks/${id}`, {
        method: "DELETE",
        ...reqOpts(),
      })
    },

    async getTaskStatuses(includeInactive = false): Promise<{ data?: TaskStatusesResponse; error?: ErrorResponse; status: number }> {
      const query = includeInactive ? "?includeInactive=true" : ""
      return request<TaskStatusesResponse>(baseUrl, `${prefix}/task-statuses${query}`, reqOpts())
    },
  }
}

export const tasksApi = createTasksApi()
