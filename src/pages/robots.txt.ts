import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ request }) => {
  const userAgent = request.headers.get('user-agent') || '';
  
  // Detect social media crawlers
  const isSocialCrawler = /facebookexternalhit|Facebot|Twitterbot|X-Bot|XBot|LinkedInBot|WhatsApp|TelegramBot|SkypeUriPreview|SlackBot|DiscordBot|redditbot|Pinterest|InstagramBot/i.test(userAgent);
  
  // Generate robots.txt content
  const robotsContent = `# Dynamic Robots.txt for Iquitos Tech
# Generated at: ${new Date().toISOString()}
# User-Agent: ${userAgent}

# Allow all crawlers access to all content
User-agent: *
Allow: /
${isSocialCrawler ? 'Crawl-delay: 0' : 'Crawl-delay: 1'}

# Sitemaps
Sitemap: https://iquitostech.com/sitemap.xml
Sitemap: https://iquitostech.com/news-sitemap.xml

# Block sensitive areas
Disallow: /api/debug*
Disallow: /api/test*
Disallow: /_dev/
Disallow: /.well-known/
Disallow: /admin/
Disallow: /_admin/
Disallow: /_astro/

# Block sensitive file patterns
Disallow: /*.json$
Disallow: /*.log$
Disallow: /*.config.*$
Disallow: /*?debug*
Disallow: /*?test*

# Explicit allows for important content
Allow: /posts/
Allow: /categoria/
Allow: /categorias
Allow: /trends
Allow: /about
Allow: /contact
Allow: /newsletter

# Important files
Allow: /sitemap.xml
Allow: /robots.txt
Allow: /favicon.ico
Allow: /logo.svg`;

  return new Response(robotsContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain',
      'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      'X-Robots-Tag': 'noindex, nofollow', // Don't index the robots.txt itself
    }
  });
};