import { createClient } from '@supabase/supabase-js';

// Fallback to hosted project if env vars are missing
const defaultSupabaseUrl = 'https://zsjpvuyihsfhqzmiogyi.supabase.co';
const defaultSupabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzanB2dXlpaHNmaHF6bWlvZ3lpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYxMTY0MjQsImV4cCI6MjA4MTY5MjQyNH0.f6Sm15GyZm87tMHkPxQxk1zuWjY6ztTMsENxMh41qZM';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || defaultSupabaseUrl;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || defaultSupabaseAnonKey;

export const supabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// Only create client if credentials are configured
export const supabase = supabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

if (!supabaseConfigured) {
  // Warn once in dev/console when env is missing to avoid silent failures
  console.warn('[Supabase] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY not configured; data will not load.');
}

export interface WorkoutLog {
  id?: string;
  user_id: 'aaron' | 'kristin';
  date: string;
  plan_workout: string;
  completed: boolean;
  actual_distance?: string;
  actual_pace?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}
