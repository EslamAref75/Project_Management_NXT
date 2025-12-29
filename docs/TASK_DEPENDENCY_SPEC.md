# Task Dependency Section Specification

## Overview
This document outlines the functional and technical specifications for the Task Dependency Section within the Task Page. The module enables defining task execution order by establishing blocking relationships between tasks in the same project.

## Actors
- **Project Manager**: Can manage all dependencies.
- **Team Lead**: Can manage team-related dependencies.
- **Developer**: Can manage dependencies for assigned tasks.

## Functional Requirements

### 1. Dependency Section Location
- **Location**: dedicated "Dependencies" section within the Task Page / Sheet.
- **Behavior**: Expandable/Collapsible.
- **Visibility**: Visible to all, editable by authorized users.

### 2. Dependency Selection
- **UI Component**: Searchable Dropdown (Combobox).
- **Data Source**: All tasks within the **same project**.
- **Filtering**:
    - Exclude current task (Self-dependency).
    - Exclude already linked tasks.
    - Exclude tasks that would cause circular dependencies.
- **Item Display**:
    - Task Title
    - Assigned User/Team
    - Current Status

### 3. Adding a Dependency
- **Action**: Select task -> Save.
- **Effect**:
    - Creation of `TaskDependency` record.
    - Main task status updates to **"Waiting"** (On Hold) if dependency is not `completed`.
    - UI updates immediately.

### 4. Dependency List Display
- **Components**: List of dependency items.
- **Content**: Title, Assignee, Status Badge.
- **Actions**: Remove (Delete) button.

### 5. Removing a Dependency
- **Action**: Click remove icon on dependency item.
- **Effect**:
    - Record deleted.
    - Main task status recalculated:
        - If all remaining dependencies are complete -> Status `Pending` (or previous active status).
        - If blocking dependencies remain -> Status remains `Waiting`.

### 6. Dependency Resolution
- **Blocking Rule**: Main task is "Waiting" if *any* dependency is not "Completed".
- **Unblocking Rule**: Main task becomes "Pending" *only* when *all* dependencies are "Completed".
- **Enforcement**: User cannot manually set Main task to "Completed" while unresolved dependencies exist.

### 7. Validation & Constraints
- **Scope**: Same Project only.
- **Constraints**:
    - No Self-dependency.
    - No Circular dependencies (A->B->A).

## Database Design

### Table: `task_dependencies`
| Column | Type | Description |
|--------|------|-------------|
| `task_id` | Int (FK) | The dependent task (Blocked task) |
| `depends_on_task_id` | Int (FK) | The prerequisite task (Blocking task) |
| `dependency_type` | String | Default: 'finish_to_start' |
| `created_by_id` | Int | User who created the link |
| `created_at` | DateTime | Timestamp |

**Indexes**: Compound primary key `[task_id, depends_on_task_id]`.

## API Design (Server Actions)

- **`createTaskDependency(formData)`**:
    - Inputs: `taskId`, `dependsOnTaskId`
    - Logic: Validate project scope, circular check, create record, update task status.
- **`removeTaskDependency(taskId, dependsOnTaskId)`**:
    - Logic: Delete record, recalculate and update task status.
- **`getAvailableDependencyTasks(taskId)`**:
    - Returns: List of valid tasks for dropdown (Same project, not self).

## UI / UX Details
- **Status Indicators**:
    - **Incomplete Dependency**: "Blocking" badge (Orange/Yellow).
    - **Completed Dependency**: "Completed" badge (Green).
- **Main Task State**:
    - Displays "Blocked" or "On Hold" badge in header when applicable.

## Scalability
- **Search**: Dropdown implementation must support filtering on the client-side (or server-side for very large lists) to handle large project task counts.
- **Performance**: Recursive circular dependency checks should be optimized or depth-limited.
