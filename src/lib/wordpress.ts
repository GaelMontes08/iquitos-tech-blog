/**
 * WordPress data fetching and processing utilities
 * Handles post data extraction with SEO information
 */

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

/**
 * Parse WordPress content into distinct sections
 */
function parseWordPressContent(htmlContent: string) {
  if (!htmlContent) {
    return {
      puntosClave: '',
      mainContent: '',
      faqPairs: []
    };
  }

  // Extract "Puntos clave" section
  const puntosClaveRegex = /<h2[^>]*>\s*Puntos\s+clave\s*<\/h2>([\s\S]*?)(?=<h2[^>]*>|$)/i;
  const puntosClaveMatch = htmlContent.match(puntosClaveRegex);
  const puntosClave = puntosClaveMatch ? cleanWordPressHtml(puntosClaveMatch[1]) : '';

  // Extract "Preguntas frecuentes" section  
  const faqRegex = /<h2[^>]*>\s*Preguntas\s+frecuentes\s*<\/h2>([\s\S]*?)(?=<h2[^>]*>|$)/i;
  const faqMatch = htmlContent.match(faqRegex);
  const faqSection = faqMatch ? faqMatch[1].trim() : '';

  // Parse FAQ section into question/answer pairs
  const faqPairs: Array<{question: string, answer: string}> = [];
  if (faqSection) {
    // Split by h3 tags (questions)
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

  // Remove extracted sections from main content
  let mainContent = htmlContent;
  if (puntosClave) {
    mainContent = mainContent.replace(puntosClaveRegex, '');
  }
  if (faqSection) {
    mainContent = mainContent.replace(faqRegex, '');
  }

  // Clean and style the main content
  mainContent = cleanWordPressHtml(mainContent);

  return {
    puntosClave: puntosClave.trim(),
    mainContent: mainContent.trim(),
    faqPairs
  };
}

/**
 * Fetch and process post data from WordPress
 */
export async function getPostInfo(slug: string): Promise<PostInfo | null> {
  const domain = import.meta.env.WP_DOMAIN;
  const apiUrl = `https://${domain}/wp-json/wp/v2`;

  try {
    const response = await fetchWithTimeout(`${apiUrl}/posts?slug=${slug}&_embed`);
    if (!response.ok) throw new Error(`Error fetching post: ${response.status}`);
    
    const data = await response.json();
    if (!data || !data.length) return null;
    
    const post = data[0];
    
    // Parse the content
    const { puntosClave, mainContent, faqPairs } = parseWordPressContent(post.content?.rendered || '');
    
    // ENHANCED: Get featured image with better validation and fallback logic
    let featuredImage: string | undefined;
    let imageSource = 'none';
    
    // Method 1: Try embedded media (most reliable)
    if (post._embedded?.['wp:featuredmedia']?.[0]?.source_url) {
      featuredImage = post._embedded['wp:featuredmedia'][0].source_url;
      imageSource = 'embedded_media';
    }
    // Method 2: If no embedded media but there's a featured_media ID, fetch it directly
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
    
    // Method 3: Last resort - use Yoast og_image but validate it's reasonable
    if (!featuredImage && post.yoast_head_json?.og_image?.[0]?.url) {
      const yoastImage = post.yoast_head_json.og_image[0].url;
      featuredImage = yoastImage;
      imageSource = 'yoast_fallback';
      console.warn(`⚠️ Using Yoast og_image as fallback for post ${post.slug}. This might be the first content image, not the featured image.`);
    }

    // Validation logging
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
