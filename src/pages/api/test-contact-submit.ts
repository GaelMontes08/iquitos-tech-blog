import type { APIRoute } from 'astro';
import { supabase } from '../../lib/supabase.js';

function getClientIP(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0] || 
         request.headers.get('x-real-ip') || 
         request.headers.get('cf-connecting-ip') || 
         'test-ip-fixed'; // Use fixed IP for testing rate limiting
}

async function logTestAttempt(ipAddress: string, success: boolean): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('contact_attempts')
      .insert({
        email: 'test@example.com',
        ip_address: ipAddress,
        name: 'Test User',
        message_preview: 'This is a test message for rate limiting',
        success: success,
        error_message: success ? null : 'Rate limit test',
        user_agent: 'Test Script'
      })
      .select();

    if (error) {
      console.error('❌ Error logging test attempt:', error);
      console.error('Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      return false;
    } else {
      console.log('✅ Test attempt logged successfully, data:', data);
      return true;
    }
  } catch (error) {
    console.error('❌ Exception logging test attempt:', error);
    return false;
  }
}

async function checkRateLimit(ipAddress: string): Promise<number> {
  try {
    const hoursAgo = new Date();
    hoursAgo.setHours(hoursAgo.getHours() - 24);

    const { data, error } = await supabase
      .from('contact_attempts')
      .select('id')
      .eq('ip_address', ipAddress)
      .gte('attempted_at', hoursAgo.toISOString());

    if (error) {
      console.error('❌ Rate limit check error:', error);
      return 999; // Error state
    }

    return data?.length || 0;
  } catch (error) {
    console.error('❌ Rate limit check exception:', error);
    return 999; // Error state
  }
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const ipAddress = getClientIP(request);
    console.log(`🧪 Testing rate limiting for IP: ${ipAddress}`);
    
    // Check current rate limit
    const currentAttempts = await checkRateLimit(ipAddress);
    console.log(`📊 Current attempts: ${currentAttempts}`);
    
    if (currentAttempts >= 1) {
      console.log(`🚫 Rate limit exceeded: ${currentAttempts} attempts`);
      return new Response(JSON.stringify({
        success: false,
        message: 'Rate limit exceeded - only 1 submission per day allowed',
        currentAttempts,
        rateLimited: true
      }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Log this attempt
    const logSuccess = await logTestAttempt(ipAddress, true);
    console.log(`✅ Test submission successful for IP: ${ipAddress}, logged: ${logSuccess}`);
    
    // Check new count
    const newAttempts = await checkRateLimit(ipAddress);
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Test submission successful',
      previousAttempts: currentAttempts,
      currentAttempts: newAttempts,
      rateLimited: false,
      ipAddress
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('💥 Test submission error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
