/**
 * Minimal in-memory request metrics for Phase 0 baseline.
 * Records request count, latency samples, and optional status codes.
 * Not for production SLA; use for baseline snapshot and dev.
 */

const MAX_LATENCIES = 10_000
const MAX_SAMPLES = 20_000

interface RequestRecord {
  path: string
  statusCode: number
  durationMs: number
  at: number
}

const latencies: number[] = []
const statusCounts: Record<number, number> = {}
const records: RequestRecord[] = []
let requestCount = 0
let periodStart = Date.now()

function ensureSorted(arr: number[]): number[] {
  if (arr.length <= 1) return arr
  const copy = [...arr]
  copy.sort((a, b) => a - b)
  return copy
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0
  const index = Math.ceil((p / 100) * sorted.length) - 1
  const i = Math.max(0, index)
  return sorted[i] ?? 0
}

/**
 * Record a request for baseline metrics.
 * statusCode can be 0 if unknown (e.g. middleware-only timing).
 */
export function recordRequest(
  path: string,
  statusCode: number,
  durationMs: number
): void {
  requestCount += 1
  statusCounts[statusCode] = (statusCounts[statusCode] ?? 0) + 1
  if (latencies.length < MAX_LATENCIES) {
    latencies.push(durationMs)
  }
  if (records.length < MAX_SAMPLES) {
    records.push({ path, statusCode, durationMs, at: Date.now() })
  }
}

/**
 * Returns a snapshot of current metrics: request count, error rate, p50/p95 latency.
 */
export function getSnapshot(): {
  requestCount: number
  errorRate: number
  latencyP50Ms: number
  latencyP95Ms: number
  periodStart: string
  periodEnd: string
  statusCounts: Record<number, number>
} {
  const now = Date.now()
  const sorted = ensureSorted(latencies)
  const errorCount = Object.entries(statusCounts).reduce(
    (sum, [code, n]) => (Number(code) >= 400 ? sum + n : sum),
    0
  )
  const totalWithStatus = Object.values(statusCounts).reduce((a, b) => a + b, 0)
  const errorRate = totalWithStatus > 0 ? errorCount / totalWithStatus : 0

  return {
    requestCount,
    errorRate: Math.round(errorRate * 1e6) / 1e6,
    latencyP50Ms: Math.round(percentile(sorted, 50) * 100) / 100,
    latencyP95Ms: Math.round(percentile(sorted, 95) * 100) / 100,
    periodStart: new Date(periodStart).toISOString(),
    periodEnd: new Date(now).toISOString(),
    statusCounts: { ...statusCounts },
  }
}

/**
 * Reset metrics (e.g. for tests or new baseline window).
 */
export function resetMetrics(): void {
  latencies.length = 0
  Object.keys(statusCounts).forEach((k) => delete statusCounts[Number(k)])
  records.length = 0
  requestCount = 0
  periodStart = Date.now()
}
