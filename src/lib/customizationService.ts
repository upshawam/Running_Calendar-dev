import { supabase } from './supabaseClient';

/**
 * Store what event/workout should be on each date
 * This avoids the problem of mapping becoming invalid when plans rebuild
 */
export interface DateWorkoutCustomization {
  [date: string]: string | null; // date -> workout description (null means blank/rest day)
}

export interface WorkoutCustomization {
  id?: string;
  user_id: 'aaron' | 'kristin';
  plan_id: string;
  race_date: string;
  customizations: DateWorkoutCustomization; // Store what's on each date
  created_at?: string;
  updated_at?: string;
}

/**
 * Fetch customizations for a specific user, plan, and race date
 * Returns object mapping date -> workout description
 */
export async function fetchCustomizations(
  userId: 'aaron' | 'kristin',
  planId: string,
  raceDate: string
): Promise<DateWorkoutCustomization> {
  if (!supabase) return {};
  
  const { data, error } = await supabase
    .from('workout_customizations')
    .select('customizations')
    .eq('user_id', userId)
    .eq('plan_id', planId)
    .eq('race_date', raceDate)
    .maybeSingle();

  if (error) {
    console.error('Error fetching customizations:', error);
    return {};
  }

  const result = data?.customizations || {};
  
  // If it's a string, parse it (shouldn't happen with JSONB but handle it)
  if (typeof result === 'string') {
    try {
      return JSON.parse(result);
    } catch (e) {
      console.error('Failed to parse customizations:', e);
      return {};
    }
  }
  
  return result;
}

/**
 * Save a swap between two dates
 * Store the actual workout at each date for robust persistence
 */
export async function saveSwapOperation(
  userId: 'aaron' | 'kristin',
  planId: string,
  raceDate: string,
  date1: Date,
  date2: Date,
  racePlan: any // The current race plan with all workout data
): Promise<boolean> {
  if (!supabase) return false;

  try {
    const date1Str = date1.toISOString().split('T')[0];
    const date2Str = date2.toISOString().split('T')[0];

    // Get the current customizations
    const existing = await fetchCustomizations(userId, planId, raceDate);
    const customizations = { ...existing };

    // Get what workouts are currently at each date (after the swap)
    const event1 = racePlan.dateGrid.getEvent(date1);
    const event2 = racePlan.dateGrid.getEvent(date2);

    // Store exactly what's at each date after the swap
    // Keep "Rest or cross-train" as-is, only convert truly blank events to null
    const title1 = event1?.title || null;
    const title2 = event2?.title || null;
    
    customizations[date1Str] = title1;  // Store what's at date1
    customizations[date2Str] = title2;  // Store what's at date2

    // Remove entries where workout matches what would naturally be there
    // (This is an optimization - we can't easily know what "natural" is without rebuilding,
    //  so we keep it simple and store everything)

    // Upsert the record
    const { error } = await supabase
      .from('workout_customizations')
      .upsert(
        {
          user_id: userId,
          plan_id: planId,
          race_date: raceDate,
          customizations,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,plan_id,race_date',
        }
      );

    if (error) {
      console.error('Error saving swap:', error);
      return false;
    }

    // Also swap the workout logs so notes follow the workout
    await swapWorkoutLogs(userId, date1Str, date2Str);

    return true;
  } catch (err) {
    console.error('Error in saveSwapOperation:', err);
    return false;
  }
}

/**
 * Swap workout logs between two dates (so notes follow the workout)
 */
async function swapWorkoutLogs(
  userId: 'aaron' | 'kristin',
  date1: string,
  date2: string
): Promise<void> {
  if (!supabase) return;

  try {
    // Fetch both logs
    const { data: logs } = await supabase
      .from('workout_logs')
      .select('*')
      .eq('user_id', userId)
      .in('date', [date1, date2]);

    if (!logs || logs.length === 0) return;

    const log1 = logs.find(l => l.date === date1);
    const log2 = logs.find(l => l.date === date2);

    // Swap the dates in the logs
    const updates = [];
    
    if (log1) {
      updates.push({
        ...log1,
        date: date2,
        updated_at: new Date().toISOString(),
      });
    }
    
    if (log2) {
      updates.push({
        ...log2,
        date: date1,
        updated_at: new Date().toISOString(),
      });
    }

    if (updates.length > 0) {
      // Delete old logs first
      await supabase
        .from('workout_logs')
        .delete()
        .eq('user_id', userId)
        .in('date', [date1, date2]);

      // Insert swapped logs
      await supabase
        .from('workout_logs')
        .insert(updates);
    }
  } catch (err) {
    console.error('Error swapping workout logs:', err);
  }
}

/**
 * Clear all customizations for a user/plan/date (useful for reset)
 */
export async function clearCustomizations(
  userId: 'aaron' | 'kristin',
  planId: string,
  raceDate: string
): Promise<boolean> {
  if (!supabase) return false;

  const { error } = await supabase
    .from('workout_customizations')
    .delete()
    .eq('user_id', userId)
    .eq('plan_id', planId)
    .eq('race_date', raceDate);

  if (error) {
    console.error('Error clearing customizations:', error);
    return false;
  }

  return true;
}
