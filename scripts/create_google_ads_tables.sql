-- Google Ads Integration Database Tables

-- Table to store Google Ads OAuth connections
CREATE TABLE IF NOT EXISTS google_ads_connections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    customer_id VARCHAR(255) NOT NULL,
    customer_name VARCHAR(500) NOT NULL,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    last_sync TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'error')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, organization_id)
);

-- Table to store Google Ads campaigns
CREATE TABLE IF NOT EXISTS google_ads_campaigns (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    campaign_id VARCHAR(255) NOT NULL,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(500) NOT NULL,
    status VARCHAR(50) NOT NULL,
    start_date DATE,
    end_date DATE,
    budget DECIMAL(10,2),
    budget_type VARCHAR(50),
    impressions BIGINT DEFAULT 0,
    clicks BIGINT DEFAULT 0,
    cost DECIMAL(10,2) DEFAULT 0,
    conversions BIGINT DEFAULT 0,
    ctr DECIMAL(5,2) DEFAULT 0,
    cpc DECIMAL(10,2) DEFAULT 0,
    cpm DECIMAL(10,2) DEFAULT 0,
    last_sync TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(campaign_id, organization_id)
);

-- Table to store Google Ads ad groups
CREATE TABLE IF NOT EXISTS google_ads_ad_groups (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ad_group_id VARCHAR(255) NOT NULL,
    campaign_id VARCHAR(255) NOT NULL,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(500) NOT NULL,
    status VARCHAR(50) NOT NULL,
    impressions BIGINT DEFAULT 0,
    clicks BIGINT DEFAULT 0,
    cost DECIMAL(10,2) DEFAULT 0,
    conversions BIGINT DEFAULT 0,
    ctr DECIMAL(5,2) DEFAULT 0,
    cpc DECIMAL(10,2) DEFAULT 0,
    last_sync TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(ad_group_id, organization_id)
);

-- Table to store Google Ads keywords
CREATE TABLE IF NOT EXISTS google_ads_keywords (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    keyword_id VARCHAR(255) NOT NULL,
    ad_group_id VARCHAR(255) NOT NULL,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    text VARCHAR(500) NOT NULL,
    match_type VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL,
    impressions BIGINT DEFAULT 0,
    clicks BIGINT DEFAULT 0,
    cost DECIMAL(10,2) DEFAULT 0,
    conversions BIGINT DEFAULT 0,
    ctr DECIMAL(5,2) DEFAULT 0,
    cpc DECIMAL(10,2) DEFAULT 0,
    quality_score INTEGER,
    last_sync TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(keyword_id, organization_id)
);

-- Table to store Google Ads performance data (daily granularity)
CREATE TABLE IF NOT EXISTS google_ads_performance (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    campaign_id VARCHAR(255),
    ad_group_id VARCHAR(255),
    keyword_id VARCHAR(255),
    date DATE NOT NULL,
    impressions BIGINT DEFAULT 0,
    clicks BIGINT DEFAULT 0,
    cost DECIMAL(10,2) DEFAULT 0,
    conversions BIGINT DEFAULT 0,
    conversion_value DECIMAL(10,2) DEFAULT 0,
    ctr DECIMAL(5,2) DEFAULT 0,
    cpc DECIMAL(10,2) DEFAULT 0,
    cpm DECIMAL(10,2) DEFAULT 0,
    roas DECIMAL(10,2) DEFAULT 0,
    last_sync TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(organization_id, campaign_id, ad_group_id, keyword_id, date)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_google_ads_connections_user_id ON google_ads_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_google_ads_connections_org_id ON google_ads_connections(organization_id);
CREATE INDEX IF NOT EXISTS idx_google_ads_connections_status ON google_ads_connections(status);

CREATE INDEX IF NOT EXISTS idx_google_ads_campaigns_org_id ON google_ads_campaigns(organization_id);
CREATE INDEX IF NOT EXISTS idx_google_ads_campaigns_campaign_id ON google_ads_campaigns(campaign_id);
CREATE INDEX IF NOT EXISTS idx_google_ads_campaigns_status ON google_ads_campaigns(status);

CREATE INDEX IF NOT EXISTS idx_google_ads_ad_groups_org_id ON google_ads_ad_groups(organization_id);
CREATE INDEX IF NOT EXISTS idx_google_ads_ad_groups_campaign_id ON google_ads_ad_groups(campaign_id);

CREATE INDEX IF NOT EXISTS idx_google_ads_keywords_org_id ON google_ads_keywords(organization_id);
CREATE INDEX IF NOT EXISTS idx_google_ads_keywords_ad_group_id ON google_ads_keywords(ad_group_id);

CREATE INDEX IF NOT EXISTS idx_google_ads_performance_org_date ON google_ads_performance(organization_id, date);
CREATE INDEX IF NOT EXISTS idx_google_ads_performance_campaign_date ON google_ads_performance(campaign_id, date);

-- Enable Row Level Security
ALTER TABLE google_ads_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE google_ads_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE google_ads_ad_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE google_ads_keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE google_ads_performance ENABLE ROW LEVEL SECURITY;

-- RLS Policies for google_ads_connections
CREATE POLICY "Users can view their own Google Ads connections" ON google_ads_connections
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own Google Ads connections" ON google_ads_connections
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own Google Ads connections" ON google_ads_connections
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own Google Ads connections" ON google_ads_connections
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for google_ads_campaigns
CREATE POLICY "Users can view campaigns for their organization" ON google_ads_campaigns
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert campaigns for their organization" ON google_ads_campaigns
    FOR INSERT WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update campaigns for their organization" ON google_ads_campaigns
    FOR UPDATE USING (
        organization_id IN (
            SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
        )
    );

-- RLS Policies for google_ads_ad_groups
CREATE POLICY "Users can view ad groups for their organization" ON google_ads_ad_groups
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert ad groups for their organization" ON google_ads_ad_groups
    FOR INSERT WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update ad groups for their organization" ON google_ads_ad_groups
    FOR UPDATE USING (
        organization_id IN (
            SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
        )
    );

-- RLS Policies for google_ads_keywords
CREATE POLICY "Users can view keywords for their organization" ON google_ads_keywords
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert keywords for their organization" ON google_ads_keywords
    FOR INSERT WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update keywords for their organization" ON google_ads_keywords
    FOR UPDATE USING (
        organization_id IN (
            SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
        )
    );

-- RLS Policies for google_ads_performance
CREATE POLICY "Users can view performance data for their organization" ON google_ads_performance
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert performance data for their organization" ON google_ads_performance
    FOR INSERT WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update performance data for their organization" ON google_ads_performance
    FOR UPDATE USING (
        organization_id IN (
            SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
        )
    );

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_google_ads_connections_updated_at BEFORE UPDATE ON google_ads_connections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_google_ads_campaigns_updated_at BEFORE UPDATE ON google_ads_campaigns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_google_ads_ad_groups_updated_at BEFORE UPDATE ON google_ads_ad_groups
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_google_ads_keywords_updated_at BEFORE UPDATE ON google_ads_keywords
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_google_ads_performance_updated_at BEFORE UPDATE ON google_ads_performance
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 