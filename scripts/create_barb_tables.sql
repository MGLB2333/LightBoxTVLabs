-- Create BARB data tables for TV Spot Analysis
-- Run this in your Supabase SQL editor

-- Create barb_spots table
CREATE TABLE IF NOT EXISTS barb_spots (
  id TEXT PRIMARY KEY,
  transmission_datetime TIMESTAMP WITH TIME ZONE,
  date DATE,
  time TIME,
  channel_id TEXT,
  channel_name TEXT,
  programme_id TEXT,
  programme_title TEXT,
  programme_episode_title TEXT,
  advertiser_id TEXT,
  advertiser_name TEXT,
  brand_id TEXT,
  brand_name TEXT,
  campaign_id TEXT,
  campaign_name TEXT,
  buyer_id TEXT,
  buyer_name TEXT,
  duration INTEGER,
  impacts INTEGER,
  cpt DECIMAL(10,2),
  daypart TEXT,
  region TEXT,
  audience_segment TEXT,
  clearance_status TEXT,
  clearcast_id TEXT,
  metabroadcast_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create barb_advertisers table
CREATE TABLE IF NOT EXISTS barb_advertisers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create barb_brands table
CREATE TABLE IF NOT EXISTS barb_brands (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  advertiser_id TEXT REFERENCES barb_advertisers(id),
  advertiser_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create barb_campaigns table
CREATE TABLE IF NOT EXISTS barb_campaigns (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  advertiser_id TEXT REFERENCES barb_advertisers(id),
  advertiser_name TEXT,
  brand_id TEXT REFERENCES barb_brands(id),
  brand_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create barb_buyers table
CREATE TABLE IF NOT EXISTS barb_buyers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create barb_stations table
CREATE TABLE IF NOT EXISTS barb_stations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  region TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_barb_spots_date ON barb_spots(date);
CREATE INDEX IF NOT EXISTS idx_barb_spots_advertiser ON barb_spots(advertiser_id);
CREATE INDEX IF NOT EXISTS idx_barb_spots_brand ON barb_spots(brand_id);
CREATE INDEX IF NOT EXISTS idx_barb_spots_campaign ON barb_spots(campaign_id);
CREATE INDEX IF NOT EXISTS idx_barb_spots_channel ON barb_spots(channel_id);
CREATE INDEX IF NOT EXISTS idx_barb_spots_transmission_datetime ON barb_spots(transmission_datetime);

-- Enable RLS (Row Level Security) - you can customize this based on your needs
ALTER TABLE barb_spots ENABLE ROW LEVEL SECURITY;
ALTER TABLE barb_advertisers ENABLE ROW LEVEL SECURITY;
ALTER TABLE barb_brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE barb_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE barb_buyers ENABLE ROW LEVEL SECURITY;
ALTER TABLE barb_stations ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users to read all BARB data
CREATE POLICY "Allow authenticated users to read barb_spots" ON barb_spots
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to read barb_advertisers" ON barb_advertisers
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to read barb_brands" ON barb_brands
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to read barb_campaigns" ON barb_campaigns
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to read barb_buyers" ON barb_buyers
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to read barb_stations" ON barb_stations
  FOR SELECT TO authenticated USING (true);

-- Grant permissions to authenticated users
GRANT SELECT ON barb_spots TO authenticated;
GRANT SELECT ON barb_advertisers TO authenticated;
GRANT SELECT ON barb_brands TO authenticated;
GRANT SELECT ON barb_campaigns TO authenticated;
GRANT SELECT ON barb_buyers TO authenticated;
GRANT SELECT ON barb_stations TO authenticated;

-- Grant INSERT/UPDATE permissions for the script
GRANT INSERT, UPDATE ON barb_spots TO authenticated;
GRANT INSERT, UPDATE ON barb_advertisers TO authenticated;
GRANT INSERT, UPDATE ON barb_brands TO authenticated;
GRANT INSERT, UPDATE ON barb_campaigns TO authenticated;
GRANT INSERT, UPDATE ON barb_buyers TO authenticated;
GRANT INSERT, UPDATE ON barb_stations TO authenticated; 