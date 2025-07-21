-- Drop existing objects first
DROP MATERIALIZED VIEW IF EXISTS public.inventory_summary;
DROP FUNCTION IF EXISTS aggregate_inventory_data();

-- Create function for inventory table (grouped by pub_name only)
CREATE OR REPLACE FUNCTION aggregate_inventory_data()
RETURNS TABLE (
  publisher_name TEXT,
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
      COUNT(CASE WHEN ce.event_type = 'impression' THEN 1 END) as impressions,
      COUNT(CASE WHEN ce.event_type = 'videocomplete' THEN 1 END) as completed_views
    FROM public.campaign_events ce
    GROUP BY ce.pub_name
  )
  SELECT 
    im.publisher_name,
    im.impressions as total_impressions,
    im.completed_views as total_completed_views,
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
      WHEN im.completed_views > 0 
      THEN ROUND(((im.impressions::NUMERIC * 24.00) / 1000) / im.completed_views::NUMERIC, 2)
      ELSE 0 
    END as cpcv
  FROM inventory_metrics im
  WHERE im.impressions > 0
  ORDER BY im.impressions DESC;
END;
$$ LANGUAGE plpgsql;

-- Create function for bundle ID table (grouped by both pub_name and bundle_id)
CREATE OR REPLACE FUNCTION aggregate_bundle_data()
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
  WITH bundle_metrics AS (
    SELECT 
      COALESCE(ce.pub_name, 'Unknown') as publisher_name,
      COALESCE(ce.bundle_id, 'Unknown') as bundle_id,
      COUNT(CASE WHEN ce.event_type = 'impression' THEN 1 END) as impressions,
      COUNT(CASE WHEN ce.event_type = 'videocomplete' THEN 1 END) as completed_views
    FROM public.campaign_events ce
    GROUP BY ce.pub_name, ce.bundle_id
  )
  SELECT 
    bm.publisher_name,
    bm.bundle_id,
    bm.impressions as total_impressions,
    bm.completed_views as total_completed_views,
    -- Calculate spend based on impressions and CPM
    CASE 
      WHEN bm.impressions > 0 THEN ROUND((bm.impressions::NUMERIC * 24.00) / 1000, 2)
      ELSE 0 
    END as total_spend,
    -- CPM calculation: £24 CPM
    CASE 
      WHEN bm.impressions > 0 THEN 24.00
      ELSE 0 
    END as cpm,
    -- CPCV calculation: spend / completed_views
    CASE 
      WHEN bm.completed_views > 0 
      THEN ROUND(((bm.impressions::NUMERIC * 24.00) / 1000) / bm.completed_views::NUMERIC, 2)
      ELSE 0 
    END as cpcv
  FROM bundle_metrics bm
  WHERE bm.impressions > 0
  ORDER BY bm.impressions DESC;
END;
$$ LANGUAGE plpgsql;

-- Create the inventory materialized view (publisher only)
CREATE MATERIALIZED VIEW public.inventory_summary AS
SELECT * FROM aggregate_inventory_data();

-- Create the bundle materialized view (publisher + bundle_id)
CREATE MATERIALIZED VIEW public.bundle_summary AS
SELECT * FROM aggregate_bundle_data();

-- Create indexes for inventory view
CREATE INDEX idx_inventory_publisher ON public.inventory_summary(publisher_name);
CREATE INDEX idx_inventory_impressions ON public.inventory_summary(total_impressions DESC);
CREATE INDEX idx_inventory_completed_views ON public.inventory_summary(total_completed_views DESC);
CREATE INDEX idx_inventory_spend ON public.inventory_summary(total_spend DESC);

-- Create indexes for bundle view
CREATE INDEX idx_bundle_publisher ON public.bundle_summary(publisher_name);
CREATE INDEX idx_bundle_bundle_id ON public.bundle_summary(bundle_id);
CREATE INDEX idx_bundle_impressions ON public.bundle_summary(total_impressions DESC);
CREATE INDEX idx_bundle_completed_views ON public.bundle_summary(total_completed_views DESC);
CREATE INDEX idx_bundle_spend ON public.bundle_summary(total_spend DESC); 