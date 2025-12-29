import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { ProjectNotificationCenter } from "@/components/project-notifications/project-notification-center"

export default async function ProjectNotificationsPage({
  params,
}: {
  params: { id: string }
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    redirect("/login")
  }

  const projectId = parseInt(params.id)
  const userId = parseInt(session.user.id)

  // Verify user has access to the project
  const projectUser = await prisma.projectUser.findFirst({
    where: {
      projectId,
      userId,
      leftAt: null,
    },
  })

  if (!projectUser) {
    redirect("/dashboard/projects")
  }

  // Fetch project details
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, name: true, code: true },
  })

  if (!project) {
    redirect("/dashboard/projects")
  }

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Project Notifications</h1>
        <p className="text-muted-foreground mt-2">
          {project.name}
        </p>
      </div>

      <ProjectNotificationCenter projectId={projectId} />
    </div>
  )
}

