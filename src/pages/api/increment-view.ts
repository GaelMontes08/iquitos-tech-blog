import type { APIRoute } from 'astro';
import { incrementPostViewCount } from '../../lib/views';

export const POST: APIRoute = async ({ request }) => {
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

    // Get the user agent for additional bot detection
    const userAgent = request.headers.get('user-agent') || '';
    
    // Server-side bot detection
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

    // Increment the view count
    console.log(`📊 Incrementing view count for post: ${slug}`);
    const newViewCount = await incrementPostViewCount(slug);
    console.log(`📊 New view count for ${slug}: ${newViewCount}`);

    return new Response(JSON.stringify({ 
      success: true, 
      views: newViewCount 
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });

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
