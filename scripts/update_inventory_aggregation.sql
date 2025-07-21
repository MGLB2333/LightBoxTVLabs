-- Update the inventory aggregation function to include completed_views, CPM, and CPCV
CREATE OR REPLACE FUNCTION aggregate_inventory_data()
RETURNS TABLE (
  publisher_name TEXT,
  bundle_id TEXT,
  total_impressions BIGINT,
  total_completed_views BIGINT,
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
      COUNT(CASE WHEN ce.event_type = 'completed_view' THEN 1 END) as completed_views
    FROM public.campaign_events ce
    GROUP BY ce.pub_name, ce.bundle_id
  )
  SELECT 
    im.publisher_name,
    im.bundle_id,
    im.impressions as total_impressions,
    im.completed_views as total_completed_views,
    -- CPM calculation: assuming £24 CPM as used in other parts of the app
    CASE 
      WHEN im.impressions > 0 THEN 24.00
      ELSE 0 
    END as cpm,
    -- CPCV calculation: CPM / completion_rate
    CASE 
      WHEN im.completed_views > 0 THEN ROUND((24.00 * im.impressions::NUMERIC / 1000) / im.completed_views::NUMERIC, 2)
      ELSE 0 
    END as cpcv
  FROM inventory_metrics im
  WHERE im.impressions > 0
  ORDER BY im.impressions DESC;
END;
$$ LANGUAGE plpgsql;

-- Refresh the materialized view with new schema
DROP MATERIALIZED VIEW IF EXISTS public.inventory_summary;
CREATE MATERIALIZED VIEW public.inventory_summary AS
SELECT * FROM aggregate_inventory_data();

-- Update indexes for new columns
DROP INDEX IF EXISTS idx_inventory_publisher;
DROP INDEX IF EXISTS idx_inventory_bundle;
DROP INDEX IF EXISTS idx_inventory_impressions;

CREATE INDEX idx_inventory_publisher ON public.inventory_summary(publisher_name);
CREATE INDEX idx_inventory_bundle ON public.inventory_summary(bundle_id);
CREATE INDEX idx_inventory_impressions ON public.inventory_summary(total_impressions DESC);
CREATE INDEX idx_inventory_completed_views ON public.inventory_summary(total_completed_views DESC); 