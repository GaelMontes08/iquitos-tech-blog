import { createClient } from '@supabase/supabase-js'

// Use import.meta.env directly instead of the security wrapper for now
const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

// Allow development mode without Supabase
const isDevelopment = import.meta.env.MODE === 'development';

if (!supabaseUrl || !supabaseKey) {
  if (isDevelopment) {
    console.warn('⚠️ Supabase not configured - some features may not work in development');
  } else {
    console.error('🔒 CRITICAL: Supabase configuration missing or invalid');
    throw new Error('Missing or invalid Supabase environment variables');
  }
}

// Create a fallback client for development
export const supabase = (supabaseUrl && supabaseKey) 
  ? createClient(supabaseUrl, supabaseKey)
  : null;

export const fetchWithTimeout = async (url: string, options: RequestInit = {}, timeout = 10000) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
};