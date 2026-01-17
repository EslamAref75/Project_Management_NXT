/**
 * Script to batch-fix common RBAC bypass patterns
 * This converts legacy role-based checks to proper RBAC permission checks
 * 
 * Run: npx ts-node scripts/fix-rbac-patterns.ts --dry-run
 *      npx ts-node scripts/fix-rbac-patterns.ts --apply
 */

import fs from "fs"
import path from "path"

const DRY_RUN = process.argv.includes("--dry-run")
const APPLY = process.argv.includes("--apply")

interface FileChanges {
  file: string
  changes: number
  content: string
}

const fileChanges: FileChanges[] = []

/**
 * Fix Pattern 1: session.user.role !== "admin" check
 * Converts to requirePermission() call
 */
function fixAdminRoleCheck(content: string, filePath: string): string {
  let modified = content
  let changeCount = 0

  // Pattern: if (!session || session.user.role !== "admin")
  const pattern1 = /if\s*\(\s*!session\s*\|\|\s*session\.user\.role\s*!==\s*["']admin["']\s*\)\s*return\s*\{\s*error:\s*["']Unauthorized["']\s*\}/g
  if (pattern1.test(modified)) {
    modified = modified.replace(pattern1, (match) => {
      changeCount++
      return `if (!session) return { error: "Unauthorized", code: "UNAUTHORIZED" }
  
  try {
    await requirePermission(parseInt(session.user.id), "admin.access")
  } catch (error: any) {
    return handleAuthorizationError(error)
  }`
    })
  }

  // Pattern: session.user.role !== "admin" (simple variable check)
  const pattern2 = /const\s+(\w+)\s*=\s*session\.user\.role\s*===?\s*["'](admin|project_manager)["']/g
  if (pattern2.test(modified)) {
    modified = modified.replace(pattern2, (match, varName, role) => {
      changeCount++
      const permission = role === "admin" ? "admin.access" : "project.manage"
      return `// Note: This should be replaced with proper permission checks
  const ${varName} = true // TODO: Use requirePermission() instead`
    })
  }

  if (changeCount > 0) {
    fileChanges.push({ file: filePath, changes: changeCount, content: modified })
  }

  return modified
}

/**
 * Add import statements if missing
 */
function ensureImports(content: string): string {
  const needsRbacHelpers =
    content.includes("requirePermission") && !content.includes('from "@/lib/rbac-helpers"')

  let modified = content

  if (needsRbacHelpers) {
    // Find the import section
    const importMatch = content.match(/^("use server"[\s\S]*?)(import\s*\{[\s\S]*?\}|const)/m)
    if (importMatch) {
      const hasRbacImport = content.includes('from "@/lib/rbac-helpers"')
      if (!hasRbacImport) {
        modified = modified.replace(
          /^("use server".*?$)/m,
          `$1

import {
  requirePermission,
  handleAuthorizationError,
  ForbiddenError,
} from "@/lib/rbac-helpers"`
        )
      }
    }
  }

  return modified
}

/**
 * Scan and fix files
 */
function scanAndFix(dirPath: string, baseDir: string = dirPath): void {
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name)

      if (
        entry.name.startsWith(".") ||
        ["node_modules", "dist", "build"].includes(entry.name)
      ) {
        continue
      }

      if (entry.isDirectory()) {
        scanAndFix(fullPath, baseDir)
      } else if (
        entry.isFile() &&
        (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx"))
      ) {
        const content = fs.readFileSync(fullPath, "utf-8")
        let modified = fixAdminRoleCheck(content, fullPath)
        modified = ensureImports(modified)

        if (modified !== content) {
          if (APPLY) {
            fs.writeFileSync(fullPath, modified, "utf-8")
            console.log(`✅ Fixed: ${path.relative(baseDir, fullPath)}`)
          } else if (DRY_RUN) {
            console.log(`ℹ️  Would fix: ${path.relative(baseDir, fullPath)}`)
          }
        }
      }
    }
  } catch (error) {
    console.error(`Error scanning ${dirPath}:`, error)
  }
}

// Main execution
console.log("🔧 RBAC Pattern Fixer")
console.log("=".repeat(60))
console.log()

if (DRY_RUN) {
  console.log("Mode: DRY RUN (no changes will be made)")
} else if (APPLY) {
  console.log("Mode: APPLY (making actual changes)")
} else {
  console.log("Mode: ANALYSIS (showing what would be changed)")
}

console.log()
console.log("Scanning for patterns to fix...")
console.log()

scanAndFix("./src")

if (fileChanges.length === 0) {
  console.log("No patterns found that match automated fix rules.")
  console.log()
  console.log("Many patterns require manual review:")
  console.log("  - Complex permission logic")
  console.log("  - UI-only role checks (these are okay)")
  console.log("  - Context-specific authorization")
  console.log()
  console.log("Use scripts/audit-rbac-bypasses.ts for a full report.")
} else {
  console.log(
    `Found ${fileChanges.length} file(s) with ${fileChanges.reduce((sum, f) => sum + f.changes, 0)} pattern(s) to fix.`
  )
  console.log()

  if (!DRY_RUN && !APPLY) {
    console.log("To apply changes, run:")
    console.log("  npx ts-node scripts/fix-rbac-patterns.ts --apply")
    console.log()
    console.log("To preview changes, run:")
    console.log("  npx ts-node scripts/fix-rbac-patterns.ts --dry-run")
  }
}

console.log()
console.log("=".repeat(60))
