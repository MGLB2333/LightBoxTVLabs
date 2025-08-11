-- Create TVR cache table for storing calculated TVR values
-- This will significantly improve performance by avoiding repeated API calls

CREATE TABLE IF NOT EXISTS tvr_cache (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    cache_key TEXT UNIQUE NOT NULL, -- JSON stringified parameters
    advertiser TEXT NOT NULL,
    brand TEXT,
    agency TEXT,
    date DATE NOT NULL,
    buying_audience TEXT,
    station TEXT,
    tvr DECIMAL(5,2) NOT NULL,
    impacts INTEGER NOT NULL,
    spots_count INTEGER NOT NULL,
    total_duration INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_tvr_cache_key ON tvr_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_tvr_cache_params ON tvr_cache(advertiser, brand, agency, date, buying_audience, station);
CREATE INDEX IF NOT EXISTS idx_tvr_cache_created_at ON tvr_cache(created_at);

-- Function to clean old cache entries (older than 1 hour)
CREATE OR REPLACE FUNCTION clean_tvr_cache()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM tvr_cache 
    WHERE created_at < NOW() - INTERVAL '1 hour';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Cleaned % old TVR cache entries', deleted_count;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get cached TVR or return NULL if not found/expired
CREATE OR REPLACE FUNCTION get_cached_tvr(
    p_cache_key TEXT,
    p_max_age_minutes INTEGER DEFAULT 30
)
RETURNS TABLE(
    tvr DECIMAL(5,2),
    impacts INTEGER,
    spots_count INTEGER,
    total_duration INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.tvr,
        c.impacts,
        c.spots_count,
        c.total_duration
    FROM tvr_cache c
    WHERE c.cache_key = p_cache_key
    AND c.created_at > NOW() - (p_max_age_minutes || ' minutes')::INTERVAL;
END;
$$ LANGUAGE plpgsql;

-- Function to store TVR in cache
CREATE OR REPLACE FUNCTION store_tvr_cache(
    p_cache_key TEXT,
    p_advertiser TEXT,
    p_brand TEXT,
    p_agency TEXT,
    p_date DATE,
    p_buying_audience TEXT,
    p_station TEXT,
    p_tvr DECIMAL(5,2),
    p_impacts INTEGER,
    p_spots_count INTEGER,
    p_total_duration INTEGER
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO tvr_cache (
        cache_key, advertiser, brand, agency, date, 
        buying_audience, station, tvr, impacts, spots_count, total_duration
    ) VALUES (
        p_cache_key, p_advertiser, p_brand, p_agency, p_date,
        p_buying_audience, p_station, p_tvr, p_impacts, p_spots_count, p_total_duration
    )
    ON CONFLICT (cache_key) 
    DO UPDATE SET
        tvr = EXCLUDED.tvr,
        impacts = EXCLUDED.impacts,
        spots_count = EXCLUDED.spots_count,
        total_duration = EXCLUDED.total_duration,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Example usage:
-- SELECT * FROM get_cached_tvr('{"advertiser":"Test","date":"2025-01-01","station":"ITV"}', 30);
-- SELECT store_tvr_cache('key', 'advertiser', 'brand', 'agency', '2025-01-01', 'audience', 'station', 10.5, 1000, 5, 150);
-- SELECT clean_tvr_cache();

