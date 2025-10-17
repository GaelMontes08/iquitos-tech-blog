import type { APIRoute } from 'astro';

// Social media platform endpoints for cache warming
const SOCIAL_PLATFORMS = {
  facebook: 'https://graph.facebook.com/?id={url}&scrape=true',
  linkedin: 'https://www.linkedin.com/sharing/share-offsite/?url={url}',
  twitter: 'https://publish.twitter.com/oembed?url={url}',
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { url, platforms = ['facebook', 'linkedin', 'twitter'] } = body;

    if (!url) {
      return new Response(JSON.stringify({
        success: false,
        error: 'URL is required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const results = [];

    // Warm cache for each platform
    for (const platform of platforms) {
      if (SOCIAL_PLATFORMS[platform as keyof typeof SOCIAL_PLATFORMS]) {
        try {
          const endpoint = SOCIAL_PLATFORMS[platform as keyof typeof SOCIAL_PLATFORMS].replace('{url}', encodeURIComponent(url));
          
          const response = await fetch(endpoint, {
            method: 'GET',
            headers: {
              'User-Agent': 'IquitosTech-CacheWarmer/1.0',
            }
          });

          results.push({
            platform,
            status: response.status,
            success: response.ok,
            cached: new Date().toISOString()
          });

          console.log(`✅ Cache warmed for ${platform}: ${url}`);
        } catch (error) {
          console.error(`❌ Failed to warm cache for ${platform}:`, error);
          results.push({
            platform,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
    }

    return new Response(JSON.stringify({
      success: true,
      url,
      results,
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Cache warming error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal server error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};