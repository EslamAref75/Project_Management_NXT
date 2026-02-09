import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getProject, updateProject, deleteProject } from "@/app/actions/projects"

type Params = Promise<{ id: string }>

export async function GET(req: NextRequest, context: { params: Params }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await context.params
  const projectId = parseInt(id, 10)
  if (Number.isNaN(projectId)) {
    return NextResponse.json({ error: "Invalid project ID" }, { status: 400 })
  }

  try {
    const project = await getProject(projectId)
    return NextResponse.json(project)
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
}

export async function PATCH(req: NextRequest, context: { params: Params }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await context.params
  const projectId = parseInt(id, 10)
  if (Number.isNaN(projectId)) {
    return NextResponse.json({ error: "Invalid project ID" }, { status: 400 })
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

  const result = await updateProject(projectId, formData)

  if (result.error) {
    let status = 400
    if (result.error === "Unauthorized") status = 401
    else if (result.error === "Project not found") status = 404
    else if (result.error.includes("Permission denied")) status = 403
    return NextResponse.json(
      { success: false, error: result.error, ...(result.details && { details: result.details }) },
      { status }
    )
  }

  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest, context: { params: Params }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await context.params
  const projectId = parseInt(id, 10)
  if (Number.isNaN(projectId)) {
    return NextResponse.json({ error: "Invalid project ID" }, { status: 400 })
  }

  const result = await deleteProject(projectId)

  if (result.error) {
    let status = 400
    if (result.error === "Unauthorized") status = 401
    else if (result.error === "Project not found") status = 404
    else if (result.error.includes("Permission denied")) status = 403
    return NextResponse.json(
      { success: false, error: result.error, ...(result.details && { details: result.details }) },
      { status }
    )
  }

  return NextResponse.json({ success: true })
}
