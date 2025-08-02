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

const apiUrl = `https://${domain}/wp-json/wp/v2`;

export const getPageInfo = async (slug: string) => {
  try {
    const response = await fetch(`${apiUrl}/pages?slug=${slug}`);
    if (!response.ok) throw new Error(`Error fetching page info: ${response.statusText}`);   
    const [data] = await response.json();
    const { title: { rendered: title }, content: { rendered: content }, date } = data

    return { title, content, date }
  } catch (error) {
    console.error('Error in getPageInfo:', error);
    return { title: 'Error loading page', content: '', date: new Date().toISOString() };
  }
}

export const getPostInfo = async (slug: string) => {
  try {
    const response = await fetch(`${apiUrl}/posts?slug=${slug}`);
    if (!response.ok) throw new Error(`Error fetching post info: ${response.statusText}`);
    const [data] = await response.json();
    const { title: { rendered: title }, content: { rendered: content }, date, yoast_head_json: seo } = data

    return { title, content, date, seo }
  } catch (error) {
    console.error('Error in getPostInfo:', error);
    return { title: 'Error loading post', content: '', date: new Date().toISOString(), seo: {} };
  }
}

export const getLatestsPosts = async ({ perPage = 10}: { perPage?: number } = {}) => {
  try {
    const response = await fetch(`${apiUrl}/posts?per_page=${perPage}&_embed`);
    if (!response.ok) throw new Error(`Error fetching latest posts: ${response.statusText}`);

    const results = await response.json();
    if (!results.length) {
      console.warn('No posts found');
      return [];
    }

    const posts = results.map(post => {
      const title = post.title.rendered;
      const excerpt = post.excerpt.rendered;
      const content = post.content.rendered;
      const { date, slug } = post;
      const author = post._embedded?.author?.[0]?.name || 'Redacción';
      const authorAvatar = post._embedded?.author?.[0]?.avatar_urls?.['96'] || '/author.jpg';
      const featuredImage = post._embedded?.['wp:featuredmedia']?.[0]?.source_url || '/placeholder.jpg';

      return { title, excerpt, content, date, slug, featuredImage, author, authorAvatar }
    });

    return posts;
  } catch (error) {
    console.error('Error in getLatestsPosts:', error);
    return [];
  }
}

  export const testConnection = async () => {
    try {
      console.log('Testing connection to:', apiUrl);
      const response = await fetch(`${apiUrl}/posts?per_page=1`);
      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);
      return response.ok;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  };