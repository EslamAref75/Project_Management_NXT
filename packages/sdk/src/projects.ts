import type {
  ProjectListResponse,
  ProjectDetail,
  ProjectCreateInput,
  ProjectUpdateInput,
  ProjectMutationResponse,
  ProjectTypesResponse,
  ProjectStatusesResponse,
  ErrorResponse,
  ListProjectsParams,
} from "./types"

function buildQuery(params: ListProjectsParams): string {
  const search = new URLSearchParams()
  if (params.search) search.set("search", params.search)
  if (params.category?.length) params.category.forEach((c) => search.append("category", c))
  if (params.status?.length) params.status.forEach((s) => search.append("status", s))
  if (params.priority?.length) params.priority.forEach((p) => search.append("priority", p))
  if (params.startDate) search.set("startDate", params.startDate)
  if (params.endDate) search.set("endDate", params.endDate)
  if (params.projectManager) search.set("projectManager", params.projectManager)
  if (params.page != null) search.set("page", String(params.page))
  if (params.limit != null) search.set("limit", String(params.limit))
  const q = search.toString()
  return q ? `?${q}` : ""
}

export interface ProjectsApiOptions {
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

export function createProjectsApi(options: ProjectsApiOptions = {}) {
  const baseUrl =
    options.baseUrl ??
    (typeof window !== "undefined" ? "" : process.env.NEXTAUTH_URL ?? "http://localhost:3000")
  const prefix = "/api/v1"
  const getToken = options.getToken

  const reqOpts = () => (getToken ? { getToken } : {})

  return {
    async listProjects(params: ListProjectsParams = {}): Promise<{ data?: ProjectListResponse; error?: ErrorResponse; status: number }> {
      const result = await request<ProjectListResponse>(baseUrl, `${prefix}/projects${buildQuery(params)}`, reqOpts())
      return result
    },

    async getProject(id: number): Promise<{ data: ProjectDetail | null; error?: ErrorResponse; status: number }> {
      const result = await request<ProjectDetail | null>(baseUrl, `${prefix}/projects/${id}`, reqOpts())
      return { data: result.data ?? null, error: result.error, status: result.status }
    },

    async createProject(body: ProjectCreateInput): Promise<{ data?: ProjectMutationResponse; error?: ErrorResponse; status: number }> {
      return request<ProjectMutationResponse>(baseUrl, `${prefix}/projects`, {
        method: "POST",
        body: JSON.stringify(body),
        ...reqOpts(),
      })
    },

    async updateProject(id: number, body: ProjectUpdateInput): Promise<{ data?: ProjectMutationResponse; error?: ErrorResponse; status: number }> {
      return request<ProjectMutationResponse>(baseUrl, `${prefix}/projects/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
        ...reqOpts(),
      })
    },

    async deleteProject(id: number): Promise<{ data?: ProjectMutationResponse; error?: ErrorResponse; status: number }> {
      return request<ProjectMutationResponse>(baseUrl, `${prefix}/projects/${id}`, {
        method: "DELETE",
        ...reqOpts(),
      })
    },

    async getProjectTypes(includeInactive = false, includeUsageCount = false): Promise<{ data?: ProjectTypesResponse; error?: ErrorResponse; status: number }> {
      const q = new URLSearchParams()
      if (includeInactive) q.set("includeInactive", "true")
      if (includeUsageCount) q.set("includeUsageCount", "true")
      const query = q.toString() ? `?${q}` : ""
      return request<ProjectTypesResponse>(baseUrl, `${prefix}/project-types${query}`, reqOpts())
    },

    async getProjectStatuses(includeInactive = false): Promise<{ data?: ProjectStatusesResponse; error?: ErrorResponse; status: number }> {
      const query = includeInactive ? "?includeInactive=true" : ""
      return request<ProjectStatusesResponse>(baseUrl, `${prefix}/project-statuses${query}`, reqOpts())
    },
  }
}

export const projectsApi = createProjectsApi()
