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
    
    const response = await fetchWithTimeout(`${apiUrl}/pages?slug=${slug}`);
    if (!response.ok) throw new Error(`Error fetching page info: ${response.status} ${response.statusText}`);   
    
    const data = await response.json();
    if (!data || !data.length) {
      throw new Error('No page data found');
    }
    
    const [page] = data;
    const rawTitle = page.title?.rendered || 'Iquitos Tech - Tecnología y Gaming';
    const rawContent = page.content?.rendered || 'Iquitos Tech es tu fuente confiable de noticias sobre tecnología, videojuegos y cultura digital. Explora lo último del mundo tech.';
    
    // Apply HTML entity decoding
    const title = decodeHtmlEntities(rawTitle);
    const content = decodeHtmlEntities(rawContent);
    const date = page.date;

    return { title, content, date };
  } catch (error) {
    console.error('Error in getPageInfo:', error);
    return { 
      title: 'Iquitos Tech - Tecnología y Gaming', 
      content: 'Iquitos Tech es tu fuente confiable de noticias sobre tecnología, videojuegos y cultura digital. Explora lo último del mundo tech.', 
      date: new Date().toISOString() 
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
    
    // Apply HTML entity decoding to title only (content may need HTML tags)
    const title = decodeHtmlEntities(rawTitle);
    const content = rawContent; // Keep content as-is for HTML formatting
    const date = post.date;
    const seo = post.yoast_head_json;

    return { title, content, date, seo };
  } catch (error) {
    console.error('Error in getPostInfo:', error);
    return { 
      title: 'Post no encontrado', 
      content: '<p>Este post no está disponible en este momento.</p>', 
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
      title: post.title?.rendered || 'Sin título',
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
        
        // Apply HTML entity decoding
        const title = decodeHtmlEntities(rawTitle);
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