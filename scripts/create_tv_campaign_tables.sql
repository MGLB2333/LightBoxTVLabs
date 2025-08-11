-- TV Campaign Management Database Tables
-- This creates tables for managing TV campaigns, plans, and reconciliation

-- Table to store TV campaigns
CREATE TABLE IF NOT EXISTS tv_campaigns (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    advertiser_name TEXT,
    brand_name TEXT,
    agency_name TEXT,
    start_date DATE,
    end_date DATE,
    total_budget DECIMAL(12,2),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'draft')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table to store campaign plans (supplier/group level)
CREATE TABLE IF NOT EXISTS tv_campaign_plans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    campaign_id UUID REFERENCES tv_campaigns(id) ON DELETE CASCADE,
    supplier_name TEXT NOT NULL,
    group_name TEXT NOT NULL,
    buying_audience TEXT,
    value_pot DECIMAL(12,2),
    universe INTEGER,
    network_universe INTEGER,
    plan_tvr DECIMAL(5,2),
    deal_tvr DECIMAL(5,2),
    plan_value DECIMAL(12,2),
    budget DECIMAL(12,2),
    cpt DECIMAL(8,2),
    sec INTEGER, -- seconds duration
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(campaign_id, supplier_name, group_name)
);

-- Table to store actual TVR data from BARB
CREATE TABLE IF NOT EXISTS tv_campaign_actuals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    campaign_id UUID REFERENCES tv_campaigns(id) ON DELETE CASCADE,
    supplier_name TEXT NOT NULL,
    group_name TEXT NOT NULL,
    date DATE NOT NULL,
    actual_tvr DECIMAL(5,2),
    actual_value DECIMAL(12,2),
    spots_count INTEGER,
    impacts INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(campaign_id, supplier_name, group_name, date)
);

-- Table to store campaign quality metrics
CREATE TABLE IF NOT EXISTS tv_campaign_quality (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    campaign_id UUID REFERENCES tv_campaigns(id) ON DELETE CASCADE,
    supplier_name TEXT NOT NULL,
    group_name TEXT NOT NULL,
    date DATE NOT NULL,
    clearance_rate DECIMAL(5,2),
    on_time_delivery_rate DECIMAL(5,2),
    audience_quality_score DECIMAL(5,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(campaign_id, supplier_name, group_name, date)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tv_campaigns_org ON tv_campaigns(organization_id);
CREATE INDEX IF NOT EXISTS idx_tv_campaigns_status ON tv_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_tv_campaign_plans_campaign ON tv_campaign_plans(campaign_id);
CREATE INDEX IF NOT EXISTS idx_tv_campaign_actuals_campaign ON tv_campaign_actuals(campaign_id);
CREATE INDEX IF NOT EXISTS idx_tv_campaign_actuals_date ON tv_campaign_actuals(date);
CREATE INDEX IF NOT EXISTS idx_tv_campaign_quality_campaign ON tv_campaign_quality(campaign_id);

-- Enable RLS
ALTER TABLE tv_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE tv_campaign_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE tv_campaign_actuals ENABLE ROW LEVEL SECURITY;
ALTER TABLE tv_campaign_quality ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tv_campaigns
CREATE POLICY "Users can view campaigns in their organization" ON tv_campaigns
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM organization_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert campaigns in their organization" ON tv_campaigns
    FOR INSERT WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM organization_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update campaigns in their organization" ON tv_campaigns
    FOR UPDATE USING (
        organization_id IN (
            SELECT organization_id FROM organization_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete campaigns in their organization" ON tv_campaigns
    FOR DELETE USING (
        organization_id IN (
            SELECT organization_id FROM organization_members 
            WHERE user_id = auth.uid()
        )
    );

-- RLS Policies for tv_campaign_plans
CREATE POLICY "Users can view plans for campaigns in their organization" ON tv_campaign_plans
    FOR SELECT USING (
        campaign_id IN (
            SELECT id FROM tv_campaigns 
            WHERE organization_id IN (
                SELECT organization_id FROM organization_members 
                WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can insert plans for campaigns in their organization" ON tv_campaign_plans
    FOR INSERT WITH CHECK (
        campaign_id IN (
            SELECT id FROM tv_campaigns 
            WHERE organization_id IN (
                SELECT organization_id FROM organization_members 
                WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can update plans for campaigns in their organization" ON tv_campaign_plans
    FOR UPDATE USING (
        campaign_id IN (
            SELECT id FROM tv_campaigns 
            WHERE organization_id IN (
                SELECT organization_id FROM organization_members 
                WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can delete plans for campaigns in their organization" ON tv_campaign_plans
    FOR DELETE USING (
        campaign_id IN (
            SELECT id FROM tv_campaigns 
            WHERE organization_id IN (
                SELECT organization_id FROM organization_members 
                WHERE user_id = auth.uid()
            )
        )
    );

-- RLS Policies for tv_campaign_actuals
CREATE POLICY "Users can view actuals for campaigns in their organization" ON tv_campaign_actuals
    FOR SELECT USING (
        campaign_id IN (
            SELECT id FROM tv_campaigns 
            WHERE organization_id IN (
                SELECT organization_id FROM organization_members 
                WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can insert actuals for campaigns in their organization" ON tv_campaign_actuals
    FOR INSERT WITH CHECK (
        campaign_id IN (
            SELECT id FROM tv_campaigns 
            WHERE organization_id IN (
                SELECT organization_id FROM organization_members 
                WHERE user_id = auth.uid()
            )
        )
    );

-- RLS Policies for tv_campaign_quality
CREATE POLICY "Users can view quality for campaigns in their organization" ON tv_campaign_quality
    FOR SELECT USING (
        campaign_id IN (
            SELECT id FROM tv_campaigns 
            WHERE organization_id IN (
                SELECT organization_id FROM organization_members 
                WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can insert quality for campaigns in their organization" ON tv_campaign_quality
    FOR INSERT WITH CHECK (
        campaign_id IN (
            SELECT id FROM tv_campaigns 
            WHERE organization_id IN (
                SELECT organization_id FROM organization_members 
                WHERE user_id = auth.uid()
            )
        )
    ); 