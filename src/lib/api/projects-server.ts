/**
 * Server-side projects data (for RSC). When backend is configured, fetches from backend with
 * server auth token; otherwise delegates to existing server actions.
 */

import { getServerAuthToken } from "./server-auth-token"

const useProjectsApi = process.env.NEXT_PUBLIC_USE_PROJECTS_API === "true"
const backendUrl = process.env.NEXT_PUBLIC_PROJECTS_BACKEND_URL?.replace(/\/$/, "") ?? ""

export type ListProjectsParams = {
  search?: string
  category?: string[]
  status?: string[]
  priority?: string[]
  startDate?: string
  endDate?: string
  projectManager?: string
  page?: number
  limit?: number
}

function buildListQuery(params: ListProjectsParams): string {
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
  const s = q.toString()
  return s ? `?${s}` : ""
}

/**
 * Server-side: list projects. Same return shape as getProjectsWithFilters from actions.
 */
export async function getProjectsWithFiltersServer(params: ListProjectsParams) {
  if (useProjectsApi && backendUrl) {
    const token = await getServerAuthToken()
    if (!token) return { error: "Unauthorized" }
    const query = buildListQuery(params)
    const res = await fetch(`${backendUrl}/api/v1/projects${query}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) return { error: (data as { error?: string }).error ?? "Failed to fetch projects" }
    return data as { success: true; projects: unknown[]; total: number; page: number; limit: number }
  }
  const { getProjectsWithFilters } = await import("@/app/actions/projects")
  return getProjectsWithFilters(params)
}

/**
 * Server-side: get one project by id. Same return shape as getProject from actions (object or null).
 */
export async function getProjectServer(id: number) {
  if (useProjectsApi && backendUrl) {
    const token = await getServerAuthToken()
    if (!token) return null
    const res = await fetch(`${backendUrl}/api/v1/projects/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    })
    if (!res.ok) return null
    const data = await res.json().catch(() => null)
    return data as unknown
  }
  const { getProject } = await import("@/app/actions/projects")
  return getProject(id)
}
