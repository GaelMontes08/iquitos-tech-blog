/**
 * SEO utilities for Yoast SEO data injection
 * Handles automatic meta tag generation from WordPress Yoast SEO plugin data
 */

/**
 * Replaces CMS domain with production domain in URLs and ensures correct URL structure
 */
export function replaceCMSDomain(url: string | undefined): string | undefined {
  if (!url) return url;
  const cmsDomain = 'cms-iquitostech.com';
  const prodDomain = 'iquitostech.com';
  const prodUrl = 'https://iquitostech.com';
  
  let result = url.replace(`https://${cmsDomain}`, prodUrl)
                  .replace(`http://${cmsDomain}`, prodUrl)
                  .replace(cmsDomain, prodDomain);
  
  // Ensure HTTPS for all production URLs
  if (result.includes('iquitostech.com') && !result.startsWith('https://')) {
    result = result.replace(/^http:\/\//, 'https://');
    if (!result.startsWith('http')) {
      result = `https://${result}`;
    }
  }
  
  return result;
}

/**
 * Fixes URL structure for Astro routing (adds /posts/ and /categoria/ paths)
 */
export function fixAstroUrlStructure(url: string | undefined, type: 'post' | 'category' | 'page' = 'post'): string | undefined {
  if (!url) return url;
  
  // If URL already has the correct structure, return as is
  if (url.includes('/posts/') || url.includes('/categoria/')) {
    return url;
  }
  
  // For static pages (like homepage, privacy, contact), don't modify the URL
  if (type === 'page') {
    return replaceCMSDomain(url);
  }
  
  // Static page patterns that should not get /posts/ prefix
  const staticPagePatterns = [
    '/',
    '/home',
    '/home/',
    '/privacy',
    '/contact', 
    '/about',
    '/404',
    '/debug-seo'
  ];
  
  const urlPath = url.replace(/^https?:\/\/[^\/]+/, ''); // Extract path from URL
  
  // Special handling for homepage - preserve www if present in input
  if (urlPath === '/home' || urlPath === '/home/') {
    const hasWww = url.includes('www.');
    return hasWww ? 'https://www.iquitostech.com' : 'https://iquitostech.com';
  }
  
  // Also handle homepage without www
  if (urlPath === '' || urlPath === '/') {
    return replaceCMSDomain(url);
  }
  
  if (staticPagePatterns.some(pattern => urlPath === pattern || urlPath === pattern + '/')) {
    return replaceCMSDomain(url);
  }
  
  // Remove trailing slash and extract the slug from the URL
  const cleanUrl = url.replace(/\/$/, '');
  const urlParts = cleanUrl.split('/');
  const slug = urlParts[urlParts.length - 1];
  
  // If we can't extract a slug, return the original URL
  if (!slug || slug.length === 0) {
    return replaceCMSDomain(url);
  }
  
  // Build the correct URL structure only for posts and categories
  const baseUrl = 'https://iquitostech.com';
  if (type === 'post') {
    return `${baseUrl}/posts/${slug}`;
  } else if (type === 'category') {
    return `${baseUrl}/categoria/${slug}`;
  }
  
  return replaceCMSDomain(url);
}

/**
 * Cleans titles by removing redundant domain references
 */
function cleanTitle(title: string | undefined): string | undefined {
  if (!title) return title;
  
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
}

/**
 * Processes Yoast SEO data to replace domains and ensure proper indexing
 */
export function processSEOData(seo: YoastSEO | undefined, urlType: 'post' | 'category' | 'page' = 'post'): YoastSEO | undefined {
  if (!seo) return seo;

  return {
    ...seo,
    // Replace domains in all URL fields and fix URL structure
    canonical: seo.canonical ? fixAstroUrlStructure(replaceCMSDomain(seo.canonical), urlType) : undefined,
    og_url: seo.og_url ? fixAstroUrlStructure(replaceCMSDomain(seo.og_url), urlType) : undefined,
    
    // Clean titles to remove domain references
    title: cleanTitle(seo.title),
    og_title: cleanTitle(seo.og_title),
    
    // Preserve keywords from various possible fields
    keywords: seo.keywords,
    focus_keyword: seo.focus_keyword,
    meta_keyword: seo.meta_keyword,
    
    // Ensure indexing is enabled (override Yoast if needed)
    robots: {
      ...seo.robots,
      index: 'index',  // Force indexing
      follow: 'follow' // Force following links
    },
    
    // Update site name and locale
    og_site_name: 'Iquitos Tech',
    og_locale: 'es_ES',
    
    // Process Twitter Card fields
    twitter_site: '@IquitosTech',
    twitter_creator: '@IquitosTech',
    
    // Process image URLs (keep original from CMS for images)
    og_image: seo.og_image?.map(img => ({
      ...img,
      // Keep original CMS URL for images since they're served from there
      url: img.url
    })),
    
    // Update schema URLs if present
    schema: seo.schema ? processSchemaURLs(seo.schema, urlType) : seo.schema
  };
}

/**
 * Processes schema URLs to replace CMS domain
 */
function processSchemaURLs(schema: any, urlType: 'post' | 'category' | 'page' = 'post'): any {
  if (!schema) return schema;
  
  const processValue = (value: any): any => {
    if (typeof value === 'string' && (value.includes('cms-iquitostech.com'))) {
      // For image URLs, keep the CMS domain
      if (value.includes('/wp-content/uploads/') || value.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) {
        return value;
      }
      // For other URLs, apply domain replacement and URL structure fix
      return fixAstroUrlStructure(replaceCMSDomain(value), urlType);
    }
    if (Array.isArray(value)) {
      return value.map(processValue);
    }
    if (typeof value === 'object' && value !== null) {
      const processed: any = {};
      for (const [key, val] of Object.entries(value)) {
        processed[key] = processValue(val);
      }
      return processed;
    }
    return value;
  };
  
  return processValue(schema);
}

// Type definitions for Yoast SEO data structure
export interface YoastSEO {
  title?: string;
  description?: string;
  keywords?: string; // Standard keywords field
  focus_keyword?: string; // Yoast focus keyword
  meta_keyword?: string; // Alternative keyword field
  robots?: {
    index?: string;
    follow?: string;
    'max-snippet'?: string;
    'max-image-preview'?: string;
    'max-video-preview'?: string;
  };
  canonical?: string;
  og_locale?: string;
  og_type?: string;
  og_title?: string;
  og_description?: string;
  og_url?: string;
  og_site_name?: string;
  article_published_time?: string;
  article_modified_time?: string;
  og_image?: Array<{
    width: number;
    height: number;
    url: string;
    type: string;
  }>;
  author?: string;
  twitter_card?: string;
  twitter_creator?: string;
  twitter_site?: string;
  twitter_label1?: string;
  twitter_data1?: string;
  twitter_label2?: string;
  twitter_data2?: string;
  schema?: {
    '@context'?: string;
    '@graph'?: Array<any>;
  };
}

export interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string; // Added keywords support
  canonical?: string;
  seo?: YoastSEO;
  image?: string;
  publishedTime?: string;
  modifiedTime?: string;
  author?: string;
  type?: 'website' | 'article';
  urlType?: 'post' | 'category' | 'page';
}

/**
 * Generates meta tags from Yoast SEO data
 */
export function generateSEOTags(props: SEOProps) {
  const { title, description, keywords, canonical, seo, image, publishedTime, modifiedTime, author, type = 'website', urlType = 'page' } = props;

  // Process SEO data to replace domains and ensure indexing
  const processedSEO = processSEOData(seo, urlType);

  // Fallback values with title cleaning
  const finalTitle = cleanTitle(processedSEO?.title || title) || 'Iquitos Tech';
  const finalDescription = processedSEO?.description || description || 'Noticias de tecnología, gaming y tendencias digitales';
  
  // Check multiple possible keyword fields from Yoast
  const finalKeywords = processedSEO?.keywords || 
                       processedSEO?.focus_keyword || 
                       processedSEO?.meta_keyword || 
                       keywords || 
                       'tecnología, gaming, videojuegos, noticias tech, iquitos tech, inteligencia artificial, programación';
  
  // Prioritize explicit canonical over SEO data canonical
  const finalCanonical = canonical 
    ? fixAstroUrlStructure(replaceCMSDomain(canonical), urlType)
    : processedSEO?.canonical || 'https://iquitostech.com';
  
  // For homepage, always use the canonical URL for og:url too
  const finalOgUrl = (urlType === 'page' && canonical) 
    ? finalCanonical 
    : processedSEO?.og_url || finalCanonical;
  // ENHANCED: Prioritize actual featured image over potentially incorrect Yoast og_image
  // The issue: Yoast might capture first content image instead of featured image
  let finalImage: string | undefined;
  
  if (image) {
    // Always prefer the explicitly passed featured image from WordPress API
    finalImage = image;
    console.log('✅ Using WordPress featured image:', image);
  } else if (processedSEO?.og_image?.[0]?.url) {
    // Only use Yoast og_image as fallback, but log this for debugging
    finalImage = processedSEO.og_image[0].url;
    console.log('⚠️ Fallback to Yoast og_image (may be incorrect):', finalImage);
  } else {
    console.log('❌ No image found - will use default fallback');
  }
  
  const siteName = processedSEO?.og_site_name || 'Iquitos Tech';

  return {
    // Basic meta tags
    title: finalTitle,
    description: finalDescription,
    keywords: finalKeywords,
    canonical: finalCanonical,
    robots: processedSEO?.robots || { index: 'index', follow: 'follow' },
    
    // Open Graph
    ogTitle: cleanTitle(processedSEO?.og_title) || finalTitle,
    ogDescription: processedSEO?.og_description || finalDescription,
    ogUrl: finalOgUrl,
    ogSiteName: siteName,
    ogType: processedSEO?.og_type || type,
    ogLocale: processedSEO?.og_locale || 'es_ES',
    ogImage: finalImage,
    ogImageWidth: processedSEO?.og_image?.[0]?.width,
    ogImageHeight: processedSEO?.og_image?.[0]?.height,
    ogImageType: processedSEO?.og_image?.[0]?.type,
    
    // Article specific
    articlePublishedTime: processedSEO?.article_published_time || publishedTime,
    articleModifiedTime: processedSEO?.article_modified_time || modifiedTime,
    articleAuthor: processedSEO?.author || author,
    
    // Twitter Cards
    twitterCard: processedSEO?.twitter_card || 'summary_large_image',
    twitterSite: processedSEO?.twitter_site || '@IquitosTech',
    twitterCreator: processedSEO?.twitter_creator || '@IquitosTech',
    twitterLabel1: processedSEO?.twitter_label1,
    twitterData1: processedSEO?.twitter_data1,
    twitterLabel2: processedSEO?.twitter_label2,
    twitterData2: processedSEO?.twitter_data2,
    
    // Schema (processed to replace URLs)
    schema: processedSEO?.schema
  };
}

/**
 * Generates robots meta content string with enforced indexing
 */
export function generateRobotsContent(robots?: YoastSEO['robots']): string {
  // Always ensure indexing is enabled
  const parts: string[] = ['index', 'follow'];
  
  // Add additional robot directives if present
  if (robots?.['max-snippet']) parts.push(`max-snippet:${robots['max-snippet']}`);
  if (robots?.['max-image-preview']) parts.push(`max-image-preview:${robots['max-image-preview']}`);
  if (robots?.['max-video-preview']) parts.push(`max-video-preview:${robots['max-video-preview']}`);
  
  return parts.join(', ');
}

/**
 * Safely stringifies JSON-LD schema data
 */
export function generateSchemaScript(schema?: YoastSEO['schema']): string | null {
  if (!schema) return null;
  
  try {
    return JSON.stringify(schema);
  } catch (error) {
    console.error('Error stringifying schema data:', error);
    return null;
  }
}

/**
 * Default SEO configuration for fallbacks
 */
export const defaultSEO: Partial<SEOProps> = {
  title: 'Iquitos Tech - Noticias de Tecnología y Gaming',
  description: 'Las últimas noticias de tecnología, videojuegos, inteligencia artificial y tendencias digitales. Mantente actualizado con Iquitos Tech.',
  type: 'website'
};

/**
 * Site-wide SEO configuration
 */
export const siteConfig = {
  siteName: 'Iquitos Tech',
  siteUrl: 'https://iquitostech.com',
  defaultImage: '/fallback-banner.webp',
  twitterHandle: '@IquitosTech',
  locale: 'es_ES',
  themeColor: '#2847d7'
};
