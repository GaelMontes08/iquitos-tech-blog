declare global {
  interface ImportMetaEnv {
    readonly WP_DOMAIN?: string;
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}

const domain = import.meta.env.WP_DOMAIN;
const apiUrl = `https://${domain}/wp-json/wp/v2`;

export const getPageInfo = async (slug: string) => {
	const response = await fetch(`${apiUrl}/pages?slug=${slug}`);
    if (!response.ok) throw new Error(`Error fetching page info: ${response.statusText}`);   
    const [data] = await response.json();
    const { title: { rendered: title }, content: { rendered: content }, date } = data

    return { title, content, date }
}

export const getPostInfo = async (slug: string) => {
	const response = await fetch(`${apiUrl}/posts?slug=${slug}`);
    if (!response.ok) throw new Error(`Error fetching post info: ${response.statusText}`);
    const [data] = await response.json();
    const { title: { rendered: title }, content: { rendered: content }, date, yoast_head_json: seo } = data

    return { title, content, date, seo }
}

export const getLatestsPosts = async ({ perPage = 10}: { perPage?: number } = {}) => {
  const response = await fetch(`${apiUrl}/posts?per_page=${perPage}&_embed`);
  if (!response.ok) throw new Error(`Error fetching latest posts: ${response.statusText}`);

  const results = await response.json();
  if (!results.length) {
    throw new Error('No posts found');
  }

  const posts = results.map(post => {
    const title = post.title.rendered;
    const excerpt = post.excerpt.rendered;
    const content = post.content.rendered;
    const { date, slug } = post;
    const author = post._embedded.author?.[0]?.name || 'Redacción';
    const authorAvatar = post._embedded.author?.[0]?.avatar_urls?.['96']
    const featuredImage = post._embedded['wp:featuredmedia'][0].source_url;


    return { title, excerpt, content, date, slug, featuredImage, author, authorAvatar }
  });

  return posts

}