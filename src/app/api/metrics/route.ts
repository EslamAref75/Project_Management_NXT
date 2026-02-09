import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getSnapshot } from "@/lib/metrics"

/**
 * GET /api/metrics — returns baseline metrics snapshot.
 * Auth required (session). Use for baseline capture and dev dashboards.
 */
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const snapshot = getSnapshot()
    return NextResponse.json(snapshot)
  } catch (e) {
    console.error("[metrics] getSnapshot failed:", e)
    return NextResponse.json(
      { error: "Failed to collect metrics" },
      { status: 500 }
    )
  }
}
