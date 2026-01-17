-- CreateIndex indices for performance optimization
-- Phase 2: Query Optimization Week 1

-- Task table - frequently filtered fields
CREATE INDEX idx_task_project_id ON "Task"("projectId");
CREATE INDEX idx_task_created_by_id ON "Task"("createdById");
CREATE INDEX idx_task_status ON "Task"("status");
CREATE INDEX idx_task_priority ON "Task"("priority");
CREATE INDEX idx_task_due_date ON "Task"("dueDate");

-- Project table - frequently filtered fields
CREATE INDEX idx_project_manager_id ON "Project"("projectManagerId");
CREATE INDEX idx_project_created_by_id ON "Project"("createdById");
CREATE INDEX idx_project_status ON "Project"("status");

-- ActivityLog table - frequently queried
CREATE INDEX idx_activity_log_user_id ON "ActivityLog"("userId");
CREATE INDEX idx_activity_log_project_id ON "ActivityLog"("projectId");
CREATE INDEX idx_activity_log_created_at ON "ActivityLog"("createdAt");
CREATE INDEX idx_activity_log_entity ON "ActivityLog"("entityType", "entityId");

-- ProjectUser table - membership checks
CREATE INDEX idx_project_user_user_id ON "ProjectUser"("userId");
CREATE INDEX idx_project_user_project_id ON "ProjectUser"("projectId");

-- TeamMember table - team membership checks
CREATE INDEX idx_team_member_user_id ON "TeamMember"("userId");
CREATE INDEX idx_team_member_team_id ON "TeamMember"("teamId");

-- Notification table - unread queries
CREATE INDEX idx_notification_user_id ON "Notification"("userId");
CREATE INDEX idx_notification_is_read ON "Notification"("isRead");
CREATE INDEX idx_notification_created_at ON "Notification"("createdAt");

-- Permission table - RBAC lookups
CREATE INDEX idx_permission_role_id ON "Permission"("roleId");
