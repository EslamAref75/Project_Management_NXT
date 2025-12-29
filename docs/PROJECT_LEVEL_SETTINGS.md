# Project-Level Settings Module - Specification

## Overview

The Project-Level Settings module provides per-project configuration management that allows controlled overrides of global system defaults. Each project can customize its behavior while maintaining consistency with system-wide rules and ensuring proper permission enforcement.

---

## 1. Functional Requirements

### 1.1 Project General Settings

**Settings:**
- **Project Timezone**: IANA timezone identifier (overrides global default)
- **Project Working Days**: Array of weekday numbers (0=Sunday, 6=Saturday)
- **Project Working Hours**: Object with `start` and `end` times (HH:mm format)
- **Project Visibility**: "internal" | "restricted" | "public"
- **Allow Override of Global Defaults**: Boolean toggle

**Business Rules:**
- If override is disabled, project inherits global settings
- Timezone affects task deadlines, Today's Tasks reset, and reporting
- Working days determine valid task scheduling dates
- Visibility controls who can view/access the project
- Changes require Project Manager or Admin approval

### 1.2 Task Rules (Per Project)

**Settings:**
- **Allowed Task Statuses**: Array of status keys (subset of global statuses)
- **Default Task Priority**: Priority key (must exist globally)
- **Allow Subtasks**: Boolean - enable/disable subtask creation
- **Task Estimation Unit**: "hours" | "points" | "days"
- **Require Task Estimation**: Boolean - force estimation before task creation
- **Default Estimation Value**: Number (when estimation is required)

**Business Rules:**
- At least one final status must be included in allowed statuses
- All selected statuses must exist in global settings
- Default priority must exist in global settings
- Estimation unit affects time tracking and reporting
- Cannot disable subtasks if existing subtasks exist

### 1.3 Dependency Rules (Per Project)

**Settings:**
- **Enable Task Dependencies**: Boolean - allow dependencies in this project
- **Allow Multiple Dependencies**: Boolean - can a task depend on multiple tasks
- **Restrict to Same Project**: Boolean - only allow dependencies within project
- **Allow Cross-Team Dependencies**: Boolean - allow dependencies across teams
- **Auto-Block Tasks**: Boolean - automatically set status to "waiting" when dependencies incomplete
- **Allow Manual Unblock**: Boolean - allow admins/managers to manually unblock

**Business Rules:**
- Dependency cycles must be prevented (enforced at system level)
- Blocked tasks cannot move to final status (enforced at system level)
- Cross-team dependencies require proper permissions
- Manual unblock requires admin or project manager role

### 1.4 Today's Tasks Rules (Per Project)

**Settings:**
- **Enable Today's Tasks**: Boolean - allow Today's Tasks for this project
- **Maximum Today's Tasks Per User**: Number (0 = unlimited, uses global default)
- **Allow Admin Modification**: Boolean - allow admins to modify during the day
- **Enable Auto Carry-Over**: Boolean - automatically carry incomplete tasks to next day
- **Exclude Blocked Tasks**: Boolean - don't include blocked tasks in Today's Tasks
- **Reset Time Override**: Time in HH:mm format (overrides global reset time)

**Business Rules:**
- Today's Tasks must belong to the selected project
- Maximum limit applies per user per day
- Auto carry-over respects global rules unless overridden
- Blocked task exclusion prevents assigning unworkable tasks

### 1.5 Workflow & Board Configuration

**Settings:**
- **Workflow Template**: String identifier (e.g., "kanban", "scrum", "custom")
- **Kanban Board Columns**: Array of column objects:
  ```json
  {
    "id": "string",
    "name": "string",
    "statusKey": "string", // Maps to task status
    "order": number,
    "wipLimit": number | null,
    "color": "string"
  }
  ```
- **Allowed Status Transitions**: Array of transition objects:
  ```json
  {
    "from": "status_key",
    "to": "status_key",
    "allowed": boolean
  }
  ```
- **WIP Limit Enforcement**: "warning" | "block" | "none"

**Business Rules:**
- Workflow must map to allowed task statuses
- Column order determines board layout
- WIP limits trigger warnings by default (configurable to block)
- Status transitions must respect allowed statuses
- Cannot delete columns with tasks in that status

### 1.6 Roles & Permissions (Project Scope)

**Settings:**
- **Project Roles**: Object mapping user IDs to project roles:
  ```json
  {
    "userId": "project_role"
  }
  ```
- **Project Role Permissions**: Object mapping project roles to permissions:
  ```json
  {
    "project_manager": { "taskAssignment": true, ... },
    "project_lead": { "taskAssignment": true, ... },
    "contributor": { "taskAssignment": false, ... }
  }
  ```
- **Permission Overrides**: Object with permission keys:
  - `taskAssignment`: Can assign tasks to users
  - `dependencyManagement`: Can create/remove dependencies
  - `todayTasksManagement`: Can manage Today's Tasks
  - `taskCreation`: Can create tasks
  - `subtaskManagement`: Can create/edit subtasks
  - `workflowModification`: Can modify workflow/board

**Business Rules:**
- Project roles are separate from system roles
- Permissions cascade: higher roles inherit lower role permissions
- Admin always has all permissions
- Project Manager can assign project roles (limited by system permissions)

### 1.7 Notifications (Project Scope)

**Settings:**
- **Enable Project Notifications**: Boolean - enable/disable project-specific notifications
- **Notification Preferences**: Object with boolean flags:
  - `notifyOnTaskAssignment`: Notify when assigned to project task
  - `notifyOnDependencyBlocked`: Notify when task becomes blocked
  - `notifyOnDependencyResolved`: Notify when dependency is completed
  - `notifyOnTodayTaskAssignment`: Notify when assigned to Today's Tasks
  - `notifyOnStatusChange`: Notify when task status changes
  - `notifyOnTaskOverdue`: Notify when task is overdue
- **Escalation Rules**: Object with:
  - `enabled`: Boolean
  - `escalateAfterHours`: Number
  - `escalateToRole`: String (role to escalate to)

**Business Rules:**
- Project notifications override global defaults when enabled
- Users can still disable notifications in their preferences
- Escalation rules apply only to project tasks
- Critical notifications (blocked tasks) can be forced

---

## 2. Business Rules Summary

1. **Override Resolution**:
   - Project settings override global settings when defined
   - If project setting is null/undefined, global setting applies
   - Override toggle must be enabled to allow overrides
   - System admins can always override

2. **Permission Hierarchy**:
   - System Admin > Project Manager > Project Lead > Contributor
   - Project roles are independent of system roles
   - Permissions are additive (higher roles get all lower role permissions)

3. **Data Integrity**:
   - Cannot delete statuses/priorities in use
   - Cannot disable features with existing data
   - Workflow must match allowed statuses
   - Dependencies must respect project rules

4. **Validation**:
   - Timezone must be valid IANA identifier
   - Working hours must be valid time format
   - Status keys must exist in global settings
   - Priority keys must exist in global settings

5. **Audit Trail**:
   - All changes logged with full context
   - Logs include: user, timestamp, setting key, old value, new value, reason
   - Logs are immutable (append-only)
   - Project-specific logs separate from global logs

---

## 3. Database Structure

### 3.1 ProjectSettings Table

```prisma
model ProjectSetting {
  id          Int      @id @default(autoincrement())
  projectId   Int      @map("project_id")
  project     Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  key         String   // e.g., "general", "tasks", "dependencies", etc.
  value       String   @db.Text // JSON string of the setting value
  category    String   // "general", "tasks", "dependencies", "today_tasks", "workflow", "permissions", "notifications"
  enabled     Boolean  @default(true) // Whether override is enabled
  updatedAt   DateTime @updatedAt @map("updated_at")
  updatedBy   Int      @map("updated_by")
  updater     User     @relation("ProjectSettingsUpdater", fields: [updatedBy], references: [id])

  changeLogs  ProjectSettingsChangeLog[]

  @@unique([projectId, key])
  @@index([projectId, category])
  @@map("project_settings")
}
```

### 3.2 ProjectSettingsChangeLog Table

```prisma
model ProjectSettingsChangeLog {
  id          Int      @id @default(autoincrement())
  projectId  Int      @map("project_id")
  project    Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  settingKey String   @map("setting_key")
  category   String
  oldValue   String?  @map("old_value") @db.Text
  newValue   String   @map("new_value") @db.Text
  reason     String?  // Optional reason for change
  changedBy  Int      @map("changed_by")
  changer    User     @relation("ProjectSettingsChanger", fields: [changedBy], references: [id])
  settingId  Int      @map("setting_id")
  setting    ProjectSetting @relation(fields: [settingId], references: [id], onDelete: Cascade)
  createdAt  DateTime @default(now()) @map("created_at")

  @@index([projectId, settingKey])
  @@index([createdAt])
  @@map("project_settings_change_logs")
}
```

### 3.3 Project Model Update

Add relations:
```prisma
model Project {
  // ... existing fields ...
  settings      ProjectSetting[]
  settingsLogs  ProjectSettingsChangeLog[]
}
```

### 3.4 User Model Update

Add relations:
```prisma
model User {
  // ... existing fields ...
  projectSettingsUpdated ProjectSetting[] @relation("ProjectSettingsUpdater")
  projectSettingsChanged ProjectSettingsChangeLog[] @relation("ProjectSettingsChanger")
}
```

### 3.5 Example JSON Values

**General Settings (`key: "general"`):**
```json
{
  "timezone": "America/New_York",
  "workingDays": [1, 2, 3, 4, 5],
  "workingHours": {
    "start": "09:00",
    "end": "17:00"
  },
  "visibility": "internal",
  "allowOverride": true
}
```

**Task Settings (`key: "tasks"`):**
```json
{
  "allowedStatuses": ["pending", "in_progress", "review", "completed"],
  "defaultPriority": "high",
  "allowSubtasks": true,
  "estimationUnit": "hours",
  "requireEstimation": true,
  "defaultEstimation": 8
}
```

**Dependency Settings (`key: "dependencies"`):**
```json
{
  "enableDependencies": true,
  "allowMultipleDependencies": true,
  "restrictToSameProject": true,
  "allowCrossTeamDependencies": false,
  "autoBlockTasks": true,
  "allowManualUnblock": true
}
```

**Today's Tasks Settings (`key: "today_tasks"`):**
```json
{
  "enableTodayTasks": true,
  "maxTasksPerUser": 5,
  "allowAdminModification": true,
  "enableAutoCarryOver": false,
  "excludeBlockedTasks": true,
  "resetTimeOverride": "09:00"
}
```

**Workflow Settings (`key: "workflow"`):**
```json
{
  "template": "kanban",
  "columns": [
    {
      "id": "todo",
      "name": "To Do",
      "statusKey": "pending",
      "order": 1,
      "wipLimit": null,
      "color": "#fbbf24"
    },
    {
      "id": "in-progress",
      "name": "In Progress",
      "statusKey": "in_progress",
      "order": 2,
      "wipLimit": 3,
      "color": "#3b82f6"
    },
    {
      "id": "done",
      "name": "Done",
      "statusKey": "completed",
      "order": 3,
      "wipLimit": null,
      "color": "#10b981"
    }
  ],
  "allowedTransitions": [
    { "from": "pending", "to": "in_progress", "allowed": true },
    { "from": "in_progress", "to": "completed", "allowed": true }
  ],
  "wipLimitEnforcement": "warning"
}
```

---

## 4. REST API Endpoints (Server Actions)

### 4.1 Get Project Settings

```typescript
GET /api/projects/:projectId/settings
// Returns all settings for a project grouped by category
```

### 4.2 Get Setting by Key

```typescript
GET /api/projects/:projectId/settings/:key
// Returns specific setting value with override resolution
```

### 4.3 Update Project Setting

```typescript
PUT /api/projects/:projectId/settings/:key
Body: { value: {...}, enabled: boolean, reason?: string }
// Updates setting and logs change
```

### 4.4 Get Settings Change Log

```typescript
GET /api/projects/:projectId/settings/logs
Query: ?key=general&limit=50&offset=0
// Returns change history for project
```

### 4.5 Reset Setting to Global Default

```typescript
POST /api/projects/:projectId/settings/:key/reset
// Disables override and uses global default
```

### 4.6 Get Resolved Settings (Project + Global)

```typescript
GET /api/projects/:projectId/settings/resolved
// Returns all settings with project overrides applied to global defaults
```

---

## 5. Override Resolution Logic

### 5.1 Resolution Algorithm

```typescript
function resolveSetting(projectId: number, settingKey: string, category: string) {
  // 1. Get project setting
  const projectSetting = await getProjectSetting(projectId, settingKey)
  
  // 2. If project override exists and is enabled
  if (projectSetting && projectSetting.enabled) {
    return {
      value: JSON.parse(projectSetting.value),
      source: "project",
      setting: projectSetting
    }
  }
  
  // 3. Get global setting
  const globalSetting = await getGlobalSetting(settingKey)
  
  if (globalSetting) {
    return {
      value: JSON.parse(globalSetting.value),
      source: "global",
      setting: globalSetting
    }
  }
  
  // 4. Return system default
  return {
    value: getSystemDefault(settingKey, category),
    source: "system",
    setting: null
  }
}
```

### 5.2 Resolution Priority

1. **Project Override** (if enabled)
2. **Global Setting**
3. **System Default**

### 5.3 Special Cases

- **Nested Settings**: For nested objects, project can override specific keys while inheriting others
- **Array Settings**: Project can extend or replace global arrays
- **Validation**: Project overrides must pass same validation as global settings

---

## 6. UI Layout Description

### 6.1 Settings Panel Structure

**Main Layout:**
- Left sidebar: Category navigation
- Main content: Settings form for selected category
- Right panel (optional): Change history for selected setting
- Top bar: Project selector and save indicator

**Categories:**
1. General
2. Task Rules
3. Dependencies
4. Today's Tasks
5. Workflow & Board
6. Permissions
7. Notifications

### 6.2 General Settings UI

```
┌─────────────────────────────────────────┐
│ Project Settings - [Project Name]        │
├─────────────────────────────────────────┤
│ General Settings                         │
├─────────────────────────────────────────┤
│ ☑ Override Global Defaults              │
│                                          │
│ Project Timezone: [Dropdown: UTC ▼]      │
│                                          │
│ Working Days:                            │
│ ☑ Monday  ☑ Tuesday  ☑ Wednesday         │
│ ☑ Thursday ☑ Friday  ☐ Saturday  ☐ Sunday│
│                                          │
│ Working Hours:                           │
│ Start: [09:00]  End: [17:00]            │
│                                          │
│ Project Visibility:                      │
│ ○ Internal  ● Restricted  ○ Public      │
│                                          │
│ [Save Changes] [Reset to Global]        │
└─────────────────────────────────────────┘
```

### 6.3 Task Rules UI

```
┌─────────────────────────────────────────┐
│ Task Rules                               │
├─────────────────────────────────────────┤
│ ☑ Override Global Task Settings         │
│                                          │
│ Allowed Task Statuses:                   │
│ ┌─────────────────────────────────────┐ │
│ │ ☑ Pending  ☑ In Progress           │ │
│ │ ☑ Review   ☑ Completed              │ │
│ │ ☐ Waiting                            │ │
│ └─────────────────────────────────────┘ │
│                                          │
│ Default Priority: [Dropdown: High ▼]     │
│                                          │
│ ☑ Allow Subtasks                        │
│                                          │
│ Estimation Unit:                         │
│ ○ Hours  ● Points  ○ Days                │
│                                          │
│ ☑ Require Task Estimation               │
│ Default Estimation: [8]                 │
│                                          │
│ [Save Changes]                           │
└─────────────────────────────────────────┘
```

### 6.4 Workflow & Board UI

```
┌─────────────────────────────────────────┐
│ Workflow & Board Configuration          │
├─────────────────────────────────────────┤
│ Workflow Template: [Kanban ▼]           │
│                                          │
│ Board Columns:                          │
│ ┌─────────────────────────────────────┐ │
│ │ [≡] To Do (Pending)        WIP: [∞] │ │
│ │ [≡] In Progress            WIP: [3] │ │
│ │ [≡] Review                  WIP: [∞] │ │
│ │ [≡] Done (Completed)        WIP: [∞] │ │
│ └─────────────────────────────────────┘ │
│ [+ Add Column] [Edit] [Delete]          │
│                                          │
│ WIP Limit Enforcement:                  │
│ ○ None  ● Warning  ○ Block              │
│                                          │
│ [Save Changes]                           │
└─────────────────────────────────────────┘
```

---

## 7. Scalability & Extensibility Considerations

### 7.1 Future Extensions

1. **User-Level Overrides**:
   - Add `UserProjectSettings` table
   - Settings cascade: User → Project → Global
   - UI shows "Inherited from Project" indicators

2. **Template System**:
   - Save project settings as templates
   - Apply templates to new projects
   - Share templates across projects

3. **Bulk Operations**:
   - Apply settings to multiple projects
   - Export/import project settings
   - Clone settings from another project

4. **Advanced Workflows**:
   - Custom status transitions
   - Automated status changes
   - Integration with external tools

5. **Multi-Tenant Support**:
   - Client-specific project settings
   - White-label configurations
   - Branded workflows

### 7.2 Performance Optimizations

1. **Caching**:
   - Cache resolved settings per project
   - Invalidate on settings update
   - Cache TTL: 5 minutes

2. **Lazy Loading**:
   - Load settings on-demand
   - Don't load all settings at once
   - Use pagination for change logs

3. **Indexing**:
   - Index `projectId` and `key` in ProjectSettings
   - Index `projectId`, `settingKey`, and `createdAt` in logs
   - Composite index for common queries

### 7.3 Data Migration

1. **Versioning**:
   - Add `version` field to settings
   - Support migration scripts
   - Backward compatibility

2. **Backup & Restore**:
   - Export settings to JSON
   - Import settings from JSON
   - Validate on import

3. **Rollback**:
   - Keep history of changes
   - Allow rollback to previous version
   - Show diff before rollback

---

## 8. Implementation Priority

**Phase 1 (MVP):**
- General settings (timezone, working days/hours)
- Task rules (statuses, priorities)
- Basic dependency rules
- Settings change logging

**Phase 2:**
- Today's Tasks rules
- Workflow & board configuration
- Permissions overrides

**Phase 3:**
- Advanced notifications
- Escalation rules
- Template system

---

## 9. Security Considerations

1. **Access Control**:
   - Verify project manager role on every operation
   - Use server-side validation only
   - Never trust client-side checks

2. **Input Validation**:
   - Validate all JSON structures
   - Sanitize all inputs
   - Validate timezone/language codes

3. **Audit Trail**:
   - Log all access attempts
   - Include IP address in logs
   - Alert on suspicious activity

4. **Data Protection**:
   - Encrypt sensitive settings at rest
   - Use HTTPS for all API calls
   - Implement rate limiting

---

## 10. Integration Points

### 10.1 Task Module
- Respect project task statuses
- Enforce project priority defaults
- Apply project estimation rules

### 10.2 Dependency Module
- Check project dependency rules
- Enforce cross-project restrictions
- Apply auto-blocking rules

### 10.3 Today's Tasks Module
- Respect project Today's Tasks settings
- Apply project limits
- Use project reset time

### 10.4 Workflow Module
- Render project board columns
- Enforce WIP limits
- Validate status transitions

---

## Conclusion

This specification provides a complete, extensible foundation for Project-Level Settings. The design supports controlled overrides while maintaining system consistency and enabling future enhancements without breaking changes.

