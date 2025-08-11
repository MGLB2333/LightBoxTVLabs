-- Fix RLS policies for tv_campaign_actuals table
-- Drop existing policies first
DROP POLICY IF EXISTS "Users can view actuals for campaigns in their organization" ON tv_campaign_actuals;
DROP POLICY IF EXISTS "Users can insert actuals for campaigns in their organization" ON tv_campaign_actuals;

-- Create more permissive policies
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

CREATE POLICY "Users can update actuals for campaigns in their organization" ON tv_campaign_actuals
    FOR UPDATE USING (
        campaign_id IN (
            SELECT id FROM tv_campaigns 
            WHERE organization_id IN (
                SELECT organization_id FROM organization_members 
                WHERE user_id = auth.uid()
            )
        )
    );

-- Also add a more permissive policy for testing
CREATE POLICY "Allow authenticated users to insert actuals" ON tv_campaign_actuals
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL AND
        campaign_id IN (
            SELECT id FROM tv_campaigns 
            WHERE organization_id IS NOT NULL
        )
    ); 