/**
 * In-memory sliding-window rate limiter and login brute-force policy. In-memory is
 * appropriate for a single-node self-hosted deployment (the default target); the
 * interface is small enough to back with Redis later without touching call sites.
 */

interface Bucket {
  hits: number[];
}

export class RateLimiter {
  private readonly buckets = new Map<string, Bucket>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
  ) {}

  /** Returns true if the action is allowed and records the hit. */
  check(key: string, now: number = Date.now()): { allowed: boolean; remaining: number; retryAfterMs: number } {
    const cutoff = now - this.windowMs;
    const bucket = this.buckets.get(key) ?? { hits: [] };
    bucket.hits = bucket.hits.filter((t) => t > cutoff);
    if (bucket.hits.length >= this.limit) {
      const oldest = bucket.hits[0]!;
      this.buckets.set(key, bucket);
      return { allowed: false, remaining: 0, retryAfterMs: oldest + this.windowMs - now };
    }
    bucket.hits.push(now);
    this.buckets.set(key, bucket);
    return { allowed: true, remaining: this.limit - bucket.hits.length, retryAfterMs: 0 };
  }

  reset(key: string): void {
    this.buckets.delete(key);
  }

  /** Drop stale buckets to bound memory. Call periodically from a route/cron. */
  prune(now: number = Date.now()): void {
    const cutoff = now - this.windowMs;
    for (const [key, bucket] of this.buckets) {
      bucket.hits = bucket.hits.filter((t) => t > cutoff);
      if (bucket.hits.length === 0) this.buckets.delete(key);
    }
  }
}

export const MAX_LOGIN_ATTEMPTS = 5;
export const LOGIN_LOCK_MS = 1000 * 60 * 15; // 15 minutes

/** Decide the outcome of a failed login given prior failures. */
export function nextLockState(
  failedAttempts: number,
  now: Date = new Date(),
): { failedAttempts: number; lockedUntil: Date | null } {
  const attempts = failedAttempts + 1;
  if (attempts >= MAX_LOGIN_ATTEMPTS) {
    return { failedAttempts: attempts, lockedUntil: new Date(now.getTime() + LOGIN_LOCK_MS) };
  }
  return { failedAttempts: attempts, lockedUntil: null };
}

export function isLocked(lockedUntil: Date | null | undefined, now: Date = new Date()): boolean {
  return !!lockedUntil && lockedUntil.getTime() > now.getTime();
}
