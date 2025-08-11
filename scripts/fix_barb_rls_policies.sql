-- Fix RLS Policies for BARB Tables
-- This script updates the Row Level Security policies to allow data insertion

-- Drop existing RLS policies for BARB tables
DROP POLICY IF EXISTS "Enable read access for all users" ON "public"."barb_spots";
DROP POLICY IF EXISTS "Enable read access for all users" ON "public"."barb_advertisers";
DROP POLICY IF EXISTS "Enable read access for all users" ON "public"."barb_brands";
DROP POLICY IF EXISTS "Enable read access for all users" ON "public"."barb_campaigns";
DROP POLICY IF EXISTS "Enable read access for all users" ON "public"."barb_buyers";
DROP POLICY IF EXISTS "Enable read access for all users" ON "public"."barb_stations";

-- Create new RLS policies that allow both read and insert operations
-- For barb_spots table
CREATE POLICY "Enable read and insert access for all users" ON "public"."barb_spots"
    FOR ALL USING (true)
    WITH CHECK (true);

-- For barb_advertisers table
CREATE POLICY "Enable read and insert access for all users" ON "public"."barb_advertisers"
    FOR ALL USING (true)
    WITH CHECK (true);

-- For barb_brands table
CREATE POLICY "Enable read and insert access for all users" ON "public"."barb_brands"
    FOR ALL USING (true)
    WITH CHECK (true);

-- For barb_campaigns table
CREATE POLICY "Enable read and insert access for all users" ON "public"."barb_campaigns"
    FOR ALL USING (true)
    WITH CHECK (true);

-- For barb_buyers table
CREATE POLICY "Enable read and insert access for all users" ON "public"."barb_buyers"
    FOR ALL USING (true)
    WITH CHECK (true);

-- For barb_stations table
CREATE POLICY "Enable read and insert access for all users" ON "public"."barb_stations"
    FOR ALL USING (true)
    WITH CHECK (true);

-- Verify RLS is enabled on all tables
ALTER TABLE "public"."barb_spots" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."barb_advertisers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."barb_brands" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."barb_campaigns" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."barb_buyers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."barb_stations" ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions to the anon role
GRANT ALL ON "public"."barb_spots" TO anon;
GRANT ALL ON "public"."barb_advertisers" TO anon;
GRANT ALL ON "public"."barb_brands" TO anon;
GRANT ALL ON "public"."barb_campaigns" TO anon;
GRANT ALL ON "public"."barb_buyers" TO anon;
GRANT ALL ON "public"."barb_stations" TO anon;

-- Grant necessary permissions to the authenticated role
GRANT ALL ON "public"."barb_spots" TO authenticated;
GRANT ALL ON "public"."barb_advertisers" TO authenticated;
GRANT ALL ON "public"."barb_brands" TO authenticated;
GRANT ALL ON "public"."barb_campaigns" TO authenticated;
GRANT ALL ON "public"."barb_buyers" TO authenticated;
GRANT ALL ON "public"."barb_stations" TO authenticated;

-- Grant usage on sequences (for auto-incrementing IDs)
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated; 