-- Calculate TVR values in the database
-- This script updates the plan_tvr and deal_tvr columns based on budget, cpt, and universe

-- Update plan_tvr based on the formula: (budget / cpt) / (universe / 1000)
UPDATE public.tv_campaign_plans 
SET plan_tvr = CASE 
  WHEN budget IS NOT NULL AND cpt IS NOT NULL AND universe IS NOT NULL AND cpt > 0 AND universe > 0
  THEN (budget / cpt) / (universe / 1000)
  ELSE plan_tvr
END
WHERE campaign_id = '4e841ea3-e1b2-40f6-bd42-1d6493bec1b4';

-- Update deal_tvr to be the same as plan_tvr (as requested earlier)
UPDATE public.tv_campaign_plans 
SET deal_tvr = plan_tvr
WHERE campaign_id = '4e841ea3-e1b2-40f6-bd42-1d6493bec1b4';

-- Show the results
SELECT 
  supplier_name,
  group_name,
  budget,
  cpt,
  universe,
  plan_tvr,
  deal_tvr,
  ROUND((budget / cpt) / (universe / 1000), 1) as calculated_tvr
FROM public.tv_campaign_plans 
WHERE campaign_id = '4e841ea3-e1b2-40f6-bd42-1d6493bec1b4'
ORDER BY supplier_name, group_name; 