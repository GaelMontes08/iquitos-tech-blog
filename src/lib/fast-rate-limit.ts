/**
 * Lightweight Rate Limiting System - Performance Optimized
 * Simplified version to reduce API response time
 */

interface SimpleLimitEntry {
  count: number;
  resetTime: number;
}

// Simple in-memory store with automatic cleanup
const limitStore = new Map<string, SimpleLimitEntry>();

// Cleanup old entries every 5 minutes to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of limitStore.entries()) {
    if (now > entry.resetTime) {
      limitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Fast rate limiting check with minimal overhead
 */
export function checkFastRateLimit(
  clientId: string, 
  maxRequests: number = 10, 
  windowMs: number = 60 * 1000
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const resetTime = now + windowMs;
  
  const existing = limitStore.get(clientId);
  
  if (!existing || now > existing.resetTime) {
    // New window or expired entry
    limitStore.set(clientId, { count: 1, resetTime });
    return { allowed: true, remaining: maxRequests - 1, resetTime };
  }
  
  if (existing.count >= maxRequests) {
    // Rate limit exceeded
    return { allowed: false, remaining: 0, resetTime: existing.resetTime };
  }
  
  // Increment counter
  existing.count++;
  return { allowed: true, remaining: maxRequests - existing.count, resetTime: existing.resetTime };
}

/**
 * Create quick rate limit response
 */
export function createFastRateLimitResponse(): Response {
  return new Response(JSON.stringify({
    success: false,
    error: 'Rate limit exceeded. Please try again later.',
    code: 'RATE_LIMIT_EXCEEDED'
  }), {
    status: 429,
    headers: {
      'Content-Type': 'application/json',
      'Retry-After': '60'
    }
  });
}

/**
 * Get client identifier from request (simplified)
 */
export function getClientId(request: Request, clientAddress?: string): string {
  // Use IP address or fallback to user-agent hash
  const ip = clientAddress || 
             request.headers.get('x-forwarded-for') || 
             request.headers.get('x-real-ip') || 
             'unknown';
  
  return ip.split(',')[0].trim();
}
