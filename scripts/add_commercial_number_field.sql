-- Add commercial_number field to barb_spots table
-- Run this in your Supabase SQL editor

ALTER TABLE barb_spots ADD COLUMN IF NOT EXISTS commercial_number TEXT;

-- Create index for commercial_number for better performance
CREATE INDEX IF NOT EXISTS idx_barb_spots_commercial_number ON barb_spots(commercial_number); 