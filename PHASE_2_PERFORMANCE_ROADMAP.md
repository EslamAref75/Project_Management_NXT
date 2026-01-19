# Phase 2: Performance Optimization - Ready to Start

**Previous Phase:** ✅ Phase 1 Security Hardening (COMPLETE)  
**Current Phase:** 🟡 Phase 2 Performance Optimization (READY)  
**Timeline:** 2-3 weeks  
**Priority:** HIGH - Must complete before general availability

---

## Phase 2 Overview

Performance optimization is critical for system stability under load. The current codebase has several architectural issues that cause degraded performance:

- **N+1 Query Problems:** Multiple requests where one should suffice
- **Over-fetching:** Queries retrieve unnecessary data
- **Missing Indices:** Database filtering is slow without proper indices
- **No Caching:** Same data fetched multiple times
- **No Monitoring:** Can't identify bottlenecks without observability

---

## Week 1: Query Optimization

### Task 1.1: Add Select Clauses to Queries
**Estimated Time:** 2-3 hours  
**Impact:** 40% faster queries

**Current Problem:**
```typescript
// BAD: Fetches all columns
const tasks = await prisma.task.findMany({
  where: { projectId }
})

// GOOD: Only fetch needed columns
const tasks = await prisma.task.findMany({
  where: { projectId },
  select: {
    id: true,
    title: true,
    status: true,
    priority: true,
    // Don't fetch: description, content, attachments, etc.
  }
})
```

**Files to Audit:**
- `src/app/actions/*.ts` - All database queries
- `src/lib/*.ts` - Database helper functions
- Find: `prisma.[model].find` without `select`

**Example Improvement:**
- Task list: 20KB → 2KB per record
- Project list: 30KB → 3KB per record
- Performance: ~10x faster data transfer

---

### Task 1.2: Identify and Combine N+1 Queries
**Estimated Time:** 2-3 hours  
**Impact:** 50% fewer database hits

**Common N+1 Patterns in Project Management Apps:**

```typescript
// BAD: N+1 Problem - 1 + N queries
const projects = await prisma.project.findMany()
for (const project of projects) {
  project.tasks = await prisma.task.findMany({
    where: { projectId: project.id }
  })
  project.team = await prisma.team.findUnique({
    where: { id: project.teamId }
  })
}

// GOOD: Single query with relations
const projects = await prisma.project.findMany({
  include: {
    tasks: {
      select: { id: true, title: true, status: true }
    },
    team: {
      select: { id: true, name: true }
    }
  }
})
```

**Likely Locations with N+1:**
- [src/app/actions/dashboard.ts](src/app/actions/dashboard.ts) - Dashboard queries
- [src/app/actions/projects.ts](src/app/actions/projects.ts) - Project listing
- [src/app/actions/tasks.ts](src/app/actions/tasks.ts) - Task queries
- Any code with loops calling `prisma.*`

**Improvement Expected:**
- Dashboard load: 10-20 queries → 2-3 queries
- Task filtering: 50+ queries → 5-8 queries
- Overall: 50% reduction in DB hits

---

### Task 1.3: Add Missing Database Indices
**Estimated Time:** 30 minutes  
**Impact:** 40% faster filtering

**Indices Likely Needed:**
```prisma
// In prisma/schema.prisma
model Task {
  // Existing fields...
  
  @@index([projectId])  // For finding tasks by project
  @@index([assignedToId])  // For finding user's tasks
  @@index([status])  // For filtering by status
  @@index([priority])  // For filtering by priority
  @@index([createdAt])  // For sorting by date
  @@index([projectId, status])  // Compound index for filtering
}

model Project {
  @@index([teamId])  // For finding team's projects
  @@index([status])  // For filtering by status
  @@index([createdAt])  // For sorting by date
}

model ActivityLog {
  @@index([userId])  // For user activity
  @@index([projectId])  // For project activity
  @@index([actionType])  // For filtering by action
  @@index([createdAt])  // For sorting by date
}

model UserRole {
  @@index([userId])  // For finding user's roles
  @@index([roleId])  // For finding role's users
}
```

**Create Migration:**
```bash
npx prisma migrate dev --name add_performance_indices
```

**Improvement Expected:**
- Task filtering: 500ms → 100ms
- User queries: 300ms → 50ms
- Overall query time: 40% faster

---

### Task 1.4: Benchmark Improvements
**Estimated Time:** 1 hour  
**Impact:** Verify performance gains

**Benchmarking Approach:**

1. **Before Optimization:**
   ```bash
   npm run dev
   # Load dashboard page
   # Check DevTools Network tab
   # Record database query count and timing
   ```

2. **After Optimization:**
   ```bash
   # Run same test
   # Compare metrics
   ```

3. **Create Benchmark Report:**
   - Query count comparison
   - Query time comparison
   - Data size comparison
   - P95 response times

---

## Week 2: Caching Layer

### Task 2.1: Set Up Redis
**Estimated Time:** 1 hour  
**Impact:** High availability caching

**Installation:**
```bash
# Option 1: Using Docker (Recommended)
docker run -d -p 6379:6379 redis:alpine

# Option 2: Installation
# On Windows: Download Redis or use WSL
# On macOS: brew install redis
# On Linux: apt install redis-server

# Verify
redis-cli ping  # Should return PONG
```

**Environment Configuration:**
```env
# .env.local
REDIS_URL=redis://localhost:6379
```

**Connection Module** (if not exists):
```typescript
// src/lib/redis.ts
import { createClient } from 'redis'

const client = createClient({
  url: process.env.REDIS_URL,
})

await client.connect()
export default client
```

---

### Task 2.2: Migrate Permission Caching to Redis
**Estimated Time:** 2 hours  
**Impact:** 70% fewer permission checks

**Current Issue:**
- Permissions cached in-memory only
- Doesn't work with multiple instances
- Memory grows indefinitely

**Redis-Based Solution:**
```typescript
// src/lib/rbac-redis.ts
import client from '@/lib/redis'
import { getUserPermissions } from '@/lib/rbac'

const PERMISSION_CACHE_TTL = 3600 // 1 hour

export async function getUserPermissionsWithCache(
  userId: number,
  projectId?: number
): Promise<string[]> {
  const cacheKey = `user:${userId}:permissions:${projectId || 'global'}`
  
  // Try cache first
  const cached = await client.get(cacheKey)
  if (cached) {
    return JSON.parse(cached)
  }
  
  // Get from database
  const permissions = await getUserPermissions(userId, projectId)
  
  // Cache for 1 hour
  await client.setEx(cacheKey, PERMISSION_CACHE_TTL, JSON.stringify(permissions))
  
  return permissions
}

export async function invalidateUserPermissionCache(
  userId: number,
  projectId?: number
): Promise<void> {
  const cacheKey = `user:${userId}:permissions:${projectId || 'global'}`
  await client.del(cacheKey)
}
```

**Integration Points:**
- [src/lib/rbac-helpers.ts](src/lib/rbac-helpers.ts) - Use cached permissions
- [src/app/actions/rbac.ts](src/app/actions/rbac.ts) - Invalidate on role changes

**Performance Impact:**
- Permission checks: 100ms → 5ms
- 70% fewer database queries
- Scales to multiple servers

---

### Task 2.3: Implement Client-Side Caching
**Estimated Time:** 2 hours  
**Impact:** Eliminate duplicate requests

**Using React Query (Recommended):**
```bash
npm install @tanstack/react-query
```

**Example Implementation:**
```typescript
// src/hooks/useProjects.ts
import { useQuery } from '@tanstack/react-query'
import { getProjects } from '@/app/actions/projects'

export function useProjects(filters?: any) {
  return useQuery({
    queryKey: ['projects', filters],
    queryFn: () => getProjects(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })
}
```

**Setup in App:**
```typescript
// src/components/providers.tsx
'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient()

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}
```

**Benefits:**
- Avoid refetching same data
- Automatic background updates
- Optimistic updates support
- Reduces server load by 30-50%

---

### Task 2.4: Add Cache Invalidation
**Estimated Time:** 1 hour  
**Impact:** Consistency + performance

**Pattern:**
```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updateTask } from '@/app/actions/tasks'

export function useUpdateTask() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: updateTask,
    onSuccess: () => {
      // Invalidate all task-related queries
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    }
  })
}
```

---

## Week 3: Monitoring & Observability

### Task 3.1: Set Up Sentry for Error Tracking
**Estimated Time:** 1 hour  
**Impact:** Know when things break

**Installation:**
```bash
npm install @sentry/nextjs
```

**Configuration:**
```typescript
// sentry.client.config.ts & sentry.server.config.ts
import * as Sentry from "@sentry/nextjs"

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
})
```

**Usage in Server Actions:**
```typescript
export async function myAction() {
  try {
    // Your code
  } catch (error) {
    Sentry.captureException(error)
    throw error
  }
}
```

---

### Task 3.2: Add Query Performance Monitoring
**Estimated Time:** 2 hours  
**Impact:** Identify slow queries

**Middleware Approach:**
```typescript
// src/lib/prisma.ts
import { PrismaClient } from '@prisma/client'
import * as Sentry from '@sentry/nextjs'

const prismaClientSingleton = () => {
  const client = new PrismaClient()
  
  client.$use(async (params, next) => {
    const before = Date.now()
    const result = await next(params)
    const after = Date.now()
    
    const duration = after - before
    
    // Log slow queries
    if (duration > 1000) { // 1 second
      Sentry.captureMessage(
        `Slow query: ${params.model}.${params.action} took ${duration}ms`,
        'warning'
      )
    }
    
    return result
  })
  
  return client
}
```

---

### Task 3.3: Create Performance Dashboards
**Estimated Time:** 2-3 hours  
**Impact:** Visibility into system health

**Metrics to Track:**
- API response times (P50, P95, P99)
- Database query count per request
- Cache hit rate
- Error rate
- Active sessions
- Login attempt rate

**Dashboard Tools:**
- Sentry: Error tracking
- New Relic/DataDog: APM
- Grafana: Metrics visualization
- Custom dashboard in admin panel

---

### Task 3.4: Configure Alerting
**Estimated Time:** 1 hour  
**Impact:** Immediate notification of issues

**Alert Rules:**
- P95 response time > 500ms
- Error rate > 1%
- Database query > 5 seconds
- Cache hit rate < 50%
- Login failure rate > 10% in 5 minutes

---

## Key Performance Metrics to Track

| Metric | Before | Target | Impact |
|--------|--------|--------|--------|
| Dashboard load time | 3-5s | <500ms | 6-10x faster |
| Query count per page | 50-100 | 5-10 | 10x fewer |
| Database query time | 500ms | 50ms | 10x faster |
| Permission checks | 1000/min | 50/min | 95% reduction |
| API response P95 | 2000ms | 200ms | 10x faster |

---

## Phase 2 Success Criteria

- [ ] All select clauses added (no over-fetching)
- [ ] N+1 queries eliminated
- [ ] Database indices created and verified
- [ ] Redis configured and working
- [ ] Permission caching using Redis
- [ ] Client-side caching with React Query
- [ ] Cache invalidation working correctly
- [ ] Sentry error tracking active
- [ ] Query performance monitoring in place
- [ ] Dashboard created for metrics
- [ ] Alert rules configured
- [ ] P95 response time < 200ms
- [ ] Database query count reduced by 80%
- [ ] Cache hit rate > 80%
- [ ] Load test passed (100+ concurrent users)

---

## Phase 2 Implementation Order

**Week 1 (Query Optimization):**
1. Create list of all database queries
2. Add select clauses
3. Combine N+1 queries
4. Create migration with indices

**Week 2 (Caching):**
1. Set up Redis
2. Update permission caching
3. Add React Query
4. Implement cache invalidation

**Week 3 (Monitoring):**
1. Deploy Sentry
2. Add query monitoring
3. Create dashboards
4. Configure alerts

---

## Tools & Dependencies

### Required
```json
{
  "redis": "^4.6.0",
  "@tanstack/react-query": "^5.0.0",
  "@sentry/nextjs": "^7.0.0"
}
```

### Optional
```json
{
  "new-relic": "latest",
  "datadog": "latest"
}
```

---

## Next Steps

1. ✅ Phase 1 complete (Security)
2. 🟡 Ready to start Phase 2
3. Start with Week 1 (Query Optimization)
4. Follow Weekly Breakdown above

---

**Status:** 🟡 Ready to Begin  
**Estimated Duration:** 2-3 weeks  
**Team Size:** 1-2 developers  
**Success Metrics:** 10x performance improvement

---

**Document Created:** January 17, 2026  
**Phase Readiness:** 100%
