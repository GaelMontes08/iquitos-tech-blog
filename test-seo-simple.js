console.log('🔄 Testing SEO Domain Replacement for Iquitos Tech...\n');

// Test URL replacement function
function replaceCMSDomain(url) {
  if (!url) return url;
  const cmsDomain = 'cms-iquitostech.com';
  const prodDomain = 'iquitostech.com';
  const prodUrl = 'https://iquitostech.com';
  
  return url.replace(`https://${cmsDomain}`, prodUrl)
            .replace(`http://${cmsDomain}`, prodUrl)
            .replace(cmsDomain, prodDomain);
}

// Test cleanTitle function
function cleanTitle(title) {
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

// Test processSEOData function
function processSEOData(seo) {
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
    }))
  };
}

// Test URLs
const testUrls = [
  'https://cms-iquitostech.com/posts/test-post',
  'http://cms-iquitostech.com/category/tech',
  'https://cms-iquitostech.com/wp-content/uploads/image.jpg',
  'https://iquitostech.com/already-correct',
  undefined,
  null
];

console.log('📍 URL Replacement Tests:');
testUrls.forEach((url, index) => {
  const result = replaceCMSDomain(url);
  console.log(`${index + 1}. ${url || 'undefined/null'} → ${result || 'undefined/null'}`);
});

// Test SEO data processing
const mockSEOData = {
  title: 'Wukong: La Supercomputadora China - iquitostech.com',
  description: 'A test post description',
  canonical: 'https://cms-iquitostech.com/posts/test-post',
  og_url: 'https://cms-iquitostech.com/posts/test-post',
  og_title: 'Gaming News | Wukong Review - iquitostech.com',
  og_site_name: 'Old Site Name',
  og_locale: 'en_US',
  robots: {
    index: 'noindex',
    follow: 'nofollow'
  },
  twitter_site: '@OldTwitter',
  twitter_creator: '@OldCreator',
  og_image: [{
    url: 'https://cms-iquitostech.com/wp-content/uploads/test.jpg',
    width: 1200,
    height: 630,
    type: 'image/jpeg'
  }]
};

console.log('\n🧹 Title Cleaning Tests:');
const testTitles = [
  'Gaming News - iquitostech.com',
  'Tech Review | iquitostech.com',
  'iPhone 17 News – iquitostech.com',
  'Clean Title Without Domain',
  'Multiple - Separators - iquitostech.com',
  'Post Title | cms-iquitostech.com',
  'Problematic Title - cms-iquitostech.com',
  'Another Test | cms-iquitostech.com',
  'Edge Case – cms',
  'Normal Title - cms'
];

testTitles.forEach((title, index) => {
  const cleaned = cleanTitle(title);
  console.log(`${index + 1}. "${title}" → "${cleaned}"`);
});

console.log('\n🔧 SEO Data Processing Test:');
console.log('Input:', JSON.stringify(mockSEOData, null, 2));

const processedSEO = processSEOData(mockSEOData);
console.log('\nProcessed:', JSON.stringify(processedSEO, null, 2));

console.log('\n✅ Key Verifications:');
console.log(`- Title: ${processedSEO.title}`);
console.log(`- OG Title: ${processedSEO.og_title}`);
console.log(`- Canonical URL: ${processedSEO.canonical}`);
console.log(`- OG URL: ${processedSEO.og_url}`);
console.log(`- Site Name: ${processedSEO.og_site_name}`);
console.log(`- Locale: ${processedSEO.og_locale}`);
console.log(`- Robots Index: ${processedSEO.robots.index}`);
console.log(`- Robots Follow: ${processedSEO.robots.follow}`);
console.log(`- Twitter Site: ${processedSEO.twitter_site}`);
console.log(`- Twitter Creator: ${processedSEO.twitter_creator}`);
console.log(`- Image URL (kept as CMS): ${processedSEO.og_image[0].url}`);

console.log('\n🎯 Expected Results:');
console.log('✓ All URLs should point to iquitostech.com');
console.log('✓ Titles should be clean without domain suffixes');
console.log('✓ Twitter handles should be @IquitosTech');
console.log('✓ Images should keep CMS domain for serving');
console.log('✓ Robots should enforce indexing');
console.log('✓ No "- iquitostech.com" or "| iquitostech.com" in titles');
