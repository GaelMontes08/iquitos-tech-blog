import type { APIRoute } from 'astro';
import { adSenseManager } from '../lib/adsense.js';

export const GET: APIRoute = async ({ request }) => {
  try {
    const adsContent = adSenseManager.generateAdsTxt();

    return new Response(adsContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'public, max-age=86400',
        'X-Content-Type-Options': 'nosniff',
        'X-Robots-Tag': 'noindex, nofollow',
        'Last-Modified': new Date().toUTCString()
      }
    });

  } catch (error) {
    console.error('Error serving ads.txt:', error);
    
    const fallbackContent = `# ads.txt file for iquitos-tech.com
# Error loading dynamic configuration - using fallback

# Google AdSense - Configure ADSENSE_PUBLISHER_ID environment variable
# google.com, pub-XXXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0

# Last updated: ${new Date().toISOString().split('T')[0]}
`;

    return new Response(fallbackContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
        'X-Content-Type-Options': 'nosniff'
      }
    });
  }
};
