-- Fix universe values - divide by 1000 to convert from actual numbers to thousands
-- Current: 8,500,000 (8.5M) -> Should be: 8,500 (representing 8.5M in thousands)

UPDATE public.tv_campaign_plans 
SET universe = universe / 1000,
    network_universe = network_universe / 1000
WHERE universe > 100000; -- Only update if universe is clearly in wrong format (>100k)

-- Show the updated results
SELECT 
  supplier_name,
  group_name,
  budget,
  cpt,
  universe,
  network_universe,
  plan_tvr,
  deal_tvr,
  ROUND((budget / cpt) / (universe / 1000), 1) as calculated_tvr_should_be
FROM public.tv_campaign_plans 
ORDER BY supplier_name, group_name;
