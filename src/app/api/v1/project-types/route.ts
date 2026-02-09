import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getProjectTypes } from "@/app/actions/project-types"

/**
 * GET /api/v1/project-types — list project types (contract: getProjectTypes)
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = req.nextUrl
  const includeInactive = searchParams.get("includeInactive") === "true"
  const includeUsageCount = searchParams.get("includeUsageCount") === "true"

  const result = await getProjectTypes(includeInactive, includeUsageCount)

  if ("error" in result) {
    return NextResponse.json(
      { success: false, error: result.error, ...(result.details && { details: result.details }) },
      { status: result.error === "Unauthorized" ? 401 : 500 }
    )
  }

  return NextResponse.json(result)
}
