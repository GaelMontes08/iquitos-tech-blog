import type { APIRoute } from 'astro';
import { getAllPosts } from '@/lib/wp';

interface NewsPost {
  id: number;
  slug: string;
  date: string;
  modified?: string;
  status: string;
  title?: string;
  excerpt?: string;
  categories?: any[];
}

function formatNewsDate(date: string | Date): string {
  const d = new Date(date);
  return d.toISOString(); // Google News requires ISO 8601 format
}

function generateNewsSitemapXML(posts: NewsPost[]): string {
  const baseURL = 'https://iquitostech.com';
  
  const urlsXML = posts.map(post => {
    const publicationDate = formatNewsDate(post.date);
    const title = post.title?.replace(/[<>&"']/g, (char) => {
      const entities: { [key: string]: string } = {
        '<': '&lt;',
        '>': '&gt;',
        '&': '&amp;',
        '"': '&quot;',
        "'": '&apos;'
      };
      return entities[char] || char;
    }) || 'Sin título';

    return `
  <url>
    <loc>${baseURL}/posts/${post.slug}</loc>
    <news:news>
      <news:publication>
        <news:name>Iquitos Tech</news:name>
        <news:language>es</news:language>
      </news:publication>
      <news:publication_date>${publicationDate}</news:publication_date>
      <news:title>${title}</news:title>
      <news:keywords>tecnología, gaming, inteligencia artificial, Perú, Amazonía</news:keywords>
    </news:news>
    <lastmod>${formatNewsDate(post.modified || post.date)}</lastmod>
    <changefreq>hourly</changefreq>
    <priority>0.9</priority>
  </url>`;
  }).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
  ${urlsXML}
</urlset>`.trim();
}

export const GET: APIRoute = async () => {
  try {
    console.log('🗞️ Generating news sitemap...');
    
    // Get posts from last 2 days only (Google News requirement)
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    
    const allPosts = await getAllPosts(100); // Get recent posts
    
    // Filter posts from last 2 days and published status
    const recentPosts = allPosts.filter((post: NewsPost) => {
      if (post.status !== 'publish') return false;
      
      const postDate = new Date(post.date);
      return postDate >= twoDaysAgo;
    });

    console.log(`📰 Found ${recentPosts.length} news articles from last 2 days`);

    if (recentPosts.length === 0) {
      console.log('⚠️ No recent posts found for news sitemap');
      // Return empty but valid news sitemap
      const emptySitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
</urlset>`;
      
      return new Response(emptySitemap, {
        status: 200,
        headers: {
          'Content-Type': 'application/xml',
          'Cache-Control': 'public, max-age=300', // 5 minutes cache for news
        }
      });
    }

    const newsSitemapXML = generateNewsSitemapXML(recentPosts);
    
    console.log(`✅ Generated news sitemap with ${recentPosts.length} articles`);

    return new Response(newsSitemapXML, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=300', // 5 minutes cache for news sitemap
      }
    });

  } catch (error) {
    console.error('❌ Error generating news sitemap:', error);
    
    // Return empty but valid news sitemap on error
    const fallbackSitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
</urlset>`;

    return new Response(fallbackSitemap, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=60', // 1 minute cache on error
      }
    });
  }
};
