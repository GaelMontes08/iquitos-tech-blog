import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ params, request }) => {
  const path = params.path || '';
  const cmsDomain = import.meta.env.WP_DOMAIN || 'cms-iquitostech.com';
  const imageUrl = `https://${cmsDomain}/${path}`;

  try {
    const response = await fetch(imageUrl);
    
    if (!response.ok) {
      return new Response('Image not found', { status: 404 });
    }

    const contentType = response.headers.get('content-type') || 'image/webp';
    const imageBuffer = await response.arrayBuffer();

    return new Response(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Content-Type-Options': 'nosniff'
      }
    });
  } catch (error) {
    console.error('Error proxying image:', error);
    return new Response('Error loading image', { status: 500 });
  }
};

export const prerender = false;
