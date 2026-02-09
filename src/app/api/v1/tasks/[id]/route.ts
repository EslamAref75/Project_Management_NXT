import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getTask, updateTask, deleteTask } from "@/app/actions/tasks"

type Params = Promise<{ id: string }>

export async function GET(req: NextRequest, context: { params: Params }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await context.params
  const taskId = parseInt(id, 10)
  if (Number.isNaN(taskId)) {
    return NextResponse.json({ error: "Invalid task ID" }, { status: 400 })
  }

  try {
    const task = await getTask(taskId)
    return NextResponse.json(task)
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
  const taskId = parseInt(id, 10)
  if (Number.isNaN(taskId)) {
    return NextResponse.json({ error: "Invalid task ID" }, { status: 400 })
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
  if (body.status != null) formData.set("status", String(body.status))
  if (body.taskStatusId != null) formData.set("taskStatusId", String(body.taskStatusId))
  if (body.assigneeIds != null) formData.set("assigneeIds", JSON.stringify(body.assigneeIds))
  if (body.dueDate != null) formData.set("dueDate", String(body.dueDate))

  const result = await updateTask(taskId, formData)

  if (result.error) {
    let status = 400
    if (result.error === "Unauthorized") status = 401
    else if (result.error === "Task not found") status = 404
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
  const taskId = parseInt(id, 10)
  if (Number.isNaN(taskId)) {
    return NextResponse.json({ error: "Invalid task ID" }, { status: 400 })
  }

  const result = await deleteTask(taskId)

  if (result.error) {
    let status = 400
    if (result.error === "Unauthorized") status = 401
    else if (result.error === "Task not found") status = 404
    else if (result.error.includes("Permission denied")) status = 403
    return NextResponse.json(
      { success: false, error: result.error, ...(result.details && { details: result.details }) },
      { status }
    )
  }

  return NextResponse.json({ success: true })
}
