import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getProjectStatuses } from "@/app/actions/project-statuses"

/**
 * GET /api/v1/project-statuses — list project statuses (contract: getProjectStatuses)
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = req.nextUrl
  const includeInactive = searchParams.get("includeInactive") === "true"

  const result = await getProjectStatuses(includeInactive)

  if ("error" in result) {
    return NextResponse.json(
      { success: false, error: result.error, ...(result.details && { details: result.details }) },
      { status: result.error === "Unauthorized" ? 401 : 500 }
    )
  }

  return NextResponse.json(result)
}
