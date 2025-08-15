import type { APIRoute } from 'astro';
import { checkAdvancedRateLimit, createRateLimitResponse } from '../../lib/rate-limit.js';
import { generateEnvironmentSecurityReport, validateEnvironmentVariables } from '../../lib/env-security.js';

export const GET: APIRoute = async ({ request, clientAddress }) => {
  try {
    const rateLimitResult = await checkAdvancedRateLimit(request, clientAddress);
    if (!rateLimitResult.allowed) {
      return createRateLimitResponse(rateLimitResult.resetTime || 60);
    }

    const authHeader = request.headers.get('authorization');
    const adminKey = import.meta.env.ADMIN_SECRET_KEY || process.env.ADMIN_SECRET_KEY;
    
    if (!authHeader || !adminKey || authHeader !== `Bearer ${adminKey}`) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Unauthorized access to security report'
      }), {
        status: 401,
        headers: { 
          'Content-Type': 'application/json'
        }
      });
    }

    const envValues = {
      'RESEND_API_KEY': import.meta.env.RESEND_API_KEY || process.env.RESEND_API_KEY,
      'RECAPTCHA_SECRET_KEY': import.meta.env.RECAPTCHA_SECRET_KEY || process.env.RECAPTCHA_SECRET_KEY,
      'RESEND_AUDIENCE_ID': import.meta.env.RESEND_AUDIENCE_ID || process.env.RESEND_AUDIENCE_ID,
      'GOOGLE_CLIENT_ID': import.meta.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID,
      'GOOGLE_CLIENT_SECRET': import.meta.env.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET,
      'PUBLIC_SUPABASE_URL': import.meta.env.PUBLIC_SUPABASE_URL,
      'PUBLIC_SUPABASE_ANON_KEY': import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
      'WORDPRESS_API_URL': import.meta.env.WORDPRESS_API_URL || process.env.WORDPRESS_API_URL,
      'ADMIN_SECRET_KEY': import.meta.env.ADMIN_SECRET_KEY || process.env.ADMIN_SECRET_KEY
    };

    const report = generateEnvironmentSecurityReport(envValues);
    
    const runtimeCheck = {
      timestamp: new Date().toISOString(),
      environment: import.meta.env.MODE || 'unknown',
      nodeEnv: process.env.NODE_ENV || 'unknown',
      totalVariables: Object.keys(import.meta.env).length,
      publicVariables: Object.keys(import.meta.env).filter(key => key.startsWith('PUBLIC_')).length
    };

    return new Response(JSON.stringify({
      success: true,
      report: {
        ...report,
        runtime: runtimeCheck
      }
    }), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });

  } catch (error) {
    console.error('Environment security report error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal server error'
    }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json'
      }
    });
  }
};

export const POST: APIRoute = async ({ request, clientAddress }) => {
  try {
    const rateLimitResult = await checkAdvancedRateLimit(request, clientAddress);
    if (!rateLimitResult.allowed) {
      return createRateLimitResponse(rateLimitResult.resetTime || 60);
    }

    const authHeader = request.headers.get('authorization');
    const adminKey = import.meta.env.ADMIN_SECRET_KEY || process.env.ADMIN_SECRET_KEY;
    
    if (!authHeader || !adminKey || authHeader !== `Bearer ${adminKey}`) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Unauthorized access'
      }), {
        status: 401,
        headers: { 
          'Content-Type': 'application/json'
        }
      });
    }

    const body = await request.json();
    const { action } = body;

    if (action === 'validate') {
      const envValues = {
        'RESEND_API_KEY': import.meta.env.RESEND_API_KEY || process.env.RESEND_API_KEY,
        'RECAPTCHA_SECRET_KEY': import.meta.env.RECAPTCHA_SECRET_KEY || process.env.RECAPTCHA_SECRET_KEY,
        'RESEND_AUDIENCE_ID': import.meta.env.RESEND_AUDIENCE_ID || process.env.RESEND_AUDIENCE_ID,
        'GOOGLE_CLIENT_ID': import.meta.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID,
        'GOOGLE_CLIENT_SECRET': import.meta.env.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET,
        'PUBLIC_SUPABASE_URL': import.meta.env.PUBLIC_SUPABASE_URL,
        'PUBLIC_SUPABASE_ANON_KEY': import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
        'WORDPRESS_API_URL': import.meta.env.WORDPRESS_API_URL || process.env.WORDPRESS_API_URL,
        'ADMIN_SECRET_KEY': import.meta.env.ADMIN_SECRET_KEY || process.env.ADMIN_SECRET_KEY
      };

      const validation = validateEnvironmentVariables(envValues);
      
      return new Response(JSON.stringify({
        success: true,
        validation,
        timestamp: new Date().toISOString()
      }), {
        status: 200,
        headers: { 
          'Content-Type': 'application/json'
        }
      });
    }

    return new Response(JSON.stringify({
      success: false,
      error: 'Invalid action'
    }), {
      status: 400,
      headers: { 
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('Environment security validation error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal server error'
    }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json'
      }
    });
  }
};
