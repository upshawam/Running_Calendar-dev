import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

type KeepAliveResult = {
  ok: boolean
  timestamp: string
  source: 'github-actions' | 'manual' | 'unknown'
  details?: string
}

function getSource(req: Request): KeepAliveResult['source'] {
  const userAgent = req.headers.get('user-agent')?.toLowerCase() ?? ''
  if (userAgent.includes('github-actions')) return 'github-actions'
  if (userAgent.length > 0) return 'manual'
  return 'unknown'
}

function isAuthorized(req: Request): boolean {
  const requiredToken = Deno.env.get('KEEP_ALIVE_CRON_SECRET')

  // If no secret is configured, allow requests (useful for initial setup).
  if (!requiredToken) return true

  const authHeader = req.headers.get('authorization') ?? ''
  const token = authHeader.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length)
    : ''

  return token === requiredToken
}

serve(async (req) => {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  if (!isAuthorized(req)) {
    return new Response('Unauthorized', { status: 401 })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({
          ok: false,
          timestamp: new Date().toISOString(),
          source: getSource(req),
          details: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY',
        } satisfies KeepAliveResult),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey)

    // Lightweight query to register real database activity.
    const { error } = await supabase
      .from('workout_logs')
      .select('date', { head: true, count: 'exact' })
      .limit(1)

    if (error) {
      console.error('Keep-alive query error:', error)
      return new Response(
        JSON.stringify({
          ok: false,
          timestamp: new Date().toISOString(),
          source: getSource(req),
          details: error.message,
        } satisfies KeepAliveResult),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }

    return new Response(
      JSON.stringify({
        ok: true,
        timestamp: new Date().toISOString(),
        source: getSource(req),
        details: 'Database ping successful',
      } satisfies KeepAliveResult),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Keep-alive function failed:', error)

    return new Response(
      JSON.stringify({
        ok: false,
        timestamp: new Date().toISOString(),
        source: getSource(req),
        details: message,
      } satisfies KeepAliveResult),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  }
})
