# User-Level Settings Specification

**Status**: ✅ **FULLY IMPLEMENTED**

## Overview

User-Level Settings provide personalization capabilities for individual users while maintaining strict governance and ensuring that global and project-level rules are never bypassed. These settings enhance user experience and productivity without compromising system integrity.

This specification document reflects the **current implementation** of the User-Level Settings module in the Project Management System.

---

## Scope & Access Control

### Scope
- **Per User**: Settings apply only to the individual user account
- **Display & UI Only**: User settings affect presentation and preferences, not system logic or business rules

### Access Control
- **System Administrator**: Full access to all user settings (can modify any user's preferences)
- **Project Manager**: Limited access to project-related preferences for team members
- **User**: Can edit their own personal preferences (read-only for restricted settings)
- **Audit**: All changes must be logged with user ID, timestamp, and change details

---

## Functional Requirements

### 1. Personal Preferences

#### 1.1 Display Timezone
- **Setting**: `preferences.timezone`
- **Type**: String (IANA timezone identifier)
- **Default**: Global system default timezone
- **Behavior**: Affects how dates/times are displayed to the user
- **Important**: Does NOT affect system logic, deadlines, or Today's Tasks reset times
- **Override Priority**: User → Global (no project-level override)

#### 1.3 Preferred Working Hours
- **Setting**: `preferences.workingHours`
- **Type**: Object `{ start: "HH:mm", end: "HH:mm" }`
- **Default**: Global system default working hours
- **Behavior**: Informational only, used for:
  - Calendar display
  - Availability indicators
  - Productivity insights
- **Override Priority**: User → Global (no project-level override)

---

### 2. Today's Tasks Display Preferences

#### 2.1 Auto-Open Today's Tasks on Login
- **Setting**: `todayTasks.autoOpenOnLogin`
- **Type**: Boolean
- **Default**: `false`
- **Behavior**: Automatically navigates to Today's Focus page after login
- **Override Priority**: User only (no project/global override)

#### 2.2 Default Today's Tasks View
- **Setting**: `todayTasks.defaultView`
- **Type**: Enum (`"compact"` | `"detailed"`)
- **Default**: `"compact"`
- **Behavior**: Controls the level of detail shown in Today's Tasks cards
- **Override Priority**: User only (no project/global override)

#### 2.3 Highlight Blocked Today's Tasks
- **Setting**: `todayTasks.highlightBlocked`
- **Type**: Boolean
- **Default**: `true`
- **Behavior**: Applies visual emphasis (color, badge, icon) to blocked tasks
- **Override Priority**: User only (no project/global override)

#### 2.4 Show Dependency Details Inline
- **Setting**: `todayTasks.showDependencyDetails`
- **Type**: Boolean
- **Default**: `false`
- **Behavior**: Shows prerequisite task information directly in Today's Tasks cards
- **Override Priority**: User only (no project/global override)

---

### 3. Notification Preferences

#### 3.1 Notification Channels
- **Setting**: `notifications.channels`
- **Type**: Object `{ inApp: boolean, email: boolean }`
- **Default**: `{ inApp: true, email: true }`
- **Behavior**: Controls which channels receive notifications
- **Restrictions**:
  - Critical system notifications always use in-app channel
  - Dependency blocking/resolution always uses in-app channel
- **Override Priority**: User only (no project/global override)

#### 3.2 Notification Grouping
- **Setting**: `notifications.grouping`
- **Type**: Enum (`"realtime"` | `"dailyDigest"`)
- **Default**: `"realtime"`
- **Behavior**:
  - `realtime`: Notifications delivered immediately
  - `dailyDigest`: Non-critical notifications batched into daily summary
- **Restrictions**: Critical notifications (blocking, dependencies) always real-time
- **Override Priority**: User only (no project/global override)

#### 3.3 Priority Filtering
- **Setting**: `notifications.priorityFilter`
- **Type**: Array of priority levels `["low", "normal", "high", "urgent"]`
- **Default**: `["low", "normal", "high", "urgent"]` (all priorities)
- **Behavior**: Filters out notifications below selected priority levels
- **Restrictions**: High and Urgent priority notifications cannot be filtered
- **Override Priority**: User only (no project/global override)

#### 3.4 Notification Sound
- **Setting**: `notifications.soundEnabled`
- **Type**: Boolean
- **Default**: `true`
- **Behavior**: Enables/disables sound playback when notifications arrive
- **Technical Implementation**: 
  - Uses Web Audio API to generate a two-tone beep
  - Frequency: 800Hz → 1000Hz transition
  - Duration: ~250ms with fade in/out
  - Only plays for new unread notifications
- **Override Priority**: User only (no project/global override)
- **Business Rules**: 
  - Sound respects user's in-app notification channel setting
  - If in-app notifications are disabled, sound is also disabled
- **Implementation**: Hook `useNotificationSound()` in `src/hooks/use-notification-sound.ts`

---

### 4. Daily Workflow Preferences

#### 4.1 Default Landing Page
- **Setting**: `workflow.defaultLandingPage`
- **Type**: Enum (`"dashboard"` | `"todayFocus"` | `"projects"` | `"tasks"`)
- **Default**: `"dashboard"`
- **Behavior**: Determines which page user sees after login
- **Override Priority**: User only (no project/global override)

#### 4.2 Default Project Context
- **Setting**: `workflow.defaultProjectContext`
- **Type**: Number (project ID) or `null`
- **Default**: `null`
- **Behavior**: Pre-selects a project context for task creation and filtering
- **Override Priority**: User only (no project/global override)

#### 4.3 Stand-up Summary Display
- **Setting**: `workflow.standupSummaryDisplay`
- **Type**: Object `{ enabled: boolean, format: "compact" | "detailed" }`
- **Default**: `{ enabled: false, format: "compact" }`
- **Behavior**: Controls display of daily stand-up summary widget
- **Override Priority**: User only (no project/global override)

---

## Business Rules

### 1. Settings Resolution Priority

The system resolves settings in the following order (highest to lowest priority):

1. **Project-Level Settings** (if user is in a project context and override is enabled)
2. **Global System Settings** (system-wide defaults)
3. **User-Level Settings** (personal preferences, only for display/UI)

**Exception**: Some user settings (like language, timezone display, notification preferences) are always user-level and never overridden by project/global settings.

### 2. Restrictions & Safeguards

#### 2.1 Users CANNOT:
- Change task dependencies (read-only)
- Modify Today's Tasks assignments (read-only)
- Override workflows or business rules
- Change project-level settings
- Disable critical system notifications
- Hide blocked tasks that are assigned as Today's Tasks

#### 2.2 Users CAN:
- Customize UI language and timezone display
- Configure task view preferences (sorting, filtering, visibility)
- Set notification delivery preferences (with restrictions)
- Choose default landing page and project context
- Personalize Today's Tasks display

### 3. Validation Rules

- **Timezone**: Must be a valid IANA timezone identifier (default: "Africa/Cairo")
- **Working Hours**: Start time must be before end time
- **Project IDs**: Must reference existing projects the user has access to
- **Priority Filter**: Must include at least "high" and "urgent"

### 4. Audit Requirements

- All setting changes must be logged with:
  - User ID (who made the change)
  - Setting key and category
  - Old value and new value
  - Timestamp
  - Change reason (optional)
  - Changed by (if admin changed user's settings)

---

## Database Structure

### UserSetting Model

```prisma
model UserSetting {
  id          Int      @id @default(autoincrement())
  userId      Int      @map("user_id")
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  key         String   // e.g., "preferences", "todayTasks", "notifications", "workflow"
  value       String   // JSON string of the setting value
  category    String   // "preferences", "todayTasks", "notifications", "workflow"
  updatedAt   DateTime @updatedAt @map("updated_at")
  updatedBy   Int      @map("updated_by")
  updater     User     @relation("UserSettingsUpdater", fields: [updatedBy], references: [id])

  changeLogs  UserSettingsChangeLog[]

  @@unique([userId, key])
  @@index([userId, category])
  @@map("user_settings")
}
```

### UserSettingsChangeLog Model

```prisma
model UserSettingsChangeLog {
  id          Int      @id @default(autoincrement())
  userId      Int      @map("user_id")
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  settingKey  String   @map("setting_key")
  category    String
  oldValue    String?  @map("old_value")
  newValue    String   @map("new_value")
  reason      String?  // Optional reason for change
  changedBy   Int      @map("changed_by")
  changer     User     @relation("UserSettingsChanger", fields: [changedBy], references: [id])
  settingId   Int      @map("setting_id")
  setting     UserSetting @relation(fields: [settingId], references: [id], onDelete: Cascade)
  createdAt   DateTime @default(now()) @map("created_at")

  @@index([userId, settingKey])
  @@index([createdAt])
  @@map("user_settings_change_logs")
}
```

### User Model Updates

```prisma
model User {
  // ... existing fields ...
  userSettings        UserSetting[]            @relation("UserSettings")
  userSettingsUpdated UserSetting[]            @relation("UserSettingsUpdater")
  userSettingsChanged UserSettingsChangeLog[]  @relation("UserSettingsChanger")
  // ... other relations ...
}
```

---

## REST API Endpoints (Server Actions)

### Get User Settings

```typescript
// Get all settings for a user
getUserSettings(userId: number): Promise<{
  success: boolean;
  settings?: Record<string, any[]>;
  error?: string;
}>

// Get a specific user setting
getUserSetting(userId: number, key: string): Promise<{
  success: boolean;
  setting?: UserSetting;
  error?: string;
}>

// Get resolved settings (user → project → global)
getResolvedUserSettings(userId: number, projectId?: number): Promise<{
  success: boolean;
  settings?: Record<string, any>;
  error?: string;
}>
```

### Update User Settings

```typescript
// Update a user setting
updateUserSetting(
  userId: number,
  key: string,
  value: any,
  reason?: string
): Promise<{
  success: boolean;
  error?: string;
}>

// Create a new user setting
createUserSetting(
  userId: number,
  key: string,
  category: string,
  value: any,
  description?: string
): Promise<{
  success: boolean;
  error?: string;
}>

// Reset a user setting to default
resetUserSetting(
  userId: number,
  key: string
): Promise<{
  success: boolean;
  error?: string;
}>
```

### Audit & History

```typescript
// Get change history for a user's settings
getUserSettingsChangeLog(
  userId: number,
  settingKey?: string,
  limit?: number,
  offset?: number
): Promise<{
  success: boolean;
  logs?: UserSettingsChangeLog[];
  error?: string;
}>
```

---

## UI Layout

### User Settings Page Structure

```
┌─────────────────────────────────────────────────────────┐
│  User Settings                                           │
│  [Back to Dashboard]                                     │
├─────────────────────────────────────────────────────────┤
│  [Tabs: Preferences | Today's Tasks | Notifications |   │
│   Workflow]                                              │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Tab Content Area:                                       │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Setting Category Card                            │  │
│  │  ┌──────────────────────────────────────────────┐ │  │
│  │  │  Setting Name                                │ │  │
│  │  │  Description                                 │ │  │
│  │  │  [Toggle/Select/Input]                       │ │  │
│  │  │  [Save] [Reset to Default]                   │ │  │
│  │  └──────────────────────────────────────────────┘ │  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Settings Categories

1. **Personal Preferences Tab**
   - Timezone selector (default: Cairo, Egypt)
   - Working hours input (start/end time)

2. **Today's Tasks Tab**
   - Auto-open on login toggle
   - Default view selector (Compact/Detailed)
   - Highlight blocked tasks toggle
   - Show dependency details toggle

3. **Notifications Tab**
   - In-app notifications toggle
   - Email notifications toggle
   - Notification grouping selector (Real-time/Daily Digest)
   - Priority filter checkboxes (Low, Normal - High/Urgent cannot be disabled)
   - **Notification Sound toggle** (enables/disables sound playback)

4. **Workflow Tab**
   - Default landing page selector
   - Default project context dropdown
   - Stand-up summary display toggle and format selector

---

## Settings Resolution Logic

### Resolution Algorithm

```typescript
function resolveSetting(
  userId: number,
  projectId: number | null,
  settingKey: string,
  category: string
): any {
  // 1. Check user-level setting
  const userSetting = getUserSetting(userId, settingKey)
  if (userSetting && isUserOverrideAllowed(category)) {
    return userSetting.value
  }

  // 2. Check project-level setting (if in project context)
  if (projectId) {
    const projectSetting = getProjectSetting(projectId, settingKey)
    if (projectSetting && projectSetting.enabled) {
      return projectSetting.value
    }
  }

  // 3. Check global system setting
  const globalSetting = getSystemSetting(settingKey)
  if (globalSetting) {
    return globalSetting.value
  }

  // 4. Return system default
  return getSystemDefault(settingKey, category)
}

function isUserOverrideAllowed(category: string): boolean {
  // Some categories always allow user override (preferences, notifications)
  const alwaysUserOverride = ["preferences", "notifications", "workflow"]
  return alwaysUserOverride.includes(category)
}
```

---

## Scalability & Extensibility

### Scalability Considerations

1. **Database Indexing**
   - Index on `(userId, key)` for fast lookups
   - Index on `(userId, category)` for category-based queries
   - Index on `createdAt` in change logs for time-based queries

2. **Caching Strategy**
   - Cache resolved user settings in session/user context
   - Invalidate cache on setting changes
   - Use Redis or in-memory cache for high-traffic scenarios

3. **Batch Operations**
   - Support bulk setting updates for admin operations
   - Batch change log writes for performance

### Extensibility Considerations

1. **New Setting Categories**
   - Easy to add new categories via JSON structure
   - No schema changes required for new setting types
   - Validation handled at application level

2. **Custom User Preferences**
   - Support for custom JSON structures
   - Plugin system for third-party preference extensions
   - API for external integrations

3. **Future Enhancements**
   - User-defined dashboard layouts
   - Custom task field visibility
   - Personal keyboard shortcuts
   - Theme customization
   - Accessibility preferences

---

## Security & Compliance

### Security Measures

1. **Access Control**
   - Strict role-based access control
   - Users can only modify their own settings (except admins)
   - Project managers have limited access

2. **Input Validation**
   - All setting values validated against schemas
   - Sanitize JSON inputs to prevent injection
   - Type checking for all setting values

3. **Audit Trail**
   - Complete change history for compliance
   - Immutable change logs
   - Regular audit log reviews

### Compliance

- GDPR: User data export includes all settings
- Data retention: Change logs retained per policy
- Privacy: User settings are private to the user (except admin access)

---

## Implementation Notes

1. **Migration Path**
   - Create migration for `UserSetting` and `UserSettingsChangeLog` tables
   - Initialize default settings for existing users
   - Migrate any existing user preferences

2. **Backward Compatibility**
   - Default values ensure system works without user settings
   - Graceful degradation if settings are missing
   - Support for legacy preference storage

3. **Testing Requirements**
   - Unit tests for resolution logic
   - Integration tests for API endpoints
   - E2E tests for UI interactions
   - Performance tests for large user bases

---

## Implementation Status

### ✅ Fully Implemented

The User-Level Settings module has been **fully implemented and is operational** in the system. Below is a summary of what has been built:

#### 1. Database Schema ✅
- **Models Created**: `UserSetting`, `UserSettingsChangeLog`
- **Migration**: `20251223121130_add_user_settings` (applied)
- **Relations**: Properly configured with cascade deletion
- **Indexes**: Optimized for fast lookups by `userId`, `category`, and `createdAt`

#### 2. Server Actions ✅ (`src/app/actions/user-settings.ts`)
- ✅ `getUserSettings(userId)` - Fetch all user settings grouped by category
- ✅ `getResolvedUserSettings(userId, projectId?)` - Get settings with resolution priority
- ✅ `getUserSetting(userId, key)` - Get a specific setting
- ✅ `updateUserSetting(userId, key, value, reason?)` - Update/create with validation
- ✅ `createUserSetting(userId, key, category, value, description?)` - Create new setting
- ✅ `resetUserSetting(userId, key)` - Reset to system default
- ✅ `getUserSettingsChangeLog(userId, settingKey?, limit?, offset?)` - Audit trail

#### 3. UI Components ✅
- **Settings Page**: `/dashboard/settings` with "Preferences" tab
- **UserSettingsPanel** (`src/components/settings/user-settings-panel.tsx`):
  - ✅ Personal Preferences (timezone, working hours)
  - ✅ Today's Tasks Display (auto-open, view style, highlighting, dependency details)
  - ✅ Notification Preferences (channels, grouping, priority filter, **sound toggle**)
  - ✅ Workflow Preferences (landing page, project context, stand-up summary)
- **Features**:
  - ✅ Save/Reset buttons for each category
  - ✅ Real-time updates with router refresh
  - ✅ Toast notifications
  - ✅ Form validation

#### 4. Notification Sound System ✅
- **Hook**: `useNotificationSound()` in `src/hooks/use-notification-sound.ts`
- **Implementation**: Web Audio API with two-tone beep (800Hz → 1000Hz)
- **Features**:
  - ✅ Respects user's sound preference setting
  - ✅ Only plays for new unread notifications
  - ✅ Handles browser autoplay policies
  - ✅ Automatic playback when notifications arrive

#### 5. Notification System Integration ✅
- **Components**: `NotificationBell`, `NotificationList`
- **Server Actions**: `src/app/actions/notifications.ts`
- **Features**:
  - ✅ Real-time notification polling
  - ✅ Unread count badge
  - ✅ Mark as read/delete functionality
  - ✅ Sound integration

#### 6. Settings Resolution ✅
- **Priority**: User → Project → Global
- **Always User Override**: `preferences`, `notifications`, `workflow`
- **Implementation**: `getResolvedUserSettings()` function

#### 7. Access Control ✅
- ✅ Users can only edit their own settings
- ✅ Admins can edit any user's settings
- ✅ All changes logged in `UserSettingsChangeLog`

### 📋 Current Configuration

**Active Settings Categories** (4 tabs):
1. **Personal Preferences**: Timezone (default: Cairo, Egypt), Working Hours
2. **Today's Tasks**: Auto-open, View style, Highlighting, Dependency details
3. **Notifications**: Channels, Grouping, Priority filter, **Sound toggle**
4. **Workflow**: Landing page, Project context, Stand-up summary

**Removed Features** (as per user requirements):
- ❌ Language selector
- ❌ Task View preferences

**Default Values**:
- Timezone: `"Africa/Cairo"`
- Notification Sound: `true` (enabled)
- All other defaults as specified in `getSystemDefault()`

### 🔧 Technical Implementation Details

- **Database**: SQLite with Prisma ORM
- **Framework**: Next.js 16.0.10 with Server Actions
- **UI Library**: Shadcn UI components
- **State Management**: React hooks (`useState`, `useTransition`)
- **Sound**: Web Audio API (no external audio files)

### 📊 Performance Considerations

- Settings are cached in user session context
- Database queries optimized with indexes
- Polling intervals: 10 seconds (notifications), 30 seconds (unread count)
- Sound generation is lightweight (no file loading)

## Conclusion

User-Level Settings provide essential personalization capabilities while maintaining strict governance and system integrity. The design ensures that users can customize their experience without compromising business rules, dependencies, or administrative controls.

The three-tier settings hierarchy (Global → Project → User) provides flexibility at each level while maintaining clear precedence and enforcement of critical system rules.

**Status**: ✅ **PRODUCTION READY** - The User-Level Settings module is fully implemented, tested, and operational.

