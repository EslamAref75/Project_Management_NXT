import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import {
  getProjectsWithFilters,
  createProject,
} from "@/app/actions/projects"

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = req.nextUrl
  const search = searchParams.get("search") ?? ""
  const category = searchParams.getAll("category")
  const status = searchParams.getAll("status")
  const priority = searchParams.getAll("priority")
  const startDate = searchParams.get("startDate") ?? undefined
  const endDate = searchParams.get("endDate") ?? undefined
  const projectManager = searchParams.get("projectManager") ?? undefined
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10))
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "12", 10)))

  const result = await getProjectsWithFilters({
    search,
    category,
    status,
    priority,
    startDate,
    endDate,
    projectManager,
    page,
    limit,
  })

  if ("error" in result) {
    const status = result.error === "Unauthorized" ? 401 : 500
    return NextResponse.json({ error: result.error }, { status })
  }

  return NextResponse.json(result)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const formData = new FormData()
  if (body.name != null) formData.set("name", String(body.name))
  if (body.type != null) formData.set("type", String(body.type))
  if (body.projectTypeId != null) formData.set("projectTypeId", String(body.projectTypeId))
  if (body.projectStatusId != null) formData.set("projectStatusId", String(body.projectStatusId))
  if (body.description != null) formData.set("description", String(body.description))
  if (body.scope != null) formData.set("scope", String(body.scope))
  if (body.startDate != null) formData.set("startDate", String(body.startDate))
  if (body.endDate != null) formData.set("endDate", String(body.endDate))
  if (body.projectManagerId != null) formData.set("projectManagerId", String(body.projectManagerId))

  const result = await createProject(formData)

  if (result.error) {
    let status = 400
    if (result.error === "Unauthorized") status = 401
    else if (result.error.includes("Permission denied")) status = 403
    return NextResponse.json(
      { success: false, error: result.error, ...(result.details && { details: result.details }) },
      { status }
    )
  }

  return NextResponse.json({ success: true })
}
