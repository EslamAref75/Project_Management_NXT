# Task Dependency Management Module

## Overview

The Task Dependency Management module enables project managers, team leads, and developers to create and manage dependencies between tasks within a project. This ensures that tasks are completed in the correct order and prevents work from being blocked by incomplete prerequisites.

---

## Functional Requirements

### 1. Dependency Creation

- **Authorized Roles**: Task owners, project managers, team leads, and admins can add dependencies
- **Scope**: A task may depend on one or more other tasks within the same project
- **Cross-Team Support**: Dependencies can be created across different users and teams
- **Project Constraint**: Both the dependent task and prerequisite task must belong to the same project

### 2. Dependency Types

- **Finish-to-Start (Mandatory)**: The dependent task cannot start or be completed until all prerequisite tasks are completed
- **Future Extension**: The system is designed to support additional dependency types (Start-to-Start, Finish-to-Finish, Start-to-Finish) in the future

### 3. Task Blocking Behavior

- **Automatic Status Change**: When a dependency is added, the dependent task status automatically changes to "waiting" if prerequisites are incomplete
- **Status Restrictions**: 
  - Users cannot move a blocked task to "completed"
  - Users cannot mark progress beyond allowed states when blocked
- **Automatic Unblocking**: Once all prerequisite tasks are completed, the dependent task is automatically unblocked and status returns to "pending"

### 4. Dependency Visibility

- **Blocked Indicator**: Clear visual indicators show when a task is blocked
- **Prerequisite List**: Display all prerequisite tasks with their status
- **Assignee Information**: Show assigned users or teams for each prerequisite task
- **Real-time Status**: Dependency resolution status updates in real-time

### 5. Notifications

- **Prerequisite Completion**: Notify dependent task owners when a prerequisite task is completed
- **Task Unblocked**: Notify users when their task is unblocked
- **Dependency Added**: Notify prerequisite task owners that other tasks depend on their completion
- **Overdue Alerts**: (Future) Notify when prerequisite tasks are delayed or overdue

### 6. Editing & Removal

- **Add Dependencies**: Authorized users can add new dependencies
- **Remove Dependencies**: Authorized users can remove existing dependencies
- **Status Recalculation**: Removing a dependency automatically recalculates task blocking state
- **Status Updates**: Task status is updated accordingly when dependencies are removed

### 7. Validation & Constraints

- **Circular Dependency Prevention**: System prevents circular task dependencies
- **Self-Dependency Prevention**: Tasks cannot depend on themselves
- **Cross-Project Prevention**: Dependencies cannot be created across different projects
- **Duplicate Prevention**: Same dependency cannot be added twice

---

## Database Entities

### TaskDependency Model

```prisma
model TaskDependency {
  taskId          Int    @map("task_id")
  dependsOnTaskId Int    @map("depends_on_task_id")
  dependencyType  String @default("finish_to_start") @map("dependency_type")
  createdById     Int    @map("created_by_id")

  task          Task @relation("Dependent", fields: [taskId], references: [id], onDelete: Cascade)
  dependsOnTask Task @relation("DependsOn", fields: [dependsOnTaskId], references: [id], onDelete: Cascade)

  createdAt DateTime @default(now()) @map("created_at")

  @@id([taskId, dependsOnTaskId])
  @@map("task_dependencies")
}
```

### Task Model (Updated)

The Task model includes relationships for dependencies:

```prisma
model Task {
  // ... existing fields ...
  
  // Dependencies (Self-relation)
  dependencies TaskDependency[] @relation("DependsOn")
  dependents   TaskDependency[] @relation("Dependent")
  
  // ... other fields ...
}
```

### Status Values

Task status now includes:
- `pending` - Task is ready to start
- `waiting` - Task is blocked by dependencies
- `in_progress` - Task is actively being worked on
- `review` - Task is under review
- `completed` - Task is finished

---

## REST API Endpoints

### Server Actions (Next.js Pattern)

The system uses Next.js Server Actions instead of traditional REST endpoints. These actions are located in `src/app/actions/dependencies.ts`:

#### 1. Create Task Dependency

**Action**: `createTaskDependency(formData: FormData)`

**Parameters**:
- `taskId` (number): The dependent task ID
- `dependsOnTaskId` (number): The prerequisite task ID
- `dependencyType` (string): Type of dependency (default: "finish_to_start")

**Returns**:
```typescript
{
  success?: boolean
  error?: string
  details?: string
}
```

**Business Logic**:
- Validates both tasks exist
- Ensures tasks belong to same project
- Checks for circular dependencies
- Prevents duplicate dependencies
- Updates task blocking status
- Creates notifications
- Logs activity

#### 2. Remove Task Dependency

**Action**: `removeTaskDependency(taskId: number, dependsOnTaskId: number)`

**Returns**:
```typescript
{
  success?: boolean
  error?: string
  details?: string
}
```

**Business Logic**:
- Validates dependency exists
- Removes dependency
- Recalculates blocking status
- Logs activity

#### 3. Get Task Dependencies

**Action**: `getTaskDependencies(taskId: number)`

**Returns**: Array of dependency objects with prerequisite task details

**Includes**:
- Prerequisite task information
- Assignees and teams
- Status information
- Dependency type

#### 4. Get Task Dependents

**Action**: `getTaskDependents(taskId: number)`

**Returns**: Array of tasks that depend on the given task

**Use Case**: Shows which tasks are waiting on the current task

#### 5. Get Available Dependency Tasks

**Action**: `getAvailableDependencyTasks(taskId: number)`

**Returns**: Array of tasks that can be added as dependencies

**Filters**:
- Same project only
- Excludes self
- Excludes tasks that would create circular dependencies

#### 6. Check if Task is Blocked

**Action**: `isTaskBlocked(taskId: number)`

**Returns**: `boolean`

---

## Business Rules

### 1. Dependency Creation Rules

1. **Same Project Constraint**: Both tasks must belong to the same project
2. **No Self-Dependency**: A task cannot depend on itself
3. **No Circular Dependencies**: System prevents any form of circular dependency (direct or transitive)
4. **No Duplicates**: The same dependency cannot be added twice
5. **Authorization**: Only authorized users (task owner, project manager, team lead, admin) can create dependencies

### 2. Task Status Rules

1. **Automatic Blocking**: When dependencies are added and prerequisites are incomplete, task status changes to "waiting"
2. **Status Progression Prevention**: Blocked tasks cannot be moved to "completed", "in_progress", or "review" status
3. **Automatic Unblocking**: When all prerequisites are completed, "waiting" tasks automatically change to "pending"
4. **Status Update Validation**: Task status updates check for blocking dependencies before allowing progression

### 3. Dependency Resolution Rules

1. **All Prerequisites Required**: All prerequisite tasks must be completed before dependent task can proceed
2. **Real-time Updates**: Dependency resolution is checked in real-time when prerequisite tasks are completed
3. **Cascade Unblocking**: When a prerequisite is completed, all dependent tasks are checked and unblocked if all prerequisites are met

### 4. Notification Rules

1. **Prerequisite Completion**: Dependent task assignees are notified when prerequisites are completed
2. **Task Unblocked**: Users are notified when their task is unblocked
3. **Dependency Added**: Prerequisite task assignees are notified when dependencies are added
4. **Cross-Team Awareness**: Notifications help teams understand dependencies across team boundaries

### 5. Circular Dependency Detection

The system uses a depth-first search (DFS) algorithm to detect circular dependencies:

1. **Direct Circular Check**: Checks if task B depends on task A when trying to make A depend on B
2. **Transitive Circular Check**: Traverses the dependency graph to detect any circular paths
3. **Prevention**: Blocks creation of dependencies that would create cycles

---

## UI/UX Behavior

### Task Detail Sheet

**Location**: `src/components/tasks/task-detail-sheet.tsx`

**Features**:
- **Prerequisites Section**: Shows all prerequisite tasks with status indicators
- **Blocked Indicator**: Visual badge showing when task is blocked
- **Add Dependency Button**: Opens dialog to add new dependencies
- **Remove Dependency**: Remove button on each prerequisite (authorized users only)
- **Dependents Section**: Shows tasks waiting on this task
- **Status Colors**: Color-coded status badges for quick visual understanding

### Dependency List Component

**Location**: `src/components/tasks/dependency-list.tsx`

**Visual Indicators**:
- ✅ Green checkmark for completed prerequisites
- ⚠️ Orange alert icon for blocking prerequisites
- Status badges with color coding
- Assignee and team information
- "Blocking" badge for incomplete prerequisites

### Dependency Dialog

**Location**: `src/components/tasks/dependency-dialog.tsx`

**Features**:
- Dropdown to select prerequisite task
- Filters out tasks that would create circular dependencies
- Shows task details (status, assignees, team)
- Validation and error handling
- Loading states

### Task Card

**Location**: `src/components/tasks/task-card.tsx`

**Updates**:
- Blocked indicator icon
- Orange border for blocked tasks
- Status includes "waiting" state
- Error messages when status update is blocked

### Dependents List Component

**Location**: `src/components/tasks/dependents-list.tsx`

**Features**:
- Shows all tasks that depend on the current task
- Visual indicators for waiting tasks
- Assignee and team information
- Helps users understand impact of their work

---

## Scalability and Extensibility Considerations

### 1. Database Performance

- **Indexing**: The composite primary key `[taskId, dependsOnTaskId]` provides efficient lookups
- **Cascade Deletes**: Dependencies are automatically cleaned up when tasks are deleted
- **Query Optimization**: Dependency queries use includes to minimize database round trips
- **Future**: Consider adding indexes on `dependsOnTaskId` for reverse lookups if needed

### 2. Circular Dependency Detection

- **Algorithm**: Uses DFS which is O(V + E) where V is tasks and E is dependencies
- **Caching**: Could cache dependency graphs for frequently accessed tasks
- **Future**: Consider using topological sort for batch operations

### 3. Notification System

- **Batch Notifications**: Currently creates individual notifications
- **Future**: Could batch notifications or use a queue system for high-volume scenarios
- **Email Integration**: System is designed to support email notifications in the future

### 4. Dependency Types

- **Current**: Only Finish-to-Start is implemented
- **Extensibility**: Database schema supports additional types
- **Future Types**:
  - Start-to-Start (SS): Dependent task can start when prerequisite starts
  - Finish-to-Finish (FF): Dependent task must finish when prerequisite finishes
  - Start-to-Finish (SF): Dependent task must finish when prerequisite starts

### 5. Cross-Project Dependencies

- **Current**: Not supported (same project constraint)
- **Future**: Could extend to support cross-project dependencies with additional validation

### 6. Dependency Chains

- **Current**: Supports multi-level dependency chains
- **Performance**: Circular dependency detection handles deep chains efficiently
- **Visualization**: Future enhancement could include dependency graph visualization

### 7. Bulk Operations

- **Current**: Operations are performed one at a time
- **Future**: Could add bulk dependency creation/removal for project templates

### 8. Dependency Analytics

- **Future Enhancements**:
  - Critical path analysis
  - Dependency chain length metrics
  - Blocking task reports
  - Dependency health dashboards

### 9. API Rate Limiting

- **Current**: No rate limiting on server actions
- **Future**: Consider rate limiting for dependency operations to prevent abuse

### 10. Real-time Updates

- **Current**: Uses Next.js revalidation for updates
- **Future**: Could integrate WebSockets or Server-Sent Events for real-time dependency status updates

---

## Implementation Files

### Server Actions
- `src/app/actions/dependencies.ts` - All dependency-related server actions
- `src/app/actions/tasks.ts` - Updated task actions with dependency checks

### UI Components
- `src/components/tasks/dependency-list.tsx` - Display prerequisites
- `src/components/tasks/dependents-list.tsx` - Display dependent tasks
- `src/components/tasks/dependency-dialog.tsx` - Add dependency dialog
- `src/components/tasks/task-detail-sheet.tsx` - Updated with dependency sections
- `src/components/tasks/task-card.tsx` - Updated with blocked indicators

### Database Schema
- `prisma/schema.prisma` - TaskDependency model (already exists)

---

## Testing Considerations

### Unit Tests
- Circular dependency detection algorithm
- Dependency validation logic
- Status update blocking logic

### Integration Tests
- Dependency creation flow
- Automatic status updates
- Notification creation
- Cross-team dependency scenarios

### E2E Tests
- User creates dependency
- Task becomes blocked
- Prerequisite completed
- Task unblocked automatically
- Circular dependency prevention

---

## Security Considerations

1. **Authorization**: All dependency operations check user permissions
2. **Input Validation**: Zod schemas validate all inputs
3. **SQL Injection**: Prisma ORM prevents SQL injection
4. **Circular Dependency**: Prevents DoS through circular dependency chains
5. **Activity Logging**: All dependency operations are logged for audit

---

## Future Enhancements

1. **Dependency Templates**: Pre-defined dependency patterns for common workflows
2. **Dependency Visualization**: Graph view of task dependencies
3. **Smart Suggestions**: AI-powered dependency suggestions based on task content
4. **Dependency Metrics**: Analytics on dependency chains and blocking patterns
5. **Automated Dependency Creation**: Rules-based automatic dependency creation
6. **Dependency Slack Time**: Calculate and display slack time in dependency chains
7. **Dependency Risk Assessment**: Identify high-risk dependency chains

---

## Support and Maintenance

For issues or questions regarding the Task Dependency Management module:
- Check server logs for dependency operation errors
- Review activity logs for dependency changes
- Monitor notification system for dependency-related notifications
- Check database for orphaned dependencies (should be handled by cascade deletes)

---

**Last Updated**: 2024-12-17
**Version**: 1.0.0

