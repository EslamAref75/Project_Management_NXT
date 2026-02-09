import { describe, it, expect, vi, beforeEach } from "vitest"
import { getProjectsWithFilters } from "../projects"

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(() =>
    Promise.resolve({ user: { id: "1" } })
  ),
}))

const mockFindMany = vi.fn()
const mockCount = vi.fn()

vi.mock("@/lib/prisma", () => ({
  prisma: {
    project: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
      count: (...args: unknown[]) => mockCount(...args),
    },
  },
}))

vi.mock("@/lib/rbac-helpers", () => ({
  hasPermissionWithoutRoleBypass: vi.fn(() => Promise.resolve(true)),
}))

describe("getProjectsWithFilters", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFindMany.mockResolvedValue([])
    mockCount.mockResolvedValue(0)
  })

  it("returns Unauthorized when session is missing", async () => {
    const { getServerSession } = await import("next-auth")
    vi.mocked(getServerSession).mockResolvedValueOnce(null)

    const result = await getProjectsWithFilters({})

    expect(result).toEqual({ error: "Unauthorized" })
    expect(mockFindMany).not.toHaveBeenCalled()
  })

  it("calls findMany with search filter when search param is provided", async () => {
    const result = await getProjectsWithFilters({ search: "Alpha" })

    expect(result).toEqual({
      success: true,
      projects: [],
      total: 0,
      page: 1,
      limit: 12,
    })
    expect(mockFindMany).toHaveBeenCalledTimes(1)
    const [callArg] = mockFindMany.mock.calls[0]
    expect(callArg.where).toBeDefined()
    expect(callArg.where.name).toEqual({ contains: "Alpha" })
  })

  it("calls findMany with category filter when category param is provided", async () => {
    await getProjectsWithFilters({ category: ["internal", "external"] })

    expect(mockFindMany).toHaveBeenCalledTimes(1)
    const [callArg] = mockFindMany.mock.calls[0]
    expect(callArg.where.type).toEqual({ in: ["internal", "external"] })
  })

  it("returns success shape with projects, total, page, limit", async () => {
    const fakeProjects = [
      {
        id: 1,
        name: "P1",
        description: null,
        status: "active",
        type: "internal",
        projectStatusId: null,
        projectTypeId: null,
        projectManagerId: 1,
        startDate: null,
        endDate: null,
        createdAt: new Date(),
        createdById: 1,
        projectManager: null,
        _count: { tasks: 0, projectUsers: 0, notifications: 0 },
      },
    ]
    mockFindMany.mockResolvedValueOnce(fakeProjects)
    mockCount.mockResolvedValueOnce(1)

    const result = await getProjectsWithFilters({})

    expect(result).toEqual({
      success: true,
      projects: fakeProjects,
      total: 1,
      page: 1,
      limit: 12,
    })
  })
})
