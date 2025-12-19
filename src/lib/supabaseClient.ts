import { createClient } from '@supabase/supabase-js';

// These will be your Supabase project credentials
// You'll replace these with your actual values after creating the project
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types
export interface WorkoutLog {
  id?: string;
  user_id: 'aaron' | 'kristin';
  date: string; // ISO date format: '2024-12-18'
  plan_workout: string; // The prescribed workout text
  completed: boolean;
  actual_pace?: string; // e.g., '8:20/mi average'
  notes?: string;
  created_at?: string;
  updated_at?: string;
}
