-- Drop existing objects first
DROP MATERIALIZED VIEW IF EXISTS public.content_channel_summary;
DROP MATERIALIZED VIEW IF EXISTS public.content_genre_summary;
DROP MATERIALIZED VIEW IF EXISTS public.content_title_summary;
DROP MATERIALIZED VIEW IF EXISTS public.content_series_summary;
DROP FUNCTION IF EXISTS aggregate_content_channel_data();
DROP FUNCTION IF EXISTS aggregate_content_genre_data();
DROP FUNCTION IF EXISTS aggregate_content_title_data();
DROP FUNCTION IF EXISTS aggregate_content_series_data();

-- Create function for channel name aggregation
CREATE OR REPLACE FUNCTION aggregate_content_channel_data()
RETURNS TABLE (
  channel_name TEXT,
  total_impressions BIGINT,
  total_completed_views BIGINT,
  total_spend NUMERIC,
  cpm NUMERIC,
  cpcv NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH channel_metrics AS (
    SELECT 
      COALESCE(ce.channel_name, 'Unknown') as channel_name,
      COUNT(CASE WHEN ce.event_type = 'impression' THEN 1 END) as impressions,
      COUNT(CASE WHEN ce.event_type = 'videocomplete' THEN 1 END) as completed_views
    FROM public.campaign_events ce
    GROUP BY ce.channel_name
  )
  SELECT 
    cm.channel_name,
    cm.impressions as total_impressions,
    cm.completed_views as total_completed_views,
    -- Calculate spend based on impressions and CPM
    CASE 
      WHEN cm.impressions > 0 THEN ROUND((cm.impressions::NUMERIC * 24.00) / 1000, 2)
      ELSE 0 
    END as total_spend,
    -- CPM calculation: £24 CPM
    CASE 
      WHEN cm.impressions > 0 THEN 24.00
      ELSE 0 
    END as cpm,
    -- CPCV calculation: spend / completed_views
    CASE 
      WHEN cm.completed_views > 0 
      THEN ROUND(((cm.impressions::NUMERIC * 24.00) / 1000) / cm.completed_views::NUMERIC, 2)
      ELSE 0 
    END as cpcv
  FROM channel_metrics cm
  WHERE cm.impressions > 0
  ORDER BY cm.impressions DESC;
END;
$$ LANGUAGE plpgsql;

-- Create function for content genre aggregation
CREATE OR REPLACE FUNCTION aggregate_content_genre_data()
RETURNS TABLE (
  content_genre TEXT,
  total_impressions BIGINT,
  total_completed_views BIGINT,
  total_spend NUMERIC,
  cpm NUMERIC,
  cpcv NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH genre_metrics AS (
    SELECT 
      COALESCE(ce.content_genre, 'Unknown') as content_genre,
      COUNT(CASE WHEN ce.event_type = 'impression' THEN 1 END) as impressions,
      COUNT(CASE WHEN ce.event_type = 'videocomplete' THEN 1 END) as completed_views
    FROM public.campaign_events ce
    GROUP BY ce.content_genre
  )
  SELECT 
    gm.content_genre,
    gm.impressions as total_impressions,
    gm.completed_views as total_completed_views,
    -- Calculate spend based on impressions and CPM
    CASE 
      WHEN gm.impressions > 0 THEN ROUND((gm.impressions::NUMERIC * 24.00) / 1000, 2)
      ELSE 0 
    END as total_spend,
    -- CPM calculation: £24 CPM
    CASE 
      WHEN gm.impressions > 0 THEN 24.00
      ELSE 0 
    END as cpm,
    -- CPCV calculation: spend / completed_views
    CASE 
      WHEN gm.completed_views > 0 
      THEN ROUND(((gm.impressions::NUMERIC * 24.00) / 1000) / gm.completed_views::NUMERIC, 2)
      ELSE 0 
    END as cpcv
  FROM genre_metrics gm
  WHERE gm.impressions > 0
  ORDER BY gm.impressions DESC;
END;
$$ LANGUAGE plpgsql;

-- Create function for content title aggregation
CREATE OR REPLACE FUNCTION aggregate_content_title_data()
RETURNS TABLE (
  content_title TEXT,
  total_impressions BIGINT,
  total_completed_views BIGINT,
  total_spend NUMERIC,
  cpm NUMERIC,
  cpcv NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH title_metrics AS (
    SELECT 
      COALESCE(ce.content_title, 'Unknown') as content_title,
      COUNT(CASE WHEN ce.event_type = 'impression' THEN 1 END) as impressions,
      COUNT(CASE WHEN ce.event_type = 'videocomplete' THEN 1 END) as completed_views
    FROM public.campaign_events ce
    GROUP BY ce.content_title
  )
  SELECT 
    tm.content_title,
    tm.impressions as total_impressions,
    tm.completed_views as total_completed_views,
    -- Calculate spend based on impressions and CPM
    CASE 
      WHEN tm.impressions > 0 THEN ROUND((tm.impressions::NUMERIC * 24.00) / 1000, 2)
      ELSE 0 
    END as total_spend,
    -- CPM calculation: £24 CPM
    CASE 
      WHEN tm.impressions > 0 THEN 24.00
      ELSE 0 
    END as cpm,
    -- CPCV calculation: spend / completed_views
    CASE 
      WHEN tm.completed_views > 0 
      THEN ROUND(((tm.impressions::NUMERIC * 24.00) / 1000) / tm.completed_views::NUMERIC, 2)
      ELSE 0 
    END as cpcv
  FROM title_metrics tm
  WHERE tm.impressions > 0
  ORDER BY tm.impressions DESC;
END;
$$ LANGUAGE plpgsql;

-- Create function for content series aggregation
CREATE OR REPLACE FUNCTION aggregate_content_series_data()
RETURNS TABLE (
  content_series TEXT,
  total_impressions BIGINT,
  total_completed_views BIGINT,
  total_spend NUMERIC,
  cpm NUMERIC,
  cpcv NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH series_metrics AS (
    SELECT 
      COALESCE(ce.content_series, 'Unknown') as content_series,
      COUNT(CASE WHEN ce.event_type = 'impression' THEN 1 END) as impressions,
      COUNT(CASE WHEN ce.event_type = 'videocomplete' THEN 1 END) as completed_views
    FROM public.campaign_events ce
    GROUP BY ce.content_series
  )
  SELECT 
    sm.content_series,
    sm.impressions as total_impressions,
    sm.completed_views as total_completed_views,
    -- Calculate spend based on impressions and CPM
    CASE 
      WHEN sm.impressions > 0 THEN ROUND((sm.impressions::NUMERIC * 24.00) / 1000, 2)
      ELSE 0 
    END as total_spend,
    -- CPM calculation: £24 CPM
    CASE 
      WHEN sm.impressions > 0 THEN 24.00
      ELSE 0 
    END as cpm,
    -- CPCV calculation: spend / completed_views
    CASE 
      WHEN sm.completed_views > 0 
      THEN ROUND(((sm.impressions::NUMERIC * 24.00) / 1000) / sm.completed_views::NUMERIC, 2)
      ELSE 0 
    END as cpcv
  FROM series_metrics sm
  WHERE sm.impressions > 0
  ORDER BY sm.impressions DESC;
END;
$$ LANGUAGE plpgsql;

-- Create materialized views
CREATE MATERIALIZED VIEW public.content_channel_summary AS
SELECT * FROM aggregate_content_channel_data();

CREATE MATERIALIZED VIEW public.content_genre_summary AS
SELECT * FROM aggregate_content_genre_data();

CREATE MATERIALIZED VIEW public.content_title_summary AS
SELECT * FROM aggregate_content_title_data();

CREATE MATERIALIZED VIEW public.content_series_summary AS
SELECT * FROM aggregate_content_series_data();

-- Create indexes for all views
CREATE INDEX idx_content_channel_name ON public.content_channel_summary(channel_name);
CREATE INDEX idx_content_channel_impressions ON public.content_channel_summary(total_impressions DESC);

CREATE INDEX idx_content_genre_name ON public.content_genre_summary(content_genre);
CREATE INDEX idx_content_genre_impressions ON public.content_genre_summary(total_impressions DESC);

CREATE INDEX idx_content_title_name ON public.content_title_summary(content_title);
CREATE INDEX idx_content_title_impressions ON public.content_title_summary(total_impressions DESC);

CREATE INDEX idx_content_series_name ON public.content_series_summary(content_series);
CREATE INDEX idx_content_series_impressions ON public.content_series_summary(total_impressions DESC); 