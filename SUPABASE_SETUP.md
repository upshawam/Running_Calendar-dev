# Supabase Setup Instructions

Follow these steps to set up your Supabase database for the Running Calendar workout logging feature.

## 1. Create a Supabase Account

1. Go to [supabase.com](https://supabase.com)
2. Click "Start your project"
3. Sign up with GitHub (recommended) or email
4. Create a new organization (or use existing)

## 2. Create a New Project

1. Click "New Project"
2. Fill in:
   - **Name**: `Running Calendar` (or whatever you prefer)
   - **Database Password**: Generate a strong password (save it somewhere safe!)
   - **Region**: Choose closest to your location
   - **Pricing Plan**: Free tier is perfect for this
3. Click "Create new project"
4. Wait ~2 minutes for setup to complete

## 3. Get Your API Keys

1. In your project dashboard, click the **Settings** icon (⚙️) in the left sidebar
2. Click **API** under Project Settings
3. You'll see two important values:
   - **Project URL**: Something like `https://xxxxx.supabase.co`
   - **anon public key**: A long string starting with `eyJ...`
4. Copy these values - you'll need them soon!

## 4. Create the Database Table

1. Click the **SQL Editor** icon in the left sidebar
2. Click **New Query**
3. Paste this SQL code:

\`\`\`sql
-- Create workout_logs table
CREATE TABLE workout_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL CHECK (user_id IN ('aaron', 'kristin')),
  date DATE NOT NULL,
  plan_workout TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  actual_distance TEXT,
  actual_pace TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure one log per user per date
  UNIQUE(user_id, date)
);

-- Add index for faster queries
CREATE INDEX idx_workout_logs_user_date ON workout_logs(user_id, date DESC);

-- Enable Row Level Security
ALTER TABLE workout_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (since no auth yet)
-- Note: This allows anyone to read/write. We'll add auth later if needed.
CREATE POLICY "Allow all access to workout_logs"
  ON workout_logs
  FOR ALL
  USING (true)
  WITH CHECK (true);
\`\`\`

4. Click **Run** (or press Ctrl/Cmd + Enter)
5. You should see "Success. No rows returned"

## 5. Configure Your App

1. In your project folder, create a file named `.env` (if it doesn't exist)
2. Add these lines (replace with your actual values from step 3):

\`\`\`
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your_long_anon_key_here
\`\`\`

3. Save the file

## 6. Test It Out

1. Restart your dev server if it's running:
   \`\`\`
   npm run dev
   \`\`\`

2. Open your Running Calendar app
3. Click on any workout card
4. The log modal should open!
5. Fill in the details and click Save
6. Check Supabase:
   - Go to **Table Editor** in left sidebar
   - Click `workout_logs`
   - You should see your log entry!

## 7. Verify Multi-Device Sync

1. Open your Running Calendar on a different device (or browser)
2. The workout logs you created should appear automatically
3. Make a change on one device
4. Refresh the other device - changes sync instantly!

---

## Security Note

**Current Setup**: Public read/write access (fine for personal use with obscure URL)

**For Better Privacy** (optional - can add later):
- We can implement simple PIN-based authentication
- Only Aaron and Kristin can log in with their PINs
- Each user only sees their own logs
- Let me know when you want to add this!

---

## Troubleshooting

### "Failed to save workout log"
- Check browser console for errors
- Verify your .env file has correct values
- Make sure the table was created successfully in SQL Editor

### "Nothing happens when I click Save"
- Open browser DevTools (F12)
- Go to Console tab
- Look for error messages - share them with me

### Logs not syncing between devices
- Hard refresh the page (Ctrl/Cmd + Shift + R)
- Check that both devices are using the same Supabase project URL

---

## What's Next?

Once this is working, we can add:
- ✅ View past workouts in a "Log" tab
- ✅ Pace progression charts
- ✅ PIN authentication for privacy
- ✅ Garmin/Runalyze integration

Let me know how the setup goes! 🏃‍♂️
