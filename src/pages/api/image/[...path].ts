import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ params, request }) => {
  const path = params.path || '';
  const cmsDomain = import.meta.env.WP_DOMAIN || 'cms-iquitostech.com';
  const imageUrl = `https://${cmsDomain}/${path}`;

  try {
    // Fetch with timeout (5 seconds max)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(imageUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; IquitosTech/1.0)'
      }
    });

    clearTimeout(timeoutId);
    
    if (!response.ok) {
      console.error(`Image fetch failed: ${imageUrl} - Status: ${response.status}`);
      return new Response('Image not found', { status: 404 });
    }

    const contentType = response.headers.get('content-type') || 'image/webp';
    const imageBuffer = await response.arrayBuffer();

    return new Response(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Content-Type-Options': 'nosniff',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.error('Image fetch timeout:', imageUrl);
      return new Response('Request timeout', { status: 504 });
    }
    console.error('Error proxying image:', error);
    return new Response('Error loading image', { status: 500 });
  }
};

export const prerender = false;
