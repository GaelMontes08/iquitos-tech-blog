/**
 * API Rate Limiting System for WordPress endpoints
 * Protects against abuse and ensures service availability
 */

interface RateLimitConfig {
  windowMs: number;     // Time window in milliseconds
  maxRequests: number;  // Maximum requests per window
  blockDurationMs: number; // How long to block after limit exceeded
}

interface RateLimitEntry {
  count: number;
  windowStart: number;
  blockedUntil?: number;
}

// Rate limiting configurations for different endpoint types
const RATE_LIMITS: Record<string, RateLimitConfig> = {
  // WordPress content endpoints (posts, categories, etc.)
  wordpress: {
    windowMs: 60 * 1000,     // 1 minute
    maxRequests: 30,         // 30 requests per minute
    blockDurationMs: 5 * 60 * 1000  // Block for 5 minutes
  },
  
  // API endpoints (contact, newsletter, etc.)
  api: {
    windowMs: 60 * 1000,     // 1 minute  
    maxRequests: 10,         // 10 requests per minute
    blockDurationMs: 10 * 60 * 1000  // Block for 10 minutes
  },
  
  // View increment endpoint (more lenient for user engagement)
  views: {
    windowMs: 60 * 1000,     // 1 minute
    maxRequests: 60,         // 60 requests per minute
    blockDurationMs: 2 * 60 * 1000   // Block for 2 minutes
  },
  
  // Sitemap and feeds (less frequent, more resource intensive)
  sitemap: {
    windowMs: 60 * 1000,     // 1 minute
    maxRequests: 5,          // 5 requests per minute
    blockDurationMs: 15 * 60 * 1000  // Block for 15 minutes
  }
};

// In-memory rate limit store (in production, use Redis or database)
const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Get client IP address from request
 */
export function getClientIP(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
         request.headers.get('x-real-ip') || 
         request.headers.get('cf-connecting-ip') ||
         request.headers.get('x-client-ip') ||
         'unknown';
}

/**
 * Get rate limit key for request
 */
function getRateLimitKey(ip: string, endpoint: string): string {
  return `${ip}:${endpoint}`;
}

/**
 * Check if request should be rate limited
 */
export function checkRateLimit(
  request: Request, 
  endpointType: keyof typeof RATE_LIMITS
): { allowed: boolean; resetTime?: number; remaining?: number } {
  
  const ip = getClientIP(request);
  const config = RATE_LIMITS[endpointType];
  const key = getRateLimitKey(ip, endpointType);
  const now = Date.now();
  
  // Clean up expired entries periodically
  if (Math.random() < 0.01) { // 1% chance to clean up
    cleanupExpiredEntries();
  }
  
  let entry = rateLimitStore.get(key);
  
  // Check if IP is currently blocked
  if (entry?.blockedUntil && now < entry.blockedUntil) {
    return { 
      allowed: false, 
      resetTime: entry.blockedUntil 
    };
  }
  
  // Initialize or reset window if expired
  if (!entry || (now - entry.windowStart) >= config.windowMs) {
    entry = {
      count: 0,
      windowStart: now
    };
    rateLimitStore.set(key, entry);
  }
  
  // Increment request count
  entry.count++;
  
  // Check if limit exceeded
  if (entry.count > config.maxRequests) {
    entry.blockedUntil = now + config.blockDurationMs;
    rateLimitStore.set(key, entry);
    
    console.warn(`🚫 Rate limit exceeded for IP ${ip} on ${endpointType} endpoint`);
    
    return { 
      allowed: false, 
      resetTime: entry.blockedUntil 
    };
  }
  
  // Calculate remaining requests and reset time
  const remaining = config.maxRequests - entry.count;
  const resetTime = entry.windowStart + config.windowMs;
  
  return { 
    allowed: true, 
    remaining, 
    resetTime 
  };
}

/**
 * Create rate limit response
 */
export function createRateLimitResponse(resetTime: number, remaining?: number): Response {
  const resetTimeSeconds = Math.ceil(resetTime / 1000);
  const retryAfterSeconds = Math.ceil((resetTime - Date.now()) / 1000);
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-RateLimit-Reset': resetTimeSeconds.toString(),
    'Retry-After': Math.max(1, retryAfterSeconds).toString()
  };
  
  if (remaining !== undefined) {
    headers['X-RateLimit-Remaining'] = remaining.toString();
  }
  
  return new Response(JSON.stringify({
    error: 'Rate limit exceeded',
    message: 'Too many requests. Please try again later.',
    retryAfter: retryAfterSeconds
  }), {
    status: 429,
    headers
  });
}

/**
 * Add rate limit headers to successful responses
 */
export function addRateLimitHeaders(
  response: Response, 
  remaining: number, 
  resetTime: number
): Response {
  const resetTimeSeconds = Math.ceil(resetTime / 1000);
  
  const newHeaders = new Headers(response.headers);
  newHeaders.set('X-RateLimit-Remaining', remaining.toString());
  newHeaders.set('X-RateLimit-Reset', resetTimeSeconds.toString());
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders
  });
}

/**
 * Clean up expired rate limit entries
 */
function cleanupExpiredEntries(): void {
  const now = Date.now();
  const expiredKeys: string[] = [];
  
  for (const [key, entry] of rateLimitStore.entries()) {
    // Remove entries that are expired and not blocked
    const windowExpired = (now - entry.windowStart) >= (5 * 60 * 1000); // 5 minutes
    const blockExpired = !entry.blockedUntil || now >= entry.blockedUntil;
    
    if (windowExpired && blockExpired) {
      expiredKeys.push(key);
    }
  }
  
  expiredKeys.forEach(key => rateLimitStore.delete(key));
  
  if (expiredKeys.length > 0) {
    console.log(`🧹 Cleaned up ${expiredKeys.length} expired rate limit entries`);
  }
}

/**
 * Get rate limit statistics (for monitoring)
 */
export function getRateLimitStats(): {
  totalEntries: number;
  blockedIPs: number;
  endpointStats: Record<string, number>;
} {
  const now = Date.now();
  let blockedIPs = 0;
  const endpointStats: Record<string, number> = {};
  
  for (const [key, entry] of rateLimitStore.entries()) {
    const endpoint = key.split(':')[1];
    endpointStats[endpoint] = (endpointStats[endpoint] || 0) + 1;
    
    if (entry.blockedUntil && now < entry.blockedUntil) {
      blockedIPs++;
    }
  }
  
  return {
    totalEntries: rateLimitStore.size,
    blockedIPs,
    endpointStats
  };
}

/**
 * Advanced rate limiting with user agent analysis
 */
export function checkAdvancedRateLimit(
  request: Request,
  endpointType: keyof typeof RATE_LIMITS
): { allowed: boolean; reason?: string; resetTime?: number; remaining?: number } {
  
  const userAgent = request.headers.get('user-agent') || '';
  const ip = getClientIP(request);
  
  // Block obvious bots and scrapers
  const suspiciousBots = [
    /bot/i, /crawler/i, /spider/i, /scraper/i,
    /python/i, /curl/i, /wget/i, /java/i,
    /scanner/i, /validator/i, /monitor/i
  ];
  
  const isSuspiciousBot = suspiciousBots.some(pattern => pattern.test(userAgent));
  
  if (isSuspiciousBot && endpointType !== 'sitemap') {
    console.warn(`🤖 Suspicious bot detected: ${userAgent} from IP ${ip}`);
    
    // Apply stricter rate limits for bots
    const botConfig = {
      ...RATE_LIMITS[endpointType],
      maxRequests: Math.floor(RATE_LIMITS[endpointType].maxRequests / 3), // 1/3 of normal limit
      blockDurationMs: RATE_LIMITS[endpointType].blockDurationMs * 2 // 2x longer block
    };
    
    // Use modified check with stricter limits
    const result = checkRateLimit(request, endpointType);
    
    if (!result.allowed) {
      return {
        allowed: false,
        reason: 'Bot rate limit exceeded',
        resetTime: result.resetTime
      };
    }
  }
  
  // Standard rate limit check
  const result = checkRateLimit(request, endpointType);
  
  return result;
}

/**
 * Middleware to protect WordPress endpoints
 */
export function withWordPressRateLimit(
  handler: (request: Request) => Promise<Response> | Response
) {
  return async (request: Request): Promise<Response> => {
    const rateLimit = checkAdvancedRateLimit(request, 'wordpress');
    
    if (!rateLimit.allowed) {
      return createRateLimitResponse(rateLimit.resetTime || Date.now() + 60000);
    }
    
    try {
      const response = await handler(request);
      
      if (response.ok && rateLimit.remaining !== undefined && rateLimit.resetTime) {
        return addRateLimitHeaders(response, rateLimit.remaining, rateLimit.resetTime);
      }
      
      return response;
    } catch (error) {
      console.error('Error in WordPress endpoint handler:', error);
      throw error;
    }
  };
}
