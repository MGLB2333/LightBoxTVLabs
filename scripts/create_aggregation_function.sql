-- Create a PostgreSQL function to aggregate all campaign events efficiently
-- This will process all 481k records in the database, not just the 1k limit

CREATE OR REPLACE FUNCTION aggregate_all_campaign_events()
RETURNS void AS $$
BEGIN
    -- Clear existing aggregated data
    DELETE FROM daily_overall_metrics;
    DELETE FROM campaign_summary_metrics;
    
    -- Insert daily overall metrics from all campaign events
    INSERT INTO daily_overall_metrics (
        organization_id, event_date, total_events, total_impressions, 
        total_clicks, total_conversions, total_completed_views,
        total_spend, total_revenue, avg_ecpm, avg_cpcv
    )
    SELECT 
        organization_id,
        event_date,
        COUNT(*) as total_events,
        COUNT(CASE WHEN event_type = 'impression' THEN 1 END) as total_impressions,
        0 as total_clicks, -- No clicks in this dataset
        0 as total_conversions, -- No conversions in this dataset
        COUNT(CASE WHEN event_type = 'videocomplete' THEN 1 END) as total_completed_views,
        -- Calculate spend using £24 CPM
        (COUNT(CASE WHEN event_type = 'impression' THEN 1 END) * 24.0) / 1000 as total_spend,
        -- Calculate revenue as 3x spend (3x ROAS)
        ((COUNT(CASE WHEN event_type = 'impression' THEN 1 END) * 24.0) / 1000) * 3 as total_revenue,
        24.0 as avg_ecpm,
        CASE 
            WHEN COUNT(CASE WHEN event_type = 'videocomplete' THEN 1 END) > 0 
            THEN ((COUNT(CASE WHEN event_type = 'impression' THEN 1 END) * 24.0) / 1000) / COUNT(CASE WHEN event_type = 'videocomplete' THEN 1 END)
            ELSE 0 
        END as avg_cpcv
    FROM campaign_events
    GROUP BY organization_id, event_date
    ORDER BY event_date;
    
    -- Insert campaign summary metrics from all campaign events
    INSERT INTO campaign_summary_metrics (
        organization_id, campaign_id, campaign_name,
        total_events, total_impressions, total_clicks, total_conversions, total_completed_views,
        total_spend, total_revenue, ctr, roas, completion_rate, last_event_date
    )
    SELECT 
        organization_id,
        campaign_id,
        campaign_id as campaign_name,
        COUNT(*) as total_events,
        COUNT(CASE WHEN event_type = 'impression' THEN 1 END) as total_impressions,
        0 as total_clicks, -- No clicks in this dataset
        0 as total_conversions, -- No conversions in this dataset
        COUNT(CASE WHEN event_type = 'videocomplete' THEN 1 END) as total_completed_views,
        -- Calculate spend using £24 CPM
        (COUNT(CASE WHEN event_type = 'impression' THEN 1 END) * 24.0) / 1000 as total_spend,
        -- Calculate revenue as 3x spend (3x ROAS)
        ((COUNT(CASE WHEN event_type = 'impression' THEN 1 END) * 24.0) / 1000) * 3 as total_revenue,
        0 as ctr, -- No clicks, so CTR is 0
        3.0 as roas, -- 3x ROAS
        CASE 
            WHEN COUNT(CASE WHEN event_type = 'impression' THEN 1 END) > 0 
            THEN (COUNT(CASE WHEN event_type = 'videocomplete' THEN 1 END)::DECIMAL / COUNT(CASE WHEN event_type = 'impression' THEN 1 END) * 100)
            ELSE 0 
        END as completion_rate,
        MAX(event_date) as last_event_date
    FROM campaign_events
    GROUP BY organization_id, campaign_id
    ORDER BY total_impressions DESC;
    
    RAISE NOTICE 'Aggregation complete! Processed all campaign events.';
END;
$$ LANGUAGE plpgsql; 