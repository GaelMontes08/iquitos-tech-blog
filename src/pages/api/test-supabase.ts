import type { APIRoute } from 'astro';
import { supabase } from '../../lib/supabase.js';

export const GET: APIRoute = async () => {
  try {
    console.log('🔍 Testing Supabase connection...');
    
    // Test basic connection
    const { data: connectionTest, error: connectionError } = await supabase
      .from('contact_attempts')
      .select('count', { count: 'exact', head: true });

    if (connectionError) {
      console.error('❌ Supabase connection error:', connectionError);
      
      return new Response(JSON.stringify({
        success: false,
        message: 'Supabase connection failed',
        error: connectionError.message,
        hint: connectionError.hint,
        details: connectionError.details,
        tableExists: false
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log('✅ Supabase connection successful');
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Supabase connection working',
      tableExists: true,
      totalAttempts: connectionTest || 0
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('💥 Supabase test exception:', error);
    
    return new Response(JSON.stringify({
      success: false,
      message: 'Exception testing Supabase',
      error: error instanceof Error ? error.message : 'Unknown error',
      tableExists: false
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
