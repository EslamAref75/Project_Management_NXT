import { describe, it, expect, vi, beforeEach } from "vitest"

const mockFindUnique = vi.fn()
const mockCompare = vi.fn()
const mockCheckLoginRateLimit = vi.fn(() => ({ allowed: true, resetTime: 0 }))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
    },
  },
}))

vi.mock("bcryptjs", () => ({
  default: {
    compare: (...args: unknown[]) => mockCompare(...args),
  },
}))

vi.mock("@/lib/rate-limiter", () => ({
  checkLoginRateLimit: (...args: unknown[]) => mockCheckLoginRateLimit(...args),
  resetLoginRateLimit: vi.fn(),
}))

describe("Auth credentials provider", () => {
  beforeEach(() => {
    mockCheckLoginRateLimit.mockReturnValue({ allowed: true, resetTime: 0 })
  })

  it("rejects when credentials are missing", async () => {
    const { authOptions } = await import("@/lib/auth")
    const credsProvider = authOptions.providers?.find(
      (p: { id?: string }) => p.id === "credentials"
    ) as { authorize?: (c: unknown) => Promise<unknown> }
    expect(credsProvider?.authorize).toBeDefined()

    const result = await credsProvider.authorize!({
      username: null,
      password: null,
    })

    expect(result).toBeNull()
    expect(mockFindUnique).not.toHaveBeenCalled()
  })

  it("rejects when user is not found", async () => {
    mockFindUnique.mockResolvedValueOnce(null)

    const { authOptions } = await import("@/lib/auth")
    const credsProvider = authOptions.providers?.find(
      (p: { id?: string }) => p.id === "credentials"
    ) as { authorize?: (c: unknown) => Promise<unknown> }

    const result = await credsProvider.authorize!({
      username: "nobody",
      password: "any",
    })

    expect(result).toBeNull()
  })

  it("rejects when password is invalid", async () => {
    mockFindUnique.mockResolvedValueOnce({
      id: 1,
      username: "user",
      email: "u@test.com",
      role: "USER",
      passwordHash: "hashed",
      isActive: true,
    })
    mockCompare.mockResolvedValueOnce(false)

    const { authOptions } = await import("@/lib/auth")
    const credsProvider = authOptions.providers?.find(
      (p: { id?: string }) => p.id === "credentials"
    ) as { authorize?: (c: unknown) => Promise<unknown> }

    const result = await credsProvider.authorize!({
      username: "user",
      password: "wrong",
    })

    expect(result).toBeNull()
  })
})
