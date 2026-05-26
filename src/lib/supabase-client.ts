import { createClient } from '@supabase/supabase-js';

function isHttpUrl(value: string | undefined) {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function hasSupabaseStorageConfig() {
  return !!(
    isHttpUrl(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    process.env.SUPABASE_BUCKET
  );
}

export function getSupabaseClient() {
  if (!hasSupabaseStorageConfig()) {
    throw new Error("Supabase storage is not configured");
  }

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

/**
 * Get Supabase client with service role key (server-side only)
 * Has elevated permissions for storage operations
 */
export function getSupabaseServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error("Supabase service role key or URL is not configured");
  }

  return createClient(url, serviceKey);
}
