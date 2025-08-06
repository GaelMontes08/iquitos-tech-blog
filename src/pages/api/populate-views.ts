import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import { fetchWithTimeout } from '../../lib/wp';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
const domain = import.meta.env.WP_DOMAIN;

export const GET: APIRoute = async ({ request }) => {
  try {
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase credentials not configured');
    }

    if (!domain) {
      throw new Error('WordPress domain not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Fetching posts from WordPress...');
    
    // Fetch all posts from WordPress
    const response = await fetchWithTimeout(
      `https://${domain}/wp-json/wp/v2/posts?per_page=50&_fields=slug,title`
    );

    if (!response.ok) {
      throw new Error(`WordPress API error: ${response.status}`);
    }

    const posts = await response.json();
    console.log(`Found ${posts.length} posts from WordPress`);

    // Insert each post slug into Supabase with random view counts for testing
    let successCount = 0;
    
    for (const post of posts) {
      // Generate random view count between 50-500 for testing
      const randomViews = Math.floor(Math.random() * 450) + 50;
      
      const { error } = await supabase
        .from('Views')
        .upsert(
          { slug: post.slug, views: randomViews },
          { onConflict: 'slug' }
        );

      if (error) {
        console.error(`Error inserting ${post.slug}:`, error);
      } else {
        console.log(`✅ Added ${post.slug} with ${randomViews} views`);
        successCount++;
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Successfully populated ${successCount} posts`,
        total: posts.length,
        success_count: successCount
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error in populate-views API:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
};

export const prerender = false;