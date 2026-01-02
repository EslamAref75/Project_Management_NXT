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
    // Project Metadata Management
    PROJECT_TYPE_MANAGE: "settings.project_type.manage",
    PROJECT_STATUS_MANAGE: "settings.project_status.manage",
    TASK_STATUS_MANAGE: "settings.task_status.manage",
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
  SYSTEM_ADMIN: {
    name: "System Admin",
    description: "Full system access with all permissions",
    isSystemRole: true,
    permissions: Object.values(PERMISSIONS).flatMap(module => Object.values(module)),
  },
  PROJECT_MANAGER: {
    name: "Project Manager",
    description: "Manage projects, tasks, teams, and dependencies",
    isSystemRole: true,
    permissions: [
      // Project Management
      ...Object.values(PERMISSIONS.PROJECT),
      // Task Management
      ...Object.values(PERMISSIONS.TASK),
      // Dependency Management
      ...Object.values(PERMISSIONS.DEPENDENCY),
      // Team Management (limited)
      PERMISSIONS.TEAM.READ,
      PERMISSIONS.TEAM.UPDATE,
      PERMISSIONS.TEAM.ADD_MEMBER,
      PERMISSIONS.TEAM.REMOVE_MEMBER,
      PERMISSIONS.TEAM.ASSIGN_PROJECT,
      PERMISSIONS.TEAM.REMOVE_PROJECT,
      // Today's Tasks
      ...Object.values(PERMISSIONS.TODAY_TASK),
      // Settings (project-level)
      PERMISSIONS.SETTINGS.PROJECT_READ,
      PERMISSIONS.SETTINGS.PROJECT_EDIT,
      PERMISSIONS.SETTINGS.PROJECT_TYPE_MANAGE,
      PERMISSIONS.SETTINGS.PROJECT_STATUS_MANAGE,
      PERMISSIONS.SETTINGS.TASK_STATUS_MANAGE,
      // Notifications
      PERMISSIONS.NOTIFICATION.VIEW,
      PERMISSIONS.NOTIFICATION.MANAGE,
      // Activity Logs
      PERMISSIONS.LOG.VIEW,
      PERMISSIONS.LOG.VIEW_DETAILS,
      // User Management (read-only for assignment)
      PERMISSIONS.USER.READ,
      // Reports
      PERMISSIONS.REPORT.VIEW,
      PERMISSIONS.REPORT.EXPORT,
      PERMISSIONS.REPORT.GENERATE,
    ],
  },
  TEAM_LEAD: {
    name: "Team Lead",
    description: "Manage team tasks, dependencies, and team members",
    isSystemRole: true,
    permissions: [
      // Project Management (read-only)
      PERMISSIONS.PROJECT.READ,
      // Task Management (for team tasks)
      ...Object.values(PERMISSIONS.TASK),
      // Dependency Management
      ...Object.values(PERMISSIONS.DEPENDENCY),
      // Team Management (own team only)
      PERMISSIONS.TEAM.READ,
      PERMISSIONS.TEAM.UPDATE,
      PERMISSIONS.TEAM.ADD_MEMBER,
      PERMISSIONS.TEAM.REMOVE_MEMBER,
      // Today's Tasks
      ...Object.values(PERMISSIONS.TODAY_TASK),
      // Settings (read-only)
      PERMISSIONS.SETTINGS.PROJECT_READ,
      // Notifications
      PERMISSIONS.NOTIFICATION.VIEW,
      // Activity Logs (team scope)
      PERMISSIONS.LOG.VIEW,
      PERMISSIONS.LOG.VIEW_DETAILS,
      // User Management (read-only for team members)
      PERMISSIONS.USER.READ,
      // Reports (view only)
      PERMISSIONS.REPORT.VIEW,
    ],
  },
  DEVELOPER: {
    name: "Developer",
    description: "Basic task management and updates",
    isSystemRole: true,
    permissions: [
      // Project Management (read-only)
      PERMISSIONS.PROJECT.READ,
      // Task Management (assigned tasks only)
      PERMISSIONS.TASK.READ,
      PERMISSIONS.TASK.UPDATE,
      PERMISSIONS.TASK.CHANGE_STATUS,
      PERMISSIONS.TASK.CHANGE_PRIORITY,
      // Dependency Management (read-only)
      PERMISSIONS.DEPENDENCY.READ,
      // Today's Tasks
      ...Object.values(PERMISSIONS.TODAY_TASK),
      // Notifications
      PERMISSIONS.NOTIFICATION.VIEW,
      // Activity Logs (own logs)
      PERMISSIONS.LOG.VIEW,
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

