interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  blockDurationMs: number;
}

interface RateLimitEntry {
  count: number;
  windowStart: number;
  blockedUntil?: number;
}

const RATE_LIMITS: Record<string, RateLimitConfig> = {
  wordpress: {
    windowMs: 60 * 1000,
    maxRequests: 30,
    blockDurationMs: 5 * 60 * 1000
  },
  
  api: {
    windowMs: 60 * 1000,
    maxRequests: 10,
    blockDurationMs: 10 * 60 * 1000
  },
  
  views: {
    windowMs: 60 * 1000,
    maxRequests: 60,
    blockDurationMs: 2 * 60 * 1000
  },
  
  sitemap: {
    windowMs: 60 * 1000,
    maxRequests: 30,  // Increased from 5 to 30 to allow legitimate crawlers
    blockDurationMs: 5 * 60 * 1000  // Reduced from 15 to 5 minutes
  }
};

const rateLimitStore = new Map<string, RateLimitEntry>();

export function getClientIP(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
         request.headers.get('x-real-ip') || 
         request.headers.get('cf-connecting-ip') ||
         request.headers.get('x-client-ip') ||
         'unknown';
}

function getRateLimitKey(ip: string, endpoint: string): string {
  return `${ip}:${endpoint}`;
}

export function checkRateLimit(
  request: Request, 
  endpointType: keyof typeof RATE_LIMITS
): { allowed: boolean; resetTime?: number; remaining?: number } {
  
  const ip = getClientIP(request);
  const config = RATE_LIMITS[endpointType];
  const key = getRateLimitKey(ip, endpointType);
  const now = Date.now();
  
  if (Math.random() < 0.01) {
    cleanupExpiredEntries();
  }
  
  let entry = rateLimitStore.get(key);
  
  if (entry?.blockedUntil && now < entry.blockedUntil) {
    return { 
      allowed: false, 
      resetTime: entry.blockedUntil 
    };
  }

  if (!entry || (now - entry.windowStart) >= config.windowMs) {
    entry = {
      count: 0,
      windowStart: now
    };
    rateLimitStore.set(key, entry);
  }
  
  entry.count++;
  
  if (entry.count > config.maxRequests) {
    entry.blockedUntil = now + config.blockDurationMs;
    rateLimitStore.set(key, entry);
    
    console.warn(`🚫 Rate limit exceeded for IP ${ip} on ${endpointType} endpoint`);
    
    return { 
      allowed: false, 
      resetTime: entry.blockedUntil 
    };
  }
  
  const remaining = config.maxRequests - entry.count;
  const resetTime = entry.windowStart + config.windowMs;
  
  return { 
    allowed: true, 
    remaining, 
    resetTime 
  };
}


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

function cleanupExpiredEntries(): void {
  const now = Date.now();
  const expiredKeys: string[] = [];
  
  for (const [key, entry] of rateLimitStore.entries()) {
    const windowExpired = (now - entry.windowStart) >= (5 * 60 * 1000);
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

export function checkAdvancedRateLimit(
  request: Request,
  endpointType: keyof typeof RATE_LIMITS
): { allowed: boolean; reason?: string; resetTime?: number; remaining?: number } {
  
  const userAgent = request.headers.get('user-agent') || '';
  const ip = getClientIP(request);
  
  // Whitelist legitimate search engine crawlers
  const legitimateCrawlers = [
    /googlebot/i,
    /bingbot/i,
    /slurp/i,              // Yahoo
    /duckduckbot/i,
    /baiduspider/i,
    /yandexbot/i,
    /facebookexternalhit/i,
    /facebot/i,
    /twitterbot/i,
    /twitter/i,            // X/Twitter generic crawler
    /x-bot/i,              // X (formerly Twitter) new bot
    /linkedinbot/i,
    /linkedin/i,
    /whatsapp/i,
    /telegrambot/i,
    /slackbot/i,
    /discordbot/i,
    /pinterest/i,
    /applebot/i,
    /petalbot/i,           // Huawei search
    /developers\.google/i  // Google dev tools
  ];
  
  const isLegitCrawler = legitimateCrawlers.some(pattern => pattern.test(userAgent));
  
  // Skip rate limiting for legitimate search engines and social media crawlers
  if (isLegitCrawler) {
    console.log(`✅ Legitimate crawler bypassing rate limit: ${userAgent.substring(0, 50)}`);
    return { allowed: true, remaining: 999, resetTime: Date.now() + 60000 };
  }
  
  // Suspicious bots that should be rate-limited more aggressively
  const suspiciousBots = [
    /python-requests/i,
    /curl\//i,
    /wget\//i,
    /java\//i,
    /scrapy/i,
    /selenium/i,
    /headless/i,
    /phantom/i,
    /scanner/i,
    /nikto/i
  ];
  
  const isSuspiciousBot = suspiciousBots.some(pattern => pattern.test(userAgent));
  
  if (isSuspiciousBot) {
    console.warn(`🤖 Suspicious bot detected: ${userAgent.substring(0, 50)} from IP ${ip}`);
    
    // Apply stricter limits to suspicious bots
    const botConfig = {
      ...RATE_LIMITS[endpointType],
      maxRequests: Math.floor(RATE_LIMITS[endpointType].maxRequests / 3),
      blockDurationMs: RATE_LIMITS[endpointType].blockDurationMs * 2
    };
    
    const result = checkRateLimit(request, endpointType);
    
    if (!result.allowed) {
      return {
        allowed: false,
        reason: 'Suspicious bot rate limit exceeded',
        resetTime: result.resetTime
      };
    }
  }
  
  const result = checkRateLimit(request, endpointType);
  
  return result;
}

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
