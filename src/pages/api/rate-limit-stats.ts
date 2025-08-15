import type { APIRoute } from 'astro';
import { getRateLimitStats } from '../../lib/rate-limit.js';

export const GET: APIRoute = async ({ request }) => {
  try {
    const isDevelopment = import.meta.env.MODE === 'development';
    const userAgent = request.headers.get('user-agent') || '';
    
    if (!isDevelopment && !userAgent.includes('admin')) {
      return new Response(JSON.stringify({ 
        error: 'Access denied' 
      }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const stats = getRateLimitStats();
    
    return new Response(JSON.stringify({
      success: true,
      timestamp: new Date().toISOString(),
      rateLimitStats: stats,
      message: 'Rate limiting is active and protecting endpoints'
    }), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      }
    });
    
  } catch (error) {
    console.error('Rate limit monitoring error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to fetch rate limit stats',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
