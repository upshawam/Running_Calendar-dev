import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

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
