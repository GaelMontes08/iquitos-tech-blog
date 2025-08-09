import type { APIRoute } from 'astro';
import { supabase } from '../../lib/supabase.js';

export const GET: APIRoute = async () => {
  try {
    console.log('🔍 Getting all contact attempts...');
    
    // Get all contact attempts from the last 24 hours
    const yesterday = new Date();
    yesterday.setHours(yesterday.getHours() - 24);
    
    const { data, error } = await supabase
      .from('contact_attempts')
      .select('*')
      .gte('attempted_at', yesterday.toISOString())
      .order('attempted_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching contact attempts:', error);
      return new Response(JSON.stringify({
        success: false,
        error: error.message
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log(`📊 Found ${data?.length || 0} contact attempts in last 24 hours`);
    
    // Group by IP address
    const attemptsByIP: Record<string, any[]> = {};
    data?.forEach(attempt => {
      if (!attemptsByIP[attempt.ip_address]) {
        attemptsByIP[attempt.ip_address] = [];
      }
      attemptsByIP[attempt.ip_address].push(attempt);
    });
    
    return new Response(JSON.stringify({
      success: true,
      totalAttempts: data?.length || 0,
      attempts: data,
      attemptsByIP,
      timeWindow: '24 hours'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('💥 Error getting contact attempts:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
