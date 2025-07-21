-- Create aggregated tables for analytics performance
-- This follows best practices for analytics platforms

-- 1. Daily Campaign Metrics (most commonly accessed)
CREATE TABLE IF NOT EXISTS daily_campaign_metrics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL,
    campaign_id TEXT,
    event_date DATE NOT NULL,
    total_events INTEGER DEFAULT 0,
    impressions INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    conversions INTEGER DEFAULT 0,
    completed_views INTEGER DEFAULT 0,
    total_spend DECIMAL(10,2) DEFAULT 0,
    total_revenue DECIMAL(10,2) DEFAULT 0,
    avg_ecpm DECIMAL(10,2) DEFAULT 0,
    avg_cpcv DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Daily Overall Metrics (for dashboard summaries)
CREATE TABLE IF NOT EXISTS daily_overall_metrics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL,
    event_date DATE NOT NULL,
    total_events INTEGER DEFAULT 0,
    total_impressions INTEGER DEFAULT 0,
    total_clicks INTEGER DEFAULT 0,
    total_conversions INTEGER DEFAULT 0,
    total_completed_views INTEGER DEFAULT 0,
    total_spend DECIMAL(10,2) DEFAULT 0,
    total_revenue DECIMAL(10,2) DEFAULT 0,
    avg_ecpm DECIMAL(10,2) DEFAULT 0,
    avg_cpcv DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Campaign Summary Metrics (for campaign table)
CREATE TABLE IF NOT EXISTS campaign_summary_metrics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL,
    campaign_id TEXT NOT NULL,
    campaign_name TEXT,
    total_events INTEGER DEFAULT 0,
    total_impressions INTEGER DEFAULT 0,
    total_clicks INTEGER DEFAULT 0,
    total_conversions INTEGER DEFAULT 0,
    total_completed_views INTEGER DEFAULT 0,
    total_spend DECIMAL(10,2) DEFAULT 0,
    total_revenue DECIMAL(10,2) DEFAULT 0,
    ctr DECIMAL(5,2) DEFAULT 0,
    roas DECIMAL(10,2) DEFAULT 0,
    completion_rate DECIMAL(5,2) DEFAULT 0,
    last_event_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_daily_campaign_metrics_org_date ON daily_campaign_metrics(organization_id, event_date);
CREATE INDEX IF NOT EXISTS idx_daily_overall_metrics_org_date ON daily_overall_metrics(organization_id, event_date);
CREATE INDEX IF NOT EXISTS idx_campaign_summary_metrics_org_campaign ON campaign_summary_metrics(organization_id, campaign_id);

-- Create unique constraints to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_campaign_metrics_unique ON daily_campaign_metrics(organization_id, campaign_id, event_date);
CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_overall_metrics_unique ON daily_overall_metrics(organization_id, event_date);
CREATE UNIQUE INDEX IF NOT EXISTS idx_campaign_summary_metrics_unique ON campaign_summary_metrics(organization_id, campaign_id);

-- Function to update aggregated metrics
CREATE OR REPLACE FUNCTION update_analytics_aggregations()
RETURNS void AS $$
BEGIN
    -- Update daily campaign metrics
    INSERT INTO daily_campaign_metrics (
        organization_id, campaign_id, event_date,
        total_events, impressions, clicks, conversions, completed_views,
        total_spend, total_revenue, avg_ecpm, avg_cpcv
    )
    SELECT 
        organization_id,
        campaign_id,
        event_date,
        COUNT(*) as total_events,
        COUNT(CASE WHEN event_type = 'impression' THEN 1 END) as impressions,
        COUNT(CASE WHEN event_type = 'click' THEN 1 END) as clicks,
        COUNT(CASE WHEN event_type = 'conversion' THEN 1 END) as conversions,
        COUNT(CASE WHEN event_type = 'videocomplete' THEN 1 END) as completed_views,
        COALESCE(SUM(spend), 0) as total_spend,
        COALESCE(SUM(revenue), 0) as total_revenue,
        CASE 
            WHEN COUNT(CASE WHEN event_type = 'impression' THEN 1 END) > 0 
            THEN COALESCE(SUM(spend), 0) / COUNT(CASE WHEN event_type = 'impression' THEN 1 END) * 1000
            ELSE 0 
        END as avg_ecpm,
        CASE 
            WHEN COUNT(CASE WHEN event_type = 'videocomplete' THEN 1 END) > 0 
            THEN COALESCE(SUM(spend), 0) / COUNT(CASE WHEN event_type = 'videocomplete' THEN 1 END)
            ELSE 0 
        END as avg_cpcv
    FROM campaign_events
    WHERE event_date >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY organization_id, campaign_id, event_date
    ON CONFLICT (organization_id, campaign_id, event_date) 
    DO UPDATE SET
        total_events = EXCLUDED.total_events,
        impressions = EXCLUDED.impressions,
        clicks = EXCLUDED.clicks,
        conversions = EXCLUDED.conversions,
        completed_views = EXCLUDED.completed_views,
        total_spend = EXCLUDED.total_spend,
        total_revenue = EXCLUDED.total_revenue,
        avg_ecpm = EXCLUDED.avg_ecpm,
        avg_cpcv = EXCLUDED.avg_cpcv,
        updated_at = NOW();

    -- Update daily overall metrics
    INSERT INTO daily_overall_metrics (
        organization_id, event_date,
        total_events, total_impressions, total_clicks, total_conversions, total_completed_views,
        total_spend, total_revenue, avg_ecpm, avg_cpcv
    )
    SELECT 
        organization_id,
        event_date,
        COUNT(*) as total_events,
        COUNT(CASE WHEN event_type = 'impression' THEN 1 END) as total_impressions,
        COUNT(CASE WHEN event_type = 'click' THEN 1 END) as total_clicks,
        COUNT(CASE WHEN event_type = 'conversion' THEN 1 END) as total_conversions,
        COUNT(CASE WHEN event_type = 'videocomplete' THEN 1 END) as total_completed_views,
        COALESCE(SUM(spend), 0) as total_spend,
        COALESCE(SUM(revenue), 0) as total_revenue,
        CASE 
            WHEN COUNT(CASE WHEN event_type = 'impression' THEN 1 END) > 0 
            THEN COALESCE(SUM(spend), 0) / COUNT(CASE WHEN event_type = 'impression' THEN 1 END) * 1000
            ELSE 0 
        END as avg_ecpm,
        CASE 
            WHEN COUNT(CASE WHEN event_type = 'videocomplete' THEN 1 END) > 0 
            THEN COALESCE(SUM(spend), 0) / COUNT(CASE WHEN event_type = 'videocomplete' THEN 1 END)
            ELSE 0 
        END as avg_cpcv
    FROM campaign_events
    WHERE event_date >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY organization_id, event_date
    ON CONFLICT (organization_id, event_date) 
    DO UPDATE SET
        total_events = EXCLUDED.total_events,
        total_impressions = EXCLUDED.total_impressions,
        total_clicks = EXCLUDED.total_clicks,
        total_conversions = EXCLUDED.total_conversions,
        total_completed_views = EXCLUDED.total_completed_views,
        total_spend = EXCLUDED.total_spend,
        total_revenue = EXCLUDED.total_revenue,
        avg_ecpm = EXCLUDED.avg_ecpm,
        avg_cpcv = EXCLUDED.avg_cpcv,
        updated_at = NOW();

    -- Update campaign summary metrics
    INSERT INTO campaign_summary_metrics (
        organization_id, campaign_id, campaign_name,
        total_events, total_impressions, total_clicks, total_conversions, total_completed_views,
        total_spend, total_revenue, ctr, roas, completion_rate, last_event_date
    )
    SELECT 
        organization_id,
        campaign_id,
        campaign_id as campaign_name, -- Using campaign_id as name for now
        COUNT(*) as total_events,
        COUNT(CASE WHEN event_type = 'impression' THEN 1 END) as total_impressions,
        COUNT(CASE WHEN event_type = 'click' THEN 1 END) as total_clicks,
        COUNT(CASE WHEN event_type = 'conversion' THEN 1 END) as total_conversions,
        COUNT(CASE WHEN event_type = 'videocomplete' THEN 1 END) as total_completed_views,
        COALESCE(SUM(spend), 0) as total_spend,
        COALESCE(SUM(revenue), 0) as total_revenue,
        CASE 
            WHEN COUNT(CASE WHEN event_type = 'impression' THEN 1 END) > 0 
            THEN (COUNT(CASE WHEN event_type = 'click' THEN 1 END)::DECIMAL / COUNT(CASE WHEN event_type = 'impression' THEN 1 END) * 100)
            ELSE 0 
        END as ctr,
        CASE 
            WHEN COALESCE(SUM(spend), 0) > 0 
            THEN COALESCE(SUM(revenue), 0) / COALESCE(SUM(spend), 0)
            ELSE 0 
        END as roas,
        CASE 
            WHEN COUNT(CASE WHEN event_type = 'impression' THEN 1 END) > 0 
            THEN (COUNT(CASE WHEN event_type = 'videocomplete' THEN 1 END)::DECIMAL / COUNT(CASE WHEN event_type = 'impression' THEN 1 END) * 100)
            ELSE 0 
        END as completion_rate,
        MAX(event_date) as last_event_date
    FROM campaign_events
    WHERE event_date >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY organization_id, campaign_id
    ON CONFLICT (organization_id, campaign_id) 
    DO UPDATE SET
        total_events = EXCLUDED.total_events,
        total_impressions = EXCLUDED.total_impressions,
        total_clicks = EXCLUDED.total_clicks,
        total_conversions = EXCLUDED.total_conversions,
        total_completed_views = EXCLUDED.total_completed_views,
        total_spend = EXCLUDED.total_spend,
        total_revenue = EXCLUDED.total_revenue,
        ctr = EXCLUDED.ctr,
        roas = EXCLUDED.roas,
        completion_rate = EXCLUDED.completion_rate,
        last_event_date = EXCLUDED.last_event_date,
        updated_at = NOW();

END;
$$ LANGUAGE plpgsql; 