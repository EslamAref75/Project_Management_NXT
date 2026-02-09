/**
 * Projects API adapter: uses either server actions (default) or SDK (contract path).
 * - NEXT_PUBLIC_USE_PROJECTS_API=true → use same-origin /api/v1 (Next.js API routes).
 * - NEXT_PUBLIC_PROJECTS_BACKEND_URL=<url> → use standalone backend (e.g. http://localhost:4000); requires USE_PROJECTS_API.
 * - NEXT_PUBLIC_PROJECTS_SHADOW_MODE=true → when using backend, also call monolith and log diffs (Phase 3).
 */

const useProjectsApi = process.env.NEXT_PUBLIC_USE_PROJECTS_API === "true"
const backendUrl = process.env.NEXT_PUBLIC_PROJECTS_BACKEND_URL
const shadowMode = process.env.NEXT_PUBLIC_PROJECTS_SHADOW_MODE === "true"

let cachedApi: ReturnType<typeof import("@pms/sdk").createProjectsApi> | null = null

async function getProjectsApi() {
  if (cachedApi) return cachedApi
  const { createProjectsApi, projectsApi } = await import("@pms/sdk")
  if (backendUrl) {
    cachedApi = createProjectsApi({
      baseUrl: backendUrl,
      getToken: async () => {
        const res = await fetch("/api/auth/token", { credentials: "include" })
        if (!res.ok) return null
        const data = await res.json().catch(() => ({}))
        return data.token ?? null
      },
    })
  } else {
    cachedApi = projectsApi
  }
  return cachedApi
}

async function listProjects(params: {
  search?: string
  category?: string[]
  status?: string[]
  priority?: string[]
  startDate?: string
  endDate?: string
  projectManager?: string
  page?: number
  limit?: number
}) {
  if (useProjectsApi) {
    const api = await getProjectsApi()
    const result = await api.listProjects(params)
    if (result.error) return { error: result.error }
    if (!result.data) return { error: "No data" }
    if (backendUrl && shadowMode && typeof window !== "undefined") {
      try {
        const q = new URLSearchParams()
        if (params.search) q.set("search", params.search)
        params.category?.forEach((c) => q.append("category", c))
        params.status?.forEach((s) => q.append("status", s))
        params.priority?.forEach((p) => q.append("priority", p))
        if (params.startDate) q.set("startDate", params.startDate)
        if (params.endDate) q.set("endDate", params.endDate)
        if (params.projectManager) q.set("projectManager", params.projectManager)
        if (params.page != null) q.set("page", String(params.page))
        if (params.limit != null) q.set("limit", String(params.limit))
        const monolithRes = await fetch(`/api/v1/projects?${q}`, { credentials: "include" })
        const monolithData = await monolithRes.json().catch(() => null)
        if (monolithRes.ok && monolithData) {
          const { compareAndLog } = await import("@/lib/api/shadow-compare")
          compareAndLog("listProjects", params as Record<string, unknown>, result.data, monolithData)
        }
      } catch (e) {
        if (typeof console !== "undefined" && console.warn) console.warn("[shadow] listProjects monolith fetch failed", e)
      }
    }
    return result.data
  }
  const { getProjectsWithFilters } = await import("@/app/actions/projects")
  return getProjectsWithFilters(params)
}

async function getProjectTypes(includeInactive = false, includeUsageCount = false) {
  if (useProjectsApi) {
    const api = await getProjectsApi()
    const result = await api.getProjectTypes(includeInactive, includeUsageCount)
    if (result.error) return { error: result.error }
    if (!result.data) return { error: "No data" }
    if (backendUrl && shadowMode && typeof window !== "undefined") {
      try {
        const q = new URLSearchParams()
        if (includeInactive) q.set("includeInactive", "true")
        if (includeUsageCount) q.set("includeUsageCount", "true")
        const monolithRes = await fetch(`/api/v1/project-types?${q}`, { credentials: "include" })
        const monolithData = await monolithRes.json().catch(() => null)
        if (monolithRes.ok && monolithData) {
          const { compareAndLog } = await import("@/lib/api/shadow-compare")
          compareAndLog("getProjectTypes", { includeInactive, includeUsageCount }, result.data, monolithData)
        }
      } catch (e) {
        if (typeof console !== "undefined" && console.warn) console.warn("[shadow] getProjectTypes monolith fetch failed", e)
      }
    }
    return result.data
  }
  const { getProjectTypes: getTypes } = await import("@/app/actions/project-types")
  return getTypes(includeInactive, includeUsageCount)
}

async function getProjectStatuses(includeInactive = false) {
  if (useProjectsApi) {
    const api = await getProjectsApi()
    const result = await api.getProjectStatuses(includeInactive)
    if (result.error) return { error: result.error }
    if (!result.data) return { error: "No data" }
    if (backendUrl && shadowMode && typeof window !== "undefined") {
      try {
        const q = includeInactive ? "?includeInactive=true" : ""
        const monolithRes = await fetch(`/api/v1/project-statuses${q}`, { credentials: "include" })
        const monolithData = await monolithRes.json().catch(() => null)
        if (monolithRes.ok && monolithData) {
          const { compareAndLog } = await import("@/lib/api/shadow-compare")
          compareAndLog("getProjectStatuses", { includeInactive }, result.data, monolithData)
        }
      } catch (e) {
        if (typeof console !== "undefined" && console.warn) console.warn("[shadow] getProjectStatuses monolith fetch failed", e)
      }
    }
    return result.data
  }
  const { getProjectStatuses: getStatuses } = await import("@/app/actions/project-statuses")
  return getStatuses(includeInactive)
}

async function getProject(id: number) {
  if (useProjectsApi) {
    const api = await getProjectsApi()
    const result = await api.getProject(id)
    if (result.error) return null
    return result.data ?? null
  }
  const { getProject: getOne } = await import("@/app/actions/projects")
  return getOne(id)
}

function formDataToCreateBody(formData: FormData): Record<string, unknown> {
  const projectTypeId = formData.get("projectTypeId")
  const projectManagerId = formData.get("projectManagerId")
  return {
    name: (formData.get("name") as string) ?? "",
    type: (formData.get("type") as string) || undefined,
    projectTypeId: projectTypeId ? parseInt(String(projectTypeId), 10) : null,
    description: (formData.get("description") as string) || undefined,
    scope: (formData.get("scope") as string) || undefined,
    startDate: (formData.get("startDate") as string) || undefined,
    endDate: (formData.get("endDate") as string) || undefined,
    projectManagerId: projectManagerId ? parseInt(String(projectManagerId), 10) : null,
  }
}

function formDataToUpdateBody(formData: FormData): Record<string, unknown> {
  const projectTypeId = formData.get("projectTypeId")
  const projectStatusId = formData.get("projectStatusId")
  const projectManagerId = formData.get("projectManagerId")
  return {
    name: (formData.get("name") as string) ?? undefined,
    type: (formData.get("type") as string) || undefined,
    projectTypeId: projectTypeId ? parseInt(String(projectTypeId), 10) : null,
    projectStatusId: projectStatusId ? parseInt(String(projectStatusId), 10) : null,
    description: (formData.get("description") as string) ?? undefined,
    scope: (formData.get("scope") as string) ?? undefined,
    status: (formData.get("status") as string) ?? undefined,
    startDate: (formData.get("startDate") as string) || undefined,
    endDate: (formData.get("endDate") as string) || undefined,
    projectManagerId: projectManagerId ? parseInt(String(projectManagerId), 10) : null,
  }
}

async function createProject(formData: FormData): Promise<{ success?: boolean; error?: string }> {
  if (useProjectsApi) {
    const api = await getProjectsApi()
    const result = await api.createProject(formDataToCreateBody(formData) as unknown as Parameters<typeof api.createProject>[0])
    if (result.error) return { error: result.error.error ?? "Failed to create project" }
    return { success: true }
  }
  const { createProject: create } = await import("@/app/actions/projects")
  return create(formData)
}

async function updateProject(id: number, formData: FormData): Promise<{ success?: boolean; error?: string }> {
  if (useProjectsApi) {
    const api = await getProjectsApi()
    const result = await api.updateProject(id, formDataToUpdateBody(formData) as Parameters<typeof api.updateProject>[1])
    if (result.error) return { error: result.error.error ?? "Failed to update project" }
    return { success: true }
  }
  const { updateProject: update } = await import("@/app/actions/projects")
  return update(id, formData)
}

async function deleteProject(id: number): Promise<{ success?: boolean; error?: string }> {
  if (useProjectsApi) {
    const api = await getProjectsApi()
    const result = await api.deleteProject(id)
    if (result.error) return { error: result.error.error ?? "Failed to delete project" }
    return { success: true }
  }
  const { deleteProject: remove } = await import("@/app/actions/projects")
  return remove(id)
}

export const projectsAdapter = {
  listProjects,
  getProject,
  getProjectTypes,
  getProjectStatuses,
  createProject,
  updateProject,
  deleteProject,
}
