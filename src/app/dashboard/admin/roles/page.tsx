import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getRoles, getPermissions } from "@/app/actions/rbac"
import { RolesManagementPage } from "@/components/admin/roles-management-page"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

export default async function AdminRolesPage() {
  const session = await getServerSession(authOptions)
  if (!session) {
    redirect("/login")
  }

  // Only admins can access
  if (session.user.role !== "admin") {
    redirect("/dashboard")
  }

  const [rolesResult, permissionsResult] = await Promise.all([
    getRoles().catch(() => ({ error: "Failed to load roles" })),
    getPermissions().catch(() => ({ error: "Failed to load permissions" })),
  ])

  const roles = Array.isArray(rolesResult) ? rolesResult : []
  const permissions = permissionsResult?.permissions || []
  const permissionsGrouped = permissionsResult?.grouped || {}

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/settings">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Role Management</h2>
          <p className="text-muted-foreground">
            Manage roles and permissions for the system
          </p>
        </div>
      </div>

      <RolesManagementPage 
        roles={roles}
        permissions={permissions}
        permissionsGrouped={permissionsGrouped}
      />
    </div>
  )
}

