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
  tags?: number[];
}

export interface RelatedPost {
  id: number;
  title: string;
  excerpt: string;
  slug: string;
  date: string;
  image?: string;
  categories: any[];
  tags?: any[];
  score: number;
  reason: string;
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
      tags: post.tags || [],
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

/**
 * Advanced Related Posts Algorithm
 * Scores posts based on multiple factors: categories, tags, keywords, and recency
 */
export async function getRelatedPosts(currentPost: PostInfo, limit: number = 4): Promise<RelatedPost[]> {
  const domain = import.meta.env.WP_DOMAIN;
  const apiUrl = `https://${domain}/wp-json/wp/v2`;
  
  try {
    // Fetch recent posts with embedded data
    const response = await fetchWithTimeout(
      `${apiUrl}/posts?exclude=${currentPost.id}&per_page=20&_embed&orderby=date&order=desc`
    );
    
    if (!response.ok) {
      console.error('Failed to fetch posts for related algorithm');
      return [];
    }
    
    const posts = await response.json();
    const scoredPosts: RelatedPost[] = [];
    
    // Extract keywords from current post title and content
    const currentKeywords = extractKeywords(currentPost.title + ' ' + currentPost.content);
    
    for (const post of posts) {
      let score = 0;
      let reasons: string[] = [];
      
      // 1. Category matching (highest weight)
      const categoryMatches = post.categories?.filter((cat: number) => 
        currentPost.categories.includes(cat)
      ) || [];
      
      if (categoryMatches.length > 0) {
        const categoryScore = categoryMatches.length * 40; // 40 points per matching category
        score += categoryScore;
        reasons.push(`${categoryMatches.length} categoría${categoryMatches.length > 1 ? 's' : ''} compartida${categoryMatches.length > 1 ? 's' : ''}`);
      }
      
      // 2. Tag matching (medium weight)
      const tagMatches = post.tags?.filter((tag: number) => 
        currentPost.tags?.includes(tag)
      ) || [];
      
      if (tagMatches.length > 0) {
        const tagScore = tagMatches.length * 20; // 20 points per matching tag
        score += tagScore;
        reasons.push(`${tagMatches.length} etiqueta${tagMatches.length > 1 ? 's' : ''} compartida${tagMatches.length > 1 ? 's' : ''}`);
      }
      
      // 3. Title similarity (medium weight)
      const postTitle = post.title?.rendered || '';
      const titleSimilarity = calculateTextSimilarity(currentPost.title, postTitle);
      if (titleSimilarity > 0.3) {
        const titleScore = Math.round(titleSimilarity * 25); // Up to 25 points
        score += titleScore;
        reasons.push('título similar');
      }
      
      // 4. Content keyword matching (medium weight)
      const postContent = post.excerpt?.rendered || '';
      const postKeywords = extractKeywords(postTitle + ' ' + postContent);
      const keywordMatches = countCommonKeywords(currentKeywords, postKeywords);
      
      if (keywordMatches > 0) {
        const keywordScore = Math.min(keywordMatches * 5, 15); // Up to 15 points
        score += keywordScore;
        reasons.push('palabras clave relacionadas');
      }
      
      // 5. Recency bonus (low weight)
      const postDate = new Date(post.date);
      const currentDate = new Date();
      const daysDiff = Math.abs((currentDate.getTime() - postDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff <= 30) {
        const recencyScore = Math.round((30 - daysDiff) / 30 * 10); // Up to 10 points for recent posts
        score += recencyScore;
        if (daysDiff <= 7) {
          reasons.push('publicado recientemente');
        }
      }
      
      // 6. Same author bonus (low weight)
      const postAuthor = post._embedded?.author?.[0]?.name || 'Redacción';
      if (postAuthor === currentPost.author && postAuthor !== 'Redacción') {
        score += 8;
        reasons.push('mismo autor');
      }
      
      // Only include posts with meaningful scores
      if (score >= 10) {
        scoredPosts.push({
          id: post.id,
          title: postTitle,
          excerpt: post.excerpt?.rendered || '',
          slug: post.slug,
          date: post.date,
          image: post._embedded?.['wp:featuredmedia']?.[0]?.source_url,
          categories: post._embedded?.['wp:term']?.[0] || [],
          tags: post._embedded?.['wp:term']?.[1] || [],
          score,
          reason: reasons.join(', ')
        });
      }
    }
    
    // Sort by score (descending) and return top results
    const sortedPosts = scoredPosts
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
    
    console.log(`🎯 Related posts algorithm for "${currentPost.title}":`, {
      totalCandidates: posts.length,
      scoredPosts: scoredPosts.length,
      finalResults: sortedPosts.length,
      topScores: sortedPosts.map(p => ({ title: p.title, score: p.score, reason: p.reason }))
    });
    
    return sortedPosts;
    
  } catch (error) {
    console.error('Error in advanced related posts algorithm:', error);
    return [];
  }
}

/**
 * Extract meaningful keywords from text
 */
function extractKeywords(text: string): string[] {
  if (!text) return [];
  
  // Clean and normalize text
  const cleanText = text
    .toLowerCase()
    .replace(/<[^>]*>/g, ' ') // Remove HTML tags
    .replace(/[^\w\sáéíóúñü]/g, ' ') // Remove special characters, keep Spanish chars
    .replace(/\s+/g, ' ')
    .trim();
  
  // Spanish stop words
  const stopWords = new Set([
    'el', 'la', 'de', 'que', 'y', 'a', 'en', 'un', 'es', 'se', 'no', 'te', 'lo', 'le', 'da', 'su', 'por', 'son',
    'con', 'para', 'como', 'las', 'del', 'los', 'una', 'son', 'por', 'pero', 'sus', 'le', 'ya', 'o', 'porque',
    'cuando', 'muy', 'sin', 'sobre', 'también', 'me', 'hasta', 'hay', 'donde', 'quien', 'desde', 'todo', 'nos',
    'durante', 'todos', 'uno', 'les', 'ni', 'contra', 'otros', 'ese', 'eso', 'ante', 'ellos', 'e', 'esto', 'mí',
    'antes', 'algunos', 'qué', 'unos', 'yo', 'otro', 'otras', 'otra', 'él', 'tanto', 'esa', 'estos', 'mucho',
    'quienes', 'nada', 'muchos', 'cual', 'poco', 'ella', 'estar', 'estas', 'algunas', 'algo', 'nosotros', 'mi',
    'mis', 'tú', 'te', 'ti', 'tu', 'tus', 'ellas', 'nosotras', 'vosotros', 'vosotras', 'os', 'mío', 'mía',
    'míos', 'mías', 'tuyo', 'tuya', 'tuyos', 'tuyas', 'suyo', 'suya', 'suyos', 'suyas', 'nuestro', 'nuestra',
    'nuestros', 'nuestras', 'vuestro', 'vuestra', 'vuestros', 'vuestras', 'esos', 'esas', 'estoy', 'estás',
    'está', 'estamos', 'estáis', 'están', 'esté', 'estés', 'estemos', 'estéis', 'estén', 'estaré', 'estarás',
    'estará', 'estaremos', 'estaréis', 'estarán', 'estaría', 'estarías', 'estaríamos', 'estaríais', 'estarían',
    'estaba', 'estabas', 'estábamos', 'estabais', 'estaban', 'estuve', 'estuviste', 'estuvo', 'estuvimos',
    'estuvisteis', 'estuvieron'
  ]);
  
  // Extract words, filter stop words and short words
  const words = cleanText
    .split(' ')
    .filter(word => word.length >= 3 && !stopWords.has(word))
    .slice(0, 20); // Limit to top 20 keywords
  
  return [...new Set(words)]; // Remove duplicates
}

/**
 * Calculate text similarity between two strings using word overlap
 */
function calculateTextSimilarity(text1: string, text2: string): number {
  const words1 = extractKeywords(text1);
  const words2 = extractKeywords(text2);
  
  if (words1.length === 0 || words2.length === 0) return 0;
  
  const commonWords = words1.filter(word => words2.includes(word));
  const totalWords = Math.max(words1.length, words2.length);
  
  return commonWords.length / totalWords;
}

/**
 * Count common keywords between two keyword arrays
 */
function countCommonKeywords(keywords1: string[], keywords2: string[]): number {
  return keywords1.filter(keyword => keywords2.includes(keyword)).length;
}
