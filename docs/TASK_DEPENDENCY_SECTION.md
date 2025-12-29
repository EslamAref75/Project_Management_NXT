# Task Dependency Section Module

## Overview

The Task Dependency Section is a dedicated module within the Task Management System that enables project managers, team leads, and developers to create and manage task dependencies. Dependencies ensure that tasks are completed in the correct order by blocking dependent tasks until their prerequisite tasks are completed.

---

## Functional Requirements

### 1. Dependency Section in Task

- **Location**: Each task includes a dedicated "Dependencies" section
- **Functionality**: 
  - Allows adding one or more dependency tasks
  - Dependencies are selected from a dropdown list
  - Section is visible in both task detail sheet and full task page view
- **UI Placement**: Prominently displayed at the top of task details, before subtasks and attachments

### 2. Dependency Task Selection (Dropdown)

**Dropdown Requirements**:
- Lists all eligible tasks that:
  - Belong to the same project
  - Are not the current task itself
  - Would not create circular dependencies

**Dropdown Item Display**:
Each dropdown item displays:
- **Task Title**: Primary identifier
- **Assigned User or Team**: Shows individual assignees or team assignment
- **Current Status**: Visual status badge (pending, in_progress, waiting, review, completed)
- **Visual Indicators**: 
  - Completed tasks are marked with green badge
  - Status is human-readable (e.g., "in progress" instead of "in_progress")

**Selection Behavior**:
- Completed tasks are selectable for reference purposes (read-only dependency)
- Tasks are sorted with incomplete tasks first, then by creation date
- Real-time filtering excludes tasks that would create circular dependencies

### 3. Dependency Creation Behavior

**Immediate Actions**:
- When a dependency task is selected and confirmed:
  - The dependency is saved immediately to the database
  - The main task status automatically changes to "waiting" (if prerequisites are incomplete)
  - Visual indicators update in real-time

**Multiple Dependencies**:
- A task may have multiple dependency tasks
- All dependencies must be completed before the task can proceed
- Dependencies are displayed as a list with individual status indicators

**Status Transition**:
- If task was in "pending" or "in_progress" state → changes to "waiting"
- If task was already "waiting" → remains "waiting"
- If task was "completed" → status remains "completed" (dependency added for reference)

### 4. Dependency Resolution

**Blocking Behavior**:
- The main task must remain on hold until:
  - **All** selected dependency tasks are completed
- Partial completion does not unblock the task

**Automatic Unblocking**:
- Once all dependency tasks are completed:
  - The main task automatically becomes unblocked
  - Status reverts to "pending" (or previous active status if applicable)
  - Notifications are sent to task assignees
  - Visual indicators update immediately

**Status Reversion Logic**:
- If task was "waiting" → reverts to "pending"
- System tracks previous status for intelligent reversion (future enhancement)

### 5. Task Restrictions

**While Task is On Hold**:
- **Completion Restriction**: The assigned user cannot mark the task as completed
- **Progress Updates**: Status changes to "in_progress" or "review" are blocked
- **UI Feedback**: Clear error messages explain why the action is blocked
- **Visual Indicators**: Task card and detail view show "Blocked" badge

**Dependency Task Owner**:
- The owner of the dependency task is **not affected** by the dependency
- They can work on and complete their task independently
- No restrictions are placed on the prerequisite task

**Configurable Restrictions** (Future):
- System supports configurable restriction levels
- Can allow certain status transitions while blocking others

### 6. Editing & Removal

**Authorized Users**:
- Task owner
- Project manager
- Team lead
- Admin

**Add Dependencies**:
- Users can add additional dependency tasks at any time
- Same validation rules apply (same project, no circular dependencies)
- Status is recalculated after addition

**Remove Dependencies**:
- Users can remove existing dependencies
- Removal triggers:
  - Recalculation of blocking state
  - Automatic status update if task becomes unblocked
  - Visual indicator updates
- Confirmation dialog prevents accidental removal

**Status Recalculation**:
- After dependency removal, system checks:
  - If all remaining prerequisites are completed → unblock task
  - If any prerequisites are incomplete → keep task blocked
  - Update status accordingly

### 7. Validation

**Self-Dependency Prevention**:
- System prevents a task from depending on itself
- Validation occurs before dependency creation
- Clear error message: "A task cannot depend on itself"

**Circular Dependency Prevention**:
- System uses depth-first search (DFS) algorithm to detect circular dependencies
- Checks both direct and transitive circular dependencies
- Example: Task A → Task B → Task C → Task A (blocked)
- Clear error message: "Circular dependency detected"

**Cross-Project Prevention**:
- Dependencies can only be created between tasks in the same project
- Validation checks project IDs before creation
- Clear error message: "Tasks must belong to the same project"

**Duplicate Prevention**:
- Same dependency cannot be added twice
- System checks for existing dependency before creation
- Clear error message: "Dependency already exists"

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

**Fields**:
- `taskId`: The dependent task (task that waits)
- `dependsOnTaskId`: The prerequisite task (task that must be completed)
- `dependencyType`: Type of dependency (currently only "finish_to_start")
- `createdById`: User who created the dependency (audit trail)
- `createdAt`: Timestamp of creation

**Relationships**:
- `task`: The dependent task (many-to-one)
- `dependsOnTask`: The prerequisite task (many-to-one)

**Constraints**:
- Composite primary key prevents duplicates
- Cascade delete removes dependencies when tasks are deleted

### Task Model (Updated)

```prisma
model Task {
  // ... existing fields ...
  status String @default("pending") // pending, waiting, in_progress, review, completed
  
  // Dependencies (Self-relation)
  dependencies TaskDependency[] @relation("DependsOn")
  dependents   TaskDependency[] @relation("Dependent")
  
  // ... other fields ...
}
```

**Status Values**:
- `pending`: Task is ready to start
- `waiting`: Task is blocked by incomplete dependencies
- `in_progress`: Task is actively being worked on
- `review`: Task is under review
- `completed`: Task is finished

---

## REST API Endpoints

### Server Actions (Next.js Pattern)

The system uses Next.js Server Actions located in `src/app/actions/dependencies.ts`:

#### 1. Create Task Dependency

**Action**: `createTaskDependency(formData: FormData)`

**Parameters**:
```typescript
{
  taskId: number           // The dependent task ID
  dependsOnTaskId: number  // The prerequisite task ID
  dependencyType: string   // "finish_to_start" (default)
}
```

**Returns**:
```typescript
{
  success?: boolean
  error?: string
  details?: string
}
```

**Business Logic**:
1. Validates user authorization
2. Verifies both tasks exist
3. Ensures tasks belong to same project
4. Checks for self-dependency
5. Detects circular dependencies
6. Prevents duplicate dependencies
7. Creates dependency record
8. Updates task blocking status
9. Creates notifications
10. Logs activity

**Status Update**:
- If prerequisites incomplete → sets task status to "waiting"
- If all prerequisites complete → keeps current status

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
1. Validates dependency exists
2. Removes dependency record
3. Recalculates blocking status
4. Updates task status if unblocked
5. Logs activity

#### 3. Get Task Dependencies

**Action**: `getTaskDependencies(taskId: number)`

**Returns**: Array of dependency objects:
```typescript
Array<{
  dependsOnTask: {
    id: number
    title: string
    status: string
    assignees: Array<{
      id: number
      username: string
      avatarUrl?: string
      team?: { id: number, name: string }
    }>
    team?: { id: number, name: string }
  }
  dependencyType: string
  createdAt: string
}>
```

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
- Includes completed tasks (for reference)

**Sorting**:
- Incomplete tasks first
- Then by creation date (newest first)

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
5. **Authorization**: Only authorized users can create dependencies
6. **Completed Tasks**: Completed tasks can be selected for reference (read-only dependency)

### 2. Task Status Rules

1. **Automatic Blocking**: When dependencies are added and prerequisites are incomplete, task status changes to "waiting"
2. **Status Progression Prevention**: Blocked tasks cannot be moved to "completed", "in_progress", or "review" status
3. **Automatic Unblocking**: When all prerequisites are completed, "waiting" tasks automatically change to "pending"
4. **Status Update Validation**: Task status updates check for blocking dependencies before allowing progression
5. **Error Messages**: Clear error messages explain why status changes are blocked

### 3. Dependency Resolution Rules

1. **All Prerequisites Required**: All prerequisite tasks must be completed before dependent task can proceed
2. **Real-time Updates**: Dependency resolution is checked in real-time when prerequisite tasks are completed
3. **Cascade Unblocking**: When a prerequisite is completed, all dependent tasks are checked and unblocked if all prerequisites are met
4. **Notification Triggers**: Notifications are sent when tasks are unblocked

### 4. Notification Rules

1. **Prerequisite Completion**: Dependent task assignees are notified when prerequisites are completed
2. **Task Unblocked**: Users are notified when their task is unblocked
3. **Dependency Added**: Prerequisite task assignees are notified when dependencies are added
4. **Cross-Team Awareness**: Notifications help teams understand dependencies across team boundaries

### 5. Circular Dependency Detection

The system uses a depth-first search (DFS) algorithm:

1. **Direct Circular Check**: Checks if task B depends on task A when trying to make A depend on B
2. **Transitive Circular Check**: Traverses the dependency graph to detect any circular paths
3. **Prevention**: Blocks creation of dependencies that would create cycles
4. **Performance**: O(V + E) complexity where V is tasks and E is dependencies

---

## UI/UX Behavior

### Task Detail Page

**Location**: `/dashboard/projects/[id]/tasks/[taskId]`

**Dependencies Section**:
- **Header**: "Prerequisites" with "Add Dependency" button
- **List Display**: 
  - Each dependency shown as a card
  - Status indicators (completed = green, blocking = orange)
  - Assignee and team information
  - Remove button (authorized users only)
- **Blocked Warning**: Orange alert box when task is blocked
- **Empty State**: "No dependencies. This task can be started immediately."

### Dependency Dialog

**Trigger**: "Add Dependency" button

**Dialog Content**:
- **Title**: "Add Task Dependency"
- **Description**: Explains dependency behavior
- **Dropdown**: 
  - Searchable/filterable task list
  - Shows task title, status, assignees/team
  - Completed tasks marked with badge
  - Real-time filtering
- **Selected Task Preview**: Shows full details of selected task
- **Dependency Type Info**: Explains "Finish-to-Start" dependency
- **Actions**: Cancel and Add Dependency buttons

### Task Card

**Visual Indicators**:
- Orange border for blocked tasks
- Alert icon (⚠️) for blocked status
- "waiting" status badge with orange styling

### Status Dropdown

**Behavior**:
- Blocked status changes show error message
- Error explains which tasks are blocking
- Dropdown still shows all statuses (for reference)
- Attempted changes are prevented with user feedback

### Dependency List Component

**Visual Design**:
- Card-based layout
- Color-coded status badges
- Icons for visual clarity:
  - ✅ Green checkmark for completed prerequisites
  - ⚠️ Orange alert for blocking prerequisites
- Hover effects for interactivity
- Responsive design for mobile

---

## Scalability and Extensibility Considerations

### 1. Database Performance

**Current Implementation**:
- Composite primary key `[taskId, dependsOnTaskId]` provides efficient lookups
- Cascade deletes automatically clean up dependencies
- Queries use Prisma includes to minimize round trips

**Optimization Opportunities**:
- Add index on `dependsOnTaskId` for reverse lookups
- Consider materialized views for dependency graphs
- Cache dependency status for frequently accessed tasks

### 2. Circular Dependency Detection

**Algorithm**: Depth-First Search (DFS)
- **Complexity**: O(V + E) where V = tasks, E = dependencies
- **Performance**: Efficient for typical project sizes (< 1000 tasks)
- **Scalability**: For larger projects, consider:
  - Caching dependency graphs
  - Batch validation for bulk operations
  - Background job for graph validation

### 3. Real-time Updates

**Current**: Next.js revalidation on dependency changes
**Future Enhancements**:
- WebSocket support for real-time status updates
- Server-Sent Events for dependency resolution notifications
- Optimistic UI updates for better UX

### 4. Dependency Types

**Current**: Finish-to-Start only
**Extensibility**: Database schema supports additional types
**Future Types**:
- **Start-to-Start (SS)**: Dependent task can start when prerequisite starts
- **Finish-to-Finish (FF)**: Dependent task must finish when prerequisite finishes
- **Start-to-Finish (SF)**: Dependent task must finish when prerequisite starts

### 5. Bulk Operations

**Current**: Operations are performed one at a time
**Future Enhancements**:
- Bulk dependency creation from templates
- Import dependencies from CSV/JSON
- Dependency chain duplication for similar projects

### 6. Dependency Analytics

**Future Features**:
- Critical path analysis
- Dependency chain visualization
- Blocking task reports
- Dependency health metrics
- Bottleneck identification

### 7. Cross-Project Dependencies

**Current**: Not supported (same project constraint)
**Future**: Could extend to support cross-project dependencies with:
- Additional validation
- Project-level permissions
- Cross-project notifications

### 8. Dependency Templates

**Future Feature**: Pre-defined dependency patterns
- Common workflow templates
- Industry-specific patterns
- Custom template creation

### 9. Advanced Status Management

**Future Enhancements**:
- Status history tracking
- Intelligent status reversion
- Custom status workflows
- Status transition rules

### 10. Performance Monitoring

**Metrics to Track**:
- Dependency creation/deletion frequency
- Average dependency chain length
- Blocking task resolution time
- Circular dependency detection performance

---

## Implementation Files

### Server Actions
- `src/app/actions/dependencies.ts` - All dependency-related server actions
- `src/app/actions/tasks.ts` - Updated task actions with dependency checks

### UI Components
- `src/components/tasks/dependency-list.tsx` - Display prerequisites
- `src/components/tasks/dependents-list.tsx` - Display dependent tasks
- `src/components/tasks/dependency-dialog.tsx` - Add dependency dialog with dropdown
- `src/components/tasks/task-detail-sheet.tsx` - Updated with dependency section
- `src/components/tasks/task-card.tsx` - Updated with blocked indicators

### Pages
- `src/app/dashboard/projects/[id]/tasks/[taskId]/page.tsx` - Full task detail page with dependencies

### Database Schema
- `prisma/schema.prisma` - TaskDependency model

---

## Testing Considerations

### Unit Tests
- Circular dependency detection algorithm
- Dependency validation logic
- Status update blocking logic
- Dropdown filtering logic

### Integration Tests
- Dependency creation flow
- Automatic status updates
- Notification creation
- Cross-team dependency scenarios
- Completed task selection

### E2E Tests
- User creates dependency via dropdown
- Task becomes blocked automatically
- Prerequisite completed
- Task unblocked automatically
- Circular dependency prevention
- Dependency removal

---

## Security Considerations

1. **Authorization**: All dependency operations check user permissions
2. **Input Validation**: Zod schemas validate all inputs
3. **SQL Injection**: Prisma ORM prevents SQL injection
4. **Circular Dependency**: Prevents DoS through circular dependency chains
5. **Activity Logging**: All dependency operations are logged for audit
6. **Project Isolation**: Dependencies cannot be created across projects

---

## Future Enhancements

1. **Dependency Visualization**: Graph view of task dependencies
2. **Smart Suggestions**: AI-powered dependency suggestions
3. **Dependency Metrics**: Analytics on dependency chains
4. **Automated Dependency Creation**: Rules-based automatic dependencies
5. **Dependency Slack Time**: Calculate slack time in dependency chains
6. **Dependency Risk Assessment**: Identify high-risk dependency chains
7. **Dependency Templates**: Pre-defined dependency patterns
8. **Bulk Operations**: Import/export dependencies
9. **Advanced Filtering**: Filter dependencies by assignee, team, status
10. **Dependency History**: Track dependency changes over time

---

**Last Updated**: 2024-12-17
**Version**: 1.0.0
**Status**: Production Ready

