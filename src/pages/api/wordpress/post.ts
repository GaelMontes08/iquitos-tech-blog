import type { APIRoute } from 'astro';
import { checkAdvancedRateLimit, createRateLimitResponse, addRateLimitHeaders } from '../../../lib/rate-limit.js';

export const GET: APIRoute = async ({ request }) => {
  const rateLimit = checkAdvancedRateLimit(request, 'wordpress');
  
  if (!rateLimit.allowed) {
    console.log(`🚫 WordPress post API rate limited: ${rateLimit.reason || 'Rate limit exceeded'}`);
    return createRateLimitResponse(rateLimit.resetTime || Date.now() + 60000);
  }

  try {
    const url = new URL(request.url);
    const slug = url.searchParams.get('slug');
    
    if (!slug) {
      return new Response(JSON.stringify({ 
        error: 'Slug parameter required' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const domain = import.meta.env.WP_DOMAIN || 'cms-iquitostech.com';
    const apiUrl = `https://${domain}/wp-json/wp/v2/posts?slug=${slug}&_embed`;
    
    const response = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'Iquitos-Tech/1.0 (+https://iquitostech.com)',
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`WordPress API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data || data.length === 0) {
      return new Response(JSON.stringify({ 
        error: 'Post not found' 
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const successResponse = new Response(JSON.stringify(data[0]), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=600'
      }
    });

    if (rateLimit.remaining !== undefined && rateLimit.resetTime) {
      return addRateLimitHeaders(successResponse, rateLimit.remaining, rateLimit.resetTime);
    }

    return successResponse;
    
  } catch (error) {
    console.error('WordPress post API error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to fetch post',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
