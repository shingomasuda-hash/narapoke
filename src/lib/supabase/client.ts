'use client';
import { createBrowserClient } from '@supabase/ssr';
import { env } from '@/lib/config';

export function createSupabaseBrowser() {
  return createBrowserClient(env.supabaseUrl, env.supabaseAnonKey);
}
