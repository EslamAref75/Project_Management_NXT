/**
 * Rate Limiting Module
 * 
 * Provides in-memory rate limiting for login attempts and server actions.
 * In production, this should be replaced with Redis-based rate limiting.
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

interface RateLimitConfig {
  windowMs?: number;      // Time window in milliseconds (default: 15 minutes)
  maxRequests?: number;   // Max requests per window (default: 100)
  skipOnError?: boolean;  // Skip limiting on errors (default: false)
  keyPrefix?: string;     // Prefix for rate limit keys (default: "rl:")
}

// In-memory store for rate limits
const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Rate limit a request
 * 
 * @param key - Unique identifier for rate limiting (e.g., user ID, IP address)
 * @param config - Rate limit configuration
 * @returns Object with current count, limit, and remaining requests
 */
export function rateLimitCheck(
  key: string,
  config: RateLimitConfig = {}
): { allowed: boolean; current: number; limit: number; remaining: number; resetTime: number } {
  const windowMs = config.windowMs || 15 * 60 * 1000; // 15 minutes default
  const maxRequests = config.maxRequests || 100;
  const keyPrefix = config.keyPrefix || "rl:";
  const fullKey = `${keyPrefix}${key}`;

  const now = Date.now();
  let entry = rateLimitStore.get(fullKey);

  // Create new entry if doesn't exist or has expired
  if (!entry || entry.resetTime < now) {
    entry = {
      count: 1,
      resetTime: now + windowMs,
    };
    rateLimitStore.set(fullKey, entry);
    return {
      allowed: true,
      current: 1,
      limit: maxRequests,
      remaining: maxRequests - 1,
      resetTime: entry.resetTime,
    };
  }

  // Increment existing entry
  entry.count++;

  return {
    allowed: entry.count <= maxRequests,
    current: entry.count,
    limit: maxRequests,
    remaining: Math.max(0, maxRequests - entry.count),
    resetTime: entry.resetTime,
  };
}

/**
 * Check login rate limit for a username or IP
 * Stricter limits than general API rate limiting
 */
export function checkLoginRateLimit(
  identifier: string
): { allowed: boolean; remaining: number; resetTime: number } {
  const result = rateLimitCheck(
    `login:${identifier}`,
    {
      windowMs: 15 * 60 * 1000,  // 15 minutes
      maxRequests: 5,            // Max 5 login attempts
    }
  );

  return {
    allowed: result.allowed,
    remaining: result.remaining,
    resetTime: result.resetTime,
  };
}

/**
 * Check server action rate limit for a user
 */
export function checkServerActionRateLimit(
  userId: number,
  action: string = "default"
): { allowed: boolean; remaining: number; resetTime: number } {
  const result = rateLimitCheck(
    `action:${userId}:${action}`,
    {
      windowMs: 60 * 1000,        // 1 minute
      maxRequests: 30,            // Max 30 requests per minute per action
    }
  );

  return {
    allowed: result.allowed,
    remaining: result.remaining,
    resetTime: result.resetTime,
  };
}

/**
 * Reset rate limit for a key (e.g., on successful login)
 */
export function resetRateLimit(key: string, keyPrefix: string = "rl:"): void {
  const fullKey = `${keyPrefix}${key}`;
  rateLimitStore.delete(fullKey);
}

/**
 * Reset login rate limit for a username/IP
 */
export function resetLoginRateLimit(identifier: string): void {
  resetRateLimit(`login:${identifier}`);
}

/**
 * Get current rate limit status (for debugging)
 */
export function getRateLimitStatus(key: string): RateLimitEntry | null {
  return rateLimitStore.get(key) || null;
}

/**
 * Clear all rate limits (development/testing only)
 */
export function clearAllRateLimits(): void {
  rateLimitStore.clear();
}
