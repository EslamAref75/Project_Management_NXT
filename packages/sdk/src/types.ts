/**
 * DTOs aligned with packages/contracts/openapi/projects-v1.yaml
 */

export interface ProjectListItem {
  id: number
  name: string
  description: string | null
  status: string
  type: string
  projectStatusId: number | null
  projectTypeId: number | null
  projectManagerId: number | null
  startDate: string | null
  endDate: string | null
  createdAt: string
  createdById: number | null
  projectManager: UserRef | null
  _count: { tasks: number; projectUsers: number; notifications: number }
}

export interface UserRef {
  id: number
  username: string
  email: string
  avatarUrl: string | null
}

export interface ProjectListResponse {
  success: true
  projects: ProjectListItem[]
  total: number
  page: number
  limit: number
}

export interface ProjectDetail {
  id: number
  name: string
  description: string | null
  status: string
  type: string
  projectStatusId: number | null
  projectTypeId: number | null
  projectManagerId: number | null
  startDate: string | null
  endDate: string | null
  createdAt: string
  updatedAt: string
  createdById: number | null
  projectType?: { id: number; name: string } | null
  projectStatus?: { id: number; name: string } | null
  projectManager: UserRef | null
  tasks?: unknown[]
  projectTeams?: unknown[]
}

export interface ProjectCreateInput {
  name: string
  type?: string
  projectTypeId?: number | null
  projectStatusId?: number | null
  description?: string
  scope?: string
  startDate?: string
  endDate?: string
  projectManagerId?: number | null
}

export interface ProjectUpdateInput {
  name?: string
  type?: string
  projectTypeId?: number | null
  projectStatusId?: number | null
  description?: string
  scope?: string
  startDate?: string
  endDate?: string
  projectManagerId?: number | null
}

export interface ProjectMutationResponse {
  success: boolean
  error?: string
}

export interface ProjectTypesResponse {
  success: boolean
  projectTypes?: Array<{ id: number; name: string; description?: string | null; isActive: boolean; displayOrder?: number; color?: string | null; icon?: string | null; usageCount?: number }>
  error?: string
}

export interface ProjectStatusesResponse {
  success: boolean
  projectStatuses?: Array<{ id: number; name: string; color: string; isDefault: boolean; isFinal: boolean; isUrgent: boolean; orderIndex: number; isActive: boolean }>
  error?: string
}

export interface ErrorResponse {
  error: string
  details?: string
}

export interface ListProjectsParams {
  search?: string
  category?: string[]
  status?: string[]
  priority?: string[]
  startDate?: string
  endDate?: string
  projectManager?: string
  page?: number
  limit?: number
}

// Tasks API (tasks-v1.yaml)

export interface TaskListItem {
  id: number
  title: string
  description: string | null
  priority: string
  status: string
  dueDate: string | null
  projectId: number
  createdAt: string
  createdById: number | null
  assignees: UserRef[]
  project: { id: number; name: string }
  _count: { dependencies: number; dependents: number }
}

export interface TaskListResponse {
  success: true
  tasks: TaskListItem[]
  total: number
  page: number
  limit: number
}

export interface TaskDetail {
  id: number
  title: string
  description: string | null
  priority: string
  status: string
  dueDate: string | null
  projectId: number
  createdAt: string
  createdById: number | null
  startedAt?: string | null
  completedAt?: string | null
  taskStatusId?: number | null
  teamId?: number | null
  assignees?: UserRef[]
  project?: { id: number; name: string }
  taskStatus?: { id: number; name: string; color: string } | null
  team?: unknown
  creator?: unknown
  attachments?: unknown[]
  comments?: unknown[]
  subtasks?: unknown[]
  dependencies?: unknown[]
  dependents?: unknown[]
  _count?: { subtasks: number; dependencies: number; dependents: number; comments: number }
}

export interface TaskCreateInput {
  title: string
  description?: string
  priority?: string
  projectId: number
  assigneeIds?: number[]
  dueDate?: string
}

export interface TaskUpdateInput {
  title?: string
  description?: string
  priority?: string
  status?: string
  taskStatusId?: number | null
  assigneeIds?: number[]
  dueDate?: string
}

export interface TaskMutationResponse {
  success: boolean
  error?: string
}

export interface TaskStatusesResponse {
  success: boolean
  taskStatuses?: Array<{ id: number; name: string; color: string; isDefault: boolean; isFinal: boolean; isBlocking?: boolean; orderIndex: number; isActive: boolean }>
  error?: string
}

export interface ListTasksParams {
  search?: string
  projectId?: string[]
  status?: string[]
  priority?: string[]
  assigneeId?: string
  startDate?: string
  endDate?: string
  dateFilterType?: "dueDate" | "createdDate"
  page?: number
  limit?: number
}
