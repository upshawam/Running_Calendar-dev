// Strava Webhook Handler - Supabase Edge Function
// This receives webhook events from Strava and logs activities to your database

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const STRAVA_API_URL = 'https://www.strava.com/api/v3'

interface StravaWebhookEvent {
  aspect_type: 'create' | 'update' | 'delete'
  event_time: number
  object_id: number
  object_type: 'activity' | 'athlete'
  owner_id: number
  subscription_id: number
  updates?: any
}

interface StravaActivity {
  id: number
  name: string
  distance: number // meters
  moving_time: number // seconds
  elapsed_time: number // seconds
  type: string
  start_date: string
  start_date_local: string
  average_speed: number // m/s
  max_speed: number
  average_heartrate?: number
}

serve(async (req) => {
  try {
    // Handle Strava's subscription validation (GET request)
    if (req.method === 'GET') {
      const url = new URL(req.url)
      const mode = url.searchParams.get('hub.mode')
      const token = url.searchParams.get('hub.verify_token')
      const challenge = url.searchParams.get('hub.challenge')

      const verifyToken = Deno.env.get('STRAVA_VERIFY_TOKEN')

      if (mode === 'subscribe' && token === verifyToken) {
        console.log('Webhook validation successful')
        return new Response(JSON.stringify({ 'hub.challenge': challenge }), {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        })
      }

      return new Response('Forbidden', { status: 403 })
    }

    // Handle webhook events (POST request)
    if (req.method === 'POST') {
      const event: StravaWebhookEvent = await req.json()
      console.log('Received webhook event:', event)

      // Only process new running activities
      if (event.object_type !== 'activity' || event.aspect_type !== 'create') {
        console.log('Ignoring non-create or non-activity event')
        return new Response('OK', { status: 200 })
      }

      // Fetch activity details from Strava
      const activity = await fetchStravaActivity(event.object_id)
      
      if (!activity) {
        console.error('Failed to fetch activity details')
        return new Response('Error fetching activity', { status: 500 })
      }

      // Only log runs (ignore bikes, swims, etc.)
      if (!activity.type.toLowerCase().includes('run')) {
        console.log(`Ignoring non-run activity: ${activity.type}`)
        return new Response('OK', { status: 200 })
      }

      // Determine user based on Strava athlete ID
      const userId = getUserFromAthleteId(event.owner_id)
      
      // Save to Supabase
      await saveWorkoutLog(activity, userId)

      return new Response('OK', { status: 200 })
    }

    return new Response('Method not allowed', { status: 405 })
  } catch (error) {
    console.error('Error processing webhook:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
})

async function fetchStravaActivity(activityId: number): Promise<StravaActivity | null> {
  try {
    const accessToken = await getValidAccessToken()
    
    const response = await fetch(`${STRAVA_API_URL}/activities/${activityId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    })

    if (!response.ok) {
      console.error('Failed to fetch activity:', response.status)
      return null
    }

    return await response.json()
  } catch (error) {
    console.error('Error fetching activity:', error)
    return null
  }
}

async function getValidAccessToken(): Promise<string> {
  // For simplicity, we'll use a static token initially
  // In production, implement token refresh logic here
  const accessToken = Deno.env.get('STRAVA_ACCESS_TOKEN')
  
  if (!accessToken) {
    throw new Error('STRAVA_ACCESS_TOKEN not configured')
  }

  // TODO: Implement automatic token refresh
  // Check if token is expired and refresh if needed
  // For now, you'll need to manually update the token periodically
  
  return accessToken
}

async function saveWorkoutLog(activity: StravaActivity, userId: 'aaron' | 'kristin') {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, supabaseKey)

  // Extract date from activity (format: YYYY-MM-DD)
  const activityDate = activity.start_date_local.split('T')[0]

  // Convert distance from meters to miles/km
  const distanceKm = (activity.distance / 1000).toFixed(2)
  const distanceMi = (activity.distance / 1609.34).toFixed(2)
  
  // Calculate pace (min/mile and min/km)
  const paceSecondsPerMile = activity.moving_time / (activity.distance / 1609.34)
  const paceMinPerMile = Math.floor(paceSecondsPerMile / 60)
  const paceSecPerMile = Math.floor(paceSecondsPerMile % 60)
  
  const paceSecondsPerKm = activity.moving_time / (activity.distance / 1000)
  const paceMinPerKm = Math.floor(paceSecondsPerKm / 60)
  const paceSecPerKm = Math.floor(paceSecondsPerKm % 60)

  // Format duration
  const hours = Math.floor(activity.moving_time / 3600)
  const minutes = Math.floor((activity.moving_time % 3600) / 60)
  const seconds = activity.moving_time % 60
  const duration = hours > 0 
    ? `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    : `${minutes}:${seconds.toString().padStart(2, '0')}`

  // Build the workout log entry
  const workoutLog = {
    user_id: userId,
    date: activityDate,
    plan_workout: 'Auto-synced from Strava', // Will match with planned workout if exists
    completed: true,
    actual_distance: `${distanceMi} mi (${distanceKm} km)`,
    actual_pace: `${paceMinPerMile}:${paceSecPerMile.toString().padStart(2, '0')}/mi (${paceMinPerKm}:${paceSecPerKm.toString().padStart(2, '0')}/km)`,
    notes: `${activity.name}\nDuration: ${duration}${activity.average_heartrate ? `\nAvg HR: ${Math.round(activity.average_heartrate)} bpm` : ''}\n\nAuto-synced from Strava`,
    updated_at: new Date().toISOString()
  }

  // Check if a log already exists for this date
  const { data: existingLog } = await supabase
    .from('workout_logs')
    .select('*')
    .eq('user_id', userId)
    .eq('date', activityDate)
    .maybeSingle()

  if (existingLog) {
    // Update existing log, preserving plan_workout from calendar
    const { error } = await supabase
      .from('workout_logs')
      .update({
        completed: true,
        actual_distance: workoutLog.actual_distance,
        actual_pace: workoutLog.actual_pace,
        notes: workoutLog.notes,
        updated_at: workoutLog.updated_at
      })
      .eq('user_id', userId)
      .eq('date', activityDate)

    if (error) {
      console.error('Error updating workout log:', error)
    } else {
      console.log('Updated existing workout log for', activityDate)
    }
  } else {
    // Insert new log
    const { error } = await supabase
      .from('workout_logs')
      .insert(workoutLog)

    if (error) {
      console.error('Error inserting workout log:', error)
    } else {
      console.log('Created new workout log for', activityDate)
    }
  }
}

function getUserFromAthleteId(athleteId: number): 'aaron' | 'kristin' {
  // Map Strava athlete IDs to your users
  const aaronAthleteId = parseInt(Deno.env.get('STRAVA_AARON_ATHLETE_ID') || '0')
  const kristinAthleteId = parseInt(Deno.env.get('STRAVA_KRISTIN_ATHLETE_ID') || '0')

  if (athleteId === aaronAthleteId) return 'aaron'
  if (athleteId === kristinAthleteId) return 'kristin'
  
  // Default to aaron if no match
  return 'aaron'
}
