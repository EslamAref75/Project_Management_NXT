# Phase 2: Performance Optimization - Week 1 Implementation Guide

## Overview
Week 1 focuses on database query optimization to achieve 40% faster response times and 50% fewer database hits.

## Priority Tasks

### Task 1: Add Select Clauses to Queries (HIGH IMPACT - 40% improvement)
**Estimated Time:** 3-4 hours

**Problem:** Queries return all fields when only subset needed, wasting bandwidth and memory.

**Files to Update (by priority):**
1. `src/app/actions/tasks.ts` - Task queries (heavy use)
2. `src/app/actions/projects.ts` - Project queries
3. `src/app/actions/dashboard.ts` - Dashboard queries
4. `src/app/actions/reports.ts` - Report queries

**Example Fix:**
```typescript
// BEFORE
const tasks = await prisma.task.findMany({
  where: { projectId },
  include: { assignees: true, taskStatus: true }
})

// AFTER
const tasks = await prisma.task.findMany({
  where: { projectId },
  select: {
    id: true,
    title: true,
    description: true,
    priority: true,
    status: true,
    dueDate: true,
    assignees: {
      select: { id: true, username: true, email: true, avatarUrl: true }
    },
    taskStatus: {
      select: { id: true, name: true, color: true }
    }
  }
})
```

**Pattern to Follow:**
1. Identify all fields actually used in the response/template
2. Use `select` instead of `include` where possible
3. Limit nested relations to essential fields only
4. Return array of selected fields for list queries

### Task 2: Combine N+1 Queries (HIGH IMPACT - 50% DB hit reduction)

**Estimated Time:** 3-4 hours

**Problem:** Loops that query database for each item instead of querying once.

**Example N+1 Pattern:**
```typescript
// BEFORE - N+1 Problem
const projects = await prisma.project.findMany()
const projectsWithStats = await Promise.all(
  projects.map(async (project) => {
    const taskCount = await prisma.task.count({
      where: { projectId: project.id }
    })
    const completedCount = await prisma.task.count({
      where: { projectId: project.id, status: "completed" }
    })
    return { ...project, taskCount, completedCount }
  })
)

// AFTER - Combined
const projectsWithStats = await prisma.project.findMany({
  include: {
    _count: {
      select: {
        tasks: true
      }
    },
    tasks: {
      where: { status: "completed" },
      select: { id: true }
    }
  }
})
// Then count in application
.map(project => ({
  ...project,
  taskCount: project._count.tasks,
  completedCount: project.tasks.length
}))
```

**Files to Check:**
1. `src/app/actions/dashboard.ts` - Dashboard statistics
2. `src/app/actions/stats.ts` - Stats generation
3. `src/app/actions/reports.ts` - Report generation
4. `src/app/actions/projects.ts` - Project listings

### Task 3: Identify Missing Database Indices (MEDIUM IMPACT - 40% filtering improvement)

**Estimated Time:** 2 hours

**Problem:** Queries filter on fields without database indices, causing full table scans.

**Common Fields Needing Indices:**
```prisma
// In schema.prisma - Add @@index for these fields:

model Task {
  projectId    Int  // Frequently filtered
  createdById  Int  // Frequently filtered
  status       String  // Frequently filtered
  priority     String  // Frequently filtered
  dueDate      DateTime  // Frequently filtered
  
  @@index([projectId])
  @@index([createdById])
  @@index([status])
  @@index([dueDate])
}

model Project {
  projectManagerId  Int?  // Frequently filtered
  createdById       Int  // Frequently filtered
  status            String  // Frequently filtered
  
  @@index([projectManagerId])
  @@index([createdById])
  @@index([status])
}

model ActivityLog {
  userId     Int  // Frequently filtered
  projectId  Int?  // Frequently filtered
  createdAt  DateTime  // Frequently filtered
  
  @@index([userId])
  @@index([projectId])
  @@index([createdAt])
}
```

**Steps:**
1. Review schema.prisma for missing indices
2. Add @@index() for frequently filtered fields
3. Create migration: `npx prisma migrate dev --name add-query-indices`
4. Benchmark before/after with queries

### Task 4: Benchmark and Verify Improvements

**Estimated Time:** 1 hour

**Benchmark Points:**
1. **Before optimization:**
   - Query execution time (use Prisma logs)
   - Number of database hits
   - Memory usage
   - Response time (end-to-end)

2. **After optimization:**
   - Re-run same queries
   - Compare metrics
   - Calculate improvement percentage

**Enable Prisma Query Logging:**
```typescript
// In .env.local
DATABASE_URL="postgresql://...?logQueries=true"

// Or in prisma client code
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn'],
})
```

## Implementation Order

### Phase 2.1: High-Priority Files (Highest Impact)
1. ✅ `src/app/actions/tasks.ts`
   - Add select clauses (task queries are heavy)
   - Combine task statistics queries
   - Add `_count` for subtask counting

2. ✅ `src/app/actions/projects.ts`
   - Add select clauses
   - Fix project + task count queries
   - Use `_count` for member counts

3. ✅ `src/app/actions/dashboard.ts`
   - Optimize dashboard statistics
   - Reduce nested includes
   - Batch related queries

### Phase 2.2: Medium-Priority Files
4. `src/app/actions/reports.ts`
   - Report generation queries
   - Statistics aggregation

5. `src/app/actions/stats.ts`
   - Dashboard stats
   - Performance metrics

### Phase 2.3: Database Schema
6. Update `prisma/schema.prisma`
   - Add missing indices
   - Create migration
   - Verify performance

## Testing Checklist

### Unit Level
- [ ] Task queries return expected fields
- [ ] Project queries return expected fields
- [ ] Dashboard renders without errors
- [ ] No missing fields in responses

### Integration Level
- [ ] Dashboard loads in < 200ms
- [ ] Project list loads in < 200ms
- [ ] Task list loads in < 200ms
- [ ] Reports generate in < 1s

### Performance Level
- [ ] Queries cut in half (measure with Prisma logs)
- [ ] Database hits reduced by 50%
- [ ] Memory usage decreased
- [ ] P95 response time < 200ms

## Rollback Plan

If issues arise:
1. Revert select clauses to include (no breaking change)
2. Remove new indices (safe, just slower)
3. Reset database to previous migration

```bash
# Rollback last migration
npx prisma migrate resolve --rolled-back migration_name
npx prisma migrate deploy
```

## Success Criteria

✅ Week 1 Complete when:
1. All high-priority files have select clauses added
2. All identified N+1 patterns are combined
3. Database indices created and migrated
4. Response times improved by 40%+
5. Database query count reduced by 50%+
6. All tests passing
7. No regressions in functionality

## Estimated Effort: 9-11 hours over 5 days (2-3 hours/day)

---

## Detailed File-by-File Guide

### src/app/actions/tasks.ts

**Current Issues:**
- `findMany` returns all task fields
- Task assignments use nested include
- No select clauses on related queries
- Stats queries have N+1 pattern

**Changes Needed:**
1. Add select clauses to all task queries
2. Use `_count` for subtask counts
3. Batch task statistics queries
4. Optimize assignee includes

**Expected Impact:** 
- Query time: 200ms → 120ms (40% improvement)
- DB hits for task list: 15 → 1 (93% reduction)

### src/app/actions/projects.ts

**Current Issues:**
- Project + task count queries
- Team member includes
- Status filters without index
- Project team queries

**Changes Needed:**
1. Add `_count: { select: { tasks: true } }`
2. Select only needed user fields in team members
3. Create indices on status, createdById, projectManagerId

**Expected Impact:**
- Query time: 150ms → 90ms (40% improvement)
- DB hits: 10 → 1 (90% reduction)

### src/app/actions/dashboard.ts

**Current Issues:**
- Multiple independent queries can be batched
- Over-fetching data for widgets
- No `_count` usage for statistics

**Changes Needed:**
1. Combine project + task statistics
2. Use `_count` instead of separate count queries
3. Add select for dashboard-specific fields only

**Expected Impact:**
- Dashboard load time: 400ms → 240ms (40% improvement)
- DB roundtrips: 8 → 2

## Next Steps

After Week 1 is complete:
- Week 2: Set up Redis caching layer
- Week 3: Add monitoring and performance tracking
- Ongoing: Monitor production metrics and optimize further

