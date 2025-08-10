import type { APIRoute } from 'astro';
import { getAllPosts, getAllCategories } from '../lib/wp';

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

// Static pages that should be included in the sitemap
const STATIC_PAGES = [
  '',           // Homepage
  'about',
  'contact', 
  'faqs',
  'terms',
  'privacy',
  'newsletter',
  'posts',
  'editorial',    // Editorial Guidelines
  'corrections'   // Corrections Policy
];

interface SitemapURL {
  url: string;
  lastmod: string;
  changefreq: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority: number;
}

function formatDate(date: string | Date): string {
  const d = new Date(date);
  return d.toISOString().split('T')[0]; // Returns YYYY-MM-DD format
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

export const GET: APIRoute = async () => {
  try {
    const baseURL = 'https://iquitostech.com';
    const currentDate = formatDate(new Date());
    const urls: SitemapURL[] = [];

    // Add static pages
    STATIC_PAGES.forEach(page => {
      const url = page === '' ? baseURL : `${baseURL}/${page}`;
      const priority = page === '' ? 1.0 : 0.8; // Homepage gets highest priority
      const changefreq = page === '' ? 'daily' : 'weekly';
      
      urls.push({
        url,
        lastmod: currentDate,
        changefreq,
        priority
      });
    });

    // Fetch and add all blog posts from WordPress CMS
    console.log('🔍 Fetching posts for sitemap...');
    const posts: WordPressPost[] = await getAllPosts();
    
    if (posts && posts.length > 0) {
      posts.forEach((post: WordPressPost, index: number) => {
        // Skip posts that are not published
        if (post.status !== 'publish') return;
        
        const postDate = formatDate(post.date);
        const modifiedDate = formatDate(post.modified || post.date);
        
        // Higher priority for recent posts (for high-volume sites)
        let priority = 0.7;
        if (index < 10) priority = 0.9; // Last 10 posts get higher priority
        else if (index < 50) priority = 0.8; // Last 50 posts get medium-high priority
        
        // Recent posts change more frequently
        let changefreq: SitemapURL['changefreq'] = 'monthly';
        if (index < 7) changefreq = 'daily'; // This week's posts
        else if (index < 30) changefreq = 'weekly'; // This month's posts
        
        urls.push({
          url: `${baseURL}/posts/${post.slug}`,
          lastmod: modifiedDate,
          changefreq,
          priority
        });
      });
      
      console.log(`✅ Added ${posts.length} blog posts to sitemap`);
    }

    // Fetch and add category pages
    console.log('🔍 Fetching categories for sitemap...');
    const categories: WordPressCategory[] = await getAllCategories();
    
    if (categories && categories.length > 0) {
      categories.forEach((category: WordPressCategory) => {
        // Skip uncategorized and empty categories
        if (category.slug === 'uncategorized' || category.count === 0) return;
        
        urls.push({
          url: `${baseURL}/categoria/${category.slug}`,
          lastmod: currentDate,
          changefreq: 'weekly', // Categories update when new posts are added
          priority: 0.6
        });
      });
      
      console.log(`✅ Added ${categories.length} categories to sitemap`);
    }

    // Sort URLs by priority (highest first)
    urls.sort((a, b) => b.priority - a.priority);

    const sitemapXML = generateSitemapXML(urls);
    
    console.log(`📄 Generated sitemap with ${urls.length} URLs`);

    return new Response(sitemapXML, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=900', // Cache for 15 minutes (faster updates for daily posts)
      }
    });

  } catch (error) {
    console.error('❌ Error generating sitemap:', error);
    
    // Return a minimal sitemap with just the homepage if there's an error
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
        'Cache-Control': 'public, max-age=300', // Cache for 5 minutes on error
      }
    });
  }
};
