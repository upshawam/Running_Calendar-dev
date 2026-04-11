# Strava Webhook → Supabase Integration Plan

**Goal:** Automatically log completed runs from Strava into your Running Calendar app via Supabase.

## How It Works

```
Garmin Watch → Garmin Connect → Strava
                                   ↓
                            [Webhook Event]
                                   ↓
                         Supabase Edge Function
                                   ↓
                         Parse Activity Data
                                   ↓
                      Insert into workout_logs table
                                   ↓
                    Your Calendar Auto-Updates! ✨
```

## Phase 1: Strava API Setup (15 minutes)

### Step 1.1: Create Strava API Application
1. Go to https://www.strava.com/settings/api
2. Click "Create App" or "My API Application"
3. Fill in:
   - **Application Name**: "Running Calendar Sync"
   - **Category**: Training
   - **Club**: Leave blank
   - **Website**: `https://upshawam.github.io/Running_Calendar-dev/`
   - **Authorization Callback Domain**: `localhost` (we won't use OAuth)
   - **Application Description**: "Auto-sync my runs to my training calendar"
4. Click "Create"
5. **Save these values** (you'll need them):
   - Client ID
   - Client Secret
   - Your Athlete ID (shown at top)

### Step 1.2: Get Your Access Token
You need to authorize your own app to access your Strava data:

1. Build this URL (replace `YOUR_CLIENT_ID`):
   ```
   https://www.strava.com/oauth/authorize?client_id=YOUR_CLIENT_ID&response_type=code&redirect_uri=http://localhost&approval_prompt=force&scope=activity:read_all
   ```

2. Open it in your browser
3. Click "Authorize"
4. You'll be redirected to `http://localhost/?code=SOMETHING`
5. Copy the `code` value from the URL

6. Exchange code for token (use PowerShell or online tool):
   ```powershell
   $body = @{
       client_id = "YOUR_CLIENT_ID"
       client_secret = "YOUR_CLIENT_SECRET"
       code = "CODE_FROM_STEP_5"
       grant_type = "authorization_code"
   }
   Invoke-RestMethod -Uri "https://www.strava.com/oauth/token" -Method POST -Body $body
   ```

7. **Save the response** - you need:
   - `access_token`
   - `refresh_token`

---

## Phase 2: Supabase Edge Function Setup (30 minutes)

### Step 2.1: Install Supabase CLI
```powershell
# Using npm
npm install -g supabase

# Or using Scoop (Windows package manager)
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

### Step 2.2: Initialize Supabase Functions
```powershell
# Navigate to your project
cd C:\Users\Aaron\Documents\GitHub\Running_Calendar-dev

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Create the webhook function
supabase functions new strava-webhook
```

### Step 2.3: Create the Webhook Handler
I'll create the function code for you (see `supabase/functions/strava-webhook/index.ts` below)

### Step 2.4: Set Environment Variables
```powershell
# Set secrets for the function
supabase secrets set STRAVA_CLIENT_ID=your_client_id
supabase secrets set STRAVA_CLIENT_SECRET=your_client_secret
supabase secrets set STRAVA_VERIFY_TOKEN=random_string_you_choose
```

### Step 2.5: Deploy the Function
```powershell
supabase functions deploy strava-webhook
```

You'll get a URL like:
`https://YOUR_PROJECT_REF.supabase.co/functions/v1/strava-webhook`

---

## Phase 3: Register Webhook with Strava (10 minutes)

### Step 3.1: Subscribe to Webhook Events
Use this PowerShell command (replace values):

```powershell
$body = @{
    client_id = "YOUR_CLIENT_ID"
    client_secret = "YOUR_CLIENT_SECRET"
    callback_url = "https://YOUR_PROJECT_REF.supabase.co/functions/v1/strava-webhook"
    verify_token = "random_string_you_chose"
}

Invoke-RestMethod -Uri "https://www.strava.com/api/v3/push_subscriptions" -Method POST -Body $body
```

### Step 3.2: Verify Subscription
Check if it worked:
```powershell
Invoke-RestMethod -Uri "https://www.strava.com/api/v3/push_subscriptions?client_id=YOUR_CLIENT_ID&client_secret=YOUR_CLIENT_SECRET"
```

---

## Phase 4: Testing (10 minutes)

### Test 1: Manual Test
You can test the webhook manually:
```powershell
$testPayload = @{
    object_type = "activity"
    object_id = 12345
    aspect_type = "create"
    owner_id = YOUR_ATHLETE_ID
    subscription_id = 1
} | ConvertTo-Json

Invoke-RestMethod -Uri "https://YOUR_PROJECT_REF.supabase.co/functions/v1/strava-webhook" -Method POST -Body $testPayload -ContentType "application/json"
```

### Test 2: Real Run
1. Go for a short run
2. Let Garmin sync to Strava
3. Within ~5 minutes, check your Supabase `workout_logs` table
4. The run should appear automatically!

---

## What Gets Auto-Logged

When you complete a run, the webhook will automatically save:
- ✅ Date of run
- ✅ Distance (from Strava)
- ✅ Average pace (calculated)
- ✅ Duration
- ✅ Marked as completed
- ✅ Run title/name from Strava

You can still manually edit or add notes afterward!

---

## Troubleshooting

### Project Paused (Supabase Free Tier)
If the project is currently paused, you must **resume it once** in the Supabase dashboard first.

Then set up an automated keep-alive ping:

1. Deploy keep-alive edge function:
   ```powershell
   supabase functions deploy keep-alive
   ```
2. Set function secret:
   ```powershell
   supabase secrets set KEEP_ALIVE_CRON_SECRET=your_long_random_secret
   ```
3. In GitHub repo settings, add Actions secrets:
   - `SUPABASE_PROJECT_REF` = your project ref
   - `SUPABASE_KEEPALIVE_TOKEN` = same value as `KEEP_ALIVE_CRON_SECRET`
4. Enable workflow in [/.github/workflows/supabase-keepalive.yml](.github/workflows/supabase-keepalive.yml)

This pings your Supabase function every 3 days and performs a lightweight DB query to keep activity flowing.

> Note: On Free tier, pauses can still happen based on platform policy. This reduces risk but does not guarantee always-on uptime.

### Webhook Not Firing
1. Check Strava subscription status:
   ```powershell
   Invoke-RestMethod -Uri "https://www.strava.com/api/v3/push_subscriptions?client_id=YOUR_CLIENT_ID&client_secret=YOUR_CLIENT_SECRET"
   ```
2. Check Supabase function logs:
   ```powershell
   supabase functions logs strava-webhook
   ```

### Token Expired
Strava tokens expire after 6 hours. The function automatically refreshes them, but you may need to re-authorize occasionally.

### Missing Data
- Make sure your Strava privacy settings allow API access
- Check that the activity is marked as "Run" type
- Verify the date matches format in your calendar

---

## Maintenance

**Monthly:** Check that webhook subscription is still active

**As Needed:** If you stop getting auto-logs, check:
1. Supabase function is deployed
2. Strava subscription is active
3. Environment variables are set

---

## Cost Breakdown

- ✅ **Strava API**: FREE (within rate limits)
- ✅ **Supabase Edge Functions**: FREE (500k invocations/month)
- ✅ **Supabase Database**: FREE (within tier limits)

**Total: $0/month** 🎉

---

## Next Steps

When you're ready to implement:

1. **I'll create** the Edge Function code file
2. **You'll run** the Strava API setup commands
3. **We'll deploy** together and test
4. **You'll enjoy** auto-synced runs!

Let me know when you want to tackle this - should take about 1 hour total.
