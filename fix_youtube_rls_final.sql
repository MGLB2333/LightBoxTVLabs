-- Comprehensive fix for YouTube Channels RLS Policies
-- This will allow authenticated users to perform all operations

-- First, drop all existing policies
DROP POLICY IF EXISTS "Users can view all YouTube channels" ON youtube_channels;
DROP POLICY IF EXISTS "Users can insert YouTube channels" ON youtube_channels;
DROP POLICY IF EXISTS "Users can update YouTube channels" ON youtube_channels;
DROP POLICY IF EXISTS "Users can upsert YouTube channels" ON youtube_channels;

-- Create a single comprehensive policy that allows all operations for authenticated users
CREATE POLICY "Allow all operations for authenticated users" ON youtube_channels
    FOR ALL USING (auth.role() = 'authenticated');

-- Also create specific policies for better control
CREATE POLICY "Authenticated users can view channels" ON youtube_channels
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert channels" ON youtube_channels
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update channels" ON youtube_channels
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Test the policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'youtube_channels'; 