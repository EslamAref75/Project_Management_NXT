/**
 * Select Clause Generator Helper
 * Analyzes queries and suggests optimized select clauses
 * 
 * Usage: npx ts-node scripts/generate-select-clauses.ts
 */

import fs from "fs"
import path from "path"

interface FieldAnalysis {
  file: string
  line: number
  table: string
  currentSelect: string | null
  suggestedSelect: string
  impact: "HIGH" | "MEDIUM" | "LOW"
}

// Map of table models to commonly used fields
const commonFieldMap: Record<string, Record<string, string[]>> = {
  task: {
    listView: ["id", "title", "priority", "status", "dueDate", "projectId"],
    detailView: ["id", "title", "description", "priority", "status", "dueDate", "projectId", "createdAt", "createdById"],
    withAssignees: [
      "id", "title", "priority", "status", "dueDate",
      "assignees: { select: { id: true, username: true, email: true, avatarUrl: true } }"
    ],
    withStatus: [
      "id", "title", "priority", "status",
      "taskStatus: { select: { id: true, name: true, color: true } }"
    ],
  },

  project: {
    listView: ["id", "name", "status", "projectManagerId", "startDate", "endDate"],
    detailView: [
      "id", "name", "description", "status", "projectManagerId",
      "projectManager: { select: { id: true, username: true, email: true } }"
    ],
    withStats: [
      "id", "name", "status",
      "_count: { select: { tasks: true, members: true } }"
    ],
  },

  user: {
    basic: ["id", "username", "email", "avatarUrl", "role"],
    profile: ["id", "username", "email", "avatarUrl", "role", "isActive", "createdAt"],
    withStats: [
      "id", "username", "email",
      "_count: { select: { tasks: true, projects: true } }"
    ],
  },

  team: {
    listView: ["id", "name", "status", "teamLeadId"],
    detailView: [
      "id", "name", "description", "status",
      "teamLead: { select: { id: true, username: true } }",
      "members: { select: { userId: true, role: true } }"
    ],
  },

  activityLog: {
    listView: ["id", "actionType", "actionSummary", "performedById", "createdAt", "entityType"],
    detailView: [
      "id", "actionType", "actionCategory", "actionSummary", "actionDetails",
      "performedById", "createdAt", "entityType", "entityId"
    ],
  },
}

function analyzeFile(filePath: string, content: string): FieldAnalysis[] {
  const analyses: FieldAnalysis[] = []
  const lines = content.split("\n")

  lines.forEach((line, idx) => {
    // Find prisma queries
    if (!line.includes("prisma.") || !line.includes("find")) {
      return
    }

    // Extract table name
    const tableMatch = line.match(/prisma\.(\w+)\.find/)
    if (!tableMatch) return

    const table = tableMatch[1]
    const hasSelect = line.includes("select:")
    const hasInclude = line.includes("include:")

    // Determine context (list, detail, etc)
    let context = "listView"
    if (line.includes("findUnique") || line.includes("findFirst")) {
      context = "detailView"
    }
    if (line.includes("_count")) {
      context = hasInclude ? "withStats" : context
    }

    if (hasInclude && !hasSelect) {
      const fields = commonFieldMap[table]?.[context] || commonFieldMap[table]?.listView || []

      analyses.push({
        file: filePath,
        line: idx + 1,
        table,
        currentSelect: hasSelect ? "has select" : null,
        suggestedSelect: generateSelectString(table, fields),
        impact: "HIGH",
      })
    }
  })

  return analyses
}

function generateSelectString(table: string, fields: string[]): string {
  const simpleFields = fields.filter((f) => !f.includes(":"))
  const complexFields = fields.filter((f) => f.includes(":"))

  let select = "select: {\n"

  // Add simple fields
  simpleFields.forEach((field) => {
    select += `      ${field}: true,\n`
  })

  // Add complex fields
  complexFields.forEach((field) => {
    select += `      ${field},\n`
  })

  select += "    }"

  return select
}

function scanDirectory(dirPath: string): FieldAnalysis[] {
  const allAnalyses: FieldAnalysis[] = []

  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name)

      if (entry.name.startsWith(".") || ["node_modules", "dist", "build", ".next"].includes(entry.name)) {
        continue
      }

      if (entry.isDirectory()) {
        allAnalyses.push(...scanDirectory(fullPath))
      } else if (entry.isFile() && entry.name.endsWith(".ts") && entry.name.includes("action")) {
        const content = fs.readFileSync(fullPath, "utf-8")
        allAnalyses.push(...analyzeFile(fullPath, content))
      }
    }
  } catch (error) {
    console.error(`Error scanning ${dirPath}:`, error)
  }

  return allAnalyses
}

// Main execution
console.log("🔧 Select Clause Optimization Helper")
console.log("=".repeat(70))
console.log()

const analyses = scanDirectory("./src")

if (analyses.length === 0) {
  console.log("✅ No queries found needing select clause optimization")
  console.log()
  console.log("This tool looks for queries using 'include' without 'select'.")
  console.log("If you see queries that could be optimized, file paths would appear here.")
} else {
  console.log(`Found ${analyses.length} queries that could use select clauses:\n`)

  // Group by table
  const byTable = analyses.reduce(
    (acc, analysis) => {
      if (!acc[analysis.table]) acc[analysis.table] = []
      acc[analysis.table].push(analysis)
      return acc
    },
    {} as Record<string, FieldAnalysis[]>
  )

  Object.entries(byTable).forEach(([table, items]) => {
    console.log(`📊 ${table.toUpperCase()} (${items.length} queries):`)
    items.forEach((item) => {
      console.log(`   Line ${item.line}: ${item.file.split("\\").pop() || item.file}`)
    })
    console.log()
  })
}

console.log()
console.log("=".repeat(70))
console.log("💡 Quick Reference - Common Select Patterns:")
console.log()

Object.entries(commonFieldMap).forEach(([model, contexts]) => {
  console.log(`${model.toUpperCase()}:`)
  Object.entries(contexts).forEach(([context, fields]) => {
    console.log(`  ${context}: [${fields.slice(0, 3).join(", ")}...]`)
  })
  console.log()
})

console.log("📚 Next Steps:")
console.log("  1. Review PHASE_2_WEEK_1_GUIDE.md for detailed instructions")
console.log("  2. Identify N+1 query patterns in dashboard.ts, stats.ts, reports.ts")
console.log("  3. Add select clauses to high-traffic queries first")
console.log("  4. Update database schema with missing indices")
console.log("  5. Benchmark improvements with: npm run dev (check database logs)")
console.log()
