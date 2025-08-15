import type { APIRoute } from 'astro';
import { incrementPostViewCount } from '../../lib/views';
import { checkAdvancedRateLimit, createRateLimitResponse, addRateLimitHeaders } from '../../lib/rate-limit.js';

export const POST: APIRoute = async ({ request }) => {
  const rateLimit = checkAdvancedRateLimit(request, 'views');
  
  if (!rateLimit.allowed) {
    return createRateLimitResponse(rateLimit.resetTime || Date.now() + 60000);
  }

  try {
    const body = await request.json();
    const { slug } = body;

    if (!slug) {
      return new Response(JSON.stringify({ error: 'Slug is required' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }

    const userAgent = request.headers.get('user-agent') || '';
    
    const botPatterns = [
      'googlebot', 'bingbot', 'slurp', 'duckduckbot', 'baiduspider',
      'yandexbot', 'facebookexternalhit', 'twitterbot', 'linkedinbot',
      'whatsapp', 'telegram', 'discord', 'crawler', 'spider', 'bot',
      'curl', 'wget', 'python-requests', 'postman'
    ];
    
    const isBot = botPatterns.some(pattern => 
      userAgent.toLowerCase().includes(pattern)
    );

    if (isBot) {
      console.log(`🤖 Bot detected (${userAgent}), not incrementing view for ${slug}`);
      return new Response(JSON.stringify({ 
        error: 'Bot traffic not counted',
        views: 0 
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }

    console.log(`📊 Incrementing view count for post: ${slug}`);
    const newViewCount = await incrementPostViewCount(slug);
    console.log(`📊 New view count for ${slug}: ${newViewCount}`);

    const successResponse = new Response(JSON.stringify({ 
      success: true, 
      views: newViewCount 
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (rateLimit.remaining !== undefined && rateLimit.resetTime) {
      return addRateLimitHeaders(successResponse, rateLimit.remaining, rateLimit.resetTime);
    }

    return successResponse;

  } catch (error) {
    console.error('Error incrementing view count:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error' 
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
};
