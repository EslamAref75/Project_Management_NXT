/**
 * Permission definitions for RBAC system
 * Format: module.action or module.category.action
 */

export const PERMISSIONS = {
  // User Management
  USER: {
    CREATE: "user.create",
    READ: "user.read",
    UPDATE: "user.update",
    DELETE: "user.delete",
    ASSIGN_ROLE: "user.assign_role",
    ACTIVATE: "user.activate",
    DEACTIVATE: "user.deactivate",
  },

  // Team Management
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

  // Project Management
  PROJECT: {
    CREATE: "project.create",
    READ: "project.read",
    UPDATE: "project.update",
    DELETE: "project.delete",
    ASSIGN_TEAM: "project.assign_team",
    REMOVE_TEAM: "project.remove_team",
    MANAGE_SETTINGS: "project.manage_settings",
  },

  // Task Management
  TASK: {
    CREATE: "task.create",
    READ: "task.read",
    UPDATE: "task.update",
    DELETE: "task.delete",
    ASSIGN: "task.assign",
    CHANGE_STATUS: "task.change_status",
    CHANGE_PRIORITY: "task.change_priority",
  },

  // Dependency Management
  DEPENDENCY: {
    CREATE: "dependency.create",
    READ: "dependency.read",
    UPDATE: "dependency.update",
    DELETE: "dependency.delete",
    MANUAL_UNBLOCK: "dependency.manual_unblock",
  },

  // Today's Tasks Management
  TODAY_TASK: {
    ASSIGN: "today_task.assign",
    REMOVE: "today_task.remove",
    REORDER: "today_task.reorder",
    VIEW_ALL: "today_task.view_all",
  },

  // Settings Management
  SETTINGS: {
    GLOBAL_READ: "settings.global.read",
    GLOBAL_EDIT: "settings.global.edit",
    PROJECT_READ: "settings.project.read",
    PROJECT_EDIT: "settings.project.edit",
    USER_READ: "settings.user.read",
    USER_EDIT: "settings.user.edit",
  },

  // Notifications Management
  NOTIFICATION: {
    VIEW: "notification.view",
    MANAGE: "notification.manage",
    CONFIGURE: "notification.configure",
  },

  // Activity Logs & Audit
  LOG: {
    VIEW: "log.view",
    EXPORT: "log.export",
    VIEW_DETAILS: "log.view_details",
  },

  // Role Management
  ROLE: {
    CREATE: "role.create",
    READ: "role.read",
    UPDATE: "role.update",
    DELETE: "role.delete",
    ASSIGN: "role.assign",
    MANAGE_PERMISSIONS: "role.manage_permissions",
  },

  // Reports & Exports
  REPORT: {
    VIEW: "report.view",
    EXPORT: "report.export",
    GENERATE: "report.generate",
  },
} as const

/**
 * Permission modules
 */
export const PERMISSION_MODULES = {
  USER: "user",
  TEAM: "team",
  PROJECT: "project",
  TASK: "task",
  DEPENDENCY: "dependency",
  TODAY_TASK: "today_task",
  SETTINGS: "settings",
  NOTIFICATION: "notification",
  LOG: "log",
  ROLE: "role",
  REPORT: "report",
} as const

/**
 * Default roles and their permissions
 */
export const DEFAULT_ROLES = {
  SUPER_ADMIN: {
    name: "Super Admin",
    description: "Full system access with all permissions",
    isSystemRole: true,
    permissions: Object.values(PERMISSIONS).flatMap(module => Object.values(module)),
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
} as const

/**
 * Get all permission keys as a flat array
 */
export function getAllPermissions(): string[] {
  return Object.values(PERMISSIONS).flatMap(module => Object.values(module))
}

/**
 * Get permissions by module
 */
export function getPermissionsByModule(module: string): string[] {
  const moduleKey = module.toUpperCase() as keyof typeof PERMISSIONS
  if (PERMISSIONS[moduleKey]) {
    return Object.values(PERMISSIONS[moduleKey])
  }
  return []
}

