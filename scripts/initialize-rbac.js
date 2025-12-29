const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

// Import permission definitions (simplified for Node.js)
const PERMISSIONS = {
  USER: {
    CREATE: "user.create",
    READ: "user.read",
    UPDATE: "user.update",
    DELETE: "user.delete",
    ASSIGN_ROLE: "user.assign_role",
    ACTIVATE: "user.activate",
    DEACTIVATE: "user.deactivate",
  },
  TEAM: {
    CREATE: "team.create",
    READ: "team.read",
    UPDATE: "team.update",
    DELETE: "team.delete",
    ADD_MEMBER: "team.add_member",
    REMOVE_MEMBER: "team.remove_member",
    ASSIGN_PROJECT: "team.assign_project",
    REMOVE_PROJECT: "team.remove_project",
  },
  PROJECT: {
    CREATE: "project.create",
    READ: "project.read",
    UPDATE: "project.update",
    DELETE: "project.delete",
    ASSIGN_TEAM: "project.assign_team",
    REMOVE_TEAM: "project.remove_team",
    MANAGE_SETTINGS: "project.manage_settings",
  },
  TASK: {
    CREATE: "task.create",
    READ: "task.read",
    UPDATE: "task.update",
    DELETE: "task.delete",
    ASSIGN: "task.assign",
    CHANGE_STATUS: "task.change_status",
    CHANGE_PRIORITY: "task.change_priority",
  },
  DEPENDENCY: {
    CREATE: "dependency.create",
    READ: "dependency.read",
    UPDATE: "dependency.update",
    DELETE: "dependency.delete",
    MANUAL_UNBLOCK: "dependency.manual_unblock",
  },
  TODAY_TASK: {
    ASSIGN: "today_task.assign",
    REMOVE: "today_task.remove",
    REORDER: "today_task.reorder",
    VIEW_ALL: "today_task.view_all",
  },
  SETTINGS: {
    GLOBAL_READ: "settings.global.read",
    GLOBAL_EDIT: "settings.global.edit",
    PROJECT_READ: "settings.project.read",
    PROJECT_EDIT: "settings.project.edit",
    USER_READ: "settings.user.read",
    USER_EDIT: "settings.user.edit",
  },
  NOTIFICATION: {
    VIEW: "notification.view",
    MANAGE: "notification.manage",
    CONFIGURE: "notification.configure",
  },
  LOG: {
    VIEW: "log.view",
    EXPORT: "log.export",
    VIEW_DETAILS: "log.view_details",
  },
  ROLE: {
    CREATE: "role.create",
    READ: "role.read",
    UPDATE: "role.update",
    DELETE: "role.delete",
    ASSIGN: "role.assign",
    MANAGE_PERMISSIONS: "role.manage_permissions",
  },
  REPORT: {
    VIEW: "report.view",
    EXPORT: "report.export",
    GENERATE: "report.generate",
  },
}

function getAllPermissions() {
  return Object.values(PERMISSIONS).flatMap(module => Object.values(module))
}

const DEFAULT_ROLES = {
  SUPER_ADMIN: {
    name: "Super Admin",
    description: "Full system access with all permissions",
    isSystemRole: true,
    permissions: getAllPermissions(),
  },
  SYSTEM_ADMIN: {
    name: "System Admin",
    description: "Manage users, teams, projects, and global settings",
    isSystemRole: true,
    permissions: [
      ...Object.values(PERMISSIONS.USER),
      ...Object.values(PERMISSIONS.TEAM),
      ...Object.values(PERMISSIONS.PROJECT),
      ...Object.values(PERMISSIONS.TASK),
      ...Object.values(PERMISSIONS.DEPENDENCY),
      ...Object.values(PERMISSIONS.TODAY_TASK),
      ...Object.values(PERMISSIONS.SETTINGS),
      PERMISSIONS.NOTIFICATION.VIEW,
      PERMISSIONS.NOTIFICATION.MANAGE,
      ...Object.values(PERMISSIONS.LOG),
      PERMISSIONS.ROLE.READ,
    ],
  },
  PROJECT_ADMIN: {
    name: "Project Admin",
    description: "Manage assigned projects, tasks, and dependencies",
    isSystemRole: true,
    permissions: [
      PERMISSIONS.PROJECT.READ,
      PERMISSIONS.PROJECT.UPDATE,
      PERMISSIONS.PROJECT.MANAGE_SETTINGS,
      ...Object.values(PERMISSIONS.TASK),
      ...Object.values(PERMISSIONS.DEPENDENCY),
      ...Object.values(PERMISSIONS.TODAY_TASK),
      PERMISSIONS.SETTINGS.PROJECT_READ,
      PERMISSIONS.SETTINGS.PROJECT_EDIT,
      PERMISSIONS.NOTIFICATION.VIEW,
      PERMISSIONS.LOG.VIEW,
    ],
  },
  AUDIT_ADMIN: {
    name: "Audit Admin",
    description: "Read-only access to activity logs and audit information",
    isSystemRole: true,
    permissions: [
      ...Object.values(PERMISSIONS.LOG),
      PERMISSIONS.USER.READ,
      PERMISSIONS.PROJECT.READ,
      PERMISSIONS.TASK.READ,
    ],
  },
}

async function initializeRBAC() {
  try {
    console.log("Initializing RBAC system...")

    // Create all permissions
    const allPermissionKeys = getAllPermissions()
    const permissionMap = new Map()

    for (const key of allPermissionKeys) {
      const [module, ...actionParts] = key.split(".")
      const action = actionParts.join(".")
      const name = action.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())
      const category = actionParts.length > 1 ? actionParts[0] : null

      const permission = await prisma.permission.upsert({
        where: { key },
        update: {},
        create: {
          key,
          name,
          description: `Permission to ${action.replace(/_/g, " ")}`,
          module,
          category,
        },
      })

      permissionMap.set(key, permission.id)
    }

    console.log(`✅ Created/updated ${permissionMap.size} permissions`)

    // Create default roles
    for (const [roleKey, roleData] of Object.entries(DEFAULT_ROLES)) {
      const role = await prisma.role.upsert({
        where: { name: roleData.name },
        update: {
          description: roleData.description,
        },
        create: {
          name: roleData.name,
          description: roleData.description,
          isSystemRole: roleData.isSystemRole,
        },
      })

      // Assign permissions to role
      const permissionIds = roleData.permissions
        .map(key => permissionMap.get(key))
        .filter(id => id !== undefined)

      // Remove existing permissions
      await prisma.rolePermission.deleteMany({
        where: { roleId: role.id },
      })

      // Add new permissions (SQLite doesn't support createMany with unique constraints)
      if (permissionIds.length > 0) {
        for (const permissionId of permissionIds) {
          try {
            await prisma.rolePermission.create({
              data: {
                roleId: role.id,
                permissionId,
              },
            })
          } catch (e) {
            // Skip if already exists
            if (e.code !== 'P2002') {
              throw e
            }
          }
        }
      }

      console.log(`✅ Created/updated role: ${role.name} with ${permissionIds.length} permissions`)
    }

    console.log("✅ RBAC initialization completed!")
  } catch (error) {
    console.error("❌ RBAC initialization failed:", error)
    throw error
  }
}

initializeRBAC()
  .then(() => {
    console.log("Done!")
    process.exit(0)
  })
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

