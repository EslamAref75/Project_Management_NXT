/**
 * Next.js instrumentation hook. Loads Sentry server/edge SDKs and baseline metrics.
 */
import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
    const { getSnapshot } = await import("./src/lib/metrics");
    if (typeof getSnapshot === "function") {
      console.log("[instrumentation] Metrics module loaded; baseline recording enabled.");
    }
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export const onRequestError = Sentry.captureRequestError;
