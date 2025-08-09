import type { APIRoute } from 'astro';
import { supabase } from '../../lib/supabase.js';

function getClientIP(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0] || 
         request.headers.get('x-real-ip') || 
         request.headers.get('cf-connecting-ip') || 
         'unknown';
}

export const GET: APIRoute = async ({ request }) => {
  try {
    const ipAddress = getClientIP(request);
    const RATE_LIMIT_HOURS = 24;
    
    console.log(`🔍 Testing rate limit for IP: ${ipAddress}`);
    
    // Get recent attempts for this IP
    const hoursAgo = new Date();
    hoursAgo.setHours(hoursAgo.getHours() - RATE_LIMIT_HOURS);
    
    console.log(`📅 Looking for attempts since: ${hoursAgo.toISOString()}`);
    
    const { data, error } = await supabase
      .from('contact_attempts')
      .select('*')
      .eq('ip_address', ipAddress)
      .gte('attempted_at', hoursAgo.toISOString())
      .order('attempted_at', { ascending: false });

    if (error) {
      console.error('❌ Rate limit check error:', error);
      return new Response(JSON.stringify({
        success: false,
        error: error.message,
        ipAddress,
        timeWindow: `${RATE_LIMIT_HOURS} hours`
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const attemptCount = data?.length || 0;
    console.log(`📊 Found ${attemptCount} recent attempts for IP ${ipAddress}`);
    
    return new Response(JSON.stringify({
      success: true,
      ipAddress,
      recentAttempts: attemptCount,
      rateLimited: attemptCount >= 1,
      timeWindow: `${RATE_LIMIT_HOURS} hours`,
      attempts: data,
      timeWindowStart: hoursAgo.toISOString()
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('💥 Rate limit test exception:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
