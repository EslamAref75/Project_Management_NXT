# Global System Settings Module - Specification

## Overview

The Global System Settings module provides centralized configuration management for the entire Project Management System. All settings are system-wide, editable only by System Administrators, and designed to support future project-level and user-level overrides.

---

## 1. Functional Requirements

### 1.1 General System Settings

**Settings:**
- **System Name**: Display name for the application
- **System Logo**: URL or file path to system logo
- **Default Language**: ISO 639-1 language code (e.g., "en", "ar")
- **Default Timezone**: IANA timezone identifier (e.g., "America/New_York", "UTC")
- **Working Days**: Array of weekday numbers (0=Sunday, 6=Saturday)
- **Default Working Hours**: Object with `start` and `end` times (HH:mm format)

**Business Rules:**
- Timezone affects all date/time operations, daily resets, logs, and reports
- Language serves as fallback when user preference is not set
- Working days determine valid task scheduling dates
- Working hours affect time tracking and availability calculations

### 1.2 Task & Workflow Settings

**Settings:**
- **Task Statuses**: Array of status objects with:
  - `id`: Unique identifier
  - `name`: Display name (e.g., "Pending", "In Progress")
  - `key`: System key (e.g., "pending", "in_progress")
  - `order`: Display order (integer)
  - `color`: Hex color code
  - `isFinal`: Boolean indicating if this is a completion status
  - `isDefault`: Boolean for default status
- **Task Priority Levels**: Array of priority objects with:
  - `id`: Unique identifier
  - `name`: Display name (e.g., "Low", "Normal", "High", "Urgent")
  - `key`: System key (e.g., "low", "normal", "high", "urgent")
  - `weight`: Numeric weight for sorting (higher = more important)
  - `color`: Hex color code
  - `isDefault`: Boolean for default priority

**Business Rules:**
- At least one status must be marked as `isFinal: true`
- Exactly one status must be marked as `isDefault: true`
- Exactly one priority must be marked as `isDefault: true`
- Status order determines workflow progression
- Priority weight determines sorting order

### 1.3 Today's Tasks Settings

**Settings:**
- **Daily Reset Time**: Time in HH:mm format (e.g., "00:00", "09:00")
- **Reset Timezone Source**: "system" | "user" - which timezone to use for reset
- **Auto Carry-Over**: Boolean - automatically carry incomplete tasks to next day
- **Carry-Over Rules**: Object with:
  - `excludeBlocked`: Boolean - don't carry over blocked tasks
  - `incompleteOnly`: Boolean - only carry over incomplete tasks
  - `maxDays`: Number - maximum days to carry over (0 = unlimited)
- **Admin Override Permissions**: Boolean - allow admins to override carry-over rules

**Business Rules:**
- Reset time determines when "today" changes
- Timezone source affects when reset occurs for each user
- Carry-over rules prevent task accumulation
- Admin override allows manual intervention

### 1.4 Dependency Settings

**Settings:**
- **Allow Multiple Dependencies**: Boolean - can a task depend on multiple tasks
- **Allow Cross-Team Dependencies**: Boolean - can tasks depend on tasks from other teams
- **Allow Cross-Project Dependencies**: Boolean - can tasks depend on tasks from other projects
- **Auto-Block Tasks**: Boolean - automatically set status to "waiting" when dependencies incomplete
- **Allow Admin Manual Unblock**: Boolean - allow admins to manually unblock tasks

**Business Rules:**
- Cross-team/project dependencies require proper permissions
- Auto-blocking prevents work on dependent tasks prematurely
- Manual unblock allows override for special cases

### 1.5 Roles & Permissions Defaults

**Settings:**
- **Default Permissions**: Object mapping role keys to permission objects:
  ```json
  {
    "admin": { "taskCreation": true, "taskAssignment": true, ... },
    "team_lead": { "taskCreation": true, "taskAssignment": true, ... },
    "developer": { "taskCreation": false, "taskAssignment": false, ... }
  }
  ```
- **Permission Keys**:
  - `taskCreation`: Can create tasks
  - `taskAssignment`: Can assign tasks to users
  - `todayTasksManagement`: Can manage Today's Tasks
  - `dependencyManagement`: Can create/remove dependencies
  - `projectCreation`: Can create projects
  - `userManagement`: Can manage users

**Business Rules:**
- Permissions are defaults; can be overridden at project/user level
- Admin role always has all permissions
- Permissions cascade: higher roles inherit lower role permissions

### 1.6 Notifications

**Settings:**
- **Notification Preferences**: Object with boolean flags:
  - `notifyOnTodayTaskAssignment`: Notify when assigned to Today's Tasks
  - `notifyOnTaskBlocked`: Notify when task becomes blocked
  - `notifyOnDependencyCompleted`: Notify when dependency is completed
  - `notifyOnTaskOverdue`: Notify when task is overdue
  - `notifyOnStatusChange`: Notify when task status changes

**Business Rules:**
- Notifications respect user preferences (can be disabled per user)
- System defaults apply when user preference is not set
- Critical notifications (e.g., blocked tasks) can be forced

### 1.7 Audit & Logs

**Settings:**
- **Enable Settings Change Logs**: Boolean - log all settings changes
- **Enable Override Logs**: Boolean - log permission/rule overrides
- **Log Retention Policy**: Object with:
  - `retentionDays`: Number of days to keep logs (0 = forever)
  - `archiveAfterDays`: Number of days before archiving
  - `maxLogSizeMB`: Maximum log file size before rotation

**Business Rules:**
- All settings changes must be logged with user, timestamp, old value, new value
- Override logs track when rules are bypassed
- Retention policy ensures database doesn't grow unbounded

---

## 2. Business Rules Summary

1. **Access Control**:
   - Only System Administrators can view/edit global settings
   - All changes require authentication and authorization
   - Changes take effect immediately (no approval workflow)

2. **Data Integrity**:
   - At least one final task status required
   - Exactly one default status and priority required
   - Status and priority keys must be unique
   - Cannot delete status/priority if in use

3. **Validation**:
   - Timezone must be valid IANA identifier
   - Language must be valid ISO 639-1 code
   - Working hours must be valid time format
   - Reset time must be valid time format

4. **Cascading**:
   - Project-level settings override global settings
   - User-level settings override project and global settings
   - System defaults apply when no override exists

5. **Audit Trail**:
   - All changes logged with full context
   - Logs include: user, timestamp, setting key, old value, new value, reason
   - Logs are immutable (append-only)

---

## 3. Database Structure

### 3.1 SystemSettings Table

```prisma
model SystemSettings {
  id        Int      @id @default(autoincrement())
  key       String   @unique // e.g., "general", "tasks", "today_tasks", etc.
  value     String   @db.Text // JSON string of the setting value
  category  String   // "general", "tasks", "today_tasks", "dependencies", "permissions", "notifications", "audit"
  updatedAt DateTime  @updatedAt
  updatedBy Int       @map("updated_by")
  updater   User      @relation("SettingsUpdater", fields: [updatedBy], references: [id])

  @@map("system_settings")
}
```

### 3.2 SettingsChangeLog Table

```prisma
model SettingsChangeLog {
  id          Int      @id @default(autoincrement())
  settingKey  String   @map("setting_key")
  category    String
  oldValue    String?  @map("old_value") @db.Text
  newValue    String   @map("new_value") @db.Text
  reason      String?  // Optional reason for change
  changedBy   Int      @map("changed_by")
  changer     User     @relation("SettingsChanger", fields: [changedBy], references: [id])
  createdAt   DateTime @default(now()) @map("created_at")

  @@index([settingKey])
  @@index([createdAt])
  @@map("settings_change_logs")
}
```

### 3.3 User Model Update

Add relations:
```prisma
model User {
  // ... existing fields ...
  settingsUpdated SystemSettings[] @relation("SettingsUpdater")
  settingsChanged SettingsChangeLog[] @relation("SettingsChanger")
}
```

### 3.4 Example JSON Values

**General Settings (`key: "general"`):**
```json
{
  "systemName": "Project Management System",
  "systemLogo": "/assets/logo.png",
  "defaultLanguage": "en",
  "defaultTimezone": "UTC",
  "workingDays": [1, 2, 3, 4, 5],
  "defaultWorkingHours": {
    "start": "09:00",
    "end": "17:00"
  }
}
```

**Task Settings (`key: "tasks"`):**
```json
{
  "statuses": [
    {
      "id": 1,
      "name": "Pending",
      "key": "pending",
      "order": 1,
      "color": "#fbbf24",
      "isFinal": false,
      "isDefault": true
    },
    {
      "id": 2,
      "name": "In Progress",
      "key": "in_progress",
      "order": 2,
      "color": "#3b82f6",
      "isFinal": false,
      "isDefault": false
    },
    {
      "id": 3,
      "name": "Completed",
      "key": "completed",
      "order": 3,
      "color": "#10b981",
      "isFinal": true,
      "isDefault": false
    }
  ],
  "priorities": [
    {
      "id": 1,
      "name": "Low",
      "key": "low",
      "weight": 1,
      "color": "#6b7280",
      "isDefault": false
    },
    {
      "id": 2,
      "name": "Normal",
      "key": "normal",
      "weight": 2,
      "color": "#3b82f6",
      "isDefault": true
    },
    {
      "id": 3,
      "name": "High",
      "key": "high",
      "weight": 3,
      "color": "#f59e0b",
      "isDefault": false
    },
    {
      "id": 4,
      "name": "Urgent",
      "key": "urgent",
      "weight": 4,
      "color": "#ef4444",
      "isDefault": false
    }
  ]
}
```

**Today's Tasks Settings (`key: "today_tasks"`):**
```json
{
  "dailyResetTime": "00:00",
  "resetTimezoneSource": "system",
  "autoCarryOver": true,
  "carryOverRules": {
    "excludeBlocked": true,
    "incompleteOnly": true,
    "maxDays": 7
  },
  "adminOverridePermissions": true
}
```

**Dependency Settings (`key: "dependencies"`):**
```json
{
  "allowMultipleDependencies": true,
  "allowCrossTeamDependencies": true,
  "allowCrossProjectDependencies": false,
  "autoBlockTasks": true,
  "allowAdminManualUnblock": true
}
```

---

## 4. REST API Endpoints (Server Actions)

### 4.1 Get All Settings

```typescript
GET /api/settings
// Returns all settings grouped by category
```

### 4.2 Get Setting by Key

```typescript
GET /api/settings/:key
// Returns specific setting value
```

### 4.3 Update Setting

```typescript
PUT /api/settings/:key
Body: { value: {...}, reason?: string }
// Updates setting and logs change
```

### 4.4 Get Settings Change Log

```typescript
GET /api/settings/logs
Query: ?key=general&limit=50&offset=0
// Returns change history
```

### 4.5 Reset Setting to Default

```typescript
POST /api/settings/:key/reset
// Resets setting to system default
```

---

## 5. UI Layout Description

### 5.1 Settings Panel Structure

**Main Layout:**
- Left sidebar: Category navigation
- Main content: Settings form for selected category
- Right panel (optional): Change history for selected setting

**Categories:**
1. General
2. Tasks & Workflow
3. Today's Tasks
4. Dependencies
5. Permissions
6. Notifications
7. Audit & Logs

### 5.2 General Settings UI

```
┌─────────────────────────────────────────┐
│ General Settings                         │
├─────────────────────────────────────────┤
│ System Name: [________________]          │
│ System Logo: [Browse...] [Preview]      │
│ Default Language: [Dropdown: en ▼]      │
│ Default Timezone: [Dropdown: UTC ▼]     │
│                                          │
│ Working Days:                            │
│ ☑ Monday  ☑ Tuesday  ☑ Wednesday       │
│ ☑ Thursday ☑ Friday  ☐ Saturday  ☐ Sunday│
│                                          │
│ Default Working Hours:                   │
│ Start: [09:00]  End: [17:00]            │
│                                          │
│ [Save Changes] [Reset to Default]       │
└─────────────────────────────────────────┘
```

### 5.3 Task & Workflow Settings UI

```
┌─────────────────────────────────────────┐
│ Task & Workflow Settings                │
├─────────────────────────────────────────┤
│ Task Statuses:                           │
│ ┌─────────────────────────────────────┐ │
│ │ Name    Key          Order  Color  │ │
│ │ Pending pending      1     [🎨]   │ │
│ │ In Prog. in_progress 2     [🎨]   │ │
│ │ Completed completed  3     [🎨]   │ │
│ └─────────────────────────────────────┘ │
│ [+ Add Status] [Edit] [Delete]          │
│                                          │
│ Task Priorities:                        │
│ ┌─────────────────────────────────────┐ │
│ │ Name    Key      Weight  Color      │ │
│ │ Low     low      1       [🎨]       │ │
│ │ Normal  normal   2       [🎨]  ⭐   │ │
│ │ High    high     3       [🎨]       │ │
│ │ Urgent  urgent   4       [🎨]       │ │
│ └─────────────────────────────────────┘ │
│ [+ Add Priority] [Edit] [Delete]       │
│                                          │
│ [Save Changes]                          │
└─────────────────────────────────────────┘
```

### 5.4 Today's Tasks Settings UI

```
┌─────────────────────────────────────────┐
│ Today's Tasks Settings                  │
├─────────────────────────────────────────┤
│ Daily Reset Time: [00:00]                │
│ Reset Timezone Source:                   │
│ ○ System Timezone                       │
│ ● User Timezone                         │
│                                          │
│ Auto Carry-Over: [Toggle: ON]           │
│                                          │
│ Carry-Over Rules:                       │
│ ☑ Exclude Blocked Tasks                  │
│ ☑ Incomplete Tasks Only                 │
│ Max Days: [7] days                      │
│                                          │
│ ☑ Allow Admin Override                  │
│                                          │
│ [Save Changes]                          │
└─────────────────────────────────────────┘
```

### 5.5 Dependency Settings UI

```
┌─────────────────────────────────────────┐
│ Dependency Settings                     │
├─────────────────────────────────────────┤
│ ☑ Allow Multiple Dependencies           │
│ ☑ Allow Cross-Team Dependencies         │
│ ☐ Allow Cross-Project Dependencies      │
│ ☑ Auto-Block Tasks                      │
│ ☑ Allow Admin Manual Unblock            │
│                                          │
│ [Save Changes]                          │
└─────────────────────────────────────────┘
```

### 5.6 Permissions UI

```
┌─────────────────────────────────────────┐
│ Default Permissions by Role              │
├─────────────────────────────────────────┤
│ Admin:                                   │
│ ☑ Task Creation  ☑ Task Assignment     │
│ ☑ Today's Tasks  ☑ Dependency Mgmt     │
│ ☑ Project Creation  ☑ User Management  │
│                                          │
│ Team Lead:                               │
│ ☑ Task Creation  ☑ Task Assignment     │
│ ☑ Today's Tasks  ☑ Dependency Mgmt     │
│ ☐ Project Creation  ☐ User Management  │
│                                          │
│ Developer:                               │
│ ☐ Task Creation  ☐ Task Assignment     │
│ ☐ Today's Tasks  ☐ Dependency Mgmt     │
│ ☐ Project Creation  ☐ User Management  │
│                                          │
│ [Save Changes]                           │
└─────────────────────────────────────────┘
```

---

## 6. Scalability & Extensibility Considerations

### 6.1 Future Extensions

1. **Project-Level Overrides**:
   - Add `ProjectSettings` table with same structure
   - Settings cascade: Project → Global
   - UI shows "Inherited from Global" indicators

2. **User-Level Overrides**:
   - Add `UserSettings` table for user preferences
   - Settings cascade: User → Project → Global
   - UI allows users to customize their experience

3. **Setting Groups**:
   - Support setting groups for organization
   - Allow bulk operations on groups
   - Export/import setting groups

4. **Validation Rules**:
   - Add custom validation rules per setting
   - Support conditional settings (if X then Y)
   - Allow setting dependencies

5. **Multi-Tenant Support**:
   - Add `tenantId` to settings table
   - Each tenant has isolated settings
   - Global settings become tenant defaults

### 6.2 Performance Optimizations

1. **Caching**:
   - Cache settings in memory (Redis/Memcached)
   - Invalidate cache on settings update
   - Cache TTL: 5 minutes

2. **Lazy Loading**:
   - Load settings on-demand
   - Don't load all settings at once
   - Use pagination for change logs

3. **Indexing**:
   - Index `key` and `category` in SystemSettings
   - Index `settingKey` and `createdAt` in SettingsChangeLog
   - Composite index for common queries

### 6.3 Data Migration

1. **Versioning**:
   - Add `version` field to settings
   - Support migration scripts for version upgrades
   - Backward compatibility for old settings format

2. **Backup & Restore**:
   - Export settings to JSON
   - Import settings from JSON
   - Validate on import

3. **Rollback**:
   - Keep history of changes
   - Allow rollback to previous version
   - Show diff before rollback

---

## 7. Implementation Priority

**Phase 1 (MVP):**
- General settings
- Task statuses and priorities
- Basic dependency settings
- Settings change logging

**Phase 2:**
- Today's Tasks settings
- Permissions defaults
- Notification preferences

**Phase 3:**
- Advanced audit features
- Project-level overrides
- User-level preferences

---

## 8. Security Considerations

1. **Access Control**:
   - Verify admin role on every settings operation
   - Use server-side validation only
   - Never trust client-side checks

2. **Input Validation**:
   - Validate all JSON structures
   - Sanitize file paths (logo)
   - Validate timezone/language codes

3. **Audit Trail**:
   - Log all access attempts (success/failure)
   - Include IP address in logs
   - Alert on suspicious activity

4. **Data Protection**:
   - Encrypt sensitive settings at rest
   - Use HTTPS for all API calls
   - Implement rate limiting

---

## Conclusion

This specification provides a complete, extensible foundation for Global System Settings. The JSON-based storage allows flexibility while maintaining structure, and the design supports future enhancements without breaking changes.
