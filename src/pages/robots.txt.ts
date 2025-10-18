import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ request }) => {
  const userAgent = request.headers.get('user-agent') || '';
  
  // Detect social media crawlers (including X/Twitter bots)
  const isSocialCrawler = /facebookexternalhit|Facebot|Twitterbot|X-Bot|XBot|TwitterAPI|LinkedInBot|WhatsApp|TelegramBot|SkypeUriPreview|SlackBot|DiscordBot|redditbot|Pinterest|InstagramBot/i.test(userAgent);
  
  // Generate robots.txt content with explicit social media crawler support
  const robotsContent = `# Dynamic Robots.txt for Iquitos Tech
# Generated at: ${new Date().toISOString()}
# User-Agent: ${userAgent}

# Social Media Crawlers - Full Access
User-agent: Twitterbot
User-agent: X-Bot
User-agent: XBot
User-agent: TwitterAPI
User-agent: facebookexternalhit
User-agent: Facebot
User-agent: LinkedInBot
User-agent: WhatsApp
User-agent: TelegramBot
User-agent: SlackBot
User-agent: DiscordBot
Allow: /
Crawl-delay: 0

# Allow all other crawlers access to all content
User-agent: *
Allow: /
${isSocialCrawler ? 'Crawl-delay: 0' : 'Crawl-delay: 1'}

# Sitemaps
Sitemap: https://iquitostech.com/sitemap.xml
Sitemap: https://iquitostech.com/news-sitemap.xml

# Block sensitive areas (applies to all non-social crawlers)
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
Allow: /logo.svg
Allow: /*.jpg
Allow: /*.jpeg
Allow: /*.png
Allow: /*.webp
Allow: /*.gif`;

  return new Response(robotsContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain',
      'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
    }
  });
};