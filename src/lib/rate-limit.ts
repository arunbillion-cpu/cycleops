// Simple in-memory rate limiter (per IP)
// Suitable for a one-day event. Resets when the server instance restarts.

type RateLimitEntry = {
  count: number;
  resetTime: number;
};

const ipRequests = new Map<string, RateLimitEntry>();

interface RateLimitOptions {
  limit: number;      // Max requests allowed
  windowMs: number;   // Time window in milliseconds
}

export function rateLimit(ip: string, options: RateLimitOptions): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const key = ip || 'unknown';

  let entry = ipRequests.get(key);

  // Reset if window has passed
  if (!entry || now > entry.resetTime) {
    entry = {
      count: 0,
      resetTime: now + options.windowMs,
    };
    ipRequests.set(key, entry);
  }

  entry.count += 1;

  const allowed = entry.count <= options.limit;
  const remaining = Math.max(0, options.limit - entry.count);

  // Clean up old entries occasionally (simple garbage collection)
  if (Math.random() < 0.01) {
    for (const [k, v] of ipRequests.entries()) {
      if (now > v.resetTime) {
        ipRequests.delete(k);
      }
    }
  }

  return {
    allowed,
    remaining,
    resetTime: entry.resetTime,
  };
}

// Helper to get client IP from Next.js request
export function getClientIP(request: Request): string {
  // Vercel and most proxies set these headers
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs, first one is the client
    return forwardedFor.split(',')[0].trim();
  }

  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }

  // Fallback (may not be accurate in production)
  return 'unknown';
}
