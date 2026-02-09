import { getToken } from "next-auth/jwt"
import { cookies } from "next/headers"

/**
 * Returns the current session JWT for server-side use (e.g. calling the backend from RSC).
 * Uses next-auth session cookie. Returns null if not authenticated.
 */
export async function getServerAuthToken(): Promise<string | null> {
  const cookieStore = await cookies()
  const token = await getToken({
    req: { cookies: cookieStore } as Parameters<typeof getToken>[0]["req"],
    raw: true,
  })
  return token ?? null
}
