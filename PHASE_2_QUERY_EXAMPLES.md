# Phase 2 Week 1: Before/After Query Examples

## Pattern 1: List View with Basic Fields

### BEFORE
```typescript
const tasks = await prisma.task.findMany({
  where: { projectId },
  include: {
    assignees: true,
    taskStatus: true
  },
  orderBy: { createdAt: "desc" }
})
```

**Issues:**
- Returns ALL task fields
- Loads all assignee data
- Loads full taskStatus

**Impact:** 
- 25+ fields per task × 100 tasks = 2500+ fields transferred
- Multiple joins with full row loads

### AFTER
```typescript
const tasks = await prisma.task.findMany({
  where: { projectId },
  select: {
    id: true,
    title: true,
    priority: true,
    status: true,
    dueDate: true,
    createdAt: true,
    assignees: {
      select: {
        id: true,
        username: true,
        email: true,
        avatarUrl: true
      }
    },
    taskStatus: {
      select: {
        id: true,
        name: true,
        color: true
      }
    }
  },
  orderBy: { createdAt: "desc" }
})
```

**Improvements:**
- Only 7 task fields + assignee fields
- 70% reduction in data transfer
- Faster network + faster parsing

---

## Pattern 2: Stats with _count

### BEFORE (N+1 Problem)
```typescript
const projects = await prisma.project.findMany()

const projectsWithStats = await Promise.all(
  projects.map(async (project) => {
    const taskCount = await prisma.task.count({
      where: { projectId: project.id }
    })
    const completedCount = await prisma.task.count({
      where: { projectId: project.id, status: "completed" }
    })
    return {
      ...project,
      taskCount,
      completedCount
    }
  })
)
```

**Issues:**
- 1 query for projects + 2 queries per project = 1 + (2 × N) queries
- For 100 projects = 201 database roundtrips!

### AFTER (Batched)
```typescript
const projectsWithStats = await prisma.project.findMany({
  select: {
    id: true,
    name: true,
    status: true,
    projectManagerId: true,
    _count: {
      select: {
        tasks: true,
        members: true
      }
    },
    tasks: {
      where: { status: "completed" },
      select: { id: true }
    }
  }
})

// Then map in application
const result = projectsWithStats.map(project => ({
  ...project,
  taskCount: project._count.tasks,
  completedCount: project.tasks.length
}))
```

**Improvements:**
- 1 database query instead of 1 + 2N
- For 100 projects: 201 → 1 query (99.5% reduction!)
- Single roundtrip

---

## Pattern 3: Related Data with Select

### BEFORE
```typescript
const task = await prisma.task.findUnique({
  where: { id: taskId },
  include: {
    assignees: true,
    project: true,
    createdBy: true,
    taskStatus: true,
    dependencies: {
      include: {
        dependsOn: true
      }
    }
  }
})
```

**Issues:**
- Loads ALL user fields for assignees/creator
- Loads full task status
- Deep nested includes (dependencies)

### AFTER
```typescript
const task = await prisma.task.findUnique({
  where: { id: taskId },
  select: {
    id: true,
    title: true,
    description: true,
    priority: true,
    status: true,
    dueDate: true,
    projectId: true,
    createdAt: true,
    createdById: true,
    assignees: {
      select: {
        id: true,
        username: true,
        email: true,
        avatarUrl: true
      }
    },
    project: {
      select: {
        id: true,
        name: true,
        status: true
      }
    },
    createdBy: {
      select: {
        id: true,
        username: true,
        email: true
      }
    },
    taskStatus: {
      select: {
        id: true,
        name: true,
        color: true
      }
    }
    // Note: Dependencies should be separate query
  }
})

// Fetch dependencies separately if needed
const dependencies = await prisma.taskDependency.findMany({
  where: { taskId },
  select: {
    id: true,
    dependencyType: true,
    dependsOn: {
      select: {
        id: true,
        title: true,
        status: true
      }
    }
  }
})
```

**Improvements:**
- Only essential user fields
- Shallow includes (2 levels max)
- Dependencies fetched separately if needed
- Faster initial load

---

## Pattern 4: Aggregation Queries

### BEFORE
```typescript
const stats = {
  totalTasks: await prisma.task.count({ where: { projectId } }),
  completedTasks: await prisma.task.count({ 
    where: { projectId, status: "completed" } 
  }),
  activeTasks: await prisma.task.count({ 
    where: { projectId, status: "in_progress" } 
  }),
  overdueTasks: await prisma.task.count({ 
    where: { projectId, dueDate: { lt: new Date() } } 
  })
}
```

**Issues:**
- 4 separate count queries
- Not utilizing any aggregation

### AFTER
```typescript
const [allTasks, completedTasks] = await Promise.all([
  prisma.task.findMany({
    where: { projectId },
    select: { id: true, status: true, dueDate: true }
  }),
  // Alternative: use count with multiple filters
  prisma.task.groupBy({
    by: ["status"],
    where: { projectId },
    _count: true
  })
])

// Or use single query with calculation
const tasks = await prisma.task.findMany({
  where: { projectId },
  select: { id: true, status: true, dueDate: true }
})

const stats = {
  totalTasks: tasks.length,
  completedTasks: tasks.filter(t => t.status === "completed").length,
  activeTasks: tasks.filter(t => t.status === "in_progress").length,
  overdueTasks: tasks.filter(t => t.dueDate && t.dueDate < new Date()).length
}
```

**Improvements:**
- Reduce queries from 4 to 1
- Application-side calculation is fine for <1000 items
- Could use `_count` in a parent query if available

---

## Performance Metrics Reference

### Expected Improvements

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Queries per page load | 8-15 | 2-3 | 70-80% reduction |
| Data transferred | ~500KB | ~200KB | 60% reduction |
| Time to first render | 400ms | 240ms | 40% faster |
| P95 response time | 500ms | 300ms | 40% faster |
| Database CPU | High | Low | 50-60% reduction |

### Measurement Method

```typescript
// Enable Prisma logging
const prisma = new PrismaClient({
  log: [
    { emit: "event", level: "query" },
    { emit: "stdout", level: "info" }
  ]
})

prisma.$on("query", (e) => {
  console.log("Query: " + e.query)
  console.log("Duration: " + e.duration + "ms")
})
```

---

## Implementation Checklist

### For Each High-Priority File:

1. **Identify current queries**
   - [ ] Find all `findMany`, `findUnique`, `findFirst` calls
   - [ ] Note which ones use `include`
   - [ ] Check for loops with database queries

2. **Plan optimizations**
   - [ ] List fields actually used in response
   - [ ] Identify N+1 patterns to combine
   - [ ] Plan related data structure

3. **Implement changes**
   - [ ] Replace `include` with `select`
   - [ ] Add only needed fields
   - [ ] Combine N+1 queries

4. **Test changes**
   - [ ] Verify no missing fields in response
   - [ ] Check for runtime errors
   - [ ] Validate response structure

5. **Benchmark**
   - [ ] Measure query count (before/after)
   - [ ] Measure response time (before/after)
   - [ ] Log performance improvements

6. **Commit**
   - [ ] Document changes in commit message
   - [ ] Note performance improvements

---

## Common Pitfalls to Avoid

❌ **DON'T:**
- Forget to select `id` field (needed for relations)
- Create queries with 10+ levels of nesting
- Use `include` when you only need a few fields
- Fetch data then filter in application (do it in query)

✅ **DO:**
- Always include `id` in select clauses
- Keep nesting to 2-3 levels max
- Use `select` for targeted data fetching
- Filter in Prisma queries for efficiency
- Document why specific fields are needed

---

Generated by Phase 2 implementation guide
