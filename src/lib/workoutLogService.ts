import { supabase, WorkoutLog } from './supabaseClient';

/**
 * Fetch workout logs for a specific user
 */
export async function fetchWorkoutLogs(userId: 'aaron' | 'kristin'): Promise<WorkoutLog[]> {
  const { data, error } = await supabase
    .from('workout_logs')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false });

  if (error) {
    console.error('Error fetching workout logs:', error);
    return [];
  }

  return data || [];
}

/**
 * Fetch a single workout log by user and date
 */
export async function fetchWorkoutLog(
  userId: 'aaron' | 'kristin',
  date: string
): Promise<WorkoutLog | null> {
  const { data, error } = await supabase
    .from('workout_logs')
    .select('*')
    .eq('user_id', userId)
    .eq('date', date)
    .single();

  if (error) {
    if (error.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('Error fetching workout log:', error);
    }
    return null;
  }

  return data;
}

/**
 * Create or update a workout log
 */
export async function upsertWorkoutLog(log: WorkoutLog): Promise<WorkoutLog | null> {
  const { data, error } = await supabase
    .from('workout_logs')
    .upsert(
      {
        user_id: log.user_id,
        date: log.date,
        plan_workout: log.plan_workout,
        completed: log.completed,
        actual_pace: log.actual_pace || null,
        notes: log.notes || null,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'user_id,date', // Unique constraint on user_id and date
      }
    )
    .select()
    .single();

  if (error) {
    console.error('Error upserting workout log:', error);
    return null;
  }

  return data;
}

/**
 * Delete a workout log
 */
export async function deleteWorkoutLog(
  userId: 'aaron' | 'kristin',
  date: string
): Promise<boolean> {
  const { error } = await supabase
    .from('workout_logs')
    .delete()
    .eq('user_id', userId)
    .eq('date', date);

  if (error) {
    console.error('Error deleting workout log:', error);
    return false;
  }

  return true;
}
