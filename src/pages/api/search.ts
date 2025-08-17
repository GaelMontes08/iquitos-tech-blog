import type { APIRoute } from 'astro';
import { searchService } from '../../lib/search.js';
import { checkFastRateLimit, createFastRateLimitResponse, getClientId } from '../../lib/fast-rate-limit.js';
import { secureErrorHandler } from '../../lib/secure-error-handler.js';
import type { SearchFilters } from '../../lib/search.js';

export const GET: APIRoute = async ({ request, url, clientAddress }) => {
  try {
    const clientId = getClientId(request, clientAddress);
    const rateLimit = checkFastRateLimit(clientId, 20, 60 * 1000);
    
    if (!rateLimit.allowed) {
      return createFastRateLimitResponse();
    }

    // Parse search parameters
    const searchParams = url.searchParams;
    const query = searchParams.get('q') || searchParams.get('query') || '';
    
    if (!query || query.trim().length < 2) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Query must be at least 2 characters long',
        results: [],
        total: 0
      }), {
        status: 400,
        headers: { 
          'Content-Type': 'application/json',
          'X-RateLimit-Remaining': rateLimit.remaining.toString(),
          'X-RateLimit-Reset': Math.ceil(rateLimit.resetTime / 1000).toString()
        }
      });
    }

    const filters: SearchFilters = {
      category: searchParams.get('category') || undefined,
      dateFrom: searchParams.get('date_from') || undefined,
      dateTo: searchParams.get('date_to') || undefined,
      sortBy: (searchParams.get('sort') as any) || 'relevance',
      limit: parseInt(searchParams.get('limit') || '20')
    };

    const searchResult = await searchService.search(query, filters, request, clientAddress);

    return new Response(JSON.stringify({
      success: true,
      ...searchResult
    }), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
        'X-RateLimit-Remaining': rateLimit.remaining.toString(),
        'X-RateLimit-Reset': Math.ceil(rateLimit.resetTime / 1000).toString(),
        'X-Search-Time': `${searchResult.took.toFixed(2)}ms`
      }
    });

  } catch (error) {
    const errorContext = {
      endpoint: '/api/search',
      ip: clientAddress,
      userAgent: request.headers.get('user-agent') || undefined
    };

    console.error('Search API error:', error);
    
    return secureErrorHandler.handleError(
      error instanceof Error ? error : new Error(String(error)), 
      'INTERNAL_SERVER_ERROR', 
      errorContext, 
      500
    );
  }
};

export const POST: APIRoute = async ({ request, clientAddress }) => {
  try {
    const clientId = getClientId(request, clientAddress);
    const rateLimit = checkFastRateLimit(clientId, 10, 60 * 1000);
    
    if (!rateLimit.allowed) {
      return createFastRateLimitResponse();
    }

    const body = await request.json();
    const { query, filters = {} } = body;

    if (!query || typeof query !== 'string' || query.trim().length < 2) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Query must be a string with at least 2 characters',
        results: [],
        total: 0
      }), {
        status: 400,
        headers: { 
          'Content-Type': 'application/json',
          'X-RateLimit-Remaining': rateLimit.remaining.toString(),
          'X-RateLimit-Reset': Math.ceil(rateLimit.resetTime / 1000).toString()
        }
      });
    }

    const searchResult = await searchService.search(query, filters, request, clientAddress);

    return new Response(JSON.stringify({
      success: true,
      ...searchResult
    }), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300',
        'X-RateLimit-Remaining': rateLimit.remaining.toString(),
        'X-RateLimit-Reset': Math.ceil(rateLimit.resetTime / 1000).toString(),
        'X-Search-Time': `${searchResult.took.toFixed(2)}ms`
      }
    });

  } catch (error) {
    const errorContext = {
      endpoint: '/api/search',
      ip: clientAddress,
      userAgent: request.headers.get('user-agent') || undefined
    };

    console.error('Search API POST error:', error);
    
    return secureErrorHandler.handleError(
      error instanceof Error ? error : new Error(String(error)), 
      'INTERNAL_SERVER_ERROR', 
      errorContext, 
      500
    );
  }
};
