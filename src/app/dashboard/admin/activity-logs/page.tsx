import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { ActivityLogsPage } from "@/components/admin/activity-logs-page"

export default async function AdminActivityLogsPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    redirect("/login")
  }

  // Only admins can access
  if (session.user.role !== "admin") {
    redirect("/dashboard")
  }

  return <ActivityLogsPage />
}

