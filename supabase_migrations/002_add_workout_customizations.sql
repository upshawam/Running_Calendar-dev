-- Migration: Add workout_customizations table for persisting drag-and-drop changes
-- Run this in your Supabase SQL Editor

-- Drop table if it exists to recreate with correct schema
DROP TABLE IF EXISTS workout_customizations;

-- Create workout_customizations table
CREATE TABLE workout_customizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL CHECK (user_id IN ('aaron', 'kristin')),
  plan_id TEXT NOT NULL,
  race_date DATE NOT NULL,
  customizations JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure one customization record per user per plan+date combination
  UNIQUE(user_id, plan_id, race_date)
);

-- Add index for faster queries
CREATE INDEX idx_workout_customizations_user_plan ON workout_customizations(user_id, plan_id, race_date);

-- Enable Row Level Security
ALTER TABLE workout_customizations ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (matches workout_logs setup)
CREATE POLICY "Allow all access to workout_customizations"
  ON workout_customizations
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Add comment explaining the structure
COMMENT ON TABLE workout_customizations IS 'Stores drag-and-drop customizations for training plans per user';
COMMENT ON COLUMN workout_customizations.customizations IS 'Object mapping date to workout title: {"2025-12-30": "Recovery {4-5:6-8}", "2026-01-04": null}';
