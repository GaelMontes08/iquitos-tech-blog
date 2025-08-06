import { fetchWithTimeout } from '@/lib/wp.ts';
import { createClient } from '@supabase/supabase-js';

declare global {
  interface ImportMetaEnv {
    readonly WP_DOMAIN?: string;
    readonly PUBLIC_SUPABASE_URL?: string;
    readonly PUBLIC_SUPABASE_ANON_KEY?: string;
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}

const domain = import.meta.env.WP_DOMAIN;
const apiUrl = `https://${domain}/wp-json/wp/v2`;

// Supabase configuration
const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

let supabase: any = null;
if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
}

// Helper function to format view numbers
const formatViews = (views: number): string => {
  if (views >= 1000000) {
    return `${(views / 1000000).toFixed(1)}M`;
  } else if (views >= 1000) {
    return `${(views / 1000).toFixed(1)}k`;
  }
  return views.toString();
};

// Helper function to format date in Spanish
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  
  const day = date.getDate().toString().padStart(2, '0');
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  
  return `${day} ${month}, ${year}`;
};

// Get view count for a specific post from Supabase
export const getPostViewCount = async (slug: string): Promise<number> => {
  try {
    if (!supabase) {
      console.warn('Supabase not configured');
      return 0;
    }

    const { data, error } = await supabase
      .from('Views')  // Your table name
      .select('views') // Your column name
      .eq('slug', slug)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching view count:', error);
      return 0;
    }

    return data?.views || 0;
  } catch (error) {
    console.error('Error getting post view count:', error);
    return 0;
  }
};

// Increment view count for a specific post
export const incrementPostViewCount = async (slug: string): Promise<number> => {
  try {
    if (!supabase) {
      console.warn('Supabase not configured');
      return 0;
    }

    // Try using the PostgreSQL function first
    const { data, error } = await supabase
      .rpc('increment_view_count', { post_slug: slug });

    if (error) {
      console.warn('RPC function failed, using manual increment:', error.message);
      return await manualIncrementViews(slug);
    }

    console.log(`✅ RPC increment successful for ${slug}: ${data} views`);
    return data || 1;
  } catch (error) {
    console.error('Error incrementing post view count:', error);
    return await manualIncrementViews(slug);
  }
};

// Manual increment as fallback
const manualIncrementViews = async (slug: string): Promise<number> => {
  try {
    // Check if record exists
    const { data: existingRecord, error: fetchError } = await supabase
      .from('Views')
      .select('views')
      .eq('slug', slug)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error checking existing record:', fetchError);
      return 0;
    }

    let newViewCount = 1;

    if (existingRecord) {
      // Record exists, increment it
      newViewCount = existingRecord.views + 1;
      const { error: updateError } = await supabase
        .from('Views')
        .update({ views: newViewCount })
        .eq('slug', slug);

      if (updateError) {
        console.error('Error updating view count:', updateError);
        return existingRecord.views;
      }
    } else {
      // Record doesn't exist, create it (UUID will be auto-generated)
      const { error: insertError } = await supabase
        .from('Views')
        .insert({ slug, views: 1 });

      if (insertError) {
        console.error('Error inserting new view record:', insertError);
        return 0;
      }
    }

    return newViewCount;
  } catch (error) {
    console.error('Error in manual increment:', error);
    return 0;
  }
};

// Get most viewed posts from Supabase + WordPress data
export const getMostViewedPosts = async () => {
  try {
    if (!supabase) {
      console.warn('Supabase not configured, returning fallback most viewed posts');
      return getFallbackMostViewedPosts();
    }

    console.log('Fetching view data from Supabase...');
    
    // Get top viewed posts from Supabase (remove the gt filter for now)
    const { data: viewData, error: viewError } = await supabase
      .from('Views')
      .select('slug, views')
      .order('views', { ascending: false })
      .limit(10);

    console.log('Supabase response:', { viewData, viewError });

    if (viewError) {
      console.error('Error fetching view data from Supabase:', viewError);
      return getFallbackMostViewedPosts();
    }

    if (!viewData || viewData.length === 0) {
      console.warn('No view data found in Supabase, returning fallback');
      return getFallbackMostViewedPosts();
    }

    console.log(`Found ${viewData.length} posts in Supabase`);

    if (!domain) {
      console.warn('WP_DOMAIN not configured, using view data only');
      return createPostsFromViewData(viewData);
    }

    // Get post data from WordPress for posts
    const postPromises = viewData.slice(0, 5).map(async (viewRecord) => {
      try {
        const response = await fetchWithTimeout(
          `https://${domain}/wp-json/wp/v2/posts?slug=${viewRecord.slug}&_embed&_fields=id,title,slug,date,_embedded`,
          {},
          10000
        );

        if (!response.ok) {
          console.warn(`Failed to fetch post data for slug: ${viewRecord.slug}`);
          return null;
        }

        const posts = await response.json();
        if (!posts || posts.length === 0) {
          console.warn(`No WordPress post found for slug: ${viewRecord.slug}`);
          return null;
        }

        const post = posts[0];
        const category = post._embedded?.['wp:term']?.[0]?.[0]?.name || 'Tecnología';

        return {
          id: post.id,
          title: post.title?.rendered || 'Sin título',
          slug: post.slug,
          category,
          views: formatViews(viewRecord.views),
          date: formatDate(post.date),
          rawViews: viewRecord.views
        };
      } catch (error) {
        console.error(`Error fetching WordPress data for slug ${viewRecord.slug}:`, error);
        return null;
      }
    });

    const postsData = await Promise.all(postPromises);
    const validPosts = postsData.filter(post => post !== null);

    if (validPosts.length === 0) {
      console.warn('No valid posts found, returning fallback');
      return getFallbackMostViewedPosts();
    }

    console.log(`Returning ${validPosts.length} most viewed posts with real data`);
    
    return validPosts;

  } catch (error) {
    console.error('Error fetching most viewed posts:', error);
    return getFallbackMostViewedPosts();
  }
};

// Create posts from view data only (fallback when WordPress is not available)
const createPostsFromViewData = (viewData: any[]) => {
  return viewData.slice(0, 5).map((record, index) => ({
    id: index + 1,
    title: record.slug.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
    slug: record.slug,
    category: 'Tecnología',
    views: formatViews(record.views),
    date: formatDate(new Date().toISOString()),
    rawViews: record.views
  }));
};

// Alternative function that combines WordPress posts with Supabase view counts
export const getMostViewedPostsWithWordPress = async () => {
  try {
    if (!domain) {
      console.warn('WP_DOMAIN not configured, returning fallback');
      return getFallbackMostViewedPosts();
    }

    // Fetch recent posts from WordPress
    const response = await fetchWithTimeout(
      `${apiUrl}/posts?_embed&per_page=20&orderby=date&order=desc&_fields=id,title,slug,date,_embedded`
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const posts = await response.json();
    
    if (!posts || !posts.length) {
      console.warn('No posts found, returning fallback');
      return getFallbackMostViewedPosts();
    }

    // Get view counts for all posts from Supabase
    const postsWithViews = await Promise.all(
      posts.map(async (post: any) => {
        const viewCount = await getPostViewCount(post.slug);
        const category = post._embedded?.['wp:term']?.[0]?.[0]?.name || 'Tecnología';

        return {
          id: post.id,
          title: post.title?.rendered || 'Sin título',
          slug: post.slug,
          category,
          views: viewCount,
          date: post.date,
          rawViews: viewCount
        };
      })
    );

    // Filter posts with views and sort by view count
    const postsWithRealViews = postsWithViews.filter(post => post.rawViews > 0);
    
    if (postsWithRealViews.length === 0) {
      console.warn('No posts with view counts found, returning fallback');
      return getFallbackMostViewedPosts();
    }

    const sortedPosts = postsWithRealViews.sort((a, b) => b.rawViews - a.rawViews);

    // Take top 5 and format the response
    const mostViewedPosts = sortedPosts.slice(0, 5).map((post) => ({
      id: post.id,
      title: post.title,
      slug: post.slug,
      category: post.category,
      views: formatViews(post.views),
      date: formatDate(post.date)
    }));

    console.log(`Found ${mostViewedPosts.length} posts with Supabase view counts`);
    return mostViewedPosts;

  } catch (error) {
    console.error('Error fetching most viewed posts with WordPress:', error);
    return getFallbackMostViewedPosts();
  }
};

// Fallback data
function getFallbackMostViewedPosts() {
  const currentDate = new Date();
  
  return [
    {
      id: 1,
      title: 'Las mejores tarjetas gráficas para gaming en 2024',
      slug: 'mejores-tarjetas-graficas-gaming-2024',
      category: 'Gaming',
      views: '15.2k',
      date: formatDate(new Date(currentDate.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString())
    },
    {
      id: 2,
      title: 'ChatGPT vs Claude: Comparativa completa de IA',
      slug: 'chatgpt-vs-claude-comparativa-ia',
      category: 'Inteligencia Artificial',
      views: '12.8k',
      date: formatDate(new Date(currentDate.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString())
    },
    {
      id: 3,
      title: 'iPhone 16 Pro: Todo lo que sabemos hasta ahora',
      slug: 'iphone-16-pro-rumores-caracteristicas',
      category: 'Móviles',
      views: '10.5k',
      date: formatDate(new Date(currentDate.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString())
    },
    {
      id: 4,
      title: 'Los mejores frameworks de JavaScript en 2024',
      slug: 'mejores-frameworks-javascript-2024',
      category: 'Desarrollo',
      views: '9.3k',
      date: formatDate(new Date(currentDate.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString())
    },
    {
      id: 5,
      title: 'Ciberseguridad: Protege tu empresa de ransomware',
      slug: 'ciberseguridad-proteccion-ransomware',
      category: 'Seguridad',
      views: '7.8k',
      date: formatDate(new Date(currentDate.getTime() - 6 * 24 * 60 * 60 * 1000).toISOString())
    }
  ];
}

// Legacy function for backward compatibility
export const getMostViewedPostsWithMetaQuery = getMostViewedPosts;