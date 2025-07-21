-- Create analytics views for fast performance
-- Run these in your Supabase SQL editor

-- 1. Create view for postcode performance
CREATE OR REPLACE VIEW v_postcode_performance AS
SELECT 
  geo as postcode_district,
  COUNT(CASE WHEN event_type = 'impression' THEN 1 END) as impressions,
  COUNT(CASE WHEN event_type = 'videocomplete' THEN 1 END) as completions,
  ROUND(COUNT(CASE WHEN event_type = 'impression' THEN 1 END) * 24.0 / 1000, 2) as spend,
  24.0 as cpm
FROM campaign_events 
WHERE geo IS NOT NULL AND geo != ''
GROUP BY geo
ORDER BY impressions DESC;

-- 2. Create view for daily performance
CREATE OR REPLACE VIEW v_daily_performance AS
SELECT 
  DATE(event_date) as date,
  COUNT(CASE WHEN event_type = 'impression' THEN 1 END) as impressions,
  COUNT(CASE WHEN event_type = 'videocomplete' THEN 1 END) as completions,
  ROUND(COUNT(CASE WHEN event_type = 'impression' THEN 1 END) * 24.0 / 1000, 2) as spend
FROM campaign_events 
WHERE event_date IS NOT NULL
GROUP BY DATE(event_date)
ORDER BY date DESC;

-- 3. Create view for total metrics
CREATE OR REPLACE VIEW v_total_metrics AS
SELECT 
  COUNT(CASE WHEN event_type = 'impression' THEN 1 END) as total_impressions,
  COUNT(CASE WHEN event_type = 'videocomplete' THEN 1 END) as total_completions,
  ROUND(COUNT(CASE WHEN event_type = 'impression' THEN 1 END) * 24.0 / 1000, 2) as total_spend,
  COUNT(DISTINCT geo) as unique_postcodes
FROM campaign_events 
WHERE geo IS NOT NULL AND geo != '';

-- 4. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_campaign_events_geo ON campaign_events(geo);
CREATE INDEX IF NOT EXISTS idx_campaign_events_type ON campaign_events(event_type);
CREATE INDEX IF NOT EXISTS idx_campaign_events_date ON campaign_events(event_date);
CREATE INDEX IF NOT EXISTS idx_campaign_events_geo_type ON campaign_events(geo, event_type);

-- 5. Grant permissions (adjust as needed)
GRANT SELECT ON v_postcode_performance TO anon;
GRANT SELECT ON v_daily_performance TO anon;
GRANT SELECT ON v_total_metrics TO anon; 