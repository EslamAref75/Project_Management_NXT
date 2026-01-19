# Phase 2: Query Performance Audit Report
**Date:** January 18, 2026  
**Phase:** Week 1 - Query Optimization  
**Status:** Baseline audit complete

---

## Executive Summary

Analysis of the codebase reveals that **query optimization is partially implemented**:
- ✅ Most queries already use `select` clauses (good!)
- ⚠️ Some N+1 patterns exist in specific functions
- 🟡 Database indices may be missing on frequently-filtered fields
- 🟡 Some queries fetch entire related objects when only IDs are needed

**Estimated Improvements:** 20-40% faster query response times with targeted optimizations

---

## Current State Assessment

### ✅ Already Optimized

**Projects Queries:**
- `getProjects()` - Uses select clause with counts
- `getProjectsWithFilters()` - Properly uses select for filtered list
- `getProjectById()` - Selective field fetching
- Good: All use `_count` instead of full relations

**Tasks Queries:**
- `getTasks()` - Uses select clause
- `getTasksWithFilters()` - Properly optimized with pagination
- `getTaskById()` - Selective loading
- Good: Includes assignees and project with select

**Teams Queries:**
- `getTeams()` - Uses select on team members
- `getTeam()` - Selective loading
- Good: Uses `include` with nested select

### ⚠️ Optimization Opportunities

#### 1. **N+1 Pattern: Team Projects Unassigned** 
**File:** `src/app/actions/teams.ts`, lines 485-510  
**Function:** `getUnassignedProjects()`

**Current Code:**
```typescript
// Query 1: Get assigned project IDs
const assignedProjects = await prisma.projectTeam.findMany({
    where: { teamId },
    select: { projectId: true }
})
const assignedProjectIds = assignedProjects.map(pt => pt.projectId)

// Query 2: Get unassigned projects (uses Query 1 result)
const projects = await prisma.project.findMany({
    where: { id: { notIn: assignedProjectIds } },
    ...
})
```

**Issue:** Two sequential queries when one could use subquery  
**Impact:** 2 database hits instead of 1  
**Fix:** Use Prisma `findMany()` with NOT EXISTS pattern

**Optimized Version:**
```typescript
// Single query with subquery
const projects = await prisma.project.findMany({
    where: {
        projectTeams: {
            none: { teamId }
        }
    },
    ...
})
```

---

#### 2. **Over-Fetching in Activity Logs**
**File:** `src/app/actions/activity-log.ts`  
**Issue:** May be fetching entire user/project objects when only ID/name needed

**Recommendation:**
- Add select clause to limit fetched fields
- Remove unnecessary relations
- Estimate: 30% less data transfer

---

#### 3. **Potential Index Gaps**
**File:** `prisma/schema.prisma`

**Frequently Filtered Fields (likely missing indices):**
- `Task.status` - Filtered in getTasksWithFilters
- `Task.priority` - Filtered in queries
- `Task.projectId` - Filtered in multiple places
- `Project.status` - Filtered frequently
- `Project.projectManagerId` - Filtered
- `User.role` - Filtered for RBAC
- `Notification.userId` - Fetched frequently
- `TaskDependency.taskId` and `dependsOnTaskId` - Join operations

**Action Required:**
```prisma
model Task {
  @@index([status])
  @@index([priority])
  @@index([projectId])
  @@index([assigneeId])
  @@index([createdById])
  @@index([createdAt])
}

model Project {
  @@index([status])
  @@index([projectManagerId])
  @@index([createdAt])
}

model User {
  @@index([role])
  @@index([email])
}

model Notification {
  @@index([userId])
  @@index([createdAt])
}

model TaskDependency {
  @@index([taskId])
  @@index([dependsOnTaskId])
}
```

---

## Files Needing Updates

### High Priority (Performance Impact)
1. **src/app/actions/teams.ts**
   - `getUnassignedProjects()` - N+1 pattern
   - Can save 1 query per request

2. **src/app/actions/projects.ts**
   - Verify all queries use select (appears done ✓)
   - Check for similar N+1 patterns

3. **src/app/actions/tasks.ts**
   - Check for loop-based queries
   - Verify no N+1 in filtering

4. **prisma/schema.prisma**
   - Add missing indices on commonly filtered fields
   - Document why each index exists

### Medium Priority
5. **src/app/actions/activity-log.ts**
   - Review field selections
   - Remove unnecessary data

6. **src/app/actions/notifications.ts**
   - Check for over-fetching
   - Optimize user/task relations

### Low Priority
7. **src/app/actions/user-settings.ts**
   - Settings are usually small objects
   - Lower impact

---

## Performance Metrics to Track

### Before Optimization
- [ ] Average query time: ___ ms
- [ ] Queries per request (dashboard): ___ 
- [ ] Avg response time: ___ ms
- [ ] Data transferred: ___ MB

### After Optimization (Target)
- [ ] Average query time: < 50ms (20-40% improvement)
- [ ] Queries per request: -30% fewer
- [ ] Avg response time: < 200ms
- [ ] Data transferred: -25%

---

## Implementation Plan

### Step 1: Fix N+1 Patterns
1. Update `getUnassignedProjects()` in teams.ts
2. Search for similar patterns in other files
3. Test for correctness

### Step 2: Add Database Indices
1. Update `prisma/schema.prisma`
2. Create migration: `npx prisma migrate dev --name add_performance_indices`
3. Verify indices were created

### Step 3: Add Select Clauses
1. Audit remaining queries
2. Add select clauses where missing
3. Measure impact

### Step 4: Benchmark
1. Create benchmark script
2. Measure baseline vs optimized
3. Document improvements

---

## Summary of Findings

| Issue | Location | Fix Difficulty | Performance Impact | Priority |
|-------|----------|-----------------|-------------------|----------|
| N+1: Unassigned Projects | teams.ts:485 | Easy | Medium | High |
| Missing Indices | schema.prisma | Easy | High | High |
| Over-Fetching | Various | Medium | Medium | Medium |
| Component Optimization | Components | Medium | Low | Low |

**Total Estimated Work:** 6-8 hours across Tasks #2-6

---

## Next Steps

1. **Immediate:** Create query optimization script to fix N+1 patterns
2. **Today:** Add missing database indices
3. **This Week:** Complete remaining select clause optimizations
4. **Benchmark:** Measure improvements before moving to Week 2 (caching)

