import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Read from Vite env vars (set in Vercel dashboard), with hardcoded fallbacks for local dev
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://zuymqduavlhdsmppmnga.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1eW1xZHVhdmxoZHNtcHBtbmdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0NTg0NzYsImV4cCI6MjA4NjAzNDQ3Nn0.GxJdWWhL23t81jorBcudRFF2e5jskKY4C_EXBT-7MWo";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});