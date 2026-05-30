import { createClient } from '@supabase/supabase-js';

// This is the recommended way for client-side Supabase in Next.js
// It uses the official client instead of raw REST calls.

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    'Missing Supabase environment variables. ' +
    'Please copy .env.example to .env.local and fill in your values.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  global: {
    // Add basic headers for better debugging in production
    headers: {
      'x-client-info': 'cycleops-event-app',
    },
  },
});

// Helper for more resilient writes (basic retry)
export async function safeInsert(table: string, payload: any, maxRetries = 2) {
  let lastError: any = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const { data, error } = await supabase.from(table).insert(payload).select();
      
      if (error) {
        lastError = error;
        // Only retry on network-like errors
        if (attempt < maxRetries && (error.message?.includes('fetch') || error.code === 'PGRST301')) {
          await new Promise(r => setTimeout(r, 800 * (attempt + 1)));
          continue;
        }
        return { data: null, error };
      }
      
      return { data, error: null };
    } catch (err: any) {
      lastError = err;
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, 800 * (attempt + 1)));
        continue;
      }
    }
  }
  
  return { data: null, error: lastError };
}

export async function safeUpsert(table: string, payload: any, maxRetries = 2) {
  let lastError: any = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const { data, error } = await supabase.from(table).upsert(payload, { onConflict: 'id' }).select();
      
      if (error) {
        lastError = error;
        if (attempt < maxRetries) {
          await new Promise(r => setTimeout(r, 800 * (attempt + 1)));
          continue;
        }
        return { data: null, error };
      }
      
      return { data, error: null };
    } catch (err: any) {
      lastError = err;
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, 800 * (attempt + 1)));
        continue;
      }
    }
  }
  
  return { data: null, error: lastError };
}