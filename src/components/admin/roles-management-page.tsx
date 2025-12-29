"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, Edit, Trash2, Shield, Users } from "lucide-react"
import { RoleDialog } from "./role-dialog"
import { RoleEditDialog } from "./role-edit-dialog"
import { deleteRole } from "@/app/actions/rbac"
import { useRouter } from "next/navigation"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface RolesManagementPageProps {
  roles: any[]
  permissions: any[]
  permissionsGrouped: Record<string, any[]>
}

export function RolesManagementPage({ 
  roles, 
  permissions, 
  permissionsGrouped 
}: RolesManagementPageProps) {
  const router = useRouter()
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [selectedRole, setSelectedRole] = useState<any>(null)

  const handleEdit = (role: any) => {
    setSelectedRole(role)
    setEditDialogOpen(true)
  }

  const handleDelete = async (roleId: number, roleName: string) => {
    if (!confirm(`Are you sure you want to delete the role "${roleName}"? This action cannot be undone.`)) {
      return
    }

    const result = await deleteRole(roleId)
    if (result?.success) {
      router.refresh()
    } else {
      alert(result?.error || "Failed to delete role")
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">System Roles</h3>
          <p className="text-sm text-muted-foreground">
            Manage roles and their assigned permissions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Role
          </Button>
          <RoleDialog
            open={createDialogOpen}
            onOpenChange={setCreateDialogOpen}
            permissions={permissions}
            permissionsGrouped={permissionsGrouped}
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Roles
          </CardTitle>
          <CardDescription>
            {roles.length} role(s) defined in the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          {roles.length === 0 ? (
            <div className="text-center py-8 border border-dashed rounded-lg">
              <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">No roles found</p>
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Role
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Role Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Permissions</TableHead>
                  <TableHead>Users</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roles.map((role) => (
                  <TableRow key={role.id}>
                    <TableCell className="font-semibold">{role.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {role.description || "No description"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={role.isSystemRole ? "default" : "secondary"}>
                        {role.isSystemRole ? "System" : "Custom"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {role._count?.permissions || 0} permissions
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span>{role._count?.userRoles || 0}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(role)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {!role.isSystemRole && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(role.id, role.name)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {selectedRole && (
        <RoleEditDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          role={selectedRole}
          permissions={permissions}
          permissionsGrouped={permissionsGrouped}
        />
      )}
    </div>
  )
}

