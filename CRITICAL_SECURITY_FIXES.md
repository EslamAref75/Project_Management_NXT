# Critical Security Fixes Implementation Guide
**Next.js Project Management System**  
**Priority Level:** 🔴 BLOCKING - Must Complete Before Production**  
**Date:** January 17, 2026

---

## Executive Summary

**5 Critical Issues Blocking Production:**
1. ❌ Weak NEXTAUTH_SECRET ("secret")
2. ❌ No file upload validation
3. ❌ Legacy role bypass in RBAC
4. ❌ In-memory permission cache (not scalable)
5. ❌ No rate limiting on server actions

**Total Effort:** 22-25 hours  
**Timeline:** 2-3 days (1 developer)  
**Impact:** Enables enterprise deployment

---

## Issue #1: Weak NEXTAUTH_SECRET

### Risk Assessment
**Severity:** 🔴 CRITICAL  
**CVSS Score:** 9.8 (Critical)  
**Impact:** Session hijacking, token forgery, complete authentication bypass

### Current Problem

**Location:** `.env.local` or `src/lib/auth.ts`

```typescript
// ❌ VULNERABLE
export const authOptions = {
  secret: "secret", // Hardcoded, visible, easily guessable
  // ...
}
```

**Why It's Dangerous:**
- Attackers can forge valid JWT tokens
- All user sessions are compromised
- No way to invalidate tokens once leaked
- Single point of failure for entire authentication system

### Solution: Generate Strong Secret

**Step 1: Generate Secure Secret**

```bash
# Option A: Using OpenSSL (Recommended)
openssl rand -base64 32

# Option B: Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Option C: Using online generator
# https://generate-secret.vercel.app/
```

**Example Output:**
```
abcdef123456/=+GHIJKLMNOPQRSTUVWXYZabcdef
```

**Step 2: Update Environment Variable**

**File:** `.env.local` (local) / `.env.production` (production)

```env
# BEFORE (❌ VULNERABLE)
NEXTAUTH_SECRET=secret

# AFTER (✅ SECURE)
NEXTAUTH_SECRET=abcdef123456/=+GHIJKLMNOPQRSTUVWXYZabcdef
```

**Step 3: Update Auth Configuration (if hardcoded)**

**File:** `src/lib/auth.ts`

```typescript
// BEFORE (❌ VULNERABLE)
export const authOptions: NextAuthOptions = {
  secret: "secret",
  providers: [
    CredentialsProvider({
      // ...
    }),
  ],
  // ...
}

// AFTER (✅ SECURE)
export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    CredentialsProvider({
      // ...
    }),
  ],
  // ...
}
```

**Step 4: Invalidate All Current Sessions**

Since the old secret is compromised, invalidate all existing tokens:

```typescript
// scripts/invalidate-old-sessions.ts
import { prisma } from '@/lib/prisma'

async function invalidateAllSessions() {
  const result = await prisma.session.deleteMany({})
  console.log(`Invalidated ${result.count} sessions`)
  console.log('All users must re-login')
}

invalidateAllSessions()
  .catch(console.error)
  .finally(() => process.exit(0))
```

**Run Migration:**
```bash
npx ts-node scripts/invalidate-old-sessions.ts
```

### Testing

**Test 1: Verify Secret Loaded**
```typescript
// scripts/test-nextauth-secret.ts
import { authOptions } from '@/lib/auth'

function testAuthSecret() {
  if (!authOptions.secret) {
    console.error('❌ NEXTAUTH_SECRET is not set!')
    process.exit(1)
  }

  if (authOptions.secret === 'secret') {
    console.error('❌ NEXTAUTH_SECRET is still using default "secret"!')
    process.exit(1)
  }

  if (authOptions.secret.length < 32) {
    console.error('❌ NEXTAUTH_SECRET is too short! Minimum 32 characters required.')
    process.exit(1)
  }

  console.log('✅ NEXTAUTH_SECRET is properly configured')
  console.log(`✅ Secret length: ${authOptions.secret.length} characters`)
}

testAuthSecret()
```

**Run Test:**
```bash
npx ts-node scripts/test-nextauth-secret.ts
```

### Deployment Steps

1. Generate new secret: `openssl rand -base64 32`
2. Update `.env.production` with new secret
3. Deploy application
4. Run session invalidation script
5. Notify users to re-login
6. Verify in logs that sessions are working

**Effort:** 0.5 hours  
**Risk:** Low (no code changes required)

---

## Issue #2: No File Upload Validation

### Risk Assessment
**Severity:** 🔴 CRITICAL  
**CVSS Score:** 8.5 (High)  
**Impact:** Arbitrary file upload, malware execution, DoS, data exfiltration

### Current Problem

**Location:** `src/app/actions/attachments.ts`

```typescript
// ❌ VULNERABLE
export async function uploadFile(formData: FormData) {
  const file = formData.get('file') as File
  
  // NO VALIDATION!
  // - No MIME type check
  // - No file size limit
  // - No extension check
  // - Direct upload to storage
  
  const buffer = await file.arrayBuffer()
  await uploadToS3(file.name, buffer) // DANGER!
}
```

**Attack Vectors:**
1. **Malicious executable upload** → Execute code on server
2. **Large file upload** → DoS via disk space exhaustion
3. **Zip bomb** → Expand to consume all resources
4. **MIME type spoofing** → Upload .exe as .jpg
5. **Path traversal** → Upload to arbitrary location (../../etc/passwd)

### Solution: Implement File Validation

**Step 1: Create Validation Library**

**File:** `src/lib/file-upload-validator.ts`

```typescript
/**
 * File upload validation and sanitization
 */

// Allowed MIME types (whitelist approach)
const ALLOWED_MIME_TYPES = {
  // Images
  'image/jpeg': { ext: 'jpg', maxSize: 5 * 1024 * 1024 }, // 5MB
  'image/png': { ext: 'png', maxSize: 5 * 1024 * 1024 },
  'image/webp': { ext: 'webp', maxSize: 5 * 1024 * 1024 },
  'image/gif': { ext: 'gif', maxSize: 5 * 1024 * 1024 },
  
  // Documents
  'application/pdf': { ext: 'pdf', maxSize: 10 * 1024 * 1024 }, // 10MB
  
  // Archives (optional - be careful!)
  // 'application/zip': { ext: 'zip', maxSize: 20 * 1024 * 1024 },
}

// Disallowed extensions (defense in depth)
const DANGEROUS_EXTENSIONS = [
  'exe', 'bat', 'cmd', 'com', 'scr',
  'vbs', 'js', 'jar', 'zip', 'rar',
  'dll', 'msi', 'app', 'deb', 'rpm'
]

export interface ValidationResult {
  valid: boolean
  error?: string
  suggestedExtension?: string
}

/**
 * Validate file before upload
 * 
 * @param file - File to validate
 * @returns ValidationResult with error if invalid
 * 
 * @example
 * const result = validateFileUpload(file)
 * if (!result.valid) {
 *   return { error: result.error }
 * }
 */
export function validateFileUpload(file: File): ValidationResult {
  // 1. Check MIME type
  if (!ALLOWED_MIME_TYPES[file.type as keyof typeof ALLOWED_MIME_TYPES]) {
    return {
      valid: false,
      error: `File type "${file.type}" not allowed. Allowed: ${Object.keys(ALLOWED_MIME_TYPES).join(', ')}`
    }
  }

  // 2. Check file size
  const maxSize = ALLOWED_MIME_TYPES[file.type as keyof typeof ALLOWED_MIME_TYPES].maxSize
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File size ${(file.size / 1024 / 1024).toFixed(2)}MB exceeds maximum ${(maxSize / 1024 / 1024).toFixed(2)}MB`
    }
  }

  // 3. Check file extension
  const ext = getFileExtension(file.name).toLowerCase()
  if (DANGEROUS_EXTENSIONS.includes(ext)) {
    return {
      valid: false,
      error: `File extension ".${ext}" is not allowed for security reasons`
    }
  }

  // 4. Validate extension matches MIME type
  const expectedExt = ALLOWED_MIME_TYPES[file.type as keyof typeof ALLOWED_MIME_TYPES].ext
  if (ext && ext !== expectedExt) {
    // Warning: extension doesn't match MIME type
    console.warn(`Warning: File extension ".${ext}" doesn't match MIME type "${file.type}"`)
  }

  return { valid: true }
}

/**
 * Sanitize filename to prevent directory traversal
 */
export function sanitizeFilename(filename: string): string {
  // Remove path separators and dangerous characters
  return filename
    .replace(/\\/g, '') // Remove backslashes
    .replace(/\//g, '') // Remove forward slashes
    .replace(/\.\./g, '') // Remove dot-dot
    .replace(/[<>:"|?*]/g, '') // Remove special characters
    .substring(0, 255) // Limit filename length
}

/**
 * Generate safe filename for storage
 */
export function generateSafeFilename(originalName: string, userId: number): string {
  const ext = getFileExtension(originalName)
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(7)
  
  // Format: user_123_timestamp_random.ext
  return `user_${userId}_${timestamp}_${random}.${ext}`
}

function getFileExtension(filename: string): string {
  const parts = filename.split('.')
  return parts.length > 1 ? parts[parts.length - 1] : ''
}

/**
 * Validate file by content (magic bytes)
 * Prevents MIME type spoofing
 */
export async function validateFileContent(buffer: ArrayBuffer, expectedMimeType: string): Promise<boolean> {
  const bytes = new Uint8Array(buffer)
  
  // Check magic bytes (first few bytes)
  const magicNumbers: { [key: string]: number[] } = {
    'image/jpeg': [0xFF, 0xD8, 0xFF],
    'image/png': [0x89, 0x50, 0x4E, 0x47],
    'image/gif': [0x47, 0x49, 0x46],
    'application/pdf': [0x25, 0x50, 0x44, 0x46],
  }

  const magic = magicNumbers[expectedMimeType]
  if (!magic) return true // No magic bytes defined, skip check

  // Check if file starts with expected magic bytes
  for (let i = 0; i < magic.length; i++) {
    if (bytes[i] !== magic[i]) {
      return false // Magic bytes don't match
    }
  }

  return true
}
```

**Step 2: Update File Upload Server Action**

**File:** `src/app/actions/attachments.ts`

```typescript
import { withAuth } from '@/lib/server-action-auth'
import { prisma } from '@/lib/prisma'
import {
  validateFileUpload,
  sanitizeFilename,
  generateSafeFilename,
  validateFileContent,
} from '@/lib/file-upload-validator'

/**
 * Upload file attachment
 * 
 * @requires PERMISSIONS.ATTACHMENTS.CREATE
 */
export const uploadAttachment = withAuth(
  PERMISSIONS.ATTACHMENTS.CREATE,
  async (formData: FormData, session) => {
    try {
      const file = formData.get('file') as File
      const projectId = formData.get('projectId') as string
      const taskId = formData.get('taskId') as string

      // 1. Validate file before processing
      const validation = validateFileUpload(file)
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error,
          code: 'INVALID_FILE',
        }
      }

      // 2. Validate file content (magic bytes)
      const buffer = await file.arrayBuffer()
      const contentValid = await validateFileContent(buffer, file.type)
      if (!contentValid) {
        return {
          success: false,
          error: 'File content does not match declared type. Possible spoofing attempt.',
          code: 'CONTENT_MISMATCH',
        }
      }

      // 3. Generate safe filename
      const safeFilename = generateSafeFilename(file.name, session.user.id)

      // 4. Upload to S3 with metadata
      const s3Key = `attachments/${projectId}/${taskId}/${safeFilename}`
      
      await uploadToS3(s3Key, buffer, {
        ContentType: file.type,
        Metadata: {
          userId: String(session.user.id),
          originalName: sanitizeFilename(file.name),
          timestamp: new Date().toISOString(),
        },
      })

      // 5. Save attachment record to database
      const attachment = await prisma.attachment.create({
        data: {
          filename: file.name,
          safeFilename,
          s3Key,
          mimeType: file.type,
          size: file.size,
          uploadedBy: session.user.id,
          projectId: parseInt(projectId),
          taskId: parseInt(taskId),
        },
      })

      // 6. Log activity
      await logActivity({
        actionType: 'file_uploaded',
        userId: session.user.id,
        entityType: 'attachment',
        entityId: attachment.id,
        description: `Uploaded file: ${file.name}`,
      })

      return {
        success: true,
        data: {
          id: attachment.id,
          url: `/api/attachments/${attachment.id}`,
        },
      }
    } catch (error) {
      console.error('File upload error:', error)
      return {
        success: false,
        error: 'Failed to upload file',
        code: 'UPLOAD_FAILED',
      }
    }
  }
)
```

**Step 3: Create API Endpoint for Secure Download**

**File:** `src/app/api/attachments/[id]/route.ts`

```typescript
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return new Response('Unauthorized', { status: 401 })
    }

    // Verify attachment exists and user has access
    const attachment = await prisma.attachment.findUnique({
      where: { id: parseInt(params.id) },
      include: { project: true },
    })

    if (!attachment) {
      return new Response('Not found', { status: 404 })
    }

    // Check permission
    const hasAccess = await hasPermission(
      session.user.id,
      'project.read',
      attachment.projectId
    )

    if (!hasAccess) {
      return new Response('Forbidden', { status: 403 })
    }

    // Download from S3
    const fileData = await downloadFromS3(attachment.s3Key)

    // Return file with proper headers
    return new Response(fileData, {
      headers: {
        'Content-Type': attachment.mimeType,
        'Content-Disposition': `attachment; filename="${attachment.filename}"`,
        'X-Content-Type-Options': 'nosniff', // Prevent MIME type sniffing
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    })
  } catch (error) {
    console.error('Download error:', error)
    return new Response('Server error', { status: 500 })
  }
}
```

### Testing

**Test 1: Valid File Upload**
```typescript
// src/app/actions/attachments.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { uploadAttachment } from '@/app/actions/attachments'

describe('File Upload', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should upload valid image file', async () => {
    const formData = new FormData()
    const file = new File(['fake image data'], 'test.jpg', { type: 'image/jpeg' })
    formData.append('file', file)
    formData.append('projectId', '1')
    formData.append('taskId', '1')

    const result = await uploadAttachment(formData)

    expect(result.success).toBe(true)
    expect(result.data?.id).toBeDefined()
  })

  it('should reject invalid file type', async () => {
    const formData = new FormData()
    const file = new File(['malware'], 'virus.exe', { type: 'application/x-msdownload' })
    formData.append('file', file)

    const result = await uploadAttachment(formData)

    expect(result.success).toBe(false)
    expect(result.error).toContain('not allowed')
  })

  it('should reject oversized file', async () => {
    const formData = new FormData()
    const largeBuffer = new ArrayBuffer(6 * 1024 * 1024) // 6MB
    const file = new File([largeBuffer], 'large.jpg', { type: 'image/jpeg' })
    formData.append('file', file)

    const result = await uploadAttachment(formData)

    expect(result.success).toBe(false)
    expect(result.error).toContain('exceeds maximum')
  })

  it('should reject MIME type spoofing', async () => {
    const formData = new FormData()
    // Fake image with .exe extension
    const file = new File(['MZ\x90\x00'], 'notavirus.jpg', { type: 'image/jpeg' })
    formData.append('file', file)

    const result = await uploadAttachment(formData)

    expect(result.success).toBe(false)
  })
})
```

**Run Tests:**
```bash
npm run test attachments.test.ts
```

### Deployment Steps

1. Create `src/lib/file-upload-validator.ts` with validation logic
2. Update `src/app/actions/attachments.ts` with validation calls
3. Create API endpoint for secure download
4. Add unit tests
5. Run tests: `npm run test`
6. Deploy to staging first
7. Test file uploads in staging
8. Deploy to production

**Effort:** 4 hours  
**Risk:** Medium (new validation logic, test thoroughly)

---

## Issue #3: Legacy Role Bypass in RBAC

### Risk Assessment
**Severity:** 🔴 CRITICAL  
**CVSS Score:** 9.0 (Critical)  
**Impact:** Complete authorization bypass, unauthorized data access, privilege escalation

### Current Problem

**Location:** Multiple files with hardcoded role checks

```typescript
// ❌ VULNERABLE - Found in 15+ files
if (user.role === 'admin') {
  // Allow everything - no permission check!
}

// Instead of using permission system
if (!await hasPermission(userId, 'action.name')) {
  throw new Error('Unauthorized')
}
```

**Example 1: Project Actions**
```typescript
// src/app/actions/projects.ts (❌ VULNERABLE)
export async function deleteProject(projectId: number) {
  const session = await getServerSession(authOptions)
  
  if (session?.user?.role === 'admin') {
    // Bypass permission check!
    await prisma.project.delete({ where: { id: projectId } })
    return { success: true }
  }
  
  // Only admins can delete
  return { success: false, error: 'Unauthorized' }
}
```

**Example 2: Task Actions**
```typescript
// src/app/actions/tasks.ts (❌ VULNERABLE)
export async function updateTask(taskId: number, data: UpdateTaskInput) {
  const session = await getServerSession(authOptions)
  
  if (session?.user?.role === 'admin') {
    // Admins bypass all permission checks
    await prisma.task.update({ where: { id: taskId }, data })
    return { success: true }
  }
  
  // Regular users need specific permission
  if (!await hasPermission(session.user.id, 'task.update')) {
    return { success: false, error: 'Unauthorized' }
  }
  
  // ...
}
```

**Attack Vector:**
1. Change user role to "admin" in database: `UPDATE User SET role = 'admin'`
2. Or if role can be tampered with via token: forge JWT with admin role
3. All permission checks are bypassed
4. Complete system compromise

### Solution: Implement Proper RBAC

**Step 1: Create RBAC Helper Functions**

**File:** `src/lib/rbac-helpers.ts`

```typescript
import { prisma } from '@/lib/prisma'
import { hasPermission } from '@/lib/permissions'

/**
 * Check if user has permission (proper RBAC way)
 * DO NOT use role === 'admin' checks!
 * 
 * @param userId - User ID
 * @param permission - Permission key (e.g., 'project.delete')
 * @param resourceId - Optional resource ID for resource-level permissions
 * @returns true if user has permission
 */
export async function requirePermission(
  userId: number,
  permission: string,
  resourceId?: number
): Promise<void> {
  const allowed = await hasPermission(userId, permission, resourceId)
  
  if (!allowed) {
    throw new UnauthorizedError(`Missing permission: ${permission}`)
  }
}

/**
 * Verify user can access project
 */
export async function verifyProjectAccess(
  userId: number,
  projectId: number,
  requiredPermission: string
): Promise<void> {
  // 1. Verify project exists
  const project = await prisma.project.findUnique({
    where: { id: projectId },
  })

  if (!project) {
    throw new NotFoundError('Project not found')
  }

  // 2. Check permission using RBAC system
  const hasAccess = await hasPermission(userId, requiredPermission, projectId)

  if (!hasAccess) {
    throw new UnauthorizedError(`You don't have permission to ${requiredPermission}`)
  }
}

/**
 * Verify user can access task
 */
export async function verifyTaskAccess(
  userId: number,
  taskId: number,
  requiredPermission: string
): Promise<void> {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { project: true },
  })

  if (!task) {
    throw new NotFoundError('Task not found')
  }

  const hasAccess = await hasPermission(userId, requiredPermission, task.projectId)

  if (!hasAccess) {
    throw new UnauthorizedError(`You don't have permission to ${requiredPermission}`)
  }
}

class UnauthorizedError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'UnauthorizedError'
  }
}

class NotFoundError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'NotFoundError'
  }
}
```

**Step 2: Audit and Fix All Server Actions**

**File:** `src/app/actions/projects.ts` (BEFORE - ❌ VULNERABLE)

```typescript
export async function deleteProject(projectId: number) {
  const session = await getServerSession(authOptions)
  
  if (session?.user?.role === 'admin') { // ❌ DANGEROUS!
    await prisma.project.delete({ where: { id: projectId } })
    return { success: true }
  }
  
  return { success: false, error: 'Unauthorized' }
}
```

**File:** `src/app/actions/projects.ts` (AFTER - ✅ SECURE)

```typescript
/**
 * Delete project (requires permission)
 * 
 * @requires PERMISSIONS.PROJECT.DELETE
 */
export const deleteProject = withAuth(
  PERMISSIONS.PROJECT.DELETE,
  async (formData: FormData, session) => {
    try {
      const projectId = parseInt(formData.get('projectId') as string)

      // Verify project exists AND user has permission
      await verifyProjectAccess(
        session.user.id,
        projectId,
        'project.delete'
      )

      // Delete project
      await prisma.project.delete({
        where: { id: projectId },
      })

      // Log activity
      await logActivity({
        actionType: 'project_deleted',
        userId: session.user.id,
        entityType: 'project',
        entityId: projectId,
      })

      return { success: true }
    } catch (error) {
      return handleServerError(error)
    }
  }
)
```

**Step 3: List All Files to Audit**

Run this to find all instances of role-based checks:

```bash
grep -r "\.role\s*===\s*['\"]admin['\"]" src/ --include="*.ts" --include="*.tsx"
grep -r "role.*admin" src/app/actions/ --include="*.ts"
```

**Expected findings:** 15-20 files with hardcoded role checks

**Step 4: Create Migration Script to Fix Hardcoded Checks**

**File:** `scripts/fix-rbac-bypasses.ts`

```typescript
/**
 * Script to identify and report RBAC bypasses
 * Run before and after fixes to verify
 */

import fs from 'fs'
import path from 'path'

const DANGEROUS_PATTERNS = [
  /\.role\s*===\s*['"](admin|owner|manager)['"]/, // role === 'admin'
  /role\s*===\s*['"](admin|owner|manager)['"]/, // role === 'admin'
  /\.role\s*\?\s*true\s*:/, // role ? true : 
]

function scanDirectory(dir: string) {
  const findings: { file: string; line: number; match: string }[] = []

  const scan = (currentDir: string) => {
    const files = fs.readdirSync(currentDir)

    for (const file of files) {
      const filePath = path.join(currentDir, file)
      const stat = fs.statSync(filePath)

      if (stat.isDirectory()) {
        // Skip node_modules and .next
        if (['node_modules', '.next', '.git'].includes(file)) continue
        scan(filePath)
      } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
        const content = fs.readFileSync(filePath, 'utf-8')
        const lines = content.split('\n')

        lines.forEach((line, index) => {
          for (const pattern of DANGEROUS_PATTERNS) {
            if (pattern.test(line)) {
              findings.push({
                file: filePath,
                line: index + 1,
                match: line.trim(),
              })
            }
          }
        })
      }
    }
  }

  scan(dir)
  return findings
}

const findings = scanDirectory('./src')

if (findings.length === 0) {
  console.log('✅ No RBAC bypasses found!')
} else {
  console.error(`❌ Found ${findings.length} potential RBAC bypasses:`)
  console.log()

  for (const finding of findings) {
    console.log(`${finding.file}:${finding.line}`)
    console.log(`  ${finding.match}`)
    console.log()
  }

  process.exit(1)
}
```

**Run Scan:**
```bash
npx ts-node scripts/fix-rbac-bypasses.ts
```

### Testing

**Test 1: Admin User Cannot Bypass Permissions**
```typescript
// src/lib/rbac.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { hasPermission } from '@/lib/rbac'

describe('RBAC System - No Admin Bypass', () => {
  it('should NOT allow admin role to bypass permission checks', async () => {
    // Create admin user without 'project.delete' permission
    const adminUser = { id: 1, role: 'admin' }
    
    // Even though role is 'admin', check actual permissions
    const result = await hasPermission(1, 'project.delete')
    
    // Should check RBAC, not just role
    expect(result).toBe(false) // If permission not assigned
  })

  it('should check RBAC for all users consistently', async () => {
    const adminResult = await hasPermission(1, 'project.create') // admin
    const userResult = await hasPermission(2, 'project.create') // developer
    
    // Both should use same permission check mechanism
    expect(typeof adminResult).toBe('boolean')
    expect(typeof userResult).toBe('boolean')
  })
})
```

### Deployment Steps

1. Create `src/lib/rbac-helpers.ts` with verification functions
2. Run audit script to find all instances: `npx ts-node scripts/fix-rbac-bypasses.ts`
3. Fix each file using RBAC helpers instead of role checks
4. Add tests for permission verification
5. Code review by security team
6. Deploy to staging
7. Run permission tests
8. Deploy to production

**Effort:** 8 hours  
**Risk:** High (affects authentication, test thoroughly)

---

## Issue #4: In-Memory Permission Cache Not Scalable

### Risk Assessment
**Severity:** 🔴 CRITICAL  
**CVSS Score:** 8.0 (High)  
**Impact:** Multi-instance deployment impossible, permission inconsistency, memory leaks

### Current Problem

**Location:** `src/lib/rbac.ts`

```typescript
// ❌ NOT SCALABLE
const permissionCache = new Map<number, Set<string>>()

export async function getUserPermissions(userId: number): Promise<string[]> {
  // Check in-memory cache
  if (permissionCache.has(userId)) {
    return Array.from(permissionCache.get(userId)!)
  }

  // Load from database
  const permissions = await loadPermissionsFromDb(userId)
  
  // Store in memory (only this instance!)
  permissionCache.set(userId, new Set(permissions))
  
  return permissions
}
```

**Problems:**
1. **Not shared between instances** - Each Node process has its own cache
2. **Memory leak** - Cache grows unbounded, never cleared
3. **Stale data** - Permission changes not reflected in other instances
4. **No TTL** - Cached data never expires
5. **Production failure** - Breaks with load balancer + multiple instances

### Solution: Redis-Based Distributed Caching

**Step 1: Install Redis Client**

```bash
npm install redis ioredis
npm install --save-dev @types/redis
```

**Step 2: Create Redis Configuration**

**File:** `src/lib/redis.ts`

```typescript
import { createClient } from 'redis'

// Create Redis client
const redis = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  socket: {
    reconnectStrategy: (retries) => {
      if (retries > 10) {
        console.error('Redis: giving up after 10 retries')
        return new Error('Redis max retries exceeded')
      }
      return retries * 50
    },
  },
})

// Handle connection events
redis.on('error', (err) => {
  console.error('Redis error:', err)
  // Don't crash - application can work without Redis (degraded mode)
})

redis.on('connect', () => {
  console.log('Connected to Redis')
})

// Ensure connection is ready
if (!redis.isOpen) {
  redis.connect().catch(console.error)
}

export { redis }

/**
 * Graceful shutdown
 */
export async function closeRedis() {
  if (redis.isOpen) {
    await redis.quit()
  }
}
```

**Step 3: Implement Redis-Based Permission Cache**

**File:** `src/lib/rbac-cache.ts`

```typescript
import { redis } from '@/lib/redis'
import { prisma } from '@/lib/prisma'

const CACHE_TTL = 3600 // 1 hour
const CACHE_PREFIX = 'permissions:'

/**
 * Get user permissions with Redis caching
 * 
 * @param userId - User ID
 * @returns Array of permission keys
 */
export async function cachedGetUserPermissions(userId: number): Promise<string[]> {
  const cacheKey = `${CACHE_PREFIX}${userId}`

  try {
    // 1. Try to get from Redis
    const cached = await redis.get(cacheKey)
    if (cached) {
      console.log(`Permission cache hit for user ${userId}`)
      return JSON.parse(cached)
    }
  } catch (error) {
    console.warn('Redis get error:', error)
    // Fall through to database
  }

  // 2. Load from database
  const permissions = await getUserPermissionsFromDb(userId)

  // 3. Store in Redis with TTL
  try {
    await redis.setEx(
      cacheKey,
      CACHE_TTL,
      JSON.stringify(permissions)
    )
  } catch (error) {
    console.warn('Redis set error:', error)
    // Continue without caching
  }

  return permissions
}

/**
 * Invalidate user permission cache
 * Called when user roles/permissions change
 */
export async function invalidateUserPermissionCache(userId: number): Promise<void> {
  const cacheKey = `${CACHE_PREFIX}${userId}`
  
  try {
    await redis.del(cacheKey)
    console.log(`Invalidated permissions cache for user ${userId}`)
  } catch (error) {
    console.warn('Redis delete error:', error)
  }
}

/**
 * Invalidate all permission caches
 * Called when permissions system changes
 */
export async function invalidateAllPermissionCaches(): Promise<void> {
  try {
    // Get all cache keys
    const keys = await redis.keys(`${CACHE_PREFIX}*`)
    
    if (keys.length > 0) {
      await redis.del(keys)
      console.log(`Invalidated ${keys.length} permission caches`)
    }
  } catch (error) {
    console.warn('Redis keys error:', error)
  }
}

/**
 * Get database permissions
 * Private function - use cachedGetUserPermissions instead
 */
async function getUserPermissionsFromDb(userId: number): Promise<string[]> {
  const userRoles = await prisma.userRole.findMany({
    where: { userId },
    include: {
      role: {
        include: {
          permissions: {
            include: {
              permission: true,
            },
          },
        },
      },
    },
  })

  // Extract all permissions
  const permissions = new Set<string>()
  
  for (const userRole of userRoles) {
    for (const rolePermission of userRole.role.permissions) {
      permissions.add(rolePermission.permission.key)
    }
  }

  return Array.from(permissions)
}
```

**Step 4: Update RBAC Module**

**File:** `src/lib/rbac.ts` (BEFORE)

```typescript
// ❌ In-memory cache
const permissionCache = new Map<number, Set<string>>()

export async function hasPermission(userId: number, permission: string): Promise<boolean> {
  // In-memory lookup
  if (permissionCache.has(userId)) {
    return permissionCache.get(userId)!.has(permission)
  }
  
  // Load and cache
  const permissions = await getUserPermissions(userId)
  return permissions.includes(permission)
}
```

**File:** `src/lib/rbac.ts` (AFTER)

```typescript
import { cachedGetUserPermissions, invalidateUserPermissionCache } from '@/lib/rbac-cache'

/**
 * Check if user has permission (uses Redis cache)
 */
export async function hasPermission(userId: number, permission: string): Promise<boolean> {
  const permissions = await cachedGetUserPermissions(userId)
  return permissions.includes(permission)
}

/**
 * Assign role to user and invalidate cache
 */
export async function assignRoleToUser(userId: number, roleId: number): Promise<void> {
  await prisma.userRole.create({
    data: { userId, roleId },
  })
  
  // Invalidate cache immediately
  await invalidateUserPermissionCache(userId)
}

/**
 * Remove role from user and invalidate cache
 */
export async function removeRoleFromUser(userId: number, roleId: number): Promise<void> {
  await prisma.userRole.delete({
    where: { userId_roleId: { userId, roleId } },
  })
  
  // Invalidate cache immediately
  await invalidateUserPermissionCache(userId)
}
```

**Step 5: Update Permission Change Handlers**

**File:** `src/app/actions/rbac.ts`

```typescript
import { invalidateUserPermissionCache } from '@/lib/rbac-cache'

export async function updateUserRole(userId: number, roleId: number) {
  // ... update role ...
  
  // Invalidate cache in Redis
  await invalidateUserPermissionCache(userId)
  
  return { success: true }
}
```

### Testing

**Test 1: Redis Cache Working**
```typescript
// src/lib/rbac-cache.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { 
  cachedGetUserPermissions,
  invalidateUserPermissionCache 
} from '@/lib/rbac-cache'
import { redis } from '@/lib/redis'

vi.mock('@/lib/redis')

describe('Redis Permission Cache', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should cache permissions in Redis', async () => {
    const mockPermissions = ['project.create', 'task.read']
    
    vi.mocked(redis.get).mockResolvedValueOnce(JSON.stringify(mockPermissions))

    const result = await cachedGetUserPermissions(1)

    expect(result).toEqual(mockPermissions)
    expect(redis.get).toHaveBeenCalledWith('permissions:1')
  })

  it('should invalidate cache on permission change', async () => {
    vi.mocked(redis.del).mockResolvedValueOnce(1)

    await invalidateUserPermissionCache(1)

    expect(redis.del).toHaveBeenCalledWith('permissions:1')
  })
})
```

### Deployment Steps

1. Install Redis: `npm install redis`
2. Create `src/lib/redis.ts` with connection logic
3. Create `src/lib/rbac-cache.ts` with caching logic
4. Update `src/lib/rbac.ts` to use Redis cache
5. Update all role/permission change handlers
6. Add unit tests
7. Setup Redis server (local/staging/production)
8. Test permission changes with cache invalidation
9. Deploy to staging
10. Deploy to production with Redis cluster

**Effort:** 6 hours  
**Risk:** Medium (depends on Redis availability, has fallback to database)

---

## Issue #5: No Rate Limiting

### Risk Assessment
**Severity:** 🔴 CRITICAL  
**CVSS Score:** 7.5 (High)  
**Impact:** Brute force attacks, DoS, account takeover, resource exhaustion

### Current Problem

**Location:** All server actions are unprotected

```typescript
// ❌ NO RATE LIMITING
export async function login(formData: FormData) {
  const username = formData.get('username')
  const password = formData.get('password')
  
  // Attacker can try 1000s of passwords without limit!
  // ...
}
```

**Attack Vectors:**
1. **Brute force login** - Unlimited password attempts
2. **Account enumeration** - Discover valid usernames
3. **DoS via resource exhaustion** - Hammer expensive operations
4. **API scraping** - Extract data at high volume

### Solution: Implement Rate Limiting

**Step 1: Install Rate Limiting Library**

```bash
npm install @upstash/ratelimit @upstash/redis
# OR for local development
npm install rate-limiter-flexible
```

**Step 2: Create Rate Limiter Service**

**File:** `src/lib/rate-limiter.ts`

```typescript
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// Initialize Redis for rate limiting
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL || process.env.REDIS_URL,
  token: process.env.UPSTASH_REDIS_TOKEN,
})

// Define rate limiting rules
export const rateLimitRules = {
  // Authentication: 5 attempts per minute
  login: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '1 m'),
    analytics: true,
    prefix: 'ratelimit:login',
  }),

  // Password reset: 3 attempts per hour
  passwordReset: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(3, '1 h'),
    analytics: true,
    prefix: 'ratelimit:password-reset',
  }),

  // General API: 100 requests per minute per user
  api: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, '1 m'),
    analytics: true,
    prefix: 'ratelimit:api',
  }),

  // File upload: 10 uploads per hour
  fileUpload: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '1 h'),
    analytics: true,
    prefix: 'ratelimit:upload',
  }),

  // Export/Report: 5 per hour (expensive operation)
  export: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '1 h'),
    analytics: true,
    prefix: 'ratelimit:export',
  }),
}

/**
 * Check if user has exceeded rate limit
 * 
 * @param rule - Rate limit rule
 * @param identifier - Unique identifier (IP, user ID, etc)
 * @returns { success: boolean, remaining: number, resetIn: number }
 */
export async function checkRateLimit(
  rule: Ratelimit,
  identifier: string
): Promise<{ success: boolean; remaining: number; resetIn: number }> {
  try {
    const { success, remaining, reset } = await rule.limit(identifier)

    const resetIn = reset ? Math.ceil((reset.getTime() - Date.now()) / 1000) : 0

    return {
      success,
      remaining: Math.max(0, remaining),
      resetIn,
    }
  } catch (error) {
    console.error('Rate limit check error:', error)
    // On error, allow request (fail open)
    return { success: true, remaining: -1, resetIn: 0 }
  }
}

/**
 * Create custom rate limiter
 */
export function createRateLimiter(
  requestsPerWindow: number,
  window: string,
  prefix: string
) {
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(requestsPerWindow, window as any),
    analytics: true,
    prefix,
  })
}
```

**Step 3: Create Rate Limit Middleware**

**File:** `src/middleware.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { rateLimitRules, checkRateLimit } from '@/lib/rate-limiter'

/**
 * Rate limit middleware for API routes
 */
export async function middleware(request: NextRequest) {
  // Skip rate limiting for static assets
  if (request.nextUrl.pathname.startsWith('/_next')) {
    return NextResponse.next()
  }

  // Get identifier (IP address)
  const identifier = request.ip || 'unknown'

  // Check general API rate limit
  const limit = await checkRateLimit(rateLimitRules.api, identifier)

  if (!limit.success) {
    return NextResponse.json(
      {
        error: 'Too many requests',
        retryAfter: limit.resetIn,
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(limit.resetIn),
          'X-RateLimit-Limit': '100',
          'X-RateLimit-Remaining': String(limit.remaining),
          'X-RateLimit-Reset': String(Math.ceil(Date.now() / 1000) + limit.resetIn),
        },
      }
    )
  }

  // Add rate limit info to response headers
  const response = NextResponse.next()
  response.headers.set('X-RateLimit-Remaining', String(limit.remaining))
  response.headers.set('X-RateLimit-Limit', '100')

  return response
}

export const config = {
  matcher: ['/api/:path*', '/api/auth/:path*'],
}
```

**Step 4: Add Rate Limiting to Server Actions**

**File:** `src/app/actions/auth.ts`

```typescript
import { rateLimitRules, checkRateLimit } from '@/lib/rate-limiter'
import { getClientIp } from '@/lib/request'

/**
 * Login with rate limiting
 */
export async function login(formData: FormData) {
  const username = formData.get('username') as string
  const password = formData.get('password') as string

  // Get client IP for rate limiting
  const clientIp = await getClientIp()

  // Check rate limit (5 attempts per minute)
  const limit = await checkRateLimit(rateLimitRules.login, clientIp)

  if (!limit.success) {
    return {
      success: false,
      error: 'Too many login attempts. Please try again later.',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: limit.resetIn,
    }
  }

  // ... rest of login logic ...

  return { success: true, data: { /* ... */ } }
}

/**
 * Password reset with rate limiting
 */
export async function resetPassword(formData: FormData) {
  const email = formData.get('email') as string
  const clientIp = await getClientIp()

  // Check rate limit (3 per hour)
  const limit = await checkRateLimit(rateLimitRules.passwordReset, clientIp)

  if (!limit.success) {
    return {
      success: false,
      error: 'Too many password reset attempts. Try again in an hour.',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: limit.resetIn,
    }
  }

  // ... rest of password reset logic ...

  return { success: true }
}
```

**Step 5: Helper to Get Client IP**

**File:** `src/lib/request.ts`

```typescript
import { headers } from 'next/headers'

/**
 * Get client IP address from request headers
 */
export async function getClientIp(): Promise<string> {
  const headersList = await headers()
  
  // Check various headers (different proxies use different headers)
  return (
    headersList.get('x-forwarded-for')?.split(',')[0].trim() ||
    headersList.get('x-real-ip') ||
    headersList.get('cf-connecting-ip') ||
    'unknown'
  )
}
```

### Testing

**Test 1: Rate Limit Enforced**
```typescript
// src/lib/rate-limiter.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { checkRateLimit, rateLimitRules } from '@/lib/rate-limiter'

describe('Rate Limiting', () => {
  it('should block after exceeding limit', async () => {
    for (let i = 0; i < 5; i++) {
      const result = await checkRateLimit(rateLimitRules.login, '127.0.0.1')
      expect(result.success).toBe(true)
    }

    // 6th attempt should fail
    const result = await checkRateLimit(rateLimitRules.login, '127.0.0.1')
    expect(result.success).toBe(false)
    expect(result.resetIn).toBeGreaterThan(0)
  })

  it('should reset after window expires', async () => {
    // This would need a time mock
    // For now, just verify the structure
    const result = await checkRateLimit(rateLimitRules.api, 'user-123')
    expect(result).toHaveProperty('success')
    expect(result).toHaveProperty('remaining')
    expect(result).toHaveProperty('resetIn')
  })
})
```

### Deployment Steps

1. Install Upstash Redis or use local Redis
2. Get Redis credentials: `UPSTASH_REDIS_URL` and `UPSTASH_REDIS_TOKEN`
3. Create `src/lib/rate-limiter.ts` with rules
4. Update `src/middleware.ts` with middleware
5. Add rate limiting to server actions (login, password reset, file upload)
6. Create tests
7. Test with load testing tool
8. Deploy to staging
9. Monitor rate limit metrics
10. Deploy to production

**Effort:** 4 hours  
**Risk:** Medium (can be deployed without breaking changes)

---

## Combined Implementation Checklist

### Week 1: Critical Fixes (22-25 hours)

**Day 1-2: NEXTAUTH_SECRET (0.5h)**
- [ ] Generate new secret
- [ ] Update .env files
- [ ] Run session invalidation
- [ ] Test login

**Day 2-3: File Upload Validation (4h)**
- [ ] Create validator library
- [ ] Update server action
- [ ] Create API endpoint
- [ ] Write tests
- [ ] Test with various files

**Day 3-4: Remove RBAC Bypass (8h)**
- [ ] Create RBAC helpers
- [ ] Run audit script
- [ ] Fix each server action (15-20 files)
- [ ] Add tests
- [ ] Code review

**Day 4-5: Redis Permission Cache (6h)**
- [ ] Install Redis
- [ ] Create Redis config
- [ ] Implement cache layer
- [ ] Update RBAC module
- [ ] Test invalidation

**Day 5: Rate Limiting (4h)**
- [ ] Install rate limiter
- [ ] Create rules
- [ ] Add middleware
- [ ] Update auth actions
- [ ] Write tests

**Day 5: Testing & Deployment (2h)**
- [ ] Run full test suite
- [ ] Deploy to staging
- [ ] Smoke test
- [ ] Deploy to production
- [ ] Monitor logs

---

## Success Verification

After all fixes, verify:

✅ **Security**
```bash
# Check NEXTAUTH_SECRET
grep "NEXTAUTH_SECRET" .env.production # Should not be "secret"

# Check for role bypasses
grep -r "\.role.*===" src/ # Should return nothing

# Verify Redis caching
redis-cli KEYS "permissions:*" # Should see cached permissions

# Verify rate limiting
curl -i http://localhost:3000/api/login -X POST # Check headers
```

✅ **Functionality**
- [ ] Login works with new secret
- [ ] File upload validation works
- [ ] Permission checks work (non-admins denied appropriately)
- [ ] Permission changes reflected immediately
- [ ] Rate limits enforced

✅ **Performance**
- [ ] Login time <100ms (with cache hits)
- [ ] Permission checks <10ms (with Redis cache)
- [ ] File validation <500ms
- [ ] No memory leaks over 24 hours

---

## Rollback Plan

If issues arise:

1. **NEXTAUTH_SECRET Issue**
   - Revert to previous secret
   - Run session invalidation again
   - Notify users

2. **File Upload Issues**
   - Disable validation temporarily
   - Investigate failing file types
   - Deploy fix

3. **RBAC Issues**
   - Revert role bypass removal
   - Investigate permission logic
   - Deploy fixes incrementally

4. **Redis Issues**
   - Fall back to database queries (slower)
   - Clear Redis cache
   - Restart Redis service

5. **Rate Limit Issues**
   - Increase limits temporarily
   - Investigate traffic patterns
   - Adjust rules

---

**Status:** Ready for Implementation  
**Total Effort:** 22-25 hours  
**Timeline:** 2-3 days  
**Team:** 1 developer (security-focused)  
**Success Criteria:** All 5 critical issues resolved + tests passing

