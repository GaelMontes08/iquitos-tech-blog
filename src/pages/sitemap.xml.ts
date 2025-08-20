import type { APIRoute } from 'astro';
import { getAllPosts, getAllCategories } from '@/lib/wp';
import { checkAdvancedRateLimit, createRateLimitResponse, addRateLimitHeaders } from '@/lib/rate-limit';

interface WordPressPost {
  id: number;
  slug: string;
  date: string;
  modified?: string;
  status: string;
}

interface WordPressCategory {
  id: number;
  slug: string;
  count: number;
}

const STATIC_PAGES = [
  '',
  'about',
  'contact', 
  'faqs',
  'terms',
  'privacy',
  'newsletter',
  'posts',
  'categorias',
  'editorial',
  'corrections'
];

interface SitemapURL {
  url: string;
  lastmod: string;
  changefreq: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority: number;
}

function formatDate(date: string | Date): string {
  const d = new Date(date);
  return d.toISOString().split('T')[0];
}

function generateSitemapXML(urls: SitemapURL[]): string {
  const urlsXML = urls.map(({ url, lastmod, changefreq, priority }) => `
  <url>
    <loc>${url}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${urlsXML}
</urlset>`.trim();
}

export const GET: APIRoute = async ({ request }) => {
  const rateLimit = checkAdvancedRateLimit(request, 'sitemap');
  
  if (!rateLimit.allowed) {
    console.log(`🚫 Sitemap request rate limited: ${rateLimit.reason || 'Rate limit exceeded'}`);
    return createRateLimitResponse(rateLimit.resetTime || Date.now() + 60000);
  }

  try {
    const baseURL = 'https://iquitostech.com';
    const currentDate = formatDate(new Date());
    const urls: SitemapURL[] = [];

    // Add static pages
    STATIC_PAGES.forEach(page => {
      const url = page === '' ? baseURL : `${baseURL}/${page}`;
      const priority = page === '' ? 1.0 : 0.8;
      const changefreq = page === '' ? 'daily' : 'weekly';
      
      urls.push({
        url,
        lastmod: currentDate,
        changefreq,
        priority
      });
    });

    console.log('🔍 Fetching posts for sitemap...');
    const posts: WordPressPost[] = await getAllPosts();
    
    if (posts && posts.length > 0) {
      posts.forEach((post: WordPressPost, index: number) => {
        if (post.status !== 'publish') return;
        
        const postDate = formatDate(post.date);
        const modifiedDate = formatDate(post.modified || post.date);
        
        let priority = 0.7;
        if (index < 10) priority = 0.9;
        else if (index < 50) priority = 0.8;
        
        let changefreq: SitemapURL['changefreq'] = 'monthly';
        if (index < 7) changefreq = 'daily';
        else if (index < 30) changefreq = 'weekly';
        
        urls.push({
          url: `${baseURL}/posts/${post.slug}`,
          lastmod: modifiedDate,
          changefreq,
          priority
        });
      });
      
      console.log(`✅ Added ${posts.length} blog posts to sitemap`);
    }

    console.log('🔍 Fetching categories for sitemap...');
    const categories: WordPressCategory[] = await getAllCategories();
    
    if (categories && categories.length > 0) {
      categories.forEach((category: WordPressCategory) => {
        if (category.slug === 'uncategorized' || category.count === 0) return;
        
        urls.push({
          url: `${baseURL}/categoria/${category.slug}`,
          lastmod: currentDate,
          changefreq: 'weekly',
          priority: 0.6
        });
      });
      
      console.log(`✅ Added ${categories.length} categories to sitemap`);
    }

    urls.sort((a, b) => b.priority - a.priority);

    const sitemapXML = generateSitemapXML(urls);
    
    console.log(`📄 Generated sitemap with ${urls.length} URLs`);

    const sitemapResponse = new Response(sitemapXML, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=900',
      }
    });

    if (rateLimit.remaining !== undefined && rateLimit.resetTime) {
      return addRateLimitHeaders(sitemapResponse, rateLimit.remaining, rateLimit.resetTime);
    }

    return sitemapResponse;

  } catch (error) {
    console.error('❌ Error generating sitemap:', error);
    
    const fallbackSitemap = generateSitemapXML([{
      url: 'https://iquitostech.com',
      lastmod: formatDate(new Date()),
      changefreq: 'daily',
      priority: 1.0
    }]);

    return new Response(fallbackSitemap, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=300',
      }
    });
  }
};
