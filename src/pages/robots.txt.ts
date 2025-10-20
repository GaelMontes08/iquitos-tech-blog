import type { APIRoute } from 'astro';

export const GET: APIRoute = async () => {
  // Static robots.txt content that works for all crawlers including social media
  const robotsContent = `# Robots.txt for Iquitos Tech
# Social Media & Search Crawlers Welcome!

# Allow ALL crawlers full access
User-agent: *
Allow: /
Crawl-delay: 0

# Sitemaps
Sitemap: https://iquitostech.com/sitemap.xml
Sitemap: https://iquitostech.com/news-sitemap.xml

# Block only sensitive areas
Disallow: /api/debug
Disallow: /api/test
Disallow: /_dev/
Disallow: /admin/
Disallow: /_admin/`;

  return new Response(robotsContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
    }
  });
};