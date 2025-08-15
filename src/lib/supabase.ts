import { createClient } from '@supabase/supabase-js'
import { getSecureEnv } from './env-security.js';

const supabaseUrl = getSecureEnv('PUBLIC_SUPABASE_URL');
const supabaseKey = getSecureEnv('PUBLIC_SUPABASE_ANON_KEY');

if (!supabaseUrl || !supabaseKey) {
  console.error('🔒 CRITICAL: Supabase configuration missing or invalid');
  throw new Error('Missing or invalid Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

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