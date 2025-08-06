import { createClient } from '@supabase/supabase-js';
import { fetchWithTimeout } from './wp';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
const domain = import.meta.env.WP_DOMAIN;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Supabase credentials not configured');
}

const supabase = createClient(supabaseUrl, supabaseKey);

export async function populateViewsFromWordPress() {
  try {
    console.log('Fetching posts from WordPress...');
    
    // Fetch all posts from WordPress
    const response = await fetchWithTimeout(
      `https://${domain}/wp-json/wp/v2/posts?per_page=100&_fields=slug`
    );

    if (!response.ok) {
      throw new Error(`WordPress API error: ${response.status}`);
    }

    const posts = await response.json();
    console.log(`Found ${posts.length} posts from WordPress`);

    // Insert each post slug into Supabase with 0 views (if it doesn't exist)
    const insertPromises = posts.map(async (post: any) => {
      const { error } = await supabase
        .from('Views')
        .upsert(
          { slug: post.slug, views: 0 },
          { onConflict: 'slug', ignoreDuplicates: true }
        );

      if (error) {
        console.error(`Error inserting ${post.slug}:`, error);
      } else {
        console.log(`✅ Added ${post.slug} to views table`);
      }
    });

    await Promise.all(insertPromises);
    console.log('✅ Finished populating views table');
    
    return posts.length;
  } catch (error) {
    console.error('Error populating views from WordPress:', error);
    throw error;
  }
}