/**
 * Query Optimization Utility Functions
 * 
 * These are reusable select clauses for common query patterns
 * Use these to standardize queries and reduce over-fetching
 */

export const selectPatterns = {
  // User minimal info (for lists)
  userMinimal: {
    id: true,
    username: true,
    email: true,
  },

  // User with avatar
  userWithAvatar: {
    id: true,
    username: true,
    email: true,
    avatarUrl: true,
  },

  // Project minimal (for lists)
  projectMinimal: {
    id: true,
    name: true,
    description: true,
    status: true,
    projectStatusId: true,
    projectTypeId: true,
    projectManagerId: true,
    startDate: true,
    endDate: true,
    createdAt: true,
    createdById: true,
  },

  // Project with manager (for cards)
  projectWithManager: {
    id: true,
    name: true,
    description: true,
    status: true,
    projectStatusId: true,
    projectTypeId: true,
    projectManagerId: true,
    startDate: true,
    endDate: true,
    createdAt: true,
    projectManager: {
      select: {
        id: true,
        username: true,
        email: true,
        avatarUrl: true,
      },
    },
  },

  // Project with counts (for dashboard)
  projectWithCounts: {
    id: true,
    name: true,
    status: true,
    projectStatusId: true,
    _count: {
      select: {
        tasks: true,
        projectUsers: true,
      },
    },
  },

  // Task minimal (for lists)
  taskMinimal: {
    id: true,
    title: true,
    status: true,
    taskStatusId: true,
    priority: true,
    dueDate: true,
    projectId: true,
  },

  // Task with details (for cards)
  taskWithDetails: {
    id: true,
    title: true,
    description: true,
    status: true,
    taskStatusId: true,
    priority: true,
    dueDate: true,
    projectId: true,
    assignees: {
      select: {
        id: true,
        username: true,
        avatarUrl: true,
      },
    },
    project: {
      select: {
        id: true,
        name: true,
      },
    },
  },

  // ActivityLog minimal
  activityMinimal: {
    id: true,
    actionType: true,
    actionSummary: true,
    createdAt: true,
    performedById: true,
    projectId: true,
  },

  // ActivityLog with user
  activityWithUser: {
    id: true,
    actionType: true,
    actionSummary: true,
    createdAt: true,
    performedById: true,
    performedBy: {
      select: {
        id: true,
        username: true,
        avatarUrl: true,
      },
    },
    projectId: true,
  },

  // Notification minimal
  notificationMinimal: {
    id: true,
    title: true,
    message: true,
    type: true,
    isRead: true,
    createdAt: true,
    userId: true,
  },

  // Notification with details
  notificationWithDetails: {
    id: true,
    title: true,
    message: true,
    type: true,
    isRead: true,
    createdAt: true,
    userId: true,
    projectId: true,
    relatedEntityType: true,
    relatedEntityId: true,
  },

  // Permission minimal
  permissionMinimal: {
    id: true,
    key: true,
    name: true,
    module: true,
  },

  // Role with permissions
  roleWithPermissions: {
    id: true,
    name: true,
    description: true,
    isSystemRole: true,
    permissions: {
      select: {
        permission: {
          select: {
            id: true,
            key: true,
            name: true,
            module: true,
          },
        },
      },
    },
  },
}

/**
 * Example usage in queries:
 * 
 * // Instead of:
 * const projects = await prisma.project.findMany()
 * 
 * // Use:
 * const projects = await prisma.project.findMany({
 *   select: selectPatterns.projectWithManager
 * })
 * 
 * // For lists with counts:
 * const projects = await prisma.project.findMany({
 *   select: selectPatterns.projectWithCounts
 * })
 */
