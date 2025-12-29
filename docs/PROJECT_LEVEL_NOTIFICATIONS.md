# Project-Level Notifications Specification

**Status**: 🚧 **IN PROGRESS**

## Overview

Project-Level Notifications provide project-scoped notification management that allows real-time alerts with sound for all project-related actions. These notifications apply only to tasks, dependencies, and Today's Tasks within a specific project and can override global notification defaults while respecting user preferences and critical action rules.

---

## Scope & Access Control

### Scope
- **Per Project**: Notifications apply only to tasks, dependencies, and Today's Tasks within a specific project
- **Project Context**: All notifications are scoped to users who are part of the project
- **Override Capability**: Can override global notification defaults for the project

### Access Control
- **System Administrator**: Full access to configure project notification settings
- **Project Manager**: Limited access to configure project notification settings
- **Team Leads and Developers**: Read-only access
- **Rules**: Critical notifications cannot be disabled by anyone

---

## Functional Requirements

### 1. Notification Triggers (Project Scope)

#### 1.1 Task-Related Notifications
- **Task Assignment**: When a task is assigned to a user within the project
- **Task Reassignment**: When a task is reassigned to a different user
- **Task Status Change**: When task status changes (pending → in_progress → completed, etc.)
- **Task Completion**: When a task is marked as completed
- **Task Blocked**: When a task is blocked due to incomplete dependencies
- **Task Unblocked**: When a task is unblocked (all dependencies completed)

#### 1.2 Dependency-Related Notifications
- **Dependency Added**: When a dependency is added to a task
- **Dependency Removed**: When a dependency is removed from a task
- **Dependency Completed**: When a prerequisite task is completed
- **Circular Dependency Warning**: When a circular dependency is detected (admin only)

#### 1.3 Today's Tasks Notifications
- **Today's Task Added**: When a task is added to a user's Today's Tasks for the project
- **Today's Task Removed**: When a task is removed from Today's Tasks
- **Today's Task Reordered**: When Today's Tasks are reordered (optional notification)
- **Today's Task Overdue**: When a Today's Task becomes overdue

#### 1.4 Project Admin Notifications
- **Project Settings Changed**: When project settings are modified
- **Project Status Changed**: When project status changes
- **Bulk Task Assignment**: When multiple tasks are assigned at once

---

### 2. Notification Delivery Channels

#### 2.1 In-App Notifications
- **Real-time Delivery**: Notifications appear immediately when triggered
- **Sound Playback**: Automatic sound playback (if enabled)
- **Visual Indicator**: Top-bar notification icon with unread count badge
- **Dropdown List**: Clicking icon shows recent notifications

#### 2.2 Email Notifications (Optional)
- **Project-Scoped**: Only for notifications within the project
- **User Preference**: Can be enabled/disabled per user
- **Critical Actions**: Always sent regardless of user preference

---

### 3. Top-Bar Notification Icon (Project Context)

#### 3.1 Visibility
- **Always Visible**: Shown on all project pages (project detail, task pages, etc.)
- **Project-Scoped**: Only shows notifications for the current project
- **Unread Badge**: Displays count of unread notifications for the project

#### 3.2 Behavior
- **Highlight/Animation**: Visual feedback when new notifications arrive
- **Click Action**: Opens dropdown with recent notifications
- **Dropdown Content**:
  - Recent notifications (last 10-15, project-scoped)
  - Read/unread indicators
  - Timestamp (relative time)
  - Action context (task title, dependency info, Today's Task info)
  - Quick actions (mark as read, navigate to task)
  - "View All" link to Project Notification Center

#### 3.3 Real-time Updates
- **Polling**: Polls for new notifications every 5-10 seconds
- **WebSocket Ready**: Architecture supports WebSocket for real-time updates (future)

---

### 4. Project Notification Center

#### 4.1 Location
- **Route**: `/dashboard/projects/{id}/notifications`
- **Access**: Available to all project members
- **Navigation**: Accessible from top-bar notification icon "View All" link

#### 4.2 Features
- **Full Notification List**: All project notifications, paginated
- **Filters**:
  - Type: Task / Dependency / Today's Task / Project Admin
  - Status: Read / Unread / All
  - User: Filter by notification recipient
  - Date Range: Filter by creation date
- **Actions**:
  - Mark as read (individual)
  - Mark all as read
  - Delete notification
  - Navigate to related entity (task, dependency, etc.)

#### 4.3 Display
- **Grouping**: Optional grouping by date (Today, Yesterday, This Week, Older)
- **Sorting**: Default by creation date (newest first)
- **Pagination**: 20-50 notifications per page
- **Search**: Optional search by notification title/message

---

### 5. Sound Settings

#### 5.1 Project-Level Sound Default
- **Setting**: `projectNotifications.soundEnabled`
- **Type**: Boolean
- **Default**: Inherits from global settings
- **Override**: Project Manager/Admin can override global default
- **Behavior**: Applies to all project notifications unless user overrides

#### 5.2 User-Level Sound Preference (Project Scope)
- **Setting**: `projectNotifications.userSoundEnabled`
- **Type**: Boolean
- **Default**: Inherits from project default
- **Override**: User can enable/disable sound for project notifications
- **Restriction**: Critical notifications always play sound

#### 5.3 Volume Control (Future)
- **Setting**: `projectNotifications.userVolume`
- **Type**: Number (0-100)
- **Default**: 100
- **Behavior**: Controls notification sound volume for project notifications

---

### 6. User Preferences (Project-Level)

#### 6.1 Notification Types
- **Task Notifications**: Enable/disable task-related notifications
- **Dependency Notifications**: Enable/disable dependency-related notifications
- **Today's Tasks Notifications**: Enable/disable Today's Tasks notifications
- **Project Admin Notifications**: Enable/disable project admin notifications

#### 6.2 Restrictions
- **Critical Actions**: Cannot be disabled
  - Task assignment
  - Task blocking/unblocking
  - Dependency completion
  - Today's Tasks assignment (if admin-assigned)
- **User Override**: Users can only disable non-critical notifications

---

### 7. Global Rules Enforcement

#### 7.1 Critical Action Rules
- **Always Enabled**: Critical notifications are always delivered
- **Sound Always Plays**: Critical notifications always play sound (cannot be muted)
- **In-App Always**: Critical notifications always appear in-app

#### 7.2 Resolution Priority
1. **Critical Action Rules** (highest priority - cannot be overridden)
2. **User Preferences** (for non-critical notifications)
3. **Project Settings** (for project defaults)
4. **Global Settings** (system-wide defaults)

---

## Database Structure

### ProjectNotification Model

```prisma
model ProjectNotification {
  id            Int      @id @default(autoincrement())
  projectId     Int      @map("project_id")
  project       Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  userId        Int      @map("user_id")
  user          User     @relation("ProjectNotificationRecipient", fields: [userId], references: [id], onDelete: Cascade)
  type          String   // "task", "dependency", "today_task", "project_admin"
  entityType    String   @map("entity_type") // "task", "subtask", "daily_task", "dependency", "project"
  entityId      Int?     @map("entity_id") // ID of the related entity
  title         String
  message       String
  isRead        Boolean  @default(false) @map("is_read")
  soundRequired Boolean  @default(false) @map("sound_required") // True for critical notifications
  createdAt     DateTime @default(now()) @map("created_at")

  @@index([projectId, userId, isRead])
  @@index([entityType, entityId])
  @@index([createdAt])
  @@map("project_notifications")
}
```

### ProjectNotificationPreference Model

```prisma
model ProjectNotificationPreference {
  id                    Int      @id @default(autoincrement())
  projectId             Int      @map("project_id")
  project               Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  userId                Int      @map("user_id")
  user                  User     @relation("ProjectNotificationPreferences", fields: [userId], references: [id], onDelete: Cascade)
  soundEnabled          Boolean  @default(true) @map("sound_enabled")
  taskNotifications     Boolean  @default(true) @map("task_notifications")
  dependencyNotifications Boolean @default(true) @map("dependency_notifications")
  todayTaskNotifications Boolean @default(true) @map("today_task_notifications")
  projectAdminNotifications Boolean @default(true) @map("project_admin_notifications")
  updatedAt             DateTime @updatedAt @map("updated_at")

  @@unique([projectId, userId])
  @@index([projectId, userId])
  @@map("project_notification_preferences")
}
```

### Model Updates

```prisma
model Project {
  // ... existing fields ...
  notifications         ProjectNotification[]
  notificationPreferences ProjectNotificationPreference[]
  // ... other relations ...
}

model User {
  // ... existing fields ...
  projectNotifications  ProjectNotification[] @relation("ProjectNotificationRecipient")
  projectNotificationPreferences ProjectNotificationPreference[] @relation("ProjectNotificationPreferences")
  // ... other relations ...
}
```

---

## REST API Endpoints (Server Actions)

### Get Project Notifications

```typescript
// Get all notifications for a project (paginated)
getProjectNotifications(
  projectId: number,
  userId: number,
  filters?: {
    type?: string;
    isRead?: boolean;
    limit?: number;
    offset?: number;
  }
): Promise<{
  success: boolean;
  notifications?: ProjectNotification[];
  total?: number;
  error?: string;
}>

// Get unread notification count for a project
getProjectUnreadNotificationCount(
  projectId: number,
  userId: number
): Promise<{
  success: boolean;
  count?: number;
  error?: string;
}>
```

### Mark Notifications as Read

```typescript
// Mark a notification as read
markProjectNotificationAsRead(
  projectId: number,
  notificationId: number,
  userId: number
): Promise<{
  success: boolean;
  error?: string;
}>

// Mark all project notifications as read
markAllProjectNotificationsAsRead(
  projectId: number,
  userId: number
): Promise<{
  success: boolean;
  error?: string;
}>
```

### Notification Preferences

```typescript
// Get user's notification preferences for a project
getProjectNotificationPreferences(
  projectId: number,
  userId: number
): Promise<{
  success: boolean;
  preferences?: ProjectNotificationPreference;
  error?: string;
}>

// Update user's notification preferences for a project
updateProjectNotificationPreferences(
  projectId: number,
  userId: number,
  preferences: {
    soundEnabled?: boolean;
    taskNotifications?: boolean;
    dependencyNotifications?: boolean;
    todayTaskNotifications?: boolean;
    projectAdminNotifications?: boolean;
  }
): Promise<{
  success: boolean;
  error?: string;
}>
```

### Create Notifications (Internal)

```typescript
// Create a project notification (internal use)
createProjectNotification(
  projectId: number,
  userId: number,
  type: string,
  entityType: string,
  entityId: number | null,
  title: string,
  message: string,
  soundRequired?: boolean
): Promise<{
  success: boolean;
  notification?: ProjectNotification;
  error?: string;
}>
```

---

## Business Rules

### 1. Notification Creation Rules

- **Project Scope**: Notifications are only created for users who are part of the project
- **Task Assignment**: Notify the assigned user(s) when a task is assigned
- **Task Status Change**: Notify task assignees when status changes
- **Dependency Events**: Notify dependent task assignees when prerequisites complete
- **Today's Tasks**: Notify user when tasks are added/removed from Today's Tasks

### 2. Critical Notification Rules

- **Always Delivered**: Critical notifications cannot be disabled
- **Sound Always Plays**: Critical notifications always play sound
- **In-App Always**: Critical notifications always appear in-app
- **Critical Actions Include**:
  - Task assignment
  - Task blocking/unblocking
  - Dependency completion
  - Admin-assigned Today's Tasks

### 3. Sound Playback Rules

- **Resolution Priority**: User preference → Project default → Global default
- **Critical Override**: Critical notifications always play sound
- **User Mute**: Users can mute non-critical notifications
- **Project Mute**: Project can disable sound for all non-critical notifications

### 4. Notification Visibility Rules

- **Project Context**: Notifications only visible within project pages
- **User Scope**: Users only see notifications intended for them
- **Read/Unread**: Users can mark notifications as read
- **Retention**: Notifications retained per system policy (e.g., 90 days)

---

## UI Components

### 1. ProjectNotificationBell Component

**Location**: Top bar of project pages (project detail, task pages)

**Features**:
- Notification icon with unread count badge
- Dropdown with recent notifications
- Click to open notification center
- Real-time updates

**Props**:
```typescript
interface ProjectNotificationBellProps {
  projectId: number
  userId: number
}
```

### 2. ProjectNotificationDropdown Component

**Features**:
- Recent notifications list (last 10-15)
- Read/unread indicators
- Timestamp display
- Quick actions (mark as read, navigate)
- "View All" link

### 3. ProjectNotificationCenter Component

**Location**: `/dashboard/projects/{id}/notifications`

**Features**:
- Full notification list with pagination
- Filters (type, status, user, date)
- Search functionality
- Mark as read/delete actions
- Grouping by date

### 4. ProjectNotificationPreferences Component

**Location**: Project settings or notification center

**Features**:
- Sound toggle
- Notification type toggles
- Critical notification indicators
- Save/Reset buttons

---

## Integration Points

### 1. Task Actions Integration

- **Task Assignment**: Create notification when task assigned
- **Task Status Update**: Create notification when status changes
- **Task Completion**: Create notification when task completed

### 2. Dependency System Integration

- **Dependency Added**: Notify prerequisite task assignees
- **Dependency Completed**: Notify dependent task assignees
- **Task Blocked/Unblocked**: Notify task assignees

### 3. Today's Tasks Integration

- **Task Added**: Notify user when task added to Today's Tasks
- **Task Removed**: Notify user when task removed
- **Task Reordered**: Optional notification

### 4. Sound System Integration

- **Hook**: `useProjectNotificationSound()` 
- **Respects**: User preferences, project settings, global settings
- **Critical Override**: Always plays for critical notifications

---

## Scalability & Extensibility

### Scalability Considerations

1. **Database Indexing**
   - Index on `(projectId, userId, isRead)` for fast unread queries
   - Index on `(entityType, entityId)` for entity lookups
   - Index on `createdAt` for time-based queries

2. **Caching Strategy**
   - Cache unread counts per project/user
   - Invalidate on new notifications
   - Use Redis for high-traffic scenarios

3. **Polling Optimization**
   - Efficient polling intervals (5-10 seconds)
   - WebSocket support for real-time updates (future)
   - Batch notification delivery

### Extensibility Considerations

1. **New Notification Types**
   - Easy to add new types via `type` field
   - Extensible entity types
   - Custom notification templates

2. **Future Enhancements**
   - Email digest for project notifications
   - Mobile push notifications
   - Notification templates per project
   - Custom notification rules per project

---

## Security & Compliance

### Security Measures

1. **Access Control**
   - Users can only see their own notifications
   - Project members only see project-scoped notifications
   - Admin/PM can view all project notifications

2. **Data Privacy**
   - Notifications are private to the recipient
   - No cross-user notification visibility
   - Secure notification delivery

### Compliance

- **Data Retention**: Notifications retained per policy
- **Audit Trail**: Notification creation logged
- **Privacy**: User preferences respected

---

## Implementation Notes

1. **Migration Path**
   - Create `ProjectNotification` and `ProjectNotificationPreference` tables
   - Migrate existing project-related notifications (if any)
   - Initialize default preferences for existing users

2. **Backward Compatibility**
   - Global notifications continue to work
   - User preferences respected
   - Graceful degradation if project notifications unavailable

3. **Testing Requirements**
   - Unit tests for notification creation
   - Integration tests for notification delivery
   - E2E tests for UI interactions
   - Performance tests for high notification volume

---

## Conclusion

Project-Level Notifications provide essential real-time communication for project teams while maintaining flexibility and respecting user preferences. The system ensures critical actions are always communicated while allowing customization for non-critical notifications.

The integration with global and user-level settings creates a comprehensive three-tier notification system that balances system requirements with user experience.

