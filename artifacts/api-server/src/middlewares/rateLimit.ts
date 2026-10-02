import { getAuth } from "@clerk/express";
import type { NextFunction, Request, Response } from "express";

type RateLimitOptions = {
  windowMs: number;
  max: number;
  maxKeys?: number;
};

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const DEFAULT_MAX_KEYS = 10_000;

function requestKey(req: Request): string {
  const userId = getAuth(req).userId;
  return userId ? `user:${userId}` : `ip:${req.ip ?? "unknown"}`;
}

export function createRateLimiter({
  windowMs,
  max,
  maxKeys = DEFAULT_MAX_KEYS,
}: RateLimitOptions) {
  const entries = new Map<string, RateLimitEntry>();

  return function rateLimit(
    req: Request,
    res: Response,
    next: NextFunction,
  ): void {
    const now = Date.now();
    const key = requestKey(req);
    let entry = entries.get(key);

    if (!entry || entry.resetAt <= now) {
      if (!entry && entries.size >= maxKeys) {
        for (const [storedKey, storedEntry] of entries) {
          if (storedEntry.resetAt <= now) entries.delete(storedKey);
        }
      }

      // Refuse additional identities rather than allowing an attacker to grow
      // the limiter's own memory without bound.
      if (!entry && entries.size >= maxKeys) {
        res.setHeader("Retry-After", Math.ceil(windowMs / 1000));
        res.status(429).json({ error: "Too many requests" });
        return;
      }

      entry = { count: 0, resetAt: now + windowMs };
      entries.set(key, entry);
    }

    entry.count += 1;
    const remaining = Math.max(0, max - entry.count);
    const retryAfterSeconds = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));

    res.setHeader("RateLimit-Limit", max);
    res.setHeader("RateLimit-Remaining", remaining);
    res.setHeader("RateLimit-Reset", retryAfterSeconds);

    if (entry.count > max) {
      res.setHeader("Retry-After", retryAfterSeconds);
      res.status(429).json({ error: "Too many requests" });
      return;
    }

    next();
  };
}