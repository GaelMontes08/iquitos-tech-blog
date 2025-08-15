import type { APIRoute } from 'astro';
import { checkAdvancedRateLimit, createRateLimitResponse, addRateLimitHeaders } from '../../../lib/rate-limit.js';

export const GET: APIRoute = async ({ request }) => {
  const rateLimit = checkAdvancedRateLimit(request, 'wordpress');
  
  if (!rateLimit.allowed) {
    console.log(`🚫 WordPress posts API rate limited: ${rateLimit.reason || 'Rate limit exceeded'}`);
    return createRateLimitResponse(rateLimit.resetTime || Date.now() + 60000);
  }

  try {
    const url = new URL(request.url);
    const perPage = url.searchParams.get('per_page') || '10';
    const page = url.searchParams.get('page') || '1';
    const category = url.searchParams.get('category') || '';
    const search = url.searchParams.get('search') || '';
    
    const domain = import.meta.env.WP_DOMAIN || 'cms-iquitostech.com';
    let apiUrl = `https://${domain}/wp-json/wp/v2/posts?per_page=${perPage}&page=${page}&_embed`;
    
    if (category) {
      apiUrl += `&categories=${category}`;
    }
    
    if (search) {
      apiUrl += `&search=${encodeURIComponent(search)}`;
    }
    
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
    
    const successResponse = new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300'
      }
    });

    if (rateLimit.remaining !== undefined && rateLimit.resetTime) {
      return addRateLimitHeaders(successResponse, rateLimit.remaining, rateLimit.resetTime);
    }

    return successResponse;
    
  } catch (error) {
    console.error('WordPress posts API error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to fetch posts',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
