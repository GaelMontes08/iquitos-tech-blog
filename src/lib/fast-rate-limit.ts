interface SimpleLimitEntry {
  count: number;
  resetTime: number;
}

const limitStore = new Map<string, SimpleLimitEntry>();

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of limitStore.entries()) {
    if (now > entry.resetTime) {
      limitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

export function checkFastRateLimit(
  clientId: string, 
  maxRequests: number = 10, 
  windowMs: number = 60 * 1000
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const resetTime = now + windowMs;
  
  const existing = limitStore.get(clientId);
  
  if (!existing || now > existing.resetTime) {
    limitStore.set(clientId, { count: 1, resetTime });
    return { allowed: true, remaining: maxRequests - 1, resetTime };
  }
  
  if (existing.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetTime: existing.resetTime };
  }
  
  existing.count++;
  return { allowed: true, remaining: maxRequests - existing.count, resetTime: existing.resetTime };
}

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

export function getClientId(request: Request, clientAddress?: string): string {
  const ip = clientAddress || 
             request.headers.get('x-forwarded-for') || 
             request.headers.get('x-real-ip') || 
             'unknown';
  
  return ip.split(',')[0].trim();
}
