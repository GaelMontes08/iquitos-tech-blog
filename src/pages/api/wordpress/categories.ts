import type { APIRoute } from 'astro';
import { checkAdvancedRateLimit, createRateLimitResponse, addRateLimitHeaders } from '../../../lib/rate-limit.js';

export const GET: APIRoute = async ({ request }) => {
  const rateLimit = checkAdvancedRateLimit(request, 'wordpress');
  
  if (!rateLimit.allowed) {
    console.log(`🚫 WordPress categories API rate limited: ${rateLimit.reason || 'Rate limit exceeded'}`);
    return createRateLimitResponse(rateLimit.resetTime || Date.now() + 60000);
  }

  try {
    const domain = import.meta.env.WP_DOMAIN || 'cms-iquitostech.com';
    const apiUrl = `https://${domain}/wp-json/wp/v2/categories?per_page=50&_fields=id,name,slug,count`;
    
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
    
    const filteredCategories = data.filter((cat: any) => 
      cat.count > 0 && 
      cat.slug !== 'uncategorized' && 
      cat.id !== 25
    );
    
    const successResponse = new Response(JSON.stringify(filteredCategories), {
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
    console.error('WordPress categories API error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to fetch categories',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
