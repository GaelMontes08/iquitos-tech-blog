import { fetchWithTimeout } from './wp';
import { cleanWordPressHtml } from './content-transformer';

export interface PostInfo {
  id: number;
  title: string;
  content: string;
  puntosClave: string;
  faqPairs: Array<{question: string, answer: string}>;
  date: string;
  seo: any;
  categories: number[];
  featuredImage?: string;
  author: string;
  authorAvatar: string;
  excerpt: string;
  slug: string;
}

function parseWordPressContent(htmlContent: string) {
  if (!htmlContent) {
    return {
      puntosClave: '',
      mainContent: '',
      faqPairs: []
    };
  }

  const puntosClaveRegex = /<h2[^>]*>\s*Puntos\s+clave\s*<\/h2>([\s\S]*?)(?=<h2[^>]*>|$)/i;
  const puntosClaveMatch = htmlContent.match(puntosClaveRegex);
  const puntosClave = puntosClaveMatch ? cleanWordPressHtml(puntosClaveMatch[1]) : '';

  const faqRegex = /<h2[^>]*>\s*Preguntas\s+frecuentes\s*<\/h2>([\s\S]*?)(?=<h2[^>]*>|$)/i;
  const faqMatch = htmlContent.match(faqRegex);
  const faqSection = faqMatch ? faqMatch[1].trim() : '';

  const faqPairs: Array<{question: string, answer: string}> = [];
  if (faqSection) {
    const h3Regex = /<h3[^>]*>(.*?)<\/h3>([\s\S]*?)(?=<h3[^>]*>|$)/gi;
    let match;
    while ((match = h3Regex.exec(faqSection)) !== null) {
      const question = match[1].replace(/<[^>]*>/g, '').trim();
      const answer = cleanWordPressHtml(match[2]);
      if (question && answer) {
        faqPairs.push({ question, answer });
      }
    }
  }

  let mainContent = htmlContent;
  if (puntosClave) {
    mainContent = mainContent.replace(puntosClaveRegex, '');
  }
  if (faqSection) {
    mainContent = mainContent.replace(faqRegex, '');
  }
  mainContent = cleanWordPressHtml(mainContent);

  return {
    puntosClave: puntosClave.trim(),
    mainContent: mainContent.trim(),
    faqPairs
  };
}

export async function getPostInfo(slug: string): Promise<PostInfo | null> {
  const domain = import.meta.env.WP_DOMAIN;
  const apiUrl = `https://${domain}/wp-json/wp/v2`;

  try {
    const response = await fetchWithTimeout(`${apiUrl}/posts?slug=${slug}&_embed`);
    if (!response.ok) throw new Error(`Error fetching post: ${response.status}`);
    
    const data = await response.json();
    if (!data || !data.length) return null;
    
    const post = data[0];
    
    const { puntosClave, mainContent, faqPairs } = parseWordPressContent(post.content?.rendered || '');
    
    let featuredImage: string | undefined;
    let imageSource = 'none';
    
    if (post._embedded?.['wp:featuredmedia']?.[0]?.source_url) {
      featuredImage = post._embedded['wp:featuredmedia'][0].source_url;
      imageSource = 'embedded_media';
    }
    else if (post.featured_media) {
      try {
        const mediaResponse = await fetchWithTimeout(`${apiUrl}/media/${post.featured_media}`);
        if (mediaResponse.ok) {
          const mediaData = await mediaResponse.json();
          featuredImage = mediaData.source_url;
          imageSource = 'direct_media_api';
        }
      } catch (mediaError) {
        console.warn('Failed to fetch featured media directly:', mediaError);
      }
    }
    
    if (!featuredImage && post.yoast_head_json?.og_image?.[0]?.url) {
      const yoastImage = post.yoast_head_json.og_image[0].url;
      featuredImage = yoastImage;
      imageSource = 'yoast_fallback';
      console.warn(`⚠️ Using Yoast og_image as fallback for post ${post.slug}. This might be the first content image, not the featured image.`);
    }

    console.log(`🖼️ Image source for "${post.slug}": ${imageSource}`, {
      featuredMediaId: post.featured_media,
      hasEmbeddedMedia: !!post._embedded?.['wp:featuredmedia']?.[0],
      finalImageUrl: featuredImage,
      yoastImageAvailable: !!post.yoast_head_json?.og_image?.[0]?.url
    });
    
    return {
      id: post.id,
      title: post.title?.rendered || 'Sin título',
      content: mainContent,
      puntosClave,
      faqPairs,
      date: post.date,
      seo: post.yoast_head_json || {},
      categories: post.categories || [],
      featuredImage,
      author: post._embedded?.author?.[0]?.name || 'Redacción',
      authorAvatar: post._embedded?.author?.[0]?.avatar_urls?.['96'] || '/author.jpg',
      excerpt: post.excerpt?.rendered || '',
      slug: post.slug
    };
  } catch (error) {
    console.error('Error fetching post data:', error);
    return null;
  }
}
