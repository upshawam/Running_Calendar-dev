-- Migration: Add actual_distance column to workout_logs table
-- Run this in your Supabase SQL Editor

ALTER TABLE workout_logs 
ADD COLUMN actual_distance TEXT;

-- No need to update existing rows - NULL is fine for historical data
