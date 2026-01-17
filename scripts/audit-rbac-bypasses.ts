/**
 * Audit script to find RBAC bypasses and role-based authorization checks
 * 
 * This script identifies all instances where:
 * 1. Code checks user.role directly (role === 'admin')
 * 2. Code uses role-based bypasses instead of permission checks
 * 3. Code uses deprecated hasPermissionOrRole function
 * 
 * Run: npx ts-node scripts/audit-rbac-bypasses.ts
 */

import fs from "fs"
import path from "path"

interface Finding {
  file: string
  line: number
  type: string
  match: string
  severity: "critical" | "high" | "medium"
}

// Patterns that indicate RBAC bypasses
const BYPASS_PATTERNS = [
  {
    name: "Direct role check",
    pattern: /\.role\s*===?\s*['"](\w+)['"]/i,
    severity: "critical" as const,
  },
  {
    name: "Role comparison without permission check",
    pattern: /if\s*\(\s*(?:session\.user\.)?role\s*===?\s*['"](\w+)['"]\s*\)/i,
    severity: "critical" as const,
  },
  {
    name: "Admin bypass (user?.role = admin)",
    pattern: /user\?.?role\s*===?\s*['"]admin['"]/i,
    severity: "critical" as const,
  },
  {
    name: "hasPermissionOrRole function (deprecated)",
    pattern: /hasPermissionOrRole\s*\(/i,
    severity: "high" as const,
  },
  {
    name: "Role-based ternary (role ? true :)",
    pattern: /\.role\s*\?\s*true\s*:/i,
    severity: "high" as const,
  },
  {
    name: "Admin check without permission",
    pattern: /isAdmin\s*&&\s*(?!hasPermission|requirePermission)/i,
    severity: "medium" as const,
  },
]

/**
 * Scan a directory for RBAC bypass patterns
 */
function scanDirectory(dirPath: string, baseDir: string = dirPath): Finding[] {
  const findings: Finding[] = []

  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name)

      // Skip node_modules, .next, .git, etc
      if (
        entry.name.startsWith(".") ||
        ["node_modules", "dist", "build"].includes(entry.name)
      ) {
        continue
      }

      if (entry.isDirectory()) {
        findings.push(...scanDirectory(fullPath, baseDir))
      } else if (entry.isFile() && (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx"))) {
        const content = fs.readFileSync(fullPath, "utf-8")
        const lines = content.split("\n")
        const relPath = path.relative(baseDir, fullPath)

        lines.forEach((line, index) => {
          for (const patternDef of BYPASS_PATTERNS) {
            if (patternDef.pattern.test(line)) {
              // Skip comments and deprecated markers
              if (line.includes("@deprecated") || line.includes("// DEPRECATED")) {
                continue
              }

              findings.push({
                file: relPath,
                line: index + 1,
                type: patternDef.name,
                match: line.trim(),
                severity: patternDef.severity,
              })
            }
          }
        })
      }
    }
  } catch (error) {
    console.error(`Error scanning ${dirPath}:`, error)
  }

  return findings
}

/**
 * Print findings in a readable format
 */
function printFindings(findings: Finding[]): void {
  if (findings.length === 0) {
    console.log("✅ No RBAC bypasses found!\n")
    return
  }

  // Group by severity
  const critical = findings.filter((f) => f.severity === "critical")
  const high = findings.filter((f) => f.severity === "high")
  const medium = findings.filter((f) => f.severity === "medium")

  console.log(`\n⚠️  Found ${findings.length} potential RBAC bypass issues:\n`)

  if (critical.length > 0) {
    console.log(`🔴 CRITICAL (${critical.length}):\n`)
    critical.forEach((finding) => {
      console.log(`  ${finding.file}:${finding.line}`)
      console.log(`     Type: ${finding.type}`)
      console.log(`     ${finding.match}`)
      console.log()
    })
  }

  if (high.length > 0) {
    console.log(`🟠 HIGH (${high.length}):\n`)
    high.forEach((finding) => {
      console.log(`  ${finding.file}:${finding.line}`)
      console.log(`     Type: ${finding.type}`)
      console.log(`     ${finding.match}`)
      console.log()
    })
  }

  if (medium.length > 0) {
    console.log(`🟡 MEDIUM (${medium.length}):\n`)
    medium.slice(0, 5).forEach((finding) => {
      console.log(`  ${finding.file}:${finding.line}`)
      console.log(`     Type: ${finding.type}`)
      console.log(`     ${finding.match}`)
      console.log()
    })
    if (medium.length > 5) {
      console.log(`  ... and ${medium.length - 5} more medium severity issues`)
    }
  }
}

/**
 * Generate a summary report
 */
function printSummary(findings: Finding[]): void {
  const critical = findings.filter((f) => f.severity === "critical").length
  const high = findings.filter((f) => f.severity === "high").length
  const medium = findings.filter((f) => f.severity === "medium").length

  console.log("\n" + "=".repeat(60))
  console.log("RBAC Bypass Audit Summary")
  console.log("=".repeat(60))
  console.log(`Total Issues: ${findings.length}`)
  console.log(`  🔴 Critical: ${critical}`)
  console.log(`  🟠 High: ${high}`)
  console.log(`  🟡 Medium: ${medium}`)
  console.log()

  if (critical > 0) {
    console.log("❌ CRITICAL ISSUES FOUND")
    console.log("These must be fixed before deployment!\n")
    process.exit(1)
  } else if (high > 0) {
    console.log("⚠️  High severity issues found")
    console.log("These should be fixed before deployment\n")
  } else {
    console.log("✅ No critical issues found\n")
  }
}

// Main execution
console.log("🔍 Scanning for RBAC bypasses...\n")

const findings = scanDirectory("./src")

printFindings(findings)
printSummary(findings)

console.log("Remediation steps:")
console.log("1. Replace role === 'X' checks with permission checks")
console.log("2. Use requirePermission() from rbac-helpers.ts")
console.log("3. Use hasPermissionWithoutRoleBypass() for checks")
console.log("4. Run this script again to verify fixes\n")
