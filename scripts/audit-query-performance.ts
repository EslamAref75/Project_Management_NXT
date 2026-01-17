/**
 * Query Performance Audit Tool
 * Identifies N+1 queries, missing select clauses, and candidates for indices
 * 
 * Usage: npx ts-node scripts/audit-query-performance.ts
 */

import fs from "fs"
import path from "path"

interface QueryIssue {
  file: string
  line: number
  type: "N+1" | "MISSING_SELECT" | "MISSING_INDEX" | "INEFFICIENT_QUERY"
  severity: "CRITICAL" | "HIGH" | "MEDIUM"
  description: string
  suggestion: string
}

const issues: QueryIssue[] = []

// Patterns to detect performance issues
const patterns = {
  // N+1 Query Patterns - findMany inside loops
  n1Queries: [
    /await\s+prisma\.\w+\.findMany\([^)]*\)\s*(?:\.then|(?=\n\s*(?:const|let|var)\s+\w+\s*=))/g,
    /for\s*\(\s*(?:const|let|var)\s+\w+.*?\)\s*{[\s\S]*?await\s+prisma\./g,
    /\.map\s*\(\s*async\s*\([^)]*\)\s*=>\s*[\s\S]*?prisma\./g,
  ],
  
  // Missing select clauses
  missingSelect: [
    /await\s+prisma\.\w+\.findMany\(\s*{\s*(?!select)[^}]*}\s*\)/g,
    /await\s+prisma\.\w+\.findUnique\(\s*{\s*(?!select)[^}]*}\s*\)/g,
    /await\s+prisma\.\w+\.findFirst\(\s*{\s*(?!select)[^}]*}\s*\)/g,
  ],

  // Queries filtering on non-indexed fields
  commonFilterFields: [
    /where:\s*{[^}]*(?:status|priority|role|createdAt|updatedAt|isActive)[^}]*}/g,
  ],

  // Include queries (potential N+1)
  nestedInclude: [
    /include:\s*{\s*\w+:\s*{[^}]+include:/g,
  ],
}

function scanFile(filePath: string, content: string): void {
  const lines = content.split("\n")
  const dirName = path.dirname(filePath).replace(/\\/g, "/")
  const fileName = path.basename(filePath)

  // Skip non-action files
  if (!fileName.endsWith(".ts") || fileName.includes(".test.") || fileName.includes(".spec.")) {
    return
  }

  // Check for N+1 patterns
  let lineNum = 1
  for (const line of lines) {
    // N+1 Query detection
    if (
      line.includes("prisma.") &&
      line.includes("findMany") &&
      !line.includes("select:")
    ) {
      const prevLines = lines.slice(Math.max(0, lineNum - 5), lineNum).join("\n")
      
      if (
        prevLines.includes(".map(") ||
        prevLines.includes("for (") ||
        prevLines.includes("forEach(")
      ) {
        issues.push({
          file: filePath,
          line: lineNum,
          type: "N+1",
          severity: "CRITICAL",
          description: `Potential N+1 query: ${line.trim().substring(0, 60)}...`,
          suggestion: "Combine into single query or use batch loading",
        })
      }
    }

    // Missing select detection
    if (
      line.includes("prisma.") &&
      (line.includes("findMany") || line.includes("findUnique") || line.includes("findFirst")) &&
      line.includes("where:") &&
      !line.includes("select:")
    ) {
      const nextLines = lines.slice(lineNum, Math.min(lines.length, lineNum + 10)).join("\n")
      if (!nextLines.includes("select:") && !nextLines.includes("include:")) {
        issues.push({
          file: filePath,
          line: lineNum,
          type: "MISSING_SELECT",
          severity: "HIGH",
          description: `Missing select clause: ${line.trim().substring(0, 60)}...`,
          suggestion: "Add select: { field1: true, field2: true } to reduce data transfer",
        })
      }
    }

    // Complex includes (potential performance issue)
    if (line.includes("include:") && line.includes("include:") && line.split("include:").length > 2) {
      issues.push({
        file: filePath,
        line: lineNum,
        type: "INEFFICIENT_QUERY",
        severity: "HIGH",
        description: `Nested includes (deeply nested relationships): ${line.trim().substring(0, 60)}...`,
        suggestion: "Consider separate queries or use select instead of include for deep nesting",
      })
    }

    // Missing index indicators - WHERE clauses on common fields
    if (line.includes("where:") && line.includes("{")) {
      const whereClause = line.substring(line.indexOf("where:"))
      if (
        whereClause.includes("userId") ||
        whereClause.includes("projectId") ||
        whereClause.includes("status") ||
        whereClause.includes("createdAt")
      ) {
        issues.push({
          file: filePath,
          line: lineNum,
          type: "MISSING_INDEX",
          severity: "MEDIUM",
          description: `Query filters on common field: ${line.trim().substring(0, 60)}...`,
          suggestion: "Verify index exists on filtered field in Prisma schema",
        })
      }
    }

    lineNum++
  }
}

function scanDirectory(dirPath: string): void {
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name)

      if (entry.name.startsWith(".") || ["node_modules", "dist", "build", ".next"].includes(entry.name)) {
        continue
      }

      if (entry.isDirectory()) {
        scanDirectory(fullPath)
      } else if (entry.isFile() && (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx"))) {
        if (entry.name.includes("action") || entry.name.includes("route")) {
          const content = fs.readFileSync(fullPath, "utf-8")
          scanFile(fullPath, content)
        }
      }
    }
  } catch (error) {
    console.error(`Error scanning ${dirPath}:`, error)
  }
}

// Main execution
console.log("🔍 Database Query Performance Audit")
console.log("=".repeat(70))
console.log()

scanDirectory("./src")

if (issues.length === 0) {
  console.log("✅ No obvious query performance issues detected!")
  console.log()
  console.log("However, you should still:")
  console.log("  1. Review ARCHITECTURE_PERFORMANCE_REPORT.md for specific findings")
  console.log("  2. Run database query analyzer on production data")
  console.log("  3. Use Prisma's query optimizer: npx prisma validate")
  console.log("  4. Check database logs for slow queries")
} else {
  // Group by severity
  const critical = issues.filter((i) => i.severity === "CRITICAL")
  const high = issues.filter((i) => i.severity === "HIGH")
  const medium = issues.filter((i) => i.severity === "MEDIUM")

  console.log(`Found ${issues.length} potential issues:\n`)

  if (critical.length > 0) {
    console.log(`🔴 CRITICAL (${critical.length}):`)
    critical.forEach((issue, idx) => {
      console.log(`  ${idx + 1}. ${issue.file}:${issue.line}`)
      console.log(`     ${issue.description}`)
      console.log(`     → ${issue.suggestion}`)
      console.log()
    })
  }

  if (high.length > 0) {
    console.log(`🟠 HIGH (${high.length}):`)
    high.forEach((issue, idx) => {
      console.log(`  ${idx + 1}. ${issue.file}:${issue.line}`)
      console.log(`     ${issue.description}`)
      console.log(`     → ${issue.suggestion}`)
      console.log()
    })
  }

  if (medium.length > 0) {
    console.log(`🟡 MEDIUM (${medium.length}):`)
    medium.slice(0, 5).forEach((issue, idx) => {
      console.log(`  ${idx + 1}. ${issue.file}:${issue.line}`)
      console.log(`     ${issue.description}`)
      console.log()
    })
    if (medium.length > 5) {
      console.log(`  ... and ${medium.length - 5} more medium issues`)
    }
  }
}

console.log()
console.log("=".repeat(70))
console.log("📊 Next Steps:")
console.log("  1. Review specific files flagged above")
console.log("  2. Read ARCHITECTURE_PERFORMANCE_REPORT.md for detailed analysis")
console.log("  3. Add select clauses to high-impact queries")
console.log("  4. Combine N+1 patterns into batch queries")
console.log("  5. Create database migration for missing indices")
console.log()
