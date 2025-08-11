-- Create a function to calculate TVR values for any campaign
CREATE OR REPLACE FUNCTION calculate_campaign_tvr(campaign_uuid UUID)
RETURNS VOID AS $$
BEGIN
  -- Update plan_tvr based on the formula: (budget / cpt) / (universe / 1000)
  UPDATE public.tv_campaign_plans 
  SET plan_tvr = CASE 
    WHEN budget IS NOT NULL AND cpt IS NOT NULL AND universe IS NOT NULL AND cpt > 0 AND universe > 0
    THEN (budget / cpt) / (universe / 1000)
    ELSE plan_tvr
  END
  WHERE campaign_id = campaign_uuid;

  -- Update deal_tvr to be the same as plan_tvr
  UPDATE public.tv_campaign_plans 
  SET deal_tvr = plan_tvr
  WHERE campaign_id = campaign_uuid;
  
  RAISE NOTICE 'TVR values calculated for campaign %', campaign_uuid;
END;
$$ LANGUAGE plpgsql;

-- Example usage:
-- SELECT calculate_campaign_tvr('4e841ea3-e1b2-40f6-bd42-1d6493bec1b4'::UUID);

-- Function to get calculated TVR for a specific plan
CREATE OR REPLACE FUNCTION get_calculated_tvr(
  p_budget NUMERIC,
  p_cpt NUMERIC, 
  p_universe INTEGER
)
RETURNS NUMERIC AS $$
BEGIN
  RETURN CASE 
    WHEN p_budget IS NOT NULL AND p_cpt IS NOT NULL AND p_universe IS NOT NULL 
         AND p_cpt > 0 AND p_universe > 0
    THEN (p_budget / p_cpt) / (p_universe / 1000)
    ELSE NULL
  END;
END;
$$ LANGUAGE plpgsql;

-- Example usage:
-- SELECT get_calculated_tvr(3500, 75, 6846); 