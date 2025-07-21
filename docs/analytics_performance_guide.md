# Analytics Performance Guide for Large Datasets

## 🚀 Best Practices for Large Dataset Analysis

### 1. **Database-Level Aggregation (Most Important)**

**Problem**: Fetching 472k raw records and aggregating in JavaScript is slow and inefficient.

**Solution**: Use SQL aggregation to do the heavy lifting in the database.

```sql
-- Instead of fetching all records and counting in JS:
SELECT geo, event_type, COUNT(*) as count
FROM campaign_events 
WHERE geo IS NOT NULL AND geo != ''
GROUP BY geo, event_type;
```

**Benefits**:
- 100x faster than client-side aggregation
- Reduces network transfer from 472k records to ~5k aggregated records
- Database engines are optimized for this type of operation

### 2. **Database Views and Materialized Views**

Create pre-aggregated views for common queries:

```sql
-- Create a materialized view for postcode performance
CREATE MATERIALIZED VIEW postcode_performance AS
SELECT 
  geo as postcode_district,
  COUNT(CASE WHEN event_type = 'impression' THEN 1 END) as impressions,
  COUNT(CASE WHEN event_type = 'videocomplete' THEN 1 END) as completions,
  COUNT(CASE WHEN event_type = 'impression' THEN 1 END) * 24 / 1000 as spend
FROM campaign_events 
WHERE geo IS NOT NULL AND geo != ''
GROUP BY geo;

-- Refresh periodically
REFRESH MATERIALIZED VIEW postcode_performance;
```

### 3. **Caching Strategies**

**Redis/Memory Cache**:
- Cache aggregated results for 5-15 minutes
- Invalidate on new data ingestion
- Use for frequently accessed metrics

**Browser Caching**:
- Cache API responses with appropriate headers
- Use service workers for offline analytics

### 4. **Pagination and Lazy Loading**

**For Large Tables**:
- Load first 50-100 rows immediately
- Load more on scroll or pagination
- Use virtual scrolling for very large datasets

**For Charts**:
- Load aggregated data for charts
- Load detailed data only when drilling down

### 5. **Data Partitioning and Archiving**

**Partition by Date**:
```sql
-- Partition campaign_events by month
CREATE TABLE campaign_events_2024_01 PARTITION OF campaign_events
FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
```

**Archive Old Data**:
- Move data older than 3 months to archive tables
- Keep only aggregated summaries for historical data

### 6. **Indexing Strategy**

**Essential Indexes**:
```sql
-- For geo-based queries
CREATE INDEX idx_campaign_events_geo ON campaign_events(geo);

-- For event type filtering
CREATE INDEX idx_campaign_events_type ON campaign_events(event_type);

-- Composite index for common queries
CREATE INDEX idx_campaign_events_geo_type ON campaign_events(geo, event_type);

-- For date-based queries
CREATE INDEX idx_campaign_events_date ON campaign_events(event_date);
```

### 7. **Real-time vs Batch Processing**

**Real-time (Current Approach)**:
- Good for small datasets (< 10k records)
- Immediate results but slower for large datasets

**Batch Processing (Recommended)**:
- Pre-calculate aggregations every 5-15 minutes
- Store results in dedicated analytics tables
- Serve pre-calculated results instantly

### 8. **API Design Patterns**

**RESTful Analytics Endpoints**:
```
GET /api/analytics/postcode-performance
GET /api/analytics/postcode-performance?limit=50&offset=0
GET /api/analytics/postcode-performance?postcode=EC1N
```

**GraphQL for Complex Queries**:
```graphql
query PostcodePerformance($limit: Int, $offset: Int) {
  postcodePerformance(limit: $limit, offset: $offset) {
    postcodeDistrict
    impressions
    completions
    spend
  }
}
```

## 🛠 Implementation Recommendations

### Immediate Improvements (This Week)

1. **Create Database Views**:
   ```sql
   CREATE VIEW v_postcode_performance AS
   SELECT 
     geo as postcode_district,
     COUNT(CASE WHEN event_type = 'impression' THEN 1 END) as impressions,
     COUNT(CASE WHEN event_type = 'videocomplete' THEN 1 END) as completions
   FROM campaign_events 
   WHERE geo IS NOT NULL AND geo != ''
   GROUP BY geo;
   ```

2. **Add Caching Layer**:
   - Cache aggregated results for 10 minutes
   - Use Redis or in-memory cache

3. **Implement Lazy Loading**:
   - Load top 50 postcodes immediately
   - Load more on demand

### Medium-term Improvements (Next Month)

1. **Materialized Views** for complex aggregations
2. **Data partitioning** by date
3. **Background job** for pre-calculating metrics
4. **Analytics-specific database** or read replicas

### Long-term Architecture (Next Quarter)

1. **Data Warehouse** (BigQuery, Snowflake, Redshift)
2. **ETL Pipeline** for data transformation
3. **Real-time streaming** for live analytics
4. **ML-powered insights** and anomaly detection

## 📊 Performance Benchmarks

| Approach | Records | Time | Network | Memory |
|----------|---------|------|---------|---------|
| Raw Data + JS Aggregation | 472k | 15-30s | 50MB+ | 200MB+ |
| SQL Aggregation | 472k | 0.5-2s | 100KB | 10MB |
| Materialized View | 472k | 0.1-0.5s | 50KB | 5MB |
| Cached Results | 472k | 0.01-0.1s | 10KB | 1MB |

## 🔧 Supabase-Specific Optimizations

1. **Use RPC Functions** for complex aggregations
2. **Enable Row Level Security** for data access control
3. **Use Database Functions** for reusable logic
4. **Monitor Query Performance** with Supabase Analytics

## 🎯 Next Steps

1. Implement database views for current analytics
2. Add caching layer
3. Create background jobs for data aggregation
4. Monitor and optimize query performance
5. Plan migration to dedicated analytics infrastructure 