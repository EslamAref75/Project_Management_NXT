"use client"

import { useEffect, useRef } from "react"

const DEFAULT_MAX_INTERVAL_MS = 5 * 60 * 1000 // 5 minutes
const DEFAULT_BACKOFF_MULTIPLIER = 2

export type UsePollWhenVisibleOptions = {
  /** Base interval in ms (e.g. 30000). Used when visible and after success. */
  intervalMs: number
  /** Max interval when backing off (default 5 min). */
  maxIntervalMs?: number
  /** Multiplier per consecutive failure (default 2). */
  backoffMultiplier?: number
}

/**
 * Polls by calling `callback` when the tab is visible. Pauses when tab is hidden.
 * Uses exponential backoff on repeated failures; resets to intervalMs on success.
 * Callback should return true on success, false on failure so backoff can be applied.
 * Future: consider WebSocket/SSE for push notifications to reduce polling load.
 */
export function usePollWhenVisible(
  callback: () => Promise<boolean>,
  options: UsePollWhenVisibleOptions
) {
  const { intervalMs, maxIntervalMs = DEFAULT_MAX_INTERVAL_MS, backoffMultiplier = DEFAULT_BACKOFF_MULTIPLIER } = options
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const consecutiveFailuresRef = useRef(0)
  const callbackRef = useRef(callback)
  callbackRef.current = callback

  useEffect(() => {
    if (typeof window === "undefined") return

    const cb = () => callbackRef.current()

    function clearPollTimer() {
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
    }

    function getNextDelay(): number {
      const failures = consecutiveFailuresRef.current
      const delay = intervalMs * backoffMultiplier ** failures
      return Math.min(delay, maxIntervalMs)
    }

    function scheduleNext() {
      if (document.visibilityState !== "visible") return
      const delay = getNextDelay()
      timeoutRef.current = setTimeout(async () => {
        timeoutRef.current = null
        if (document.visibilityState !== "visible") return
        const success = await cb()
        if (success) {
          consecutiveFailuresRef.current = 0
        } else {
          consecutiveFailuresRef.current += 1
        }
        scheduleNext()
      }, delay)
    }

    function startPolling() {
      if (document.visibilityState !== "visible") return
      cb().then((success) => {
        if (!success) consecutiveFailuresRef.current += 1
        else consecutiveFailuresRef.current = 0
        scheduleNext()
      })
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "hidden") {
        clearPollTimer()
      } else {
        startPolling()
      }
    }

    if (document.visibilityState === "visible") {
      startPolling()
    }
    document.addEventListener("visibilitychange", handleVisibilityChange)
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      clearPollTimer()
    }
  }, [intervalMs, maxIntervalMs, backoffMultiplier])
}
