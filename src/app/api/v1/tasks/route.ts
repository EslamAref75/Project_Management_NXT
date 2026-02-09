import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getTasksWithFilters, createTask } from "@/app/actions/tasks"

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = req.nextUrl
  const search = searchParams.get("search") ?? ""
  const projectId = searchParams.getAll("projectId")
  const status = searchParams.getAll("status")
  const priority = searchParams.getAll("priority")
  const assigneeId = searchParams.get("assigneeId") ?? undefined
  const startDate = searchParams.get("startDate") ?? undefined
  const endDate = searchParams.get("endDate") ?? undefined
  const dateFilterType = (searchParams.get("dateFilterType") as "dueDate" | "createdDate") || "dueDate"
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10))
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)))

  const result = await getTasksWithFilters({
    search,
    projectId,
    status,
    priority,
    assigneeId,
    startDate,
    endDate,
    dateFilterType,
    page,
    limit,
  })

  if ("error" in result) {
    const statusCode = result.error === "Unauthorized" ? 401 : 500
    return NextResponse.json({ error: result.error }, { status: statusCode })
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
  if (body.title != null) formData.set("title", String(body.title))
  if (body.description != null) formData.set("description", String(body.description))
  if (body.priority != null) formData.set("priority", String(body.priority))
  if (body.projectId != null) formData.set("projectId", String(body.projectId))
  if (body.assigneeIds != null) formData.set("assigneeIds", JSON.stringify(body.assigneeIds))
  if (body.dueDate != null) formData.set("dueDate", String(body.dueDate))

  const result = await createTask(formData)

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
