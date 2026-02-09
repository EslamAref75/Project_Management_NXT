/**
 * Next.js instrumentation hook (Phase 0 baseline).
 * Loads once on server startup. Metrics are recorded in middleware.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { getSnapshot } = await import("./src/lib/metrics")
    if (typeof getSnapshot === "function") {
      console.log("[instrumentation] Metrics module loaded; baseline recording enabled.")
    }
  }
}
