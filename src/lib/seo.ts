export function replaceCMSDomain(url: string | undefined): string | undefined {
  if (!url) return url;
  const cmsDomain = 'cms-iquitostech.com';
  const prodDomain = 'iquitostech.com';
  const prodUrl = 'https://iquitostech.com';
  
  let result = url.replace(`https://${cmsDomain}`, prodUrl)
                  .replace(`http://${cmsDomain}`, prodUrl)
                  .replace(cmsDomain, prodDomain);
  
  if (result.includes('iquitostech.com') && !result.startsWith('https://')) {
    result = result.replace(/^http:\/\//, 'https://');
    if (!result.startsWith('http')) {
      result = `https://${result}`;
    }
  }
  
  return result;
}

// Convert CMS image URL to proxied production URL
export function convertImageUrl(imageUrl: string | undefined): string | undefined {
  if (!imageUrl) return undefined;
  
  // If image is from CMS domain, proxy it through our domain
  if (imageUrl.includes('cms-iquitostech.com')) {
    const match = imageUrl.match(/cms-iquitostech\.com\/(.*)/);
    if (match && match[1]) {
      return `https://iquitostech.com/api/image/${match[1]}`;
    }
  }
  
  return imageUrl;
}

// Social media image optimization function
export function optimizeImageForSocialMedia(imageUrl: string | undefined): string | undefined {
  if (!imageUrl) return 'https://iquitostech.com/fallback-banner.webp';
  
  // Keep CMS images direct (faster for social media crawlers)
  // Just ensure HTTPS protocol
  let optimizedUrl = imageUrl.replace(/^http:\/\//, 'https://');
  
  // Make sure cms-iquitostech.com images stay on CMS domain
  if (optimizedUrl.includes('cms-iquitostech.com')) {
    // Keep the CMS domain for images (direct access is faster)
    return optimizedUrl;
  }
  
  // For non-CMS images (like fallback), ensure they point to production
  if (!optimizedUrl.startsWith('http')) {
    optimizedUrl = `https://iquitostech.com${optimizedUrl.startsWith('/') ? '' : '/'}${optimizedUrl}`;
  }
  
  return optimizedUrl;
}

export function fixAstroUrlStructure(url: string | undefined, type: 'post' | 'category' | 'page' = 'post'): string | undefined {
  if (!url) return url;
  
  if (url.includes('/posts/') || url.includes('/categoria/')) {
    return url;
  }
  
  if (type === 'page') {
    return replaceCMSDomain(url);
  }
  
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
  
  const urlPath = url.replace(/^https?:\/\/[^\/]+/, '');
  
  if (urlPath === '/home' || urlPath === '/home/') {
    const hasWww = url.includes('www.');
    return hasWww ? 'https://www.iquitostech.com' : 'https://iquitostech.com';
  }
  
  if (urlPath === '' || urlPath === '/') {
    return replaceCMSDomain(url);
  }
  
  if (staticPagePatterns.some(pattern => urlPath === pattern || urlPath === pattern + '/')) {
    return replaceCMSDomain(url);
  }
  
  const cleanUrl = url.replace(/\/$/, '');
  const urlParts = cleanUrl.split('/');
  const slug = urlParts[urlParts.length - 1];
  
  if (!slug || slug.length === 0) {
    return replaceCMSDomain(url);
  }
  
  const baseUrl = 'https://iquitostech.com';
  if (type === 'post') {
    return `${baseUrl}/posts/${slug}`;
  } else if (type === 'category') {
    return `${baseUrl}/categoria/${slug}`;
  }
  
  return replaceCMSDomain(url);
}

function cleanTitle(title: string | undefined): string | undefined {
  if (!title) return title;
  
  return title
    .replace(/\s*[-|–—]\s*cms-iquitostech\.com/gi, '')
    .replace(/\s*\|\s*cms-iquitostech\.com/gi, '')
    .replace(/\s*[-|–—]\s*iquitostech\.com/gi, '')
    .replace(/\s*\|\s*iquitostech\.com/gi, '')
    .replace(/\s*[-|–—]\s*cms\s*$/gi, '')
    .replace(/\s*\|\s*cms\s*$/gi, '')
    .replace(/\s*[-|–—]\s*$/, '')
    .replace(/\s*\|\s*$/, '')
    .trim();
}

export function processSEOData(seo: YoastSEO | undefined, urlType: 'post' | 'category' | 'page' = 'post'): YoastSEO | undefined {
  if (!seo) return seo;

  return {
    ...seo,
    canonical: seo.canonical ? fixAstroUrlStructure(replaceCMSDomain(seo.canonical), urlType) : undefined,
    og_url: seo.og_url ? fixAstroUrlStructure(replaceCMSDomain(seo.og_url), urlType) : undefined,
    
    title: cleanTitle(seo.title),
    og_title: cleanTitle(seo.og_title),
    
    keywords: seo.keywords,
    focus_keyword: seo.focus_keyword,
    meta_keyword: seo.meta_keyword,
    
    robots: {
      ...seo.robots,
      index: 'index',  // Force index in production, override WordPress noindex
      follow: 'follow'
    },
    
    og_site_name: 'Iquitos Tech',
    og_locale: 'es_ES',
    
    twitter_site: '@IquitosTech',
    twitter_creator: '@IquitosTech',
    
    og_image: seo.og_image?.map(img => ({
      ...img,
      url: img.url
    })),
    
    schema: seo.schema ? processSchemaURLs(seo.schema, urlType) : seo.schema
  };
}

function processSchemaURLs(schema: any, urlType: 'post' | 'category' | 'page' = 'post'): any {
  if (!schema) return schema;
  
  const processValue = (value: any): any => {
    if (typeof value === 'string' && (value.includes('cms-iquitostech.com'))) {
      if (value.includes('/wp-content/uploads/') || value.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) {
        return value;
      }
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

export interface YoastSEO {
  title?: string;
  description?: string;
  keywords?: string;
  focus_keyword?: string;
  meta_keyword?: string;
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
  keywords?: string;
  canonical?: string;
  seo?: YoastSEO;
  image?: string;
  publishedTime?: string;
  modifiedTime?: string;
  author?: string;
  type?: 'website' | 'article';
  urlType?: 'post' | 'category' | 'page';
}

export function generateSEOTags(props: SEOProps) {
  const { title, description, keywords, canonical, seo, image, publishedTime, modifiedTime, author, type = 'website', urlType = 'page' } = props;

  const processedSEO = processSEOData(seo, urlType);

  const finalTitle = cleanTitle(processedSEO?.title || title) || 'Iquitos Tech';
  const finalDescription = processedSEO?.description || description || 'Noticias de tecnología, gaming y tendencias digitales';
  
  let finalKeywords = processedSEO?.keywords || 
                     processedSEO?.focus_keyword || 
                     processedSEO?.meta_keyword || 
                     keywords;
  
  if (!finalKeywords && processedSEO?.schema?.['@graph']) {
    const articleSchema = processedSEO.schema['@graph'].find((item: any) => item['@type'] === 'Article');
    if (articleSchema && articleSchema.keywords) {
      if (Array.isArray(articleSchema.keywords)) {
        finalKeywords = articleSchema.keywords.join(', ');
      } else {
        finalKeywords = articleSchema.keywords;
      }
    }
  }
  
  finalKeywords = finalKeywords || 'tecnología, gaming, videojuegos, noticias tech, iquitos tech, inteligencia artificial, programación';
  
  const finalCanonical = canonical 
    ? fixAstroUrlStructure(replaceCMSDomain(canonical), urlType)
    : processedSEO?.canonical || 'https://iquitostech.com';
  
  const finalOgUrl = (urlType === 'page' && canonical) 
    ? finalCanonical 
    : processedSEO?.og_url || finalCanonical;
  let finalImage: string | undefined;
  
  if (image) {
    finalImage = image;
    console.log('✅ Using WordPress featured image:', image);
  } else if (processedSEO?.og_image?.[0]?.url) {
    finalImage = processedSEO.og_image[0].url;
    console.log('⚠️ Fallback to Yoast og_image (may be incorrect):', finalImage);
  } else {
    console.log('❌ No image found - will use default fallback');
  }
  
  const siteName = processedSEO?.og_site_name || 'Iquitos Tech';

  return {
    title: finalTitle,
    description: finalDescription,
    keywords: finalKeywords,
    canonical: finalCanonical,
    robots: processedSEO?.robots || { index: 'index', follow: 'follow' },
    
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
    
    articlePublishedTime: processedSEO?.article_published_time || publishedTime,
    articleModifiedTime: processedSEO?.article_modified_time || modifiedTime,
    articleAuthor: processedSEO?.author || author,
    
    twitterCard: processedSEO?.twitter_card || 'summary_large_image',
    twitterSite: processedSEO?.twitter_site || '@IquitosTech',
    twitterCreator: processedSEO?.twitter_creator || '@IquitosTech',
    twitterLabel1: processedSEO?.twitter_label1,
    twitterData1: processedSEO?.twitter_data1,
    twitterLabel2: processedSEO?.twitter_label2,
    twitterData2: processedSEO?.twitter_data2,
    
    schema: processedSEO?.schema
  };
}

export function generateRobotsContent(robots?: YoastSEO['robots']): string {
  const parts: string[] = ['index', 'follow'];
  
  if (robots?.['max-snippet']) parts.push(`max-snippet:${robots['max-snippet']}`);
  if (robots?.['max-image-preview']) parts.push(`max-image-preview:${robots['max-image-preview']}`);
  if (robots?.['max-video-preview']) parts.push(`max-video-preview:${robots['max-video-preview']}`);
  
  return parts.join(', ');
}

export function generateSchemaScript(schema?: YoastSEO['schema']): string | null {
  if (!schema) return null;
  
  try {
    return JSON.stringify(schema);
  } catch (error) {
    console.error('Error stringifying schema data:', error);
    return null;
  }
}

export const defaultSEO: Partial<SEOProps> = {
  title: 'Iquitos Tech - Noticias de Tecnología y Gaming',
  description: 'Las últimas noticias de tecnología, videojuegos, inteligencia artificial y tendencias digitales. Mantente actualizado con Iquitos Tech.',
  type: 'website'
};

export const siteConfig = {
  siteName: 'Iquitos Tech',
  siteUrl: 'https://iquitostech.com',
  defaultImage: '/fallback-banner.webp',
  twitterHandle: '@IquitosTech',
  locale: 'es_ES',
  themeColor: '#2847d7'
};
