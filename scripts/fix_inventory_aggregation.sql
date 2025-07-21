-- Drop existing objects first
DROP MATERIALIZED VIEW IF EXISTS public.inventory_summary;
DROP FUNCTION IF EXISTS aggregate_inventory_data();

-- Create the updated function with spend column and fixed completed views
CREATE OR REPLACE FUNCTION aggregate_inventory_data()
RETURNS TABLE (
  publisher_name TEXT,
  bundle_id TEXT,
  total_impressions BIGINT,
  total_completed_views BIGINT,
  total_spend NUMERIC,
  cpm NUMERIC,
  cpcv NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH inventory_metrics AS (
    SELECT 
      COALESCE(ce.pub_name, 'Unknown') as publisher_name,
      COALESCE(ce.bundle_id, 'Unknown') as bundle_id,
      COUNT(CASE WHEN ce.event_type = 'impression' THEN 1 END) as impressions,
      COUNT(CASE WHEN ce.event_type = 'completed_view' THEN 1 END) as completed_views,
      COUNT(CASE WHEN ce.event_type = 'completed_views' THEN 1 END) as completed_views_alt
    FROM public.campaign_events ce
    GROUP BY ce.pub_name, ce.bundle_id
  )
  SELECT 
    im.publisher_name,
    im.bundle_id,
    im.impressions as total_impressions,
    COALESCE(im.completed_views, im.completed_views_alt, 0) as total_completed_views,
    -- Calculate spend based on impressions and CPM
    CASE 
      WHEN im.impressions > 0 THEN ROUND((im.impressions::NUMERIC * 24.00) / 1000, 2)
      ELSE 0 
    END as total_spend,
    -- CPM calculation: £24 CPM
    CASE 
      WHEN im.impressions > 0 THEN 24.00
      ELSE 0 
    END as cpm,
    -- CPCV calculation: spend / completed_views
    CASE 
      WHEN COALESCE(im.completed_views, im.completed_views_alt, 0) > 0 
      THEN ROUND(((im.impressions::NUMERIC * 24.00) / 1000) / COALESCE(im.completed_views, im.completed_views_alt, 0)::NUMERIC, 2)
      ELSE 0 
    END as cpcv
  FROM inventory_metrics im
  WHERE im.impressions > 0
  ORDER BY im.impressions DESC;
END;
$$ LANGUAGE plpgsql;

-- Create the materialized view with new schema
CREATE MATERIALIZED VIEW public.inventory_summary AS
SELECT * FROM aggregate_inventory_data();

-- Create indexes for new columns
CREATE INDEX idx_inventory_publisher ON public.inventory_summary(publisher_name);
CREATE INDEX idx_inventory_bundle ON public.inventory_summary(bundle_id);
CREATE INDEX idx_inventory_impressions ON public.inventory_summary(total_impressions DESC);
CREATE INDEX idx_inventory_completed_views ON public.inventory_summary(total_completed_views DESC);
CREATE INDEX idx_inventory_spend ON public.inventory_summary(total_spend DESC); 