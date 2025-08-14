// Debug script to check Yoast SEO data structure
import fetch from 'node-fetch';

const domain = 'cms-iquitostech.com'; // Replace with your actual domain
const apiUrl = `https://${domain}/wp-json/wp/v2`;

async function debugYoastData() {
  try {
    // Get homepage data
    const response = await fetch(`${apiUrl}/pages?slug=inicio&_fields=id,title,yoast_head_json`);
    const data = await response.json();
    
    if (data && data.length > 0) {
      const yoastData = data[0].yoast_head_json;
      console.log('=== Yoast SEO Data Structure ===');
      console.log(JSON.stringify(yoastData, null, 2));
      
      // Check for keyword-related fields
      const keywords = [
        'keywords',
        'focus_keyword', 
        'meta_keyword',
        'focuskw',
        'primary_keyword',
        'keyphrase',
        'focus_keyphrase'
      ];
      
      console.log('\n=== Keyword Field Analysis ===');
      keywords.forEach(field => {
        if (yoastData && yoastData[field] !== undefined) {
          console.log(`Found ${field}:`, yoastData[field]);
        } else {
          console.log(`${field}: NOT FOUND`);
        }
      });
      
      // Check all top-level fields
      console.log('\n=== All Available Fields ===');
      if (yoastData) {
        Object.keys(yoastData).forEach(key => {
          console.log(`${key}:`, typeof yoastData[key]);
        });
      }
    } else {
      console.log('No page data found');
    }
  } catch (error) {
    console.error('Error fetching data:', error);
  }
}

debugYoastData();
