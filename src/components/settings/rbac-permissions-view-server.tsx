import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Shield, CheckCircle2 } from "lucide-react"
import { getUserRoles } from "@/lib/rbac"
import { getUserPermissions } from "@/lib/rbac"

interface RBACPermissionsViewServerProps {
  userId: number
}

export async function RBACPermissionsViewServer({ userId }: RBACPermissionsViewServerProps) {
  const [userRoles, userPermissions] = await Promise.all([
    getUserRoles(userId).catch(() => []),
    getUserPermissions(userId).catch(() => []),
  ])

  return (
    <div className="space-y-6">
      {/* User Roles */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Assigned Roles
          </CardTitle>
          <CardDescription>
            Roles assigned to your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          {userRoles.length === 0 ? (
            <p className="text-sm text-muted-foreground">No roles assigned</p>
          ) : (
            <div className="space-y-3">
              {userRoles.map((userRole) => (
                <div
                  key={`${userRole.role.id}-${userRole.scopeType}-${userRole.scopeId}`}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Badge variant={userRole.role.isSystemRole ? "default" : "secondary"}>
                      {userRole.role.name}
                    </Badge>
                    {userRole.scopeType && (
                      <span className="text-xs text-muted-foreground">
                        Scope: {userRole.scopeType}
                        {userRole.scopeId && ` (ID: ${userRole.scopeId})`}
                      </span>
                    )}
                  </div>
                  {userRole.role.description && (
                    <p className="text-sm text-muted-foreground">
                      {userRole.role.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* User Permissions */}
      <Card>
        <CardHeader>
          <CardTitle>Effective Permissions</CardTitle>
          <CardDescription>
            All permissions granted through your roles ({userPermissions.length} total)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {userPermissions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No permissions granted</p>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {userPermissions.map((permission) => (
                  <div
                    key={permission}
                    className="flex items-center gap-2 p-2 border rounded text-sm"
                  >
                    <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                    <code className="text-xs">{permission}</code>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

