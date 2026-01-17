# Critical Security Fixes - Quick Start Guide
**Next.js Project Management System**  
**Priority:** 🔴 BLOCKING  
**Timeline:** 2-3 days | Effort: 22-25 hours | Team: 1 Dev

---

## 📋 Quick Checklist

### Fix #1: NEXTAUTH_SECRET (0.5 hours)
**Status:** ⚠️ HIGH RISK - Session hijacking possible

```bash
# Generate secret
openssl rand -base64 32

# Update .env.local and .env.production
NEXTAUTH_SECRET=<paste-here>

# Invalidate old sessions
npx ts-node scripts/invalidate-old-sessions.ts

# Test
npm run dev
# Login to verify
```

**Files to Touch:**
- [ ] `.env.local`
- [ ] `.env.production`
- [ ] `src/lib/auth.ts` (if hardcoded)

---

### Fix #2: File Upload Validation (4 hours)
**Status:** 🔴 CRITICAL - Arbitrary file execution possible

**Files to Create:**
- [ ] `src/lib/file-upload-validator.ts` (validation logic)
- [ ] `src/app/api/attachments/[id]/route.ts` (secure download)

**Files to Update:**
- [ ] `src/app/actions/attachments.ts` (add validation calls)

**Commands:**
```bash
# Create validator
cat > src/lib/file-upload-validator.ts << 'EOF'
[copy from CRITICAL_SECURITY_FIXES.md - File Validation section]
EOF

# Test
npm run test attachments.test.ts

# Verify
- Try upload .jpg → ✅ Should work
- Try upload .exe → ❌ Should reject
- Try upload >5MB → ❌ Should reject
```

**Test Results Expected:**
```
✅ Valid image upload succeeds
❌ Invalid file type rejected
❌ Oversized file rejected
❌ MIME type spoofing blocked
```

---

### Fix #3: Legacy Role Bypass (8 hours)
**Status:** 🔴 CRITICAL - RBAC completely circumvented

**Audit Command:**
```bash
# Find all instances
grep -r "\.role\s*===\s*['\"]admin['\"]" src/ --include="*.ts" --include="*.tsx"

# Expected: 15-20 matches
```

**Files to Create:**
- [ ] `src/lib/rbac-helpers.ts` (permission verification)
- [ ] `scripts/fix-rbac-bypasses.ts` (audit script)

**Files to Update:** (Each instance in list above)
- [ ] Replace `if (user.role === 'admin')` with `await verifyProjectAccess(...)`
- [ ] Example files: `projects.ts`, `tasks.ts`, `teams.ts`, `users.ts`, etc.

**Commands:**
```bash
# Find instances
npx ts-node scripts/fix-rbac-bypasses.ts

# After fixes - verify no bypasses
npx ts-node scripts/fix-rbac-bypasses.ts
# Expected: "✅ No RBAC bypasses found!"

# Test
npm run test rbac.test.ts
```

**Test Results Expected:**
```
✅ Admin without permission denied
✅ User with permission allowed
✅ All users use same check mechanism
```

---

### Fix #4: Redis Permission Cache (6 hours)
**Status:** 🔴 CRITICAL - Multi-instance deployment impossible

**Installation:**
```bash
npm install redis ioredis

# Start Redis locally (for development)
redis-server --port 6379

# Or use Docker
docker run -d -p 6379:6379 redis:latest
```

**Files to Create:**
- [ ] `src/lib/redis.ts` (Redis connection)
- [ ] `src/lib/rbac-cache.ts` (caching logic)

**Files to Update:**
- [ ] `src/lib/rbac.ts` (use cache instead of in-memory)
- [ ] All role/permission change handlers

**Environment Variable:**
```env
# .env.local
REDIS_URL=redis://localhost:6379

# .env.production
REDIS_URL=redis://redis.example.com:6379
```

**Commands:**
```bash
# Test connection
redis-cli ping
# Expected: "PONG"

# Test cache
npm run test rbac-cache.test.ts

# Verify permissions cached
redis-cli KEYS "permissions:*"
# Expected: Cache keys after first user login
```

**Test Results Expected:**
```
✅ Permissions cached in Redis
✅ Cache invalidates on role change
✅ Fallback to DB if Redis down
```

---

### Fix #5: Rate Limiting (4 hours)
**Status:** 🔴 CRITICAL - Brute force/DoS possible

**Installation:**
```bash
npm install @upstash/ratelimit @upstash/redis
```

**Files to Create:**
- [ ] `src/lib/rate-limiter.ts` (rate limit rules)
- [ ] `src/lib/request.ts` (get client IP)

**Files to Update:**
- [ ] `src/middleware.ts` (add middleware)
- [ ] `src/app/actions/auth.ts` (add checks to login)
- [ ] `src/app/actions/attachments.ts` (add checks to upload)

**Environment Variables:**
```env
# For Upstash (cloud Redis)
UPSTASH_REDIS_URL=https://...
UPSTASH_REDIS_TOKEN=...

# OR for local Redis
REDIS_URL=redis://localhost:6379
```

**Commands:**
```bash
# Test rate limiting
npm run test rate-limiter.test.ts

# Manual test - try 6 logins rapidly
curl -X POST http://localhost:3000/api/auth/callback \
  -d "username=test&password=test"
# 6th should return 429 (Too Many Requests)

# Check headers
curl -i http://localhost:3000/api/login
# Look for: X-RateLimit-Remaining, X-RateLimit-Limit
```

**Test Results Expected:**
```
✅ 5 login attempts allowed
❌ 6th login attempt blocked (429)
✅ Rate limit headers present
```

---

## 📊 Implementation Order

**Recommended sequence (dependencies matter):**

1. **First:** NEXTAUTH_SECRET (0.5h)
   - No dependencies
   - Lowest risk
   - Immediate impact

2. **Second:** File Upload Validation (4h)
   - No dependencies
   - Low risk
   - Prevents exploitation

3. **Third:** Redis Setup (6h)
   - Required by Fix #4
   - Infrastructure change
   - One-time setup

4. **Fourth:** Remove RBAC Bypass (8h)
   - Uses new patterns
   - Requires testing
   - Highest impact
   - Most files to change

5. **Fifth:** Rate Limiting (4h)
   - Uses Redis
   - After main fixes
   - Easy integration

**Total: 22.5 hours**

---

## ⚠️ Risk Mitigation

### Before Deploying (Create Backups)
```bash
# Backup database
mysqldump -u root -p pms > backup-$(date +%Y%m%d).sql

# Backup code
git commit -am "Pre-security-fixes backup"
git tag v0.1-pre-security-fixes
```

### Deployment Stages
1. **Local Development** → Test all fixes locally
2. **Staging Environment** → Run full test suite, load tests
3. **Production (Off-Peak)** → Deploy during low usage window
4. **Monitoring** → Watch logs and metrics for 24 hours

### Rollback Procedure
```bash
# If critical issue
git revert <commit-sha>
git push

# Or restore from backup
mysql pms < backup-20260117.sql

# Clear Redis cache if applicable
redis-cli FLUSHALL
```

---

## 🔍 Verification Commands

Run after each fix:

```bash
# Fix #1: NEXTAUTH_SECRET
npx ts-node scripts/test-nextauth-secret.ts
# Expected: ✅ NEXTAUTH_SECRET is properly configured

# Fix #2: File Upload Validation
npm run test attachments.test.ts
# Expected: 4 tests passed

# Fix #3: RBAC Bypass
npx ts-node scripts/fix-rbac-bypasses.ts
# Expected: ✅ No RBAC bypasses found!

# Fix #4: Redis Cache
redis-cli PING
npm run test rbac-cache.test.ts
# Expected: PONG + 2 tests passed

# Fix #5: Rate Limiting
npm run test rate-limiter.test.ts
# Expected: 2 tests passed

# Overall
npm run lint
npm run type-check
npm run test
npm run build
# Expected: All green ✅
```

---

## 📈 Timeline Visualization

```
Monday (8h)
├─ 0.5h: NEXTAUTH_SECRET
├─ 3.5h: File Upload Validation
└─ 4h: Redis Setup

Tuesday (8h)
├─ 5h: Remove RBAC Bypass (part 1 - audit & setup)
├─ 2h: Testing
└─ 1h: Deployment staging

Wednesday (6-7h)
├─ 3h: Remove RBAC Bypass (part 2 - fix remaining files)
├─ 2h: Rate Limiting
├─ 1h: Full testing
└─ 0.5h: Production deployment + monitoring

Total: 22-25 hours ≈ 2-3 days
```

---

## 👨‍💻 Developer Workflow

### Day 1
```bash
# Setup
git checkout -b security/critical-fixes
cd src/lib

# Fix 1: NEXTAUTH_SECRET
# - Generate secret
# - Update .env
# - Test login
git add .env.local src/lib/auth.ts
git commit -m "fix: update NEXTAUTH_SECRET"

# Fix 2: Start file validation
# - Create validator
# - Create tests
git add file-upload-validator.ts file-upload-validator.test.ts
git commit -m "feat: implement file upload validation"
```

### Day 2
```bash
# Continue file validation
# - Update attachment server action
# - Create API endpoint
git add actions/attachments.ts api/attachments/route.ts
git commit -m "feat: enforce file upload validation in actions"

# Setup Redis
# - Create redis.ts config
# - Create rbac-cache.ts
git add lib/redis.ts lib/rbac-cache.ts
git commit -m "feat: implement Redis-backed permission cache"

# Run tests
npm run test
```

### Day 3
```bash
# Remove RBAC bypasses
# - Create rbac-helpers.ts
# - Audit files: grep for role checks
# - Fix each instance
git add lib/rbac-helpers.ts
git commit -m "refactor: add RBAC helper functions"

# Fix files one at a time
git add actions/projects.ts
git commit -m "fix: remove legacy role bypass in projects"

git add actions/tasks.ts
git commit -m "fix: remove legacy role bypass in tasks"

# ... repeat for each file ...

# Add rate limiting
git add lib/rate-limiter.ts middleware.ts
git commit -m "feat: implement rate limiting on server actions"

# Final testing
npm run lint
npm run test
npm run build

# Push and create PR
git push origin security/critical-fixes
```

---

## 🚀 One-Line Start

```bash
# Complete setup script
npm install redis @upstash/ratelimit @upstash/redis && \
git checkout -b security/critical-fixes && \
echo "Ready to implement critical fixes!"
```

---

## 📞 Troubleshooting

### Issue: Redis Connection Failed
```bash
# Verify Redis running
redis-cli PING
# If error, start Redis:
redis-server --port 6379
```

### Issue: Tests Failing
```bash
# Clear test cache
npm run test -- --clearCache

# Run specific test
npm run test -- rbac.test.ts

# Check for dependency issues
npm ci
```

### Issue: Lint/Format Errors
```bash
npm run lint -- --fix
npm run format
```

### Issue: Type Errors
```bash
npm run type-check
# Fix TypeScript errors before deployment
```

---

## 📖 Full Documentation

For detailed implementation with code examples:
**→ [CRITICAL_SECURITY_FIXES.md](CRITICAL_SECURITY_FIXES.md)** (45.2 KB)

Includes:
- ✅ Complete code samples
- ✅ Test cases
- ✅ Deployment procedures
- ✅ Rollback plans
- ✅ Risk assessments

---

## ✅ Final Checklist

**Before Committing:**
- [ ] All tests passing (`npm test`)
- [ ] No lint errors (`npm run lint`)
- [ ] TypeScript clean (`npm run type-check`)
- [ ] Build successful (`npm run build`)
- [ ] Code reviewed by security expert
- [ ] Backup created

**Before Staging Deployment:**
- [ ] Change log updated
- [ ] Environment variables documented
- [ ] Database migrations ready
- [ ] Redis cluster ready
- [ ] Monitoring alerts configured

**Before Production Deployment:**
- [ ] Staging tests passed
- [ ] Load tests passed
- [ ] Incident response tested
- [ ] Rollback procedure confirmed
- [ ] Team on-call and aware
- [ ] Off-peak window scheduled

---

**Status:** 🟢 Ready for Implementation  
**Duration:** 22-25 hours  
**Team:** 1 security-focused developer  
**Success:** All 5 critical issues resolved  
**Next:** Start with Fix #1: NEXTAUTH_SECRET

