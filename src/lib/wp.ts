declare global {
  interface ImportMetaEnv {
    readonly WP_DOMAIN?: string;
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}

const domain = import.meta.env.WP_DOMAIN;

if (!domain) {
  console.error('WP_DOMAIN environment variable is not set');
}

// Validate domain format
const isValidDomain = (domain: string) => {
  const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*$/;
  return domainRegex.test(domain);
};

if (!domain) {
  console.error('WP_DOMAIN environment variable is not set');
} else if (!isValidDomain(domain)) {
  console.error('WP_DOMAIN has invalid format:', domain);
} else {
  console.log('Using WordPress domain:', domain);
}

const apiUrl = `https://${domain}/wp-json/wp/v2`;

// Add timeout and retry logic
export const fetchWithTimeout = async (url: string, options: RequestInit = {}, timeout = 10000) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'User-Agent': 'Astro-Site/1.0',
        'Accept': 'application/json',
        'Cache-Control': 'no-cache',
        ...options.headers,
      }
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error: any) {
    clearTimeout(timeoutId);
    
    // Log specific error types
    if (error.code === 'ENOTFOUND' || error.errno === -3008) {
      console.error(`DNS resolution failed for domain: ${domain}`);
      console.error('Check if the WordPress domain is correct and accessible');
    } else if (error.name === 'AbortError') {
      console.error('Request timed out');
    } else {
      console.error('Fetch error:', error);
    }
    
    throw error;
  }
};

export const getPageInfo = async (slug: string) => {
  try {
    if (!domain) {
      throw new Error('WP_DOMAIN not configured');
    }
    
    const response = await fetchWithTimeout(`${apiUrl}/pages?slug=${slug}&_fields=id,title,content,date,yoast_head,yoast_head_json`);
    if (!response.ok) throw new Error(`Error fetching page info: ${response.status} ${response.statusText}`);   
    
    const data = await response.json();
    if (!data || !data.length) {
      throw new Error('No page data found');
    }
    
    const [page] = data;
    const rawTitle = page.title?.rendered || 'Iquitos Tech - Tecnología y Gaming';
    const rawContent = page.content?.rendered || 'Iquitos Tech es tu fuente confiable de noticias sobre tecnología, videojuegos y cultura digital. Explora lo último del mundo tech.';
    
    // Apply HTML entity decoding and title cleaning
    const title = cleanTitle(decodeHtmlEntities(rawTitle));
    const content = decodeHtmlEntities(rawContent);
    const date = page.date;
    const seo = page.yoast_head_json;

    return { title, content, date, seo };
  } catch (error) {
    console.error('Error in getPageInfo:', error);
    return { 
      title: 'Iquitos Tech - Tecnología y Gaming', 
      content: 'Iquitos Tech es tu fuente confiable de noticias sobre tecnología, videojuegos y cultura digital. Explora lo último del mundo tech.', 
      date: new Date().toISOString(),
      seo: undefined
    };
  }
}

export const getPostInfo = async (slug: string) => {
  try {
    if (!domain) {
      throw new Error('WP_DOMAIN not configured');
    }
    
    const response = await fetchWithTimeout(`${apiUrl}/posts?slug=${slug}`);
    if (!response.ok) throw new Error(`Error fetching post info: ${response.status} ${response.statusText}`);
    
    const data = await response.json();
    if (!data || !data.length) {
      throw new Error('No post data found');
    }
    
    const [post] = data;
    const rawTitle = post.title?.rendered || 'Post no encontrado';
    const rawContent = post.content?.rendered || '<p>Este post no está disponible en este momento.</p>';
    
    // Apply HTML entity decoding and title cleaning
    const title = cleanTitle(decodeHtmlEntities(rawTitle));
    const date = post.date;
    const seo = post.yoast_head_json;

    // Extract different sections using regex
    const extractSection = (content: string, sectionTitle: string) => {
      // Match the section heading and capture content until the next h2 or end of string
      const regex = new RegExp(
        `<h2[^>]*>\\s*${sectionTitle}\\s*</h2>([\\s\\S]*?)(?=<h2[^>]*>|$)`,
        'i'
      );
      const match = content.match(regex);
      return match ? match[1].trim() : '';
    };

    // Remove section from content
    const removeSection = (content: string, sectionTitle: string) => {
      const regex = new RegExp(
        `<h2[^>]*>\\s*${sectionTitle}\\s*</h2>[\\s\\S]*?(?=<h2[^>]*>|$)`,
        'i'
      );
      return content.replace(regex, '').trim();
    };

    // Extract sections
    const puntosClave = extractSection(rawContent, 'Puntos clave');
    const faqs = extractSection(rawContent, 'Preguntas frecuentes');
    
    // Remove extracted sections from main content
    let content = rawContent;
    if (puntosClave) {
      content = removeSection(content, 'Puntos clave');
    }
    if (faqs) {
      content = removeSection(content, 'Preguntas frecuentes');
    }

    return { title, date, seo, puntosClave, content, faqs };
  } catch (error) {
    console.error('Error in getPostInfo:', error);
    return { 
      title: 'Post no encontrado', 
      content: '<p>Este post no está disponible en este momento.</p>',
      puntosClave: '',
      faqs: '',
      date: new Date().toISOString(), 
      seo: {} 
    };
  }
}

export const getFeaturedPosts = async ({ 
  perPage = 2, 
  categoryId = 25
}) => {
  try {
    if (!domain) {
      throw new Error('WP_DOMAIN not configured');
    }

    const response = await fetchWithTimeout(`${apiUrl}/posts?per_page=${perPage}&category=${categoryId}&_embed`);
    if (!response.ok) throw new Error(`Error fetching featured posts: ${response.status} ${response.statusText}`);

    const data = await response.json();
    return data.map((post: any) => ({
      id: post.id,
      title: cleanTitle(decodeHtmlEntities(post.title?.rendered || 'Sin título')),
      excerpt: post.excerpt?.rendered || '',
      content: post.content?.rendered || '',
      date: post.date,
      slug: post.slug,
      featuredImage: post._embedded?.['wp:featuredmedia']?.[0]?.source_url,
      author: post._embedded?.author?.[0]?.name || 'Redacción',
      authorAvatar: post._embedded?.author?.[0]?.avatar_urls?.['96'] || '/author.jpg',
      categories: post._embedded?.['wp:term']?.[0] || []
    }));
  } catch (error) {
    console.error('Error in getFeaturedPosts:', error);
    return [];
  }
};

export const getLatestsPosts = async ({ perPage = 10 }: { perPage?: number } = {}) => {
  try {
    if (!domain) {
      console.warn('WP_DOMAIN not configured, returning fallback posts');
      return getFallbackPosts();
    }
    
    // Add cache busting parameter and exclude category 25
    const cacheBuster = Date.now();
    const url = `${apiUrl}/posts?per_page=${perPage}&categories_exclude=25&_embed&t=${cacheBuster}`;
    console.log('Fetching posts from:', url);
    
    const response = await fetchWithTimeout(url);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const results = await response.json();
    if (!results || !Array.isArray(results) || !results.length) {
      console.warn('No posts found, returning fallback');
      return getFallbackPosts();
    }

    const posts = results.map(post => {
      try {
        const rawTitle = post.title?.rendered || 'Sin título';
        const rawExcerpt = post.excerpt?.rendered || '';
        
        // Apply HTML entity decoding and title cleaning
        const title = cleanTitle(decodeHtmlEntities(rawTitle));
        const excerpt = decodeHtmlEntities(rawExcerpt.replace(/<[^>]*>/g, '')); // Also remove HTML tags from excerpt
        
        const content = post.content?.rendered || '';
        const { date, slug } = post;
        const author = post._embedded?.author?.[0]?.name || 'Redacción';
        const authorAvatar = post._embedded?.author?.[0]?.avatar_urls?.['96'] || '/author.jpg';
        const featuredImage = post._embedded?.['wp:featuredmedia']?.[0]?.source_url;
        const categories = post._embedded?.['wp:term']?.[0] || [];

        return { 
          id: post.id,
          title, 
          excerpt, 
          content, 
          date, 
          slug, 
          featuredImage, 
          author, 
          authorAvatar,
          categories
        };
      } catch (postError) {
        console.error('Error processing post:', postError);
        return null;
      }
    }).filter(Boolean);

    return posts;
  } catch (error) {
    console.error('Error in getLatestsPosts:', error);
    console.log('Returning fallback posts due to error');
    return getFallbackPosts();
  }
}

// Get all posts for sitemap generation (optimized for high-volume sites)
export const getAllPosts = async (maxPosts = 500) => {
  try {
    if (!domain) {
      console.warn('WP_DOMAIN not configured');
      return [];
    }

    const posts = [];
    let page = 1;
    const perPage = 100; // WordPress API max per page is 100

    while (posts.length < maxPosts) {
      const response = await fetchWithTimeout(
        `${apiUrl}/posts?per_page=${perPage}&page=${page}&_fields=id,slug,date,modified,status&orderby=modified&order=desc`
      );
      
      if (!response.ok) {
        if (response.status === 400 && page > 1) {
          // No more pages
          break;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const pagePosts = await response.json();
      if (!pagePosts || !Array.isArray(pagePosts) || pagePosts.length === 0) {
        break;
      }

      posts.push(...pagePosts);
      
      // If we got less than perPage posts, we've reached the end
      if (pagePosts.length < perPage) {
        break;
      }

      page++;
    }

    return posts.slice(0, maxPosts); // Limit to most recent posts for performance
  } catch (error) {
    console.error('Error in getAllPosts:', error);
    return [];
  }
};

// Get all categories for sitemap generation
export const getAllCategories = async () => {
  try {
    if (!domain) {
      console.warn('WP_DOMAIN not configured');
      return [];
    }

    const response = await fetchWithTimeout(
      `${apiUrl}/categories?per_page=100&_fields=id,slug,count`
    );
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const categories = await response.json();
    return categories || [];
  } catch (error) {
    console.error('Error in getAllCategories:', error);
    return [];
  }
};

// Fallback posts for when WordPress is unavailable
const getFallbackPosts = () => {
  return [
    {
      id: 1,
      title: 'Últimas noticias de tecnología',
      excerpt: 'Mantente actualizado con las últimas tendencias en tecnología y gaming.',
      content: '<p>Contenido de ejemplo mientras cargamos las noticias reales.</p>',
      date: new Date().toISOString(),
      slug: 'noticias-tecnologia',
      featuredImage: '',
      author: 'Redacción',
      authorAvatar: '/author.jpg',
      categories: [{ name: 'Tecnología' }]
    },
    {
      id: 2,
      title: 'Gaming: Nuevos lanzamientos',
      excerpt: 'Los juegos más esperados del año.',
      content: '<p>Contenido de ejemplo sobre gaming.</p>',
      date: new Date().toISOString(),
      slug: 'gaming-lanzamientos',
      featuredImage: '',
      author: 'Redacción',
      authorAvatar: '/author.jpg',
      categories: [{ name: 'Gaming' }]
    },
    // Add more fallback posts as needed...
  ];
};

export const testConnection = async () => {
  try {
    if (!domain) {
      console.log('WP_DOMAIN not set');
      return false;
    }
    
    console.log('Testing connection to:', apiUrl);
    const response = await fetchWithTimeout(`${apiUrl}/posts?per_page=1`, {}, 5000);
    console.log('Response status:', response.status);
    console.log('Response ok:', response.ok);
    return response.ok;
  } catch (error) {
    console.error('Connection test failed:', error);
    return false;
  }
};

/**
 * Cleans titles by removing redundant domain references
 */
const cleanTitle = (title: string): string => {
  return title
    // Remove complete domain references first (most specific to least specific)
    .replace(/\s*[-|–—]\s*cms-iquitostech\.com/gi, '')
    .replace(/\s*\|\s*cms-iquitostech\.com/gi, '')
    .replace(/\s*[-|–—]\s*iquitostech\.com/gi, '')
    .replace(/\s*\|\s*iquitostech\.com/gi, '')
    // Remove any remaining "- cms" or "| cms" patterns
    .replace(/\s*[-|–—]\s*cms\s*$/gi, '')
    .replace(/\s*\|\s*cms\s*$/gi, '')
    // Remove any trailing separators that might be left
    .replace(/\s*[-|–—]\s*$/, '')
    .replace(/\s*\|\s*$/, '')
    .trim();
};

  // More comprehensive HTML entity decoder
const decodeHtmlEntities = (text: string): string => {
  if (typeof document !== 'undefined') {
    // Browser environment
    const textarea = document.createElement('textarea');
    textarea.innerHTML = text;
    return textarea.value;
  } else {
    // Server-side fallback
    const entities: Record<string, string> = {
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>',
      '&quot;': '"',
      '&#039;': "'",
      '&#8211;': '–',
      '&#8212;': '—',
      '&#8216;': '‘',
      '&#8217;': '’',
      '&#8220;': '“',
      '&#8221;': '”',
      '&#8230;': '…',
    };

    return text.replace(/&[#\w]+;/g, (entity) => {
      return entities[entity] || entity;
    });
  }
};