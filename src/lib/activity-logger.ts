"use server"

import { prisma } from "@/lib/prisma"
import { headers } from "next/headers"

export type ActionCategory = 
  | "auth" 
  | "project" 
  | "task" 
  | "dependency" 
  | "settings" 
  | "notification" 
  | "today_task"

export type ActionType = 
  // Auth
  | "user_login"
  | "user_logout"
  | "login_failed"
  | "role_changed"
  | "user_activated"
  | "user_suspended"
  // Project
  | "project_created"
  | "project_updated"
  | "project_archived"
  | "project_manager_changed"
  | "team_member_added"
  | "team_member_removed"
  | "project_settings_changed"
  // Task
  | "task_created"
  | "task_updated"
  | "task_deleted"
  | "task_assigned"
  | "task_reassigned"
  | "task_status_changed"
  | "task_priority_changed"
  | "subtask_created"
  | "subtask_updated"
  | "subtask_completed"
  // Dependency
  | "dependency_added"
  | "dependency_removed"
  | "task_blocked"
  | "task_unblocked"
  // Today's Tasks
  | "today_task_assigned"
  | "today_task_modified"
  | "today_task_removed"
  | "auto_carryover_executed"
  // Settings
  | "global_settings_updated"
  | "project_settings_updated"
  | "user_settings_updated"
  | "project_type_created"
  | "project_type_updated"
  | "project_type_deleted"
  | "project_type_toggled"
  | "project_status_created"
  | "project_status_updated"
  | "project_status_deleted"
  | "project_status_toggled"
  | "project_statuses_reordered"
  | "task_status_created"
  | "task_status_updated"
  | "task_status_deleted"
  | "task_status_toggled"
  | "task_statuses_reordered"
  // Notifications
  | "notification_settings_changed"
  | "admin_override_executed"
  | "manual_unblock"

interface LogActivityParams {
  actionType: ActionType
  actionCategory: ActionCategory
  actionSummary: string
  actionDetails?: Record<string, any>
  performedById: number
  affectedUserId?: number
  projectId?: number
  entityType?: string
  entityId?: number
  ipAddress?: string
  userAgent?: string
}

/**
 * Log an activity to the activity log
 * This function should be called after any important action
 */
export async function logActivity(params: LogActivityParams): Promise<void> {
  console.log("[ActivityLogger] ====== START LOGGING ======")
  console.log("[ActivityLogger] Received params:", JSON.stringify(params, null, 2))
  
  try {
    // Sanitize actionDetails to remove sensitive information
    const sanitizedDetails = sanitizeActionDetails(params.actionDetails || {})
    
    console.log("[ActivityLogger] Sanitized details:", JSON.stringify(sanitizedDetails, null, 2))
    console.log("[ActivityLogger] Logging activity:", {
      actionType: params.actionType,
      actionCategory: params.actionCategory,
      actionSummary: params.actionSummary,
      performedById: params.performedById,
    })
    
    // Try to create with new schema first
    try {
      const result = await prisma.activityLog.create({
        data: {
          actionType: params.actionType,
          actionCategory: params.actionCategory,
          actionSummary: params.actionSummary,
          actionDetails: Object.keys(sanitizedDetails).length > 0 
            ? JSON.stringify(sanitizedDetails) 
            : null,
          performedById: params.performedById,
          affectedUserId: params.affectedUserId || null,
          projectId: params.projectId || null,
          entityType: params.entityType || null,
          entityId: params.entityId || null,
          ipAddress: params.ipAddress || await getClientIP(),
          userAgent: params.userAgent || await getUserAgent(),
          // Legacy fields (required by database)
          action: params.actionType, // Map actionType to legacy action field
          description: params.actionSummary, // Map actionSummary to legacy description field
          userId: params.performedById, // Map performedById to legacy userId field
        },
      })
      console.log("[ActivityLogger] ✅ Successfully logged activity with ID:", result.id)
      console.log("[ActivityLogger] ====== END LOGGING (SUCCESS) ======")
      return
    } catch (schemaError: any) {
      console.error("[ActivityLogger] ❌ Schema error occurred:")
      console.error("[ActivityLogger] Error message:", schemaError.message)
      console.error("[ActivityLogger] Error code:", schemaError.code)
      console.error("[ActivityLogger] Error meta:", JSON.stringify(schemaError.meta, null, 2))
      // If new columns don't exist, fall back to old schema
      if (schemaError.message?.includes('no such column') || schemaError.code === 'P2003' || schemaError.code === 'P2011') {
        console.warn("[ActivityLogger] New columns not found, using legacy schema. Please run migration.")
        await prisma.$executeRawUnsafe(`
          INSERT INTO activity_logs (action, description, entity_type, entity_id, ip_address, user_id, created_at)
          VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
        `, 
          params.actionType,
          params.actionSummary,
          params.entityType || null,
          params.entityId || null,
          params.ipAddress || await getClientIP() || null,
          params.performedById
        )
        console.log("[ActivityLogger] ✅ Logged using legacy schema")
        console.log("[ActivityLogger] ====== END LOGGING (LEGACY) ======")
        return
      } else {
        console.error("[ActivityLogger] ❌ Unknown schema error, rethrowing")
        throw schemaError
      }
    }
  } catch (error: any) {
    // Log errors but don't throw - activity logging should never break the main flow
    console.error("[ActivityLogger] ❌❌❌ CRITICAL ERROR - Failed to log activity ❌❌❌")
    console.error("[ActivityLogger] Error message:", error?.message || error)
    console.error("[ActivityLogger] Error code:", error?.code)
    console.error("[ActivityLogger] Error meta:", JSON.stringify(error?.meta, null, 2))
    console.error("[ActivityLogger] Error stack:", error?.stack)
    console.error("[ActivityLogger] ====== END LOGGING (ERROR) ======")
  }
}

/**
 * Sanitize action details to remove sensitive information
 */
function sanitizeActionDetails(details: Record<string, any>): Record<string, any> {
  const sensitiveKeys = [
    'password',
    'passwordHash',
    'password_hash',
    'token',
    'secret',
    'apiKey',
    'api_key',
    'accessToken',
    'refreshToken',
  ]

  const sanitized = { ...details }

  for (const key of sensitiveKeys) {
    if (key in sanitized) {
      sanitized[key] = '[REDACTED]'
    }
  }

  // Recursively sanitize nested objects
  for (const key in sanitized) {
    if (typeof sanitized[key] === 'object' && sanitized[key] !== null && !Array.isArray(sanitized[key])) {
      sanitized[key] = sanitizeActionDetails(sanitized[key])
    }
  }

  return sanitized
}

/**
 * Get client IP address from headers
 */
async function getClientIP(): Promise<string | null> {
  try {
    const headersList = await headers()
    const forwarded = headersList.get('x-forwarded-for')
    const realIP = headersList.get('x-real-ip')
    
    if (forwarded) {
      return forwarded.split(',')[0].trim()
    }
    if (realIP) {
      return realIP
    }
    return null
  } catch {
    return null
  }
}

/**
 * Get user agent from headers
 */
async function getUserAgent(): Promise<string | null> {
  try {
    const headersList = await headers()
    return headersList.get('user-agent') || null
  } catch {
    return null
  }
}

