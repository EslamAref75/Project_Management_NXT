/**
 * Phase 3: Compare backend vs monolith read responses and log diffs.
 * Used when NEXT_PUBLIC_PROJECTS_SHADOW_MODE=true.
 */

function shallowDiff(a: unknown, b: unknown, path = ""): string[] {
  const diffs: string[] = []
  if (a === b) return diffs
  if (a == null || b == null) {
    diffs.push(`${path}: ${String(a)} vs ${String(b)}`)
    return diffs
  }
  if (typeof a !== "object" || typeof b !== "object") {
    if (a !== b) diffs.push(`${path}: ${String(a)} vs ${String(b)}`)
    return diffs
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) diffs.push(`${path}.length: ${a.length} vs ${b.length}`)
    const max = Math.min(a.length, b.length, 5)
    for (let i = 0; i < max; i++) {
      diffs.push(...shallowDiff(a[i], b[i], `${path}[${i}]`))
    }
    return diffs
  }
  const keys = new Set([...Object.keys(a as object), ...Object.keys(b as object)])
  for (const k of keys) {
    const va = (a as Record<string, unknown>)[k]
    const vb = (b as Record<string, unknown>)[k]
    if (JSON.stringify(va) !== JSON.stringify(vb)) {
      if (typeof va === "object" && va !== null && typeof vb === "object" && vb !== null && !Array.isArray(va) && !Array.isArray(vb)) {
        diffs.push(...shallowDiff(va, vb, path ? `${path}.${k}` : k))
      } else {
        diffs.push((path ? `${path}.` : "") + k + ": " + JSON.stringify(va) + " vs " + JSON.stringify(vb))
      }
    }
  }
  return diffs
}

export function compareAndLog(
  operation: string,
  params: Record<string, unknown>,
  backendResult: unknown,
  monolithResult: unknown
): void {
  const diffs = shallowDiff(backendResult, monolithResult, "response")
  if (diffs.length === 0) {
    if (typeof console !== "undefined" && console.debug) {
      console.debug(`[shadow] ${operation} match`, params)
    }
    return
  }
  if (typeof console !== "undefined" && console.warn) {
    console.warn(`[shadow] ${operation} diff (backend vs monolith):`, { params, diffs })
  }
}
