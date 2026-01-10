import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcryptjs'
import { addDays, subDays, subWeeks } from 'date-fns'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seeding...\n')

  // Clean up existing data (optional - comment out if you want to keep existing data)
  console.log('🧹 Cleaning existing data...')
  await prisma.taskDependency.deleteMany()
  await prisma.subtaskDependency.deleteMany()
  await prisma.taskLabel.deleteMany()
  await prisma.timeLog.deleteMany()
  await prisma.commentMention.deleteMany()
  await prisma.comment.deleteMany()
  await prisma.subtask.deleteMany()
  await prisma.task.deleteMany()
  await prisma.deliverable.deleteMany()
  await prisma.projectPhase.deleteMany()
  await prisma.projectSettingsChangeLog.deleteMany()
  await prisma.projectSetting.deleteMany()
  await prisma.projectNotificationPreference.deleteMany()
  await prisma.projectNotification.deleteMany()
  await prisma.urgentProjectAcknowledgement.deleteMany()
  await prisma.projectTeam.deleteMany()
  await prisma.projectUser.deleteMany()
  await prisma.scopeHistory.deleteMany()
  await prisma.attachment.deleteMany()
  await prisma.activityLog.deleteMany()
  await prisma.automationRule.deleteMany()
  await prisma.notification.deleteMany()
  await prisma.userSettingsChangeLog.deleteMany()
  await prisma.userSetting.deleteMany()
  await prisma.settingsChangeLog.deleteMany()
  await prisma.systemSetting.deleteMany()
  await prisma.userRole.deleteMany()
  await prisma.teamMember.deleteMany()
  await prisma.project.deleteMany()
  await prisma.team.deleteMany()
  await prisma.label.deleteMany()
  await prisma.user.deleteMany()
  await prisma.rolePermission.deleteMany()
  await prisma.permission.deleteMany()
  await prisma.role.deleteMany()
  await prisma.taskStatus.deleteMany()
  await prisma.projectStatus.deleteMany()
  await prisma.projectType.deleteMany()
  await prisma.statSnapshot.deleteMany()
  await prisma.productivitySnapshot.deleteMany()
  await prisma.forecastSnapshot.deleteMany()

  console.log('✅ Cleanup complete\n')

  // 1. Seed Permissions
  console.log('📋 Seeding Permissions...')
  const permissions = [
    // Project permissions
    { key: 'project.create', name: 'Create Project', module: 'project', category: 'management' },
    { key: 'project.read', name: 'View Project', module: 'project', category: 'view' },
    { key: 'project.update', name: 'Update Project', module: 'project', category: 'edit' },
    { key: 'project.delete', name: 'Delete Project', module: 'project', category: 'management' },
    { key: 'project.manage_settings', name: 'Manage Project Settings', module: 'project', category: 'management' },
    
    // Task permissions
    { key: 'task.create', name: 'Create Task', module: 'task', category: 'management' },
    { key: 'task.read', name: 'View Task', module: 'task', category: 'view' },
    { key: 'task.update', name: 'Update Task', module: 'task', category: 'edit' },
    { key: 'task.delete', name: 'Delete Task', module: 'task', category: 'management' },
    { key: 'task.assign', name: 'Assign Task', module: 'task', category: 'management' },
    
    // User permissions
    { key: 'user.create', name: 'Create User', module: 'user', category: 'management' },
    { key: 'user.read', name: 'View User', module: 'user', category: 'view' },
    { key: 'user.update', name: 'Update User', module: 'user', category: 'edit' },
    { key: 'user.delete', name: 'Delete User', module: 'user', category: 'management' },
    
    // Team permissions
    { key: 'team.create', name: 'Create Team', module: 'team', category: 'management' },
    { key: 'team.read', name: 'View Team', module: 'team', category: 'view' },
    { key: 'team.update', name: 'Update Team', module: 'team', category: 'edit' },
    { key: 'team.delete', name: 'Delete Team', module: 'team', category: 'management' },
    
    // Settings permissions
    { key: 'settings.read', name: 'View Settings', module: 'settings', category: 'view' },
    { key: 'settings.update', name: 'Update Settings', module: 'settings', category: 'edit' },
    
    // Reports permissions
    { key: 'reports.read', name: 'View Reports', module: 'reports', category: 'view' },
  ]

  const createdPermissions = []
  for (const perm of permissions) {
    const p = await prisma.permission.create({ data: perm })
    createdPermissions.push(p)
  }
  console.log(`✅ Created ${createdPermissions.length} permissions\n`)

  // 2. Seed Roles
  console.log('👥 Seeding Roles...')
  const adminRole = await prisma.role.create({
    data: {
      name: 'admin',
      description: 'System Administrator with full access',
      isSystemRole: true,
    },
  })

  const projectManagerRole = await prisma.role.create({
    data: {
      name: 'project_manager',
      description: 'Project Manager with project management permissions',
      isSystemRole: true,
    },
  })

  const developerRole = await prisma.role.create({
    data: {
      name: 'developer',
      description: 'Developer with task management permissions',
      isSystemRole: true,
    },
  })

  const viewerRole = await prisma.role.create({
    data: {
      name: 'viewer',
      description: 'View-only access',
      isSystemRole: true,
    },
  })
  console.log(`✅ Created 4 roles\n`)

  // 3. Assign Permissions to Roles
  console.log('🔗 Assigning Permissions to Roles...')
  // Admin gets all permissions
  for (const perm of createdPermissions) {
    await prisma.rolePermission.create({
      data: { roleId: adminRole.id, permissionId: perm.id },
    })
  }

  // Project Manager permissions
  const pmPermissions = createdPermissions.filter(
    (p) =>
      p.key.startsWith('project.') ||
      p.key.startsWith('task.') ||
      p.key.startsWith('team.read') ||
      p.key.startsWith('user.read') ||
      p.key.startsWith('reports.read')
  )
  for (const perm of pmPermissions) {
    await prisma.rolePermission.create({
      data: { roleId: projectManagerRole.id, permissionId: perm.id },
    })
  }

  // Developer permissions
  const devPermissions = createdPermissions.filter(
    (p) =>
      p.key.startsWith('task.') ||
      p.key === 'project.read' ||
      p.key === 'team.read' ||
      p.key === 'reports.read'
  )
  for (const perm of devPermissions) {
    await prisma.rolePermission.create({
      data: { roleId: developerRole.id, permissionId: perm.id },
    })
  }

  // Viewer permissions
  const viewerPermissions = createdPermissions.filter((p) => p.key.endsWith('.read'))
  for (const perm of viewerPermissions) {
    await prisma.rolePermission.create({
      data: { roleId: viewerRole.id, permissionId: perm.id },
    })
  }
  console.log('✅ Permissions assigned\n')

  // 4. Seed Project Types
  console.log('📁 Seeding Project Types...')
  const projectTypes = [
    { name: 'Web Application', description: 'Web-based applications', displayOrder: 1, color: '#3b82f6', icon: 'globe' },
    { name: 'Mobile App', description: 'Mobile applications', displayOrder: 2, color: '#10b981', icon: 'smartphone' },
    { name: 'API Development', description: 'Backend API projects', displayOrder: 3, color: '#f59e0b', icon: 'server' },
    { name: 'Desktop Application', description: 'Desktop software', displayOrder: 4, color: '#8b5cf6', icon: 'monitor' },
    { name: 'Infrastructure', description: 'DevOps and infrastructure projects', displayOrder: 5, color: '#ef4444', icon: 'settings' },
  ]

  const createdProjectTypes = []
  for (const type of projectTypes) {
    const pt = await prisma.projectType.create({ data: type })
    createdProjectTypes.push(pt)
  }
  console.log(`✅ Created ${createdProjectTypes.length} project types\n`)

  // 5. Seed Project Statuses
  console.log('📊 Seeding Project Statuses...')
  const projectStatuses = [
    { name: 'planned', color: '#6b7280', isDefault: true, orderIndex: 0, isActive: true },
    { name: 'active', color: '#3b82f6', isDefault: false, orderIndex: 1, isActive: true },
    { name: 'on_hold', color: '#f59e0b', isDefault: false, orderIndex: 2, isActive: true },
    { name: 'completed', color: '#10b981', isDefault: false, orderIndex: 3, isFinal: true, isActive: true },
    { name: 'cancelled', color: '#ef4444', isDefault: false, orderIndex: 4, isFinal: true, isActive: true },
    { name: 'urgent', color: '#dc2626', isDefault: false, orderIndex: 5, isUrgent: true, isActive: true },
  ]

  const createdProjectStatuses = []
  for (const status of projectStatuses) {
    const ps = await prisma.projectStatus.create({ data: status })
    createdProjectStatuses.push(ps)
  }
  console.log(`✅ Created ${createdProjectStatuses.length} project statuses\n`)

  // 6. Seed Task Statuses
  console.log('✅ Seeding Task Statuses...')
  const taskStatuses = [
    { name: 'pending', color: '#6b7280', isDefault: true, orderIndex: 0, isActive: true },
    { name: 'in_progress', color: '#3b82f6', isDefault: false, orderIndex: 1, isActive: true },
    { name: 'in_review', color: '#f59e0b', isDefault: false, orderIndex: 2, isActive: true },
    { name: 'blocked', color: '#ef4444', isDefault: false, orderIndex: 3, isBlocking: true, isActive: true },
    { name: 'completed', color: '#10b981', isDefault: false, orderIndex: 4, isFinal: true, isActive: true },
    { name: 'cancelled', color: '#6b7280', isDefault: false, orderIndex: 5, isFinal: true, isActive: true },
  ]

  const createdTaskStatuses = []
  for (const status of taskStatuses) {
    const ts = await prisma.taskStatus.create({ data: status })
    createdTaskStatuses.push(ts)
  }
  console.log(`✅ Created ${createdTaskStatuses.length} task statuses\n`)

  // 7. Seed Users
  console.log('👤 Seeding Users...')
  const defaultPassword = await bcrypt.hash('password123', 10)

  const users = [
    {
      username: 'admin',
      email: 'admin@example.com',
      passwordHash: defaultPassword,
      role: 'admin',
    },
    {
      username: 'pm1',
      email: 'pm1@example.com',
      passwordHash: defaultPassword,
      role: 'project_manager',
    },
    {
      username: 'dev1',
      email: 'dev1@example.com',
      passwordHash: defaultPassword,
      role: 'developer',
    },
    {
      username: 'dev2',
      email: 'dev2@example.com',
      passwordHash: defaultPassword,
      role: 'developer',
    },
    {
      username: 'dev3',
      email: 'dev3@example.com',
      passwordHash: defaultPassword,
      role: 'developer',
    },
    {
      username: 'viewer1',
      email: 'viewer1@example.com',
      passwordHash: defaultPassword,
      role: 'viewer',
    },
  ]

  const createdUsers = []
  for (const userData of users) {
    const user = await prisma.user.create({ data: userData })
    createdUsers.push(user)

    // Assign RBAC role
    const roleMap: { [key: string]: typeof adminRole } = {
      admin: adminRole,
      project_manager: projectManagerRole,
      developer: developerRole,
      viewer: viewerRole,
    }
    const role = roleMap[userData.role]
    if (role) {
      await prisma.userRole.create({
        data: {
          userId: user.id,
          roleId: role.id,
          scopeType: 'global',
          scopeId: null,
        },
      })
    }
  }
  console.log(`✅ Created ${createdUsers.length} users\n`)

  // 8. Seed Teams
  console.log('👥 Seeding Teams...')
  const teams = [
    {
      name: 'Frontend Team',
      description: 'Frontend development team',
      teamLeadId: createdUsers.find((u) => u.username === 'dev1')?.id,
    },
    {
      name: 'Backend Team',
      description: 'Backend development team',
      teamLeadId: createdUsers.find((u) => u.username === 'dev2')?.id,
    },
    {
      name: 'Full Stack Team',
      description: 'Full stack development team',
      teamLeadId: createdUsers.find((u) => u.username === 'pm1')?.id,
    },
  ]

  const createdTeams = []
  for (const teamData of teams) {
    const team = await prisma.team.create({ data: teamData })
    createdTeams.push(team)

    // Add team members
    if (teamData.teamLeadId) {
      await prisma.teamMember.create({
        data: {
          teamId: team.id,
          userId: teamData.teamLeadId,
          role: 'lead',
        },
      })
    }
  }

  // Add additional developers to teams (team leads are already added above)
  const dev1 = createdUsers.find((u) => u.username === 'dev1')!
  const dev2 = createdUsers.find((u) => u.username === 'dev2')!
  const dev3 = createdUsers.find((u) => u.username === 'dev3')!
  const pm1 = createdUsers.find((u) => u.username === 'pm1')!

  // Frontend Team (teamLead: dev1) - add dev3 as member
  if (createdTeams[0]) {
    await prisma.teamMember.create({
      data: { teamId: createdTeams[0].id, userId: dev3.id, role: 'member' },
    })
  }
  
  // Backend Team (teamLead: dev2) - no additional members needed
  
  // Full Stack Team (teamLead: pm1) - add dev1 and dev2 as members
  if (createdTeams[2]) {
    await prisma.teamMember.create({
      data: { teamId: createdTeams[2].id, userId: dev1.id, role: 'member' },
    })
    await prisma.teamMember.create({
      data: { teamId: createdTeams[2].id, userId: dev2.id, role: 'member' },
    })
  }

  console.log(`✅ Created ${createdTeams.length} teams\n`)

  // 9. Seed Labels
  console.log('🏷️ Seeding Labels...')
  const labels = [
    { name: 'bug', color: '#ef4444', description: 'Bug fix required' },
    { name: 'feature', color: '#10b981', description: 'New feature' },
    { name: 'enhancement', color: '#3b82f6', description: 'Enhancement to existing feature' },
    { name: 'urgent', color: '#dc2626', description: 'Urgent task' },
    { name: 'documentation', color: '#8b5cf6', description: 'Documentation task' },
    { name: 'refactor', color: '#f59e0b', description: 'Code refactoring' },
  ]

  const createdLabels = []
  for (const label of labels) {
    const l = await prisma.label.create({ data: label })
    createdLabels.push(l)
  }
  console.log(`✅ Created ${createdLabels.length} labels\n`)

  // 10. Seed Projects
  console.log('📦 Seeding Projects...')
  const admin = createdUsers.find((u) => u.username === 'admin')!

  const projects = [
    {
      name: 'E-Commerce Platform',
      type: 'web_application',
      projectTypeId: createdProjectTypes[0].id,
      projectStatusId: createdProjectStatuses[1].id, // active
      description: 'Full-stack e-commerce platform with admin dashboard',
      scope: 'Build complete e-commerce solution with user authentication, product management, shopping cart, and payment integration',
      status: 'active',
      priority: 'high',
      startDate: subWeeks(new Date(), 4),
      endDate: addDays(new Date(), 60),
      projectManagerId: pm1.id,
      createdById: admin.id,
    },
    {
      name: 'Mobile Banking App',
      type: 'mobile_app',
      projectTypeId: createdProjectTypes[1].id,
      projectStatusId: createdProjectStatuses[0].id, // planned
      description: 'Secure mobile banking application',
      scope: 'Develop secure mobile banking app with biometric authentication, transaction management, and bill payments',
      status: 'planned',
      priority: 'normal',
      startDate: addDays(new Date(), 7),
      endDate: addDays(new Date(), 90),
      projectManagerId: pm1.id,
      createdById: admin.id,
    },
    {
      name: 'REST API Service',
      type: 'api',
      projectTypeId: createdProjectTypes[2].id,
      projectStatusId: createdProjectStatuses[1].id, // active
      description: 'RESTful API for microservices architecture',
      scope: 'Design and implement RESTful API with authentication, rate limiting, and comprehensive documentation',
      status: 'active',
      priority: 'normal',
      startDate: subWeeks(new Date(), 2),
      endDate: addDays(new Date(), 45),
      projectManagerId: pm1.id,
      createdById: admin.id,
    },
  ]

  const createdProjects = []
  for (const projectData of projects) {
    const project = await prisma.project.create({ data: projectData })
    createdProjects.push(project)

    // Add project users
    await prisma.projectUser.create({
      data: {
        projectId: project.id,
        userId: projectData.projectManagerId!,
        role: 'project_manager',
        allocationPercentage: 100,
        joinedAt: project.startDate || new Date(),
      },
    })

    // Add project teams
    if (createdTeams[0] && project.name === 'E-Commerce Platform') {
      await prisma.projectTeam.create({
        data: { projectId: project.id, teamId: createdTeams[0].id },
      })
    }
    if (createdTeams[1] && project.name === 'REST API Service') {
      await prisma.projectTeam.create({
        data: { projectId: project.id, teamId: createdTeams[1].id },
      })
    }
  }
  console.log(`✅ Created ${createdProjects.length} projects\n`)

  // 11. Seed Deliverables
  console.log('📋 Seeding Deliverables...')
  const deliverables = []
  for (const project of createdProjects) {
    const projectDeliverables = [
      {
        projectId: project.id,
        name: `Phase 1 - ${project.name}`,
        description: 'Initial phase deliverables',
        acceptanceCriteria: 'All features tested and documented',
        status: 'pending',
      },
      {
        projectId: project.id,
        name: `Phase 2 - ${project.name}`,
        description: 'Second phase deliverables',
        acceptanceCriteria: 'Integration tests passed',
        status: 'pending',
      },
    ]
    for (const deliverable of projectDeliverables) {
      const d = await prisma.deliverable.create({ data: deliverable })
      deliverables.push(d)
    }
  }
  console.log(`✅ Created ${deliverables.length} deliverables\n`)

  // 12. Seed Project Phases
  console.log('📅 Seeding Project Phases...')
  for (const project of createdProjects) {
    await prisma.projectPhase.create({
      data: {
        projectId: project.id,
        name: 'Planning',
        description: 'Initial planning phase',
        sequenceOrder: 1,
        startDate: project.startDate || new Date(),
        endDate: addDays(project.startDate || new Date(), 7),
        status: project.status === 'active' ? 'completed' : 'pending',
      },
    })
    await prisma.projectPhase.create({
      data: {
        projectId: project.id,
        name: 'Development',
        description: 'Active development phase',
        sequenceOrder: 2,
        startDate: addDays(project.startDate || new Date(), 7),
        endDate: addDays(project.startDate || new Date(), 30),
        status: project.status === 'active' ? 'in_progress' : 'pending',
      },
    })
    await prisma.projectPhase.create({
      data: {
        projectId: project.id,
        name: 'Testing',
        description: 'Testing and QA phase',
        sequenceOrder: 3,
        startDate: addDays(project.startDate || new Date(), 30),
        endDate: addDays(project.startDate || new Date(), 45),
        status: 'pending',
      },
    })
  }
  console.log(`✅ Created project phases\n`)

  // 13. Seed Tasks
  console.log('✅ Seeding Tasks...')
  const pendingStatus = createdTaskStatuses.find((s) => s.name === 'pending')!
  const inProgressStatus = createdTaskStatuses.find((s) => s.name === 'in_progress')!
  const completedStatus = createdTaskStatuses.find((s) => s.name === 'completed')!

  const tasks = []
  for (const project of createdProjects) {
    const projectTasks = [
      {
        title: `Setup ${project.name} Development Environment`,
        description: 'Initialize project structure, setup development tools and dependencies',
        status: 'completed',
        taskStatusId: completedStatus.id,
        priority: 'high',
        estimatedHours: 8,
        actualHours: 7.5,
        dueDate: addDays(new Date(), 5),
        plannedDate: subDays(new Date(), 3),
        projectId: project.id,
        teamId: project.name === 'E-Commerce Platform' ? createdTeams[0]?.id : createdTeams[1]?.id,
        createdById: pm1.id,
        deliverableId: deliverables.find((d) => d.projectId === project.id)?.id,
      },
      {
        title: `Implement User Authentication for ${project.name}`,
        description: 'Build user authentication system with login, registration, and password reset',
        status: 'in_progress',
        taskStatusId: inProgressStatus.id,
        priority: 'high',
        estimatedHours: 16,
        actualHours: 10,
        dueDate: addDays(new Date(), 10),
        plannedDate: addDays(new Date(), 7),
        projectId: project.id,
        teamId: project.name === 'E-Commerce Platform' ? createdTeams[0]?.id : createdTeams[1]?.id,
        createdById: pm1.id,
        deliverableId: deliverables.find((d) => d.projectId === project.id)?.id,
      },
      {
        title: `Design Database Schema for ${project.name}`,
        description: 'Design and implement database schema with proper relationships',
        status: 'in_progress',
        taskStatusId: inProgressStatus.id,
        priority: 'normal',
        estimatedHours: 12,
        actualHours: 8,
        dueDate: addDays(new Date(), 7),
        plannedDate: addDays(new Date(), 5),
        projectId: project.id,
        createdById: pm1.id,
        deliverableId: deliverables.find((d) => d.projectId === project.id)?.id,
      },
      {
        title: `Write Unit Tests for ${project.name}`,
        description: 'Create comprehensive unit tests for core functionality',
        status: 'pending',
        taskStatusId: pendingStatus.id,
        priority: 'normal',
        estimatedHours: 20,
        dueDate: addDays(new Date(), 20),
        plannedDate: addDays(new Date(), 15),
        projectId: project.id,
        createdById: pm1.id,
        deliverableId: deliverables.find((d) => d.projectId === project.id && d.name.includes('Phase 2'))?.id,
      },
      {
        title: `Fix Critical Bug in ${project.name}`,
        description: 'Resolve critical bug affecting production',
        status: 'pending',
        taskStatusId: pendingStatus.id,
        priority: 'urgent',
        estimatedHours: 4,
        dueDate: addDays(new Date(), 1),
        plannedDate: new Date(),
        projectId: project.id,
        createdById: pm1.id,
      },
    ]

    for (const taskData of projectTasks) {
      // Determine assignees based on task title
      let assigneeIds: number[] = []
      if (taskData.title.includes('Setup')) {
        assigneeIds = [dev1.id]
      } else if (taskData.title.includes('Authentication')) {
        assigneeIds = [dev1.id, dev2.id]
      } else if (taskData.title.includes('Database')) {
        assigneeIds = [dev2.id]
      } else if (taskData.title.includes('Tests')) {
        assigneeIds = [dev3.id]
      } else if (taskData.title.includes('Bug')) {
        assigneeIds = [dev1.id]
      }

      const task = await prisma.task.create({
        data: {
          ...taskData,
          startedAt: taskData.status === 'in_progress' ? subDays(new Date(), 2) : null,
          completedAt: taskData.status === 'completed' ? subDays(new Date(), 1) : null,
          ...(assigneeIds.length > 0 && {
            assignees: {
              connect: assigneeIds.map((id) => ({ id })),
            },
          }),
        },
      })
      tasks.push(task)

      // Add labels to tasks
      if (task.title.includes('Bug')) {
        const bugLabel = createdLabels.find((l) => l.name === 'bug')!
        await prisma.taskLabel.create({
          data: { taskId: task.id, labelId: bugLabel.id },
        })
        const urgentLabel = createdLabels.find((l) => l.name === 'urgent')!
        await prisma.taskLabel.create({
          data: { taskId: task.id, labelId: urgentLabel.id },
        })
      } else if (task.title.includes('Authentication') || task.title.includes('Database')) {
        const featureLabel = createdLabels.find((l) => l.name === 'feature')!
        await prisma.taskLabel.create({
          data: { taskId: task.id, labelId: featureLabel.id },
        })
      } else if (task.title.includes('Tests')) {
        const docLabel = createdLabels.find((l) => l.name === 'documentation')!
        await prisma.taskLabel.create({
          data: { taskId: task.id, labelId: docLabel.id },
        })
      }
    }
  }
  console.log(`✅ Created ${tasks.length} tasks\n`)

  // 14. Seed Task Dependencies
  console.log('🔗 Seeding Task Dependencies...')
  for (const project of createdProjects) {
    const projectTasks = tasks.filter((t) => t.projectId === project.id)
    const setupTask = projectTasks.find((t) => t.title.includes('Setup'))!
    const authTask = projectTasks.find((t) => t.title.includes('Authentication'))!
    const dbTask = projectTasks.find((t) => t.title.includes('Database'))!
    const testTask = projectTasks.find((t) => t.title.includes('Tests'))!

    if (setupTask && authTask) {
      await prisma.taskDependency.create({
        data: {
          taskId: authTask.id,
          dependsOnTaskId: setupTask.id,
          dependencyType: 'finish_to_start',
          createdById: pm1.id,
        },
      })
    }
    if (dbTask && authTask) {
      await prisma.taskDependency.create({
        data: {
          taskId: authTask.id,
          dependsOnTaskId: dbTask.id,
          dependencyType: 'finish_to_start',
          createdById: pm1.id,
        },
      })
    }
    if (authTask && testTask) {
      await prisma.taskDependency.create({
        data: {
          taskId: testTask.id,
          dependsOnTaskId: authTask.id,
          dependencyType: 'finish_to_start',
          createdById: pm1.id,
        },
      })
    }
  }
  console.log('✅ Created task dependencies\n')

  // 15. Seed Subtasks
  console.log('📝 Seeding Subtasks...')
  for (const task of tasks.slice(0, 6)) {
    // Add 2-3 subtasks per task
    const subtasks = [
      {
        title: `Research for ${task.title}`,
        description: 'Research best practices and requirements',
        status: 'completed',
        priority: 'normal',
        estimatedHours: 2,
        actualHours: 1.5,
        parentTaskId: task.id,
        assignedToId: dev1.id,
        createdById: pm1.id,
        teamId: task.teamId,
      },
      {
        title: `Implementation of ${task.title}`,
        description: 'Core implementation work',
        status: task.status === 'completed' ? 'completed' : task.status === 'in_progress' ? 'in_progress' : 'pending',
        priority: task.priority,
        estimatedHours: task.estimatedHours / 2,
        actualHours: task.status === 'completed' ? task.estimatedHours / 2 : 0,
        parentTaskId: task.id,
        assignedToId: task.status === 'completed' ? dev1.id : dev2.id,
        createdById: pm1.id,
        teamId: task.teamId,
      },
    ]

    for (const subtaskData of subtasks) {
      await prisma.subtask.create({
        data: {
          ...subtaskData,
          startDate: subtaskData.status !== 'pending' ? subDays(new Date(), 1) : null,
          dueDate: task.dueDate ? subDays(task.dueDate, 1) : null,
        },
      })
    }
  }
  console.log('✅ Created subtasks\n')

  // 16. Seed Comments
  console.log('💬 Seeding Comments...')
  for (const task of tasks.slice(0, 8)) {
    await prisma.comment.create({
      data: {
        content: `Starting work on ${task.title}. Any questions or concerns?`,
        taskId: task.id,
        userId: pm1.id,
      },
    })

    const assignedUser = task.title.includes('Setup') ? dev1 : dev2
    await prisma.comment.create({
      data: {
        content: `Progress update: Made good progress. Should be done by ${task.dueDate?.toLocaleDateString() || 'deadline'}.`,
        taskId: task.id,
        userId: assignedUser.id,
      },
    })
  }
  console.log('✅ Created comments\n')

  // 17. Seed Time Logs
  console.log('⏰ Seeding Time Logs...')
  for (const task of tasks.filter((t) => t.status !== 'pending')) {
    const user = task.title.includes('Setup') ? dev1 : dev2
    const logDate = subDays(new Date(), Math.floor(Math.random() * 7))

    await prisma.timeLog.create({
      data: {
        hoursLogged: Math.floor(Math.random() * 4) + 2,
        description: `Worked on ${task.title}`,
        logDate: logDate,
        userId: user.id,
        taskId: task.id,
      },
    })
  }
  console.log('✅ Created time logs\n')

  // 18. Seed System Settings
  console.log('⚙️ Seeding System Settings...')
  const systemSettings = [
    { key: 'app_name', value: 'Project Management System', category: 'general', description: 'Application name' },
    { key: 'app_version', value: '1.0.0', category: 'general', description: 'Application version' },
    { key: 'max_file_size', value: '10485760', category: 'files', description: 'Maximum file upload size in bytes (10MB)' },
    { key: 'session_timeout', value: '3600', category: 'security', description: 'Session timeout in seconds' },
    { key: 'enable_notifications', value: 'true', category: 'notifications', description: 'Enable system notifications' },
    { key: 'default_task_priority', value: 'normal', category: 'tasks', description: 'Default priority for new tasks' },
  ]

  for (const setting of systemSettings) {
    await prisma.systemSetting.create({
      data: {
        ...setting,
        updatedBy: admin.id,
      },
    })
  }
  console.log(`✅ Created ${systemSettings.length} system settings\n`)

  // 19. Seed Project Settings
  console.log('⚙️ Seeding Project Settings...')
  for (const project of createdProjects) {
    await prisma.projectSetting.create({
      data: {
        projectId: project.id,
        key: 'enable_time_tracking',
        value: 'true',
        category: 'features',
        enabled: true,
        updatedBy: pm1.id,
      },
    })
    await prisma.projectSetting.create({
      data: {
        projectId: project.id,
        key: 'enable_dependencies',
        value: 'true',
        category: 'features',
        enabled: true,
        updatedBy: pm1.id,
      },
    })
    await prisma.projectSetting.create({
      data: {
        projectId: project.id,
        key: 'notification_email',
        value: 'true',
        category: 'notifications',
        enabled: true,
        updatedBy: pm1.id,
      },
    })
  }
  console.log('✅ Created project settings\n')

  // 20. Seed User Settings
  console.log('👤 Seeding User Settings...')
  for (const user of createdUsers) {
    await prisma.userSetting.create({
      data: {
        userId: user.id,
        key: 'theme',
        value: 'light',
        category: 'preferences',
        updatedBy: user.id,
      },
    })
    await prisma.userSetting.create({
      data: {
        userId: user.id,
        key: 'language',
        value: 'en',
        category: 'preferences',
        updatedBy: user.id,
      },
    })
    await prisma.userSetting.create({
      data: {
        userId: user.id,
        key: 'email_notifications',
        value: 'true',
        category: 'notifications',
        updatedBy: user.id,
      },
    })
  }
  console.log('✅ Created user settings\n')

  // 21. Seed Project Notification Preferences
  console.log('🔔 Seeding Project Notification Preferences...')
  for (const project of createdProjects) {
    for (const user of [pm1, dev1, dev2]) {
      await prisma.projectNotificationPreference.create({
        data: {
          projectId: project.id,
          userId: user.id,
          soundEnabled: true,
          taskNotifications: true,
          dependencyNotifications: true,
          todayTaskNotifications: true,
          projectAdminNotifications: true,
        },
      })
    }
  }
  console.log('✅ Created notification preferences\n')

  // 22. Seed Notifications
  console.log('🔔 Seeding Notifications...')
  for (const user of createdUsers.slice(0, 5)) {
    await prisma.notification.create({
      data: {
        title: 'Welcome to Project Management System',
        message: `Welcome ${user.username}! Your account has been created successfully.`,
        type: 'info',
        isRead: false,
        userId: user.id,
      },
    })

    if (user.role === 'developer') {
      await prisma.notification.create({
        data: {
          title: 'New Task Assigned',
          message: 'You have been assigned to a new task. Please review and start working on it.',
          type: 'task',
          isRead: false,
          userId: user.id,
        },
      })
    }
  }
  console.log('✅ Created notifications\n')

  // 23. Seed Project Notifications
  console.log('🔔 Seeding Project Notifications...')
  for (const project of createdProjects.slice(0, 2)) {
    for (const user of [pm1, dev1]) {
      await prisma.projectNotification.create({
        data: {
          projectId: project.id,
          userId: user.id,
          type: 'task_created',
          entityType: 'task',
          entityId: tasks.find((t) => t.projectId === project.id)?.id,
          title: 'New Task Created',
          message: `A new task has been created in ${project.name}`,
          isRead: false,
          soundRequired: true,
          isUrgent: false,
          requiresAcknowledgment: false,
        },
      })
    }
  }
  console.log('✅ Created project notifications\n')

  // 24. Seed Activity Logs
  console.log('📜 Seeding Activity Logs...')
  for (const project of createdProjects) {
    await prisma.activityLog.create({
      data: {
        actionType: 'project_created',
        actionCategory: 'project',
        actionSummary: `Project ${project.name} was created`,
        actionDetails: JSON.stringify({ projectId: project.id, projectName: project.name }),
        performedById: admin.id,
        projectId: project.id,
        entityType: 'project',
        entityId: project.id,
      },
    })

    const projectTasks = tasks.filter((t) => t.projectId === project.id)
    for (const task of projectTasks.slice(0, 3)) {
      await prisma.activityLog.create({
        data: {
          actionType: 'task_created',
          actionCategory: 'task',
          actionSummary: `Task "${task.title}" was created`,
          actionDetails: JSON.stringify({ taskId: task.id, taskTitle: task.title }),
          performedById: pm1.id,
          projectId: project.id,
          entityType: 'task',
          entityId: task.id,
        },
      })
    }
  }

  // User login activities
  for (const user of createdUsers.slice(0, 3)) {
    await prisma.activityLog.create({
      data: {
        actionType: 'user_login',
        actionCategory: 'auth',
        actionSummary: `User ${user.username} logged in`,
        actionDetails: JSON.stringify({ userId: user.id, username: user.username }),
        performedById: user.id,
        affectedUserId: user.id,
        entityType: 'user',
        entityId: user.id,
      },
    })
  }
  console.log('✅ Created activity logs\n')

  // 25. Seed Automation Rules
  console.log('🤖 Seeding Automation Rules...')
  for (const team of createdTeams) {
    await prisma.automationRule.create({
      data: {
        name: `Auto-assign urgent tasks - ${team.name}`,
        description: 'Automatically assign urgent tasks to team lead',
        triggerType: 'task_created',
        triggerCondition: JSON.stringify({ priority: 'urgent' }),
        actionType: 'assign_task',
        actionConfig: JSON.stringify({ assignToTeamLead: true }),
        isActive: true,
        createdById: admin.id,
        teamId: team.id,
      },
    })
  }
  console.log('✅ Created automation rules\n')

  console.log('🎉 Database seeding completed successfully!')
  console.log('\n📊 Summary:')
  console.log(`  - ${createdPermissions.length} Permissions`)
  console.log(`  - 4 Roles`)
  console.log(`  - ${createdProjectTypes.length} Project Types`)
  console.log(`  - ${createdProjectStatuses.length} Project Statuses`)
  console.log(`  - ${createdTaskStatuses.length} Task Statuses`)
  console.log(`  - ${createdUsers.length} Users`)
  console.log(`  - ${createdTeams.length} Teams`)
  console.log(`  - ${createdLabels.length} Labels`)
  console.log(`  - ${createdProjects.length} Projects`)
  console.log(`  - ${deliverables.length} Deliverables`)
  console.log(`  - ${tasks.length} Tasks`)
  console.log(`  - Multiple Subtasks, Comments, Time Logs, Settings, and Notifications`)
  console.log('\n🔑 Default password for all users: password123')
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

