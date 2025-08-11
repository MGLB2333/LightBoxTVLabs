-- Function to safely execute SQL queries with organization filtering
CREATE OR REPLACE FUNCTION execute_sql(
  sql_query TEXT,
  user_id UUID,
  organization_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
  user_org_id UUID;
BEGIN
  -- Verify user has access to the organization
  SELECT om.organization_id INTO user_org_id
  FROM organization_members om
  WHERE om.user_id = execute_sql.user_id
    AND om.organization_id = execute_sql.organization_id;
  
  IF user_org_id IS NULL THEN
    RAISE EXCEPTION 'Access denied: User does not have access to this organization';
  END IF;
  
  -- Validate SQL query for security
  IF NOT is_safe_sql(sql_query) THEN
    RAISE EXCEPTION 'SQL query contains unsafe operations';
  END IF;
  
  -- Execute the query with organization context
  EXECUTE 'SELECT json_agg(t) FROM (' || sql_query || ') t' INTO result;
  
  RETURN COALESCE(result, '[]'::JSON);
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('error', SQLERRM);
END;
$$;

-- Helper function to validate SQL safety
CREATE OR REPLACE FUNCTION is_safe_sql(query TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check for dangerous operations
  IF UPPER(query) LIKE '%DROP%' OR
     UPPER(query) LIKE '%DELETE%' OR
     UPPER(query) LIKE '%UPDATE%' OR
     UPPER(query) LIKE '%INSERT%' OR
     UPPER(query) LIKE '%CREATE%' OR
     UPPER(query) LIKE '%ALTER%' OR
     UPPER(query) LIKE '%TRUNCATE%' OR
     UPPER(query) LIKE '%GRANT%' OR
     UPPER(query) LIKE '%REVOKE%' THEN
    RETURN FALSE;
  END IF;
  
  -- Must contain organization_id filter for security
  IF NOT (UPPER(query) LIKE '%ORGANIZATION_ID%' OR UPPER(query) LIKE '%ORG_ID%') THEN
    RETURN FALSE;
  END IF;
  
  -- Must be a SELECT query
  IF NOT UPPER(TRIM(query)) LIKE 'SELECT%' THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION execute_sql(TEXT, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_safe_sql(TEXT) TO authenticated; 