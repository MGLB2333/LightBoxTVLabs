# Audience Analysis Methodology

## Overview

The Audience Analysis system combines campaign delivery data with Experian demographic data to provide comprehensive insights into audience composition and behavior. This methodology enables advertisers to understand not just where their campaigns were delivered, but who saw them and how they compare to the general population.

## Data Sources

### 1. Campaign Delivery Data (`campaign_events`)
- **Source**: Real-time campaign events from CTV platforms
- **Key Fields**: 
  - `geo`: Postcode district (e.g., "NG2", "CM1")
  - `event_type`: "impression" or "videocomplete"
  - `event_date`: Date of delivery
  - `ip_parsed`: Unique IP address for reach calculation

### 2. Geographic Lookup Data (`Geo_lookup`)
- **Source**: UK postcode district mapping
- **Key Fields**:
  - `Postcode District`: Matches campaign_events.geo
  - `Town/Area`: Geographic location name
  - `Region`: UK region
  - `Population`: Total population
  - `District Households`: Number of households
  - `Latitude/Longitude`: Geographic coordinates

### 3. Experian Demographic Data (`experian_data`)
- **Source**: Experian demographic segments by postcode sector
- **Key Fields**:
  - `Postcode sector`: Geographic identifier
  - Segment columns: Various demographic segment IDs with penetration percentages

### 4. Experian Taxonomy (`experian_taxonomy`)
- **Source**: Experian segment definitions and hierarchy
- **Key Fields**:
  - `Segment ID`: Unique segment identifier
  - `Segment Name`: Human-readable segment name
  - `Taxonomy > Parent Path`: Hierarchical categorization

## Analysis Methodology

### Step 1: Data Aggregation
```sql
-- Aggregate campaign events by postcode district
SELECT 
  geo as postcode_district,
  COUNT(CASE WHEN event_type = 'impression' THEN 1 END) as impressions,
  COUNT(CASE WHEN event_type = 'videocomplete' THEN 1 END) as completions
FROM campaign_events 
WHERE geo IS NOT NULL AND geo != ''
GROUP BY geo
```

### Step 2: Geographic Enrichment
- Join delivery data with `Geo_lookup` table using postcode district
- Add geographic context: town names, regions, population data
- Calculate spend using CPM (Cost Per Mille) formula: `(impressions * CPM) / 1000`

### Step 3: Demographic Analysis
For each postcode district with delivery data:

1. **Segment Penetration**: Look up Experian segment penetration for the postcode sector
2. **Delivery Weighting**: Weight segment penetration by delivery volume
3. **Index Calculation**: Compare delivery penetration to population penetration
   ```
   Index = (Delivery Penetration / Population Penetration) × 100
   ```

### Step 4: Audience Insights Generation

#### Geographic Distribution
- Top performing postcode districts by impressions
- Geographic clustering analysis
- Regional performance comparison

#### Demographic Breakdown
- **Age Groups**: 18-24, 25-34, 35-44, 45-54, 55+
- **Income Bands**: Under £25k, £25k-£50k, £50k-£75k, £75k+
- **Lifestages**: Young Professionals, Families, Empty Nesters, Retirees, Students

#### Audience Segments
- **Top Segments**: Highest index vs population
- **Over-indexed**: Segments with index > 120
- **Under-indexed**: Segments with index < 80

## Key Metrics

### 1. Delivery Metrics
- **Total Impressions**: Sum of all impression events
- **Total Completions**: Sum of all video completion events
- **Completion Rate**: Completions / Impressions
- **Total Spend**: Calculated spend across all deliveries

### 2. Geographic Metrics
- **Unique Postcodes**: Number of distinct postcode districts reached
- **Geographic Concentration**: Distribution across regions
- **Top Performing Areas**: Postcode districts with highest delivery volume

### 3. Demographic Metrics
- **Audience Index**: Relative penetration vs population (100 = average)
- **Segment Penetration**: Percentage of delivery to each demographic segment
- **Population Penetration**: Percentage of UK population in each segment

### 4. Reach Metrics
- **Unique Reach**: Count of unique IP addresses
- **Cumulative Reach**: Running total of unique IPs over time
- **New Reach**: New unique IPs per day

## Index Interpretation

### Index Ranges
- **120+**: Strong over-index (25%+ above population average)
- **100-119**: Slight over-index (0-19% above average)
- **80-99**: Slight under-index (0-20% below average)
- **<80**: Strong under-index (>20% below average)

### Business Implications
- **High Index Segments**: Target for future campaigns, potential for premium pricing
- **Low Index Segments**: Opportunity for expansion, may require different creative/messaging
- **Average Index Segments**: Standard performance, benchmark for optimization

## Data Quality Considerations

### 1. Geographic Matching
- Campaign events use postcode districts (e.g., "NG2")
- Experian data uses postcode sectors (e.g., "NG2 1")
- Matching requires district-to-sector mapping

### 2. Sample Size
- Small postcode districts may have insufficient data for reliable analysis
- Minimum thresholds applied for statistical significance

### 3. Privacy Compliance
- IP addresses anonymized for privacy
- Aggregated data only, no individual-level insights

## Technical Implementation

### Service Architecture
```typescript
class AudienceAnalysisService {
  // Main analysis method
  static async getAudienceAnalysis(): Promise<AudienceInsights>
  
  // Data fetching methods
  private static async getDeliveryDataByPostcode()
  private static async getGeographicData()
  private static async getExperianData()
  private static async getExperianTaxonomy()
  
  // Analysis methods
  private static combineData()
  private static calculateInsights()
  private static calculateDemographics()
  private static calculateAudienceSegments()
}
```

### Performance Optimizations
- Database queries use high limits (100,000 records) to avoid default restrictions
- Client-side aggregation for complex calculations
- Caching of taxonomy data for repeated lookups
- Efficient data structures (Maps) for fast lookups

## Future Enhancements

### 1. Advanced Analytics
- Machine learning for audience prediction
- Cross-campaign audience overlap analysis
- Seasonal and temporal audience patterns

### 2. Real-time Updates
- Live audience composition monitoring
- Dynamic campaign optimization recommendations
- Real-time index calculations

### 3. Enhanced Demographics
- Behavioral segments integration
- Purchase intent modeling
- Cross-device audience mapping

## Usage Examples

### Campaign Planning
```typescript
// Get audience insights for campaign optimization
const insights = await AudienceAnalysisService.getAudienceAnalysis();

// Identify high-index segments for targeting
const highIndexSegments = insights.audienceSegments
  .filter(segment => segment.index >= 120);

// Find geographic opportunities
const lowPerformingAreas = insights.geographicBreakdown
  .filter(area => area.impressions < averageImpressions);
```

### Performance Analysis
```typescript
// Compare audience composition across campaigns
const campaignA = await getAudienceAnalysis(campaignIdA);
const campaignB = await getAudienceAnalysis(campaignIdB);

// Identify audience shifts
const audienceShift = compareAudienceComposition(campaignA, campaignB);
```

This methodology provides a robust foundation for understanding audience composition and optimizing campaign performance based on real data insights. 