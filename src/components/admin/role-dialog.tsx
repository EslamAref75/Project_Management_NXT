"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { createRole } from "@/app/actions/rbac"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface RoleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  permissions: any[]
  permissionsGrouped: Record<string, any[]>
}

export function RoleDialog({ open, onOpenChange, permissions, permissionsGrouped }: RoleDialogProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [selectedPermissions, setSelectedPermissions] = useState<number[]>([])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setLoading(true)
    const formData = new FormData()
    formData.append("name", name)
    formData.append("description", description)
    formData.append("permissionIds", JSON.stringify(selectedPermissions))

    const result = await createRole(formData)
    setLoading(false)

    if (result?.success) {
      setName("")
      setDescription("")
      setSelectedPermissions([])
      onOpenChange(false)
      router.refresh()
    } else {
      alert(result?.error || "Failed to create role")
    }
  }

  const togglePermission = (permissionId: number) => {
    setSelectedPermissions(prev =>
      prev.includes(permissionId)
        ? prev.filter(id => id !== permissionId)
        : [...prev, permissionId]
    )
  }

  const toggleAllInModule = (modulePermissions: any[]) => {
    const moduleIds = modulePermissions.map(p => p.id)
    const allSelected = moduleIds.every(id => selectedPermissions.includes(id))
    
    if (allSelected) {
      setSelectedPermissions(prev => prev.filter(id => !moduleIds.includes(id)))
    } else {
      setSelectedPermissions(prev => [...new Set([...prev, ...moduleIds])])
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create New Role</DialogTitle>
            <DialogDescription>
              Define a new role and assign permissions
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Role Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Content Manager"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the role's purpose and responsibilities"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Permissions</Label>
              <Tabs defaultValue={Object.keys(permissionsGrouped)[0]} className="w-full">
                <TabsList className="flex flex-wrap h-auto w-full justify-start gap-1 p-1">
                  {Object.keys(permissionsGrouped).map((module) => (
                    <TabsTrigger key={module} value={module} className="flex-grow-0">
                      {module}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {Object.entries(permissionsGrouped).map(([module, modulePermissions]) => (
                  <TabsContent key={module} value={module} className="mt-4">
                    <ScrollArea className="h-[300px] border rounded-lg p-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between mb-4 pb-2 border-b">
                          <span className="font-medium">{module} Permissions</span>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => toggleAllInModule(modulePermissions)}
                          >
                            {modulePermissions.every(p => selectedPermissions.includes(p.id))
                              ? "Deselect All"
                              : "Select All"}
                          </Button>
                        </div>
                        {modulePermissions.map((permission) => (
                          <div key={permission.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`perm-${permission.id}`}
                              checked={selectedPermissions.includes(permission.id)}
                              onCheckedChange={() => togglePermission(permission.id)}
                            />
                            <label
                              htmlFor={`perm-${permission.id}`}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                            >
                              <div>
                                <code className="text-xs">{permission.key}</code>
                                {permission.description && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {permission.description}
                                  </p>
                                )}
                              </div>
                            </label>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </TabsContent>
                ))}
              </Tabs>
              <p className="text-xs text-muted-foreground mt-2">
                {selectedPermissions.length} permission(s) selected
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !name.trim()}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Role
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

