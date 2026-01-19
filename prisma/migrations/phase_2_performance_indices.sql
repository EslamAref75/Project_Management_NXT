-- Performance Optimization: Add Missing Database Indices
-- Phase 2 Week 1: Query Optimization

-- Task table indices - Critical for filtering and sorting
-- Used in: getTasksWithFilters, dashboard queries
CREATE INDEX IF NOT EXISTS idx_task_projectId ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_task_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_task_status_legacy ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_task_dueDate ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_task_createdAt ON tasks(created_at);
CREATE INDEX IF NOT EXISTS idx_task_createdBy ON tasks(created_by_id);
CREATE INDEX IF NOT EXISTS idx_task_teamId ON tasks(team_id);

-- Composite indices for common filters
CREATE INDEX IF NOT EXISTS idx_task_project_status ON tasks(project_id, task_status_id);
CREATE INDEX IF NOT EXISTS idx_task_project_priority ON tasks(project_id, priority);
CREATE INDEX IF NOT EXISTS idx_task_assignee ON tasks_to_user(user_id);

-- Project table indices - Critical for listing and filtering
-- Used in: getProjects, getProjectsWithFilters, dashboard
CREATE INDEX IF NOT EXISTS idx_project_createdAt ON projects(created_at);
CREATE INDEX IF NOT EXISTS idx_project_status_legacy ON projects(status);
CREATE INDEX IF NOT EXISTS idx_project_projectStatusId ON projects(project_status_id);
CREATE INDEX IF NOT EXISTS idx_project_projectTypeId ON projects(project_type_id);
CREATE INDEX IF NOT EXISTS idx_project_projectManagerId ON projects(project_manager_id);
CREATE INDEX IF NOT EXISTS idx_project_createdBy ON projects(created_by);

-- Composite indices for common project filters
CREATE INDEX IF NOT EXISTS idx_project_status_active ON projects(project_status_id, project_type_id);

-- UserRole table indices - Critical for RBAC permission checks
-- Used in: hasPermissionWithoutRoleBypass, getUserPermissions
CREATE INDEX IF NOT EXISTS idx_userrole_userId ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_userrole_roleId ON user_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_userrole_scopeId ON user_roles(scope_id);

-- Composite indices for role lookups
CREATE INDEX IF NOT EXISTS idx_userrole_user_scope ON user_roles(user_id, scope_type, scope_id);

-- ProjectUser indices - For member access
-- Used in: project member queries
CREATE INDEX IF NOT EXISTS idx_projectuser_projectId ON project_users(project_id);
CREATE INDEX IF NOT EXISTS idx_projectuser_userId ON project_users(user_id);

-- Notification indices - For user inbox
-- Used in: getNotifications, markAsRead
CREATE INDEX IF NOT EXISTS idx_notification_userId ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_isRead ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notification_createdAt ON notifications(created_at);

-- Composite for common notification queries
CREATE INDEX IF NOT EXISTS idx_notification_user_read ON notifications(user_id, is_read);

-- Comment indices
-- Used in: task comments, activity feed
CREATE INDEX IF NOT EXISTS idx_comment_taskId ON comments(task_id);
CREATE INDEX IF NOT EXISTS idx_comment_projectId ON comments(project_id);
CREATE INDEX IF NOT EXISTS idx_comment_createdBy ON comments(created_by_id);
CREATE INDEX IF NOT EXISTS idx_comment_createdAt ON comments(created_at);

-- Attachment indices
-- Used in: file access, cleanup queries
CREATE INDEX IF NOT EXISTS idx_attachment_projectId ON attachments(project_id);
CREATE INDEX IF NOT EXISTS idx_attachment_taskId ON attachments(task_id);
CREATE INDEX IF NOT EXISTS idx_attachment_uploadedBy ON attachments(uploaded_by_id);

-- TaskDependency indices
-- Used in: dependency checking, blocking status
CREATE INDEX IF NOT EXISTS idx_taskdependency_taskId ON task_dependencies(task_id);
CREATE INDEX IF NOT EXISTS idx_taskdependency_dependsOnTaskId ON task_dependencies(depends_on_task_id);
CREATE INDEX IF NOT EXISTS idx_taskdependency_status ON task_dependencies(status);

-- Subtask indices
-- Used in: subtask queries
CREATE INDEX IF NOT EXISTS idx_subtask_taskId ON subtasks(task_id);
CREATE INDEX IF NOT EXISTS idx_subtask_createdBy ON subtasks(created_by_id);

-- TeamMember indices
-- Used in: team member lookups
CREATE INDEX IF NOT EXISTS idx_team_member_teamId ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_member_userId ON team_members(user_id);

-- AutomationRule indices
-- Used in: rule lookups
CREATE INDEX IF NOT EXISTS idx_automation_rule_projectId ON automation_rules(project_id);
CREATE INDEX IF NOT EXISTS idx_automation_rule_status ON automation_rules(is_active);

-- Deliverable indices
-- Used in: deliverable tracking
CREATE INDEX IF NOT EXISTS idx_deliverable_projectId ON deliverables(project_id);
CREATE INDEX IF NOT EXISTS idx_deliverable_createdAt ON deliverables(created_at);

-- TimeLog indices
-- Used in: time tracking queries
CREATE INDEX IF NOT EXISTS idx_timelog_taskId ON time_logs(task_id);
CREATE INDEX IF NOT EXISTS idx_timelog_userId ON time_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_timelog_date ON time_logs(log_date);

-- Important: After creating these indices, run:
-- npm run analyze:queries
-- To verify which queries benefit from these indices
