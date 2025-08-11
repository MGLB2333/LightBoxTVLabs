-- Add audience_code field to barb_spots table
-- Run this in your Supabase SQL editor

ALTER TABLE barb_spots ADD COLUMN IF NOT EXISTS audience_code TEXT;

-- Create index for audience_code for better performance
CREATE INDEX IF NOT EXISTS idx_barb_spots_audience_code ON barb_spots(audience_code); 