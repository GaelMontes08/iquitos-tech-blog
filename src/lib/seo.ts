/**
 * SEO utilities for Yoast SEO data injection
 * Handles automatic meta tag generation from WordPress Yoast SEO plugin data
 */

/**
 * Replaces CMS domain with production domain in URLs
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
export function processSEOData(seo: YoastSEO | undefined): YoastSEO | undefined {
  if (!seo) return seo;

  return {
    ...seo,
    // Replace domains in all URL fields
    canonical: replaceCMSDomain(seo.canonical),
    og_url: replaceCMSDomain(seo.og_url),
    
    // Clean titles to remove domain references
    title: cleanTitle(seo.title),
    og_title: cleanTitle(seo.og_title),
    
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
    schema: seo.schema ? processSchemaURLs(seo.schema) : seo.schema
  };
}

/**
 * Processes schema URLs to replace CMS domain
 */
function processSchemaURLs(schema: any): any {
  if (!schema) return schema;
  
  const processValue = (value: any): any => {
    if (typeof value === 'string' && (value.includes('cms-iquitostech.com'))) {
      return replaceCMSDomain(value);
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
  canonical?: string;
  seo?: YoastSEO;
  image?: string;
  publishedTime?: string;
  modifiedTime?: string;
  author?: string;
  type?: 'website' | 'article';
}

/**
 * Generates meta tags from Yoast SEO data
 */
export function generateSEOTags(props: SEOProps) {
  const { title, description, canonical, seo, image, publishedTime, modifiedTime, author, type = 'website' } = props;

  // Process SEO data to replace domains and ensure indexing
  const processedSEO = processSEOData(seo);

  // Fallback values with title cleaning
  const finalTitle = cleanTitle(processedSEO?.title || title) || 'Iquitos Tech';
  const finalDescription = processedSEO?.description || description || 'Noticias de tecnología, gaming y tendencias digitales';
  const finalCanonical = processedSEO?.canonical || replaceCMSDomain(canonical);
  const finalImage = processedSEO?.og_image?.[0]?.url || image;
  const siteName = processedSEO?.og_site_name || 'Iquitos Tech';

  return {
    // Basic meta tags
    title: finalTitle,
    description: finalDescription,
    canonical: finalCanonical,
    robots: processedSEO?.robots || { index: 'index', follow: 'follow' },
    
    // Open Graph
    ogTitle: cleanTitle(processedSEO?.og_title) || finalTitle,
    ogDescription: processedSEO?.og_description || finalDescription,
    ogUrl: processedSEO?.og_url || finalCanonical,
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
  defaultImage: '/logo.svg',
  twitterHandle: '@IquitosTech',
  locale: 'es_ES',
  themeColor: '#2847d7'
};
