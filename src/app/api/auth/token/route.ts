import { NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"

/**
 * GET /api/auth/token — returns the current session JWT for use with the backend service.
 * Call with credentials (cookie). Used when NEXT_PUBLIC_PROJECTS_BACKEND_URL is set.
 */
export async function GET(req: Request) {
  const token = await getToken({
    req: req as unknown as Parameters<typeof getToken>[0]["req"],
    raw: true,
  })
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  return NextResponse.json({ token })
}
