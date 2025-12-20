import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Only create client if credentials are configured
export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

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
