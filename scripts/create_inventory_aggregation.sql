-- Function to aggregate inventory data from campaign_events
CREATE OR REPLACE FUNCTION aggregate_inventory_data()
RETURNS TABLE (
  publisher_name TEXT,
  bundle_id TEXT,
  total_impressions BIGINT,
  total_clicks BIGINT,
  total_swipes BIGINT,
  total_conversions BIGINT,
  total_spend NUMERIC,
  total_revenue NUMERIC,
  ctr NUMERIC,
  cpm NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH inventory_metrics AS (
    SELECT 
      COALESCE(ce.pub_name, 'Unknown') as publisher_name,
      COALESCE(ce.bundle_id, 'Unknown') as bundle_id,
      COUNT(CASE WHEN ce.event_type = 'impression' THEN 1 END) as impressions,
      COUNT(CASE WHEN ce.event_type = 'click' THEN 1 END) as clicks,
      COUNT(CASE WHEN ce.event_type = 'swipe' THEN 1 END) as swipes,
      COUNT(CASE WHEN ce.event_type = 'conversion' THEN 1 END) as conversions,
      COALESCE(SUM(CAST(ce.spend AS NUMERIC)), 0) as spend,
      COALESCE(SUM(CAST(ce.revenue AS NUMERIC)), 0) as revenue
    FROM campaign_events ce
    GROUP BY ce.pub_name, ce.bundle_id
  )
  SELECT 
    im.publisher_name,
    im.bundle_id,
    im.impressions as total_impressions,
    im.clicks as total_clicks,
    im.swipes as total_swipes,
    im.conversions as total_conversions,
    im.spend as total_spend,
    im.revenue as total_revenue,
    CASE 
      WHEN im.impressions > 0 THEN ROUND((im.clicks::NUMERIC / im.impressions::NUMERIC) * 100, 2)
      ELSE 0 
    END as ctr,
    CASE 
      WHEN im.impressions > 0 THEN ROUND((im.spend / im.impressions::NUMERIC) * 1000, 2)
      ELSE 0 
    END as cpm
  FROM inventory_metrics im
  WHERE im.impressions > 0
  ORDER BY im.impressions DESC;
END;
$$ LANGUAGE plpgsql;

-- Create a materialized view for better performance
CREATE MATERIALIZED VIEW IF NOT EXISTS inventory_summary AS
SELECT * FROM aggregate_inventory_data();

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_inventory_publisher ON inventory_summary(publisher_name);
CREATE INDEX IF NOT EXISTS idx_inventory_bundle ON inventory_summary(bundle_id);
CREATE INDEX IF NOT EXISTS idx_inventory_impressions ON inventory_summary(total_impressions DESC);

-- Function to refresh the materialized view
CREATE OR REPLACE FUNCTION refresh_inventory_summary()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW inventory_summary;
END;
$$ LANGUAGE plpgsql; 