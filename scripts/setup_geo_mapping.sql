-- Function to get campaign events with coordinates and aggregate by H3 hexagons
-- This function joins campaign_events.geo with Geo_lookup."Postcode District"
-- and aggregates events by H3 hexagon index

CREATE OR REPLACE FUNCTION get_campaign_events_with_coords(resolution integer DEFAULT 6)
RETURNS TABLE(h3_index text, event_count bigint) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH geo_events AS (
    SELECT 
      ce.geo,
      gl."Latitude" as lat,
      gl."Longitude" as lng
    FROM campaign_events ce
    INNER JOIN "Geo_lookup" gl ON ce.geo = gl."Postcode District"
    WHERE ce.geo IS NOT NULL 
      AND ce.geo != ''
      AND gl."Latitude" IS NOT NULL 
      AND gl."Longitude" IS NOT NULL
  ),
  h3_aggregated AS (
    SELECT 
      -- Convert lat/lng to H3 index using a simple approximation
      -- For now, we'll use a basic grid-based approach since H3 functions aren't available
      -- This creates a grid cell based on the resolution
      CONCAT(
        'h3_', 
        resolution, '_',
        FLOOR((lat + 90) * POWER(2, resolution))::text, '_',
        FLOOR((lng + 180) * POWER(2, resolution))::text
      ) as h3_index,
      COUNT(*) as event_count
    FROM geo_events
    GROUP BY 
      FLOOR((lat + 90) * POWER(2, resolution)),
      FLOOR((lng + 180) * POWER(2, resolution))
  )
  SELECT 
    h3_index,
    event_count
  FROM h3_aggregated
  ORDER BY event_count DESC;
END;
$$;

-- Test the function
-- SELECT * FROM get_campaign_events_with_coords(6) LIMIT 10; 