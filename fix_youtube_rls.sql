-- Fix YouTube Channels RLS Policies
-- Drop existing policies first
DROP POLICY IF EXISTS "Users can view all YouTube channels" ON youtube_channels;
DROP POLICY IF EXISTS "Users can insert YouTube channels" ON youtube_channels;
DROP POLICY IF EXISTS "Users can update YouTube channels" ON youtube_channels;

-- Create new policies
CREATE POLICY "Users can view all YouTube channels" ON youtube_channels
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert YouTube channels" ON youtube_channels
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update YouTube channels" ON youtube_channels
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Also fix the upsert issue by adding a policy for upsert operations
CREATE POLICY "Users can upsert YouTube channels" ON youtube_channels
    FOR ALL USING (auth.role() = 'authenticated'); 