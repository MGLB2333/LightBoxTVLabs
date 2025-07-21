import { supabase } from './supabase';

export interface ExperianSegment {
  segmentId: string;
  segmentName: string;
  averageValue: number;
  topPostcodes: { postcode: string; value: number }[];
}

export interface PostcodePerformance {
  postcodeDistrict: string;
  impressions: number;
  completions: number;
  spend: number;
  cpm: number;
  experianSegments: { segmentId: string; value: number }[];
}

export interface GeographicAudienceData {
  postcodePerformance: PostcodePerformance[];
  topSegments: ExperianSegment[];
  totalImpressions: number;
  totalCompletions: number;
  totalSpend: number;
}

export class RealExperianService {
  
  /**
   * Get real geographic audience data combining campaign delivery with Experian segments
   */
  static async getGeographicAudienceData(): Promise<GeographicAudienceData> {
    try {
      console.log('🔍 Fetching real Experian geographic data...');
      
      // Step 1: Get campaign delivery data by postcode district
      const deliveryData = await this.getDeliveryDataByPostcode();
      console.log(`📊 Found delivery data for ${deliveryData.length} postcode districts`);
      
      // Step 2: Get Experian data with real segment values
      const experianData = await this.getExperianData();
      console.log(`👥 Found Experian data for ${experianData.length} postcode sectors`);
      
      // Step 3: Get Experian taxonomy for segment names
      const taxonomy = await this.getExperianTaxonomy();
      console.log(`📋 Found ${taxonomy.length} Experian segments`);
      
      // Step 4: Combine and analyze data
      const combinedData = this.combineData(deliveryData, experianData, taxonomy);
      
      console.log('✅ Real Experian geographic analysis completed');
      return combinedData;
      
    } catch (error) {
      console.error('❌ Error in real Experian analysis:', error);
      throw error;
    }
  }
  
  /**
   * Get campaign delivery data aggregated by postcode district
   */
  private static async getDeliveryDataByPostcode() {
    console.log('🔍 Fetching postcode performance from database view...');
    
    try {
      // Use the pre-aggregated view for instant results
      const { data, error } = await supabase
        .from('v_postcode_performance')
        .select('*')
        .order('impressions', { ascending: false });
      
      if (error) {
        console.error('Error fetching from view, falling back to raw aggregation:', error);
        return await this.getDeliveryDataWithOptimizedPagination();
      }
      
      console.log(`📊 Retrieved ${data?.length || 0} postcode districts from view`);
      
      // Transform to match expected format
      const result = data?.map(row => ({
        postcodeDistrict: row.postcode_district,
        impressions: row.impressions,
        completions: row.completions,
        spend: row.spend,
        cpm: row.cpm,
        experianSegments: [] // Will be populated later in combineData
      })) || [];
      
      const totalImpressions = result.reduce((sum, item) => sum + item.impressions, 0);
      const totalCompletions = result.reduce((sum, item) => sum + item.completions, 0);
      
      console.log(`📊 View data: ${result.length} postcode districts, ${totalImpressions.toLocaleString()} impressions, ${totalCompletions.toLocaleString()} completions`);
      
      return result;
    } catch (error) {
      console.error('Error with view query, falling back to pagination:', error);
      return await this.getDeliveryDataWithOptimizedPagination();
    }
  }

  /**
   * Optimized pagination with larger chunks and better performance
   */
  private static async getDeliveryDataWithOptimizedPagination() {
    const allData: any[] = [];
    const pageSize = 5000; // Larger chunks for better performance
    let from = 0;
    let hasMore = true;
    let totalFetched = 0;
    
    while (hasMore && totalFetched < 500000) {
      const { data, error } = await supabase
        .from('campaign_events')
        .select('geo, event_type')
        .not('geo', 'is', null)
        .neq('geo', '')
        .range(from, from + pageSize - 1);
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        allData.push(...data);
        from += pageSize;
        totalFetched += data.length;
        
        // Log progress less frequently
        if (totalFetched % 25000 === 0) {
          console.log(`📊 Fetched ${totalFetched.toLocaleString()} records...`);
        }
      } else {
        hasMore = false;
      }
    }
    
    console.log(`📊 Retrieved ${allData.length} campaign events with geo data`);
    
    // Aggregate by postcode district
    const aggregated: Record<string, { impressions: number; completions: number }> = {};
    
    allData.forEach(event => {
      const district = event.geo;
      if (!aggregated[district]) {
        aggregated[district] = { impressions: 0, completions: 0 };
      }
      
      if (event.event_type === 'impression') {
        aggregated[district].impressions++;
      } else if (event.event_type === 'videocomplete') {
        aggregated[district].completions++;
      }
    });
    
    const result = Object.entries(aggregated).map(([district, metrics]) => ({
      postcodeDistrict: district,
      impressions: metrics.impressions,
      completions: metrics.completions,
      spend: (metrics.impressions * 24) / 1000, // £24 CPM
      cpm: 24,
      experianSegments: [] // Will be populated later in combineData
    }));
    
    const totalImpressions = result.reduce((sum, item) => sum + item.impressions, 0);
    const totalCompletions = result.reduce((sum, item) => sum + item.completions, 0);
    
    console.log(`📊 Aggregated data: ${result.length} postcode districts, ${totalImpressions.toLocaleString()} impressions, ${totalCompletions.toLocaleString()} completions`);
    
    return result;
  }
  
  /**
   * Get real Experian data with segment values
   */
  private static async getExperianData() {
    // First get the taxonomy to understand what segments are available
    const taxonomy = await this.getExperianTaxonomy();
    
    if (taxonomy.length === 0) {
      console.log('No Experian taxonomy found, returning empty data');
      return [];
    }
    
    // Get segment IDs from taxonomy
    const segmentIds = taxonomy.map(t => t['Segment ID']).filter(Boolean);
    
    if (segmentIds.length === 0) {
      console.log('No segment IDs found in taxonomy');
      return [];
    }
    
    // Build select fields for experian_data
    const selectFields = ['"Postcode sector"', ...segmentIds.map(id => `"${id}"`)];
    
    const { data, error } = await supabase
      .from('experian_data')
      .select(selectFields.join(', '))
      .not('"Postcode sector"', 'is', null)
      .limit(10000); // High limit to get all data
    
    if (error) throw error;
    return data || [];
  }
  
  /**
   * Get Experian taxonomy data
   */
  private static async getExperianTaxonomy() {
    const { data, error } = await supabase
      .from('experian_taxonomy')
      .select('"Segment ID", "Segment Name", "Taxonomy > Parent Path"')
      .not('"Segment ID"', 'is', null)
      .order('"Segment Name"');
    
    if (error) throw error;
    return data || [];
  }
  
  /**
   * Combine delivery data with Experian data
   */
  private static combineData(
    deliveryData: any[],
    experianData: any[],
    taxonomy: any[]
  ): GeographicAudienceData {
    
    // Create taxonomy lookup map
    const taxonomyMap = new Map(taxonomy.map(t => [t['Segment ID'], t]));
    
    // Get all segment IDs from Experian data (columns starting with S)
    const segmentIds = this.extractSegmentIds(experianData);
    console.log(`🔍 Found ${segmentIds.length} Experian segments in data`);
    
    // Map postcode districts to sectors for matching
    const districtToSectorMap = this.createDistrictToSectorMap(experianData);
    
    // Combine delivery data with Experian segments
    const postcodePerformance: PostcodePerformance[] = deliveryData.map(delivery => {
      // Find matching Experian data for this postcode district
      const matchingSectors = districtToSectorMap.get(delivery.postcodeDistrict) || [];
      
      // Get average segment values for this district
      const experianSegments = segmentIds.map(segmentId => {
        const values = matchingSectors.map(sector => sector[segmentId]).filter(v => v !== null && v !== undefined);
        const averageValue = values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0;
        
        return {
          segmentId,
          value: Math.round(averageValue)
        };
      });
      
      return {
        ...delivery,
        experianSegments
      };
    });
    
    // Calculate top segments across all postcodes
    const topSegments = this.calculateTopSegments(experianData, segmentIds, taxonomyMap);
    
    // Calculate totals
    const totalImpressions = postcodePerformance.reduce((sum, item) => sum + item.impressions, 0);
    const totalCompletions = postcodePerformance.reduce((sum, item) => sum + item.completions, 0);
    const totalSpend = postcodePerformance.reduce((sum, item) => sum + item.spend, 0);
    
    return {
      postcodePerformance: postcodePerformance.sort((a, b) => b.impressions - a.impressions),
      topSegments,
      totalImpressions,
      totalCompletions,
      totalSpend
    };
  }
  
  /**
   * Extract segment IDs from Experian data columns
   */
  private static extractSegmentIds(experianData: any[]): string[] {
    if (experianData.length === 0) return [];
    
    const firstRow = experianData[0];
    return Object.keys(firstRow).filter(key => 
      key.startsWith('S') && key !== '_id' && key !== 'Postcode sector'
    );
  }
  
  /**
   * Create mapping from postcode districts to sectors
   */
  private static createDistrictToSectorMap(experianData: any[]): Map<string, any[]> {
    const map = new Map<string, any[]>();
    
    experianData.forEach(row => {
      const postcodeSector = row['Postcode sector'];
      if (postcodeSector) {
        // Extract district from sector (e.g., "AB10 1" -> "AB10")
        const district = postcodeSector.split(' ')[0];
        
        if (!map.has(district)) {
          map.set(district, []);
        }
        map.get(district)!.push(row);
      }
    });
    
    return map;
  }
  
  /**
   * Calculate top performing segments across all postcodes
   */
  private static calculateTopSegments(
    experianData: any[],
    segmentIds: string[],
    taxonomyMap: Map<string, any>
  ): ExperianSegment[] {
    
    const segmentStats: Record<string, { total: number; count: number; postcodes: { postcode: string; value: number }[] }> = {};
    
    // Initialize segment stats
    segmentIds.forEach(segmentId => {
      segmentStats[segmentId] = { total: 0, count: 0, postcodes: [] };
    });
    
    // Aggregate segment values across all postcodes
    experianData.forEach(row => {
      const postcodeSector = row['Postcode sector'];
      segmentIds.forEach(segmentId => {
        const value = row[segmentId];
        if (value !== null && value !== undefined) {
          segmentStats[segmentId].total += value;
          segmentStats[segmentId].count += 1;
          segmentStats[segmentId].postcodes.push({
            postcode: postcodeSector,
            value: value
          });
        }
      });
    });
    
    // Calculate averages and create segment objects
    const segments: ExperianSegment[] = segmentIds.map(segmentId => {
      const stats = segmentStats[segmentId];
      const averageValue = stats.count > 0 ? stats.total / stats.count : 0;
      
      // Get segment name from taxonomy
      const taxonomyEntry = taxonomyMap.get(segmentId);
      const segmentName = taxonomyEntry?.['Segment Name'] || segmentId;
      
      // Get top 5 postcodes for this segment
      const topPostcodes = stats.postcodes
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);
      
      return {
        segmentId,
        segmentName,
        averageValue: Math.round(averageValue),
        topPostcodes
      };
    });
    
    // Sort by average value descending
    return segments.sort((a, b) => b.averageValue - a.averageValue).slice(0, 10);
  }

  /**
   * Get comprehensive demographic insights using campaign events and geographic data
   */
  static async getDemographicInsights() {
    console.log('🔍 Fetching demographic insights...');
    try {
      const deliveryData = await this.getDeliveryDataByPostcode();
      const postcodeDistricts = deliveryData.map(d => d.postcodeDistrict);
      
      // Get Experian data for these postcodes using LIKE queries
      let experianData: any[] = [];
      let experianError = null;
      
      // Try to get Experian data for each postcode district
      for (const district of postcodeDistricts.slice(0, 50)) { // Limit to first 50 to avoid too many queries
        try {
          const { data, error } = await supabase
            .from('experian_data')
            .select('*')
            .like('"Postcode sector"', `${district}%`)
            .limit(10);
          
          if (!error && data && data.length > 0) {
            experianData.push(...data);
          }
        } catch (err) {
          console.log(`Error fetching data for district ${district}:`, err);
        }
      }
      
      if (experianData.length === 0) {
        console.log('No Experian data found, using geographic data only');
        const { data: geoData, error: geoError } = await supabase
          .from('Geo_lookup')
          .select('*')
          .in('"Postcode District"', postcodeDistricts);
        
        if (geoError) throw geoError;
        
        return {
          audienceComposition: this.analyzeAudienceComposition(deliveryData, geoData),
          geographicInsights: this.analyzeGeographicInsights(deliveryData, geoData),
          reachAnalysis: this.analyzeReachInsights(deliveryData, geoData),
          performanceMetrics: this.analyzePerformanceMetrics(deliveryData, geoData),
          topSegments: [],
          demographicBreakdown: this.analyzeDemographicBreakdown(deliveryData, geoData)
        };
      }
      
      // Get Experian taxonomy
      const { data: taxonomy, error: taxonomyError } = await supabase
        .from('experian_taxonomy')
        .select('"Segment ID", "Segment Name", "Taxonomy > Parent Path"')
        .not('"Segment ID"', 'is', null);
      
      if (taxonomyError) throw taxonomyError;
      
      console.log(`📊 Retrieved ${experianData?.length || 0} Experian records and ${taxonomy?.length || 0} taxonomy records`);
      
      const insights = {
        audienceComposition: this.analyzeAudienceComposition(deliveryData, experianData, taxonomy),
        geographicInsights: this.analyzeGeographicInsights(deliveryData, experianData),
        reachAnalysis: this.analyzeReachInsights(deliveryData, experianData),
        performanceMetrics: this.analyzePerformanceMetrics(deliveryData, experianData),
        topSegments: this.analyzeTopSegments(deliveryData, experianData, taxonomy),
        demographicBreakdown: this.analyzeDemographicBreakdown(deliveryData, experianData, taxonomy)
      };
      
      return insights;
    } catch (error) {
      console.error('Error getting demographic insights:', error);
      throw error;
    }
  }

  /**
   * Analyze audience composition using Experian segments
   */
  private static analyzeAudienceComposition(deliveryData: any[], experianData: any[], taxonomy?: any[]) {
    if (!experianData || experianData.length === 0) {
      return {
        totalAudience: deliveryData.reduce((sum, d) => sum + d.impressions, 0),
        uniquePostcodes: deliveryData.length,
        averageImpressionsPerPostcode: Math.round(deliveryData.reduce((sum, d) => sum + d.impressions, 0) / deliveryData.length),
        topRegions: []
      };
    }

    // Get segment IDs from Experian data
    const segmentIds = Object.keys(experianData[0]).filter(key => key.startsWith('S'));
    
    // Calculate audience composition by segments
    const segmentComposition = segmentIds.map(segmentId => {
      const totalValue = experianData.reduce((sum, record) => sum + (record[segmentId] || 0), 0);
      const avgValue = totalValue / experianData.length;
      
      return {
        segmentId,
        segmentName: taxonomy?.find(t => t['Segment ID'] === segmentId)?.['Segment Name'] || segmentId,
        averageValue: Math.round(avgValue),
        totalValue: Math.round(totalValue),
        postcodeCount: experianData.filter(record => record[segmentId] > 0).length
      };
    }).sort((a, b) => b.averageValue - a.averageValue).slice(0, 10);

    return {
      totalAudience: deliveryData.reduce((sum, d) => sum + d.impressions, 0),
      uniquePostcodes: deliveryData.length,
      averageImpressionsPerPostcode: Math.round(deliveryData.reduce((sum, d) => sum + d.impressions, 0) / deliveryData.length),
      topSegments: segmentComposition,
      segmentCount: segmentIds.length
    };
  }

  /**
   * Analyze geographic insights
   */
  private static analyzeGeographicInsights(deliveryData: any[], experianData?: any[]) {
    // Group by region if we have geographic data
    const regionGroups = deliveryData.reduce((groups, item) => {
      const region = item.region || 'Unknown';
      if (!groups[region]) groups[region] = [];
      groups[region].push(item);
      return groups;
    }, {});

    const regionAnalysis = Object.entries(regionGroups).map(([region, items]: [string, any]) => ({
      region,
      impressions: items.reduce((sum: number, item: any) => sum + item.impressions, 0),
      completions: items.reduce((sum: number, item: any) => sum + item.completions, 0),
      postcodeCount: items.length,
      completionRate: items.reduce((sum: number, item: any) => sum + item.completions, 0) / items.reduce((sum: number, item: any) => sum + item.impressions, 0)
    })).sort((a, b) => b.impressions - a.impressions);

    return {
      regions: regionAnalysis,
      totalRegions: regionAnalysis.length,
      topRegion: regionAnalysis[0]?.region || 'Unknown',
      geographicConcentration: regionAnalysis[0]?.impressions / deliveryData.reduce((sum, d) => sum + d.impressions, 0)
    };
  }

  /**
   * Analyze reach insights
   */
  private static analyzeReachInsights(deliveryData: any[], experianData?: any[]) {
    const totalImpressions = deliveryData.reduce((sum, d) => sum + d.impressions, 0);
    const totalCompletions = deliveryData.reduce((sum, d) => sum + d.completions, 0);
    
    return {
      totalImpressions,
      totalCompletions,
      completionRate: totalCompletions / totalImpressions,
      uniquePostcodes: deliveryData.length,
      averageImpressionsPerPostcode: Math.round(totalImpressions / deliveryData.length),
      topPerformingPostcodes: deliveryData
        .sort((a, b) => b.impressions - a.impressions)
        .slice(0, 10)
        .map(item => ({
          postcode: item.postcodeDistrict,
          region: item.region || 'Unknown',
          town: item.town || 'Unknown',
          impressions: item.impressions,
          completions: item.completions,
          spend: item.spend
        }))
    };
  }

  /**
   * Analyze performance metrics
   */
  private static analyzePerformanceMetrics(deliveryData: any[], experianData?: any[]) {
    const totalImpressions = deliveryData.reduce((sum, d) => sum + d.impressions, 0);
    const totalCompletions = deliveryData.reduce((sum, d) => sum + d.completions, 0);
    const totalSpend = deliveryData.reduce((sum, d) => sum + d.spend, 0);

    return {
      totalImpressions,
      totalCompletions,
      totalSpend,
      completionRate: totalCompletions / totalImpressions,
      cpm: 24, // Fixed CPM
      cpc: totalSpend / totalCompletions,
      averageImpressionsPerPostcode: Math.round(totalImpressions / deliveryData.length),
      postcodeEfficiency: deliveryData.filter(d => d.impressions > 100).length / deliveryData.length
    };
  }

  /**
   * Analyze top segments
   */
  private static analyzeTopSegments(deliveryData: any[], experianData: any[], taxonomy: any[]) {
    if (!experianData || experianData.length === 0) return [];

    const segmentIds = Object.keys(experianData[0]).filter(key => key.startsWith('S'));
    
    return segmentIds.map(segmentId => {
      const segmentName = taxonomy.find(t => t['Segment ID'] === segmentId)?.['Segment Name'] || segmentId;
      const values = experianData.map(record => record[segmentId]).filter(v => v > 0);
      const averageValue = values.length > 0 ? values.reduce((sum, v) => sum + v, 0) / values.length : 0;
      
      return {
        segmentId,
        segmentName,
        averageValue: Math.round(averageValue),
        postcodeCount: values.length,
        totalValue: Math.round(values.reduce((sum, v) => sum + v, 0))
      };
    }).sort((a, b) => b.averageValue - a.averageValue).slice(0, 10);
  }

  /**
   * Analyze segments and convert absolute values to percentages
   */
  private static analyzeSegments(segments: any[], experianData: any[], taxonomy: any[]) {
    return segments.map(segment => {
      const segmentId = segment['Segment ID'];
      
      // Get all values for this segment across all postcodes
      const values = experianData.map(record => {
        const value = record[segmentId];
        return typeof value === 'string' ? parseFloat(value) : value;
      }).filter(v => !isNaN(v) && v > 0);
      
      if (values.length === 0) {
        return {
          segmentId,
          segmentName: segment['Segment Name'],
          category: segment['Taxonomy > Parent Path']?.split('>')[0]?.trim() || 'Other',
          averageValue: 0,
          postcodeCount: 0,
          totalPopulation: 0
        };
      }
      
      // Calculate total population for this segment across all postcodes
      const totalPopulation = values.reduce((sum, v) => sum + v, 0);
      
      // Calculate average value (this represents the average population per postcode)
      const averageValue = totalPopulation / values.length;
      
      // Convert to percentage of total population (assuming total population per postcode is roughly similar)
      // We'll use a reasonable estimate of 10,000 people per postcode sector
      const estimatedTotalPerPostcode = 10000;
      const percentageValue = Math.round((averageValue / estimatedTotalPerPostcode) * 100);
      
      return {
        segmentId,
        segmentName: segment['Segment Name'],
        category: segment['Taxonomy > Parent Path']?.split('>')[0]?.trim() || 'Other',
        averageValue: Math.min(percentageValue, 100), // Cap at 100%
        postcodeCount: values.length,
        totalPopulation: totalPopulation
      };
    }).sort((a, b) => b.averageValue - a.averageValue);
  }

  /**
   * Analyze demographic breakdown
   */
  private static analyzeDemographicBreakdown(deliveryData: any[], experianData?: any[], taxonomy?: any[]) {
    if (!experianData || experianData.length === 0) {
      return {
        ageGroups: [],
        incomeBands: [],
        lifestages: [],
        retailBrands: [],
        genderSegments: [],
        socialGradeSegments: [],
        topDemographics: []
      };
    }

    // Extract different types of segments from taxonomy
    const allSegments = taxonomy || [];
    
    // Categorize segments based on their names and taxonomy paths
    const ageSegments = allSegments.filter(t => 
      // Exact age patterns
      t['Segment Name']?.match(/^\d+-\d+$/) || // Matches patterns like "18-25", "26-35"
      t['Segment Name']?.match(/^\d+\+$/) || // Matches patterns like "66+"
      // Specific age segments from Experian data
      t['Segment ID'] === 'S00000001' || // 18-25
      t['Segment ID'] === 'S00000002' || // 26-35
      t['Segment ID'] === 'S00000003' || // 36-45
      t['Segment ID'] === 'S00000004' || // 46-55
      t['Segment ID'] === 'S00000005' || // 56-65
      t['Segment ID'] === 'S00000006' || // 66+
      t['Segment ID'] === 'S00000007' || // 66-75
      t['Segment ID'] === 'S00000008'    // 76+
    );
    
    const genderSegments = allSegments.filter(t => 
      // Only exact gender segments
      t['Segment Name']?.toLowerCase() === 'male' ||
      t['Segment Name']?.toLowerCase() === 'female' ||
      // Specific gender segments from Experian data
      t['Segment ID'] === 'S00000893' || // Male
      t['Segment ID'] === 'S00000894'    // Female
    );
    
    const socialGradeSegments = allSegments.filter(t => 
      // Only exact social grade segments
      t['Segment Name']?.match(/^Social Grade of [A-E]$/) || // Social Grade of A, B, C1, C2, D, E
      // Specific social grade segments from Experian data
      t['Segment ID'] === 'S00000097' || // Social Grade of A
      t['Segment ID'] === 'S00000098' || // Social Grade of B
      t['Segment ID'] === 'S00000099' || // Social Grade of C1
      t['Segment ID'] === 'S00000100' || // Social Grade of C2
      t['Segment ID'] === 'S00000101' || // Social Grade of D
      t['Segment ID'] === 'S00000102'    // Social Grade of E
    );
    
    const incomeSegments = allSegments.filter(t => 
      t['Segment Name']?.toLowerCase().includes('income') ||
      t['Segment Name']?.toLowerCase().includes('wealth') ||
      t['Segment Name']?.toLowerCase().includes('affluent') ||
      t['Segment Name']?.toLowerCase().includes('premium') ||
      t['Taxonomy > Parent Path']?.toLowerCase().includes('income')
    );
    
    const lifestyleSegments = allSegments.filter(t => 
      t['Segment Name']?.toLowerCase().includes('lifestyle') ||
      t['Segment Name']?.toLowerCase().includes('family') ||
      t['Segment Name']?.toLowerCase().includes('professional') ||
      t['Segment Name']?.toLowerCase().includes('student') ||
      t['Segment Name']?.toLowerCase().includes('retired') ||
      t['Segment Name']?.toLowerCase().includes('single') ||
      t['Segment Name']?.toLowerCase().includes('children') ||
      t['Taxonomy > Parent Path']?.toLowerCase().includes('lifestyle')
    );
    
    const retailSegments = allSegments.filter(t => 
      t['Segment Name']?.toLowerCase().includes('aldi') ||
      t['Segment Name']?.toLowerCase().includes('asda') ||
      t['Segment Name']?.toLowerCase().includes('coop') ||
      t['Segment Name']?.toLowerCase().includes('marks') ||
      t['Segment Name']?.toLowerCase().includes('tesco') ||
      t['Segment Name']?.toLowerCase().includes('sainsbury') ||
      t['Segment Name']?.toLowerCase().includes('waitrose') ||
      t['Segment Name']?.toLowerCase().includes('iceland') ||
      t['Taxonomy > Parent Path']?.toLowerCase().includes('retail')
    );

    // Analyze all segments using the new method
    const ageAnalysis = this.analyzeSegments(ageSegments || [], experianData, taxonomy || []);
    const genderAnalysis = this.analyzeSegments(genderSegments || [], experianData, taxonomy || []);
    const socialGradeAnalysis = this.analyzeSegments(socialGradeSegments || [], experianData, taxonomy || []);
    const incomeAnalysis = this.analyzeSegments(incomeSegments || [], experianData, taxonomy || []);
    const lifestyleAnalysis = this.analyzeSegments(lifestyleSegments || [], experianData, taxonomy || []);
    const retailAnalysis = this.analyzeSegments(retailSegments || [], experianData, taxonomy || []);

    // If we don't have traditional demographics, use age segments as a fallback
    const topDemographics = ageAnalysis.length > 0 ? ageAnalysis.slice(0, 10) : 
                           retailAnalysis.length > 0 ? retailAnalysis.slice(0, 10) :
                           (allSegments || []).slice(0, 10).map(segment => {
                             const analysis = this.analyzeSegments([segment], experianData, taxonomy || []);
                             return analysis[0];
                           }).sort((a, b) => b.averageValue - a.averageValue);

    return {
      ageGroups: ageAnalysis.slice(0, 5),
      genderSegments: genderAnalysis.slice(0, 3),
      socialGradeSegments: socialGradeAnalysis.slice(0, 4),
      incomeBands: incomeAnalysis.slice(0, 5),
      lifestages: lifestyleAnalysis.slice(0, 5),
      retailBrands: retailAnalysis.slice(0, 5),
      topDemographics: topDemographics
    };
  }

  /**
   * Analyze performance by UK regions
   */
  private static analyzeRegionalPerformance(deliveryData: PostcodePerformance[], geoData: any[]) {
    const geoMap = new Map(geoData.map(g => [g['Postcode District'], g]));
    
    const regionalData: Record<string, { impressions: number; completions: number; spend: number; postcodes: number }> = {};
    
    deliveryData.forEach(postcode => {
      const geo = geoMap.get(postcode.postcodeDistrict);
      if (geo && geo['UK region']) {
        const region = geo['UK region'];
        if (!regionalData[region]) {
          regionalData[region] = { impressions: 0, completions: 0, spend: 0, postcodes: 0 };
        }
        regionalData[region].impressions += postcode.impressions;
        regionalData[region].completions += postcode.completions;
        regionalData[region].spend += postcode.spend;
        regionalData[region].postcodes += 1;
      }
    });
    
    return Object.entries(regionalData)
      .map(([region, data]) => ({
        region,
        impressions: data.impressions,
        completions: data.completions,
        spend: data.spend,
        postcodes: data.postcodes,
        cpm: data.impressions > 0 ? (data.spend / data.impressions) * 1000 : 0,
        completionRate: data.impressions > 0 ? (data.completions / data.impressions) * 100 : 0
      }))
      .sort((a, b) => b.impressions - a.impressions);
  }

  /**
   * Analyze performance by TV regions
   */
  private static analyzeTVRegions(deliveryData: PostcodePerformance[], geoData: any[]) {
    const geoMap = new Map(geoData.map(g => [g['Postcode District'], g]));
    
    const tvRegionData: Record<string, { impressions: number; completions: number; spend: number; postcodes: number }> = {};
    
    deliveryData.forEach(postcode => {
      const geo = geoMap.get(postcode.postcodeDistrict);
      if (geo && geo['TV Region']) {
        const tvRegion = geo['TV Region'];
        if (!tvRegionData[tvRegion]) {
          tvRegionData[tvRegion] = { impressions: 0, completions: 0, spend: 0, postcodes: 0 };
        }
        tvRegionData[tvRegion].impressions += postcode.impressions;
        tvRegionData[tvRegion].completions += postcode.completions;
        tvRegionData[tvRegion].spend += postcode.spend;
        tvRegionData[tvRegion].postcodes += 1;
      }
    });
    
    return Object.entries(tvRegionData)
      .map(([tvRegion, data]) => ({
        tvRegion,
        impressions: data.impressions,
        completions: data.completions,
        spend: data.spend,
        postcodes: data.postcodes,
        cpm: data.impressions > 0 ? (data.spend / data.impressions) * 1000 : 0,
        completionRate: data.impressions > 0 ? (data.completions / data.impressions) * 100 : 0
      }))
      .sort((a, b) => b.impressions - a.impressions);
  }

  /**
   * Analyze population density insights
   */
  private static analyzePopulationDensity(deliveryData: PostcodePerformance[], geoData: any[]) {
    const geoMap = new Map(geoData.map(g => [g['Postcode District'], g]));
    
    // Analyze by postcode count (proxy for population density)
    const densityData: Record<string, { impressions: number; completions: number; spend: number; postcodes: number; totalPostcodes: number }> = {};
    
    deliveryData.forEach(postcode => {
      const geo = geoMap.get(postcode.postcodeDistrict);
      if (geo) {
        const postcodeCount = parseInt(geo['Postcodes']?.replace(/,/g, '') || '0');
        let densityCategory = 'Low';
        
        if (postcodeCount > 5000) densityCategory = 'Very High';
        else if (postcodeCount > 2000) densityCategory = 'High';
        else if (postcodeCount > 500) densityCategory = 'Medium';
        else if (postcodeCount > 100) densityCategory = 'Low';
        else densityCategory = 'Very Low';
        
        if (!densityData[densityCategory]) {
          densityData[densityCategory] = { impressions: 0, completions: 0, spend: 0, postcodes: 0, totalPostcodes: 0 };
        }
        densityData[densityCategory].impressions += postcode.impressions;
        densityData[densityCategory].completions += postcode.completions;
        densityData[densityCategory].spend += postcode.spend;
        densityData[densityCategory].postcodes += 1;
        densityData[densityCategory].totalPostcodes += postcodeCount;
      }
    });
    
    return Object.entries(densityData)
      .map(([density, data]) => ({
        density,
        impressions: data.impressions,
        completions: data.completions,
        spend: data.spend,
        postcodes: data.postcodes,
        totalPostcodes: data.totalPostcodes,
        cpm: data.impressions > 0 ? (data.spend / data.impressions) * 1000 : 0,
        completionRate: data.impressions > 0 ? (data.completions / data.impressions) * 100 : 0
      }))
      .sort((a, b) => b.impressions - a.impressions);
  }

  /**
   * Analyze geographic distribution
   */
  private static analyzeGeographicDistribution(deliveryData: PostcodePerformance[], geoData: any[]) {
    const geoMap = new Map(geoData.map(g => [g['Postcode District'], g]));
    
    const distribution = {
      totalPostcodes: deliveryData.length,
      totalImpressions: deliveryData.reduce((sum, p) => sum + p.impressions, 0),
      totalCompletions: deliveryData.reduce((sum, p) => sum + p.completions, 0),
      totalSpend: deliveryData.reduce((sum, p) => sum + p.spend, 0),
      regions: new Set<string>(),
      tvRegions: new Set<string>(),
      towns: new Set<string>()
    };
    
    deliveryData.forEach(postcode => {
      const geo = geoMap.get(postcode.postcodeDistrict);
      if (geo) {
        if (geo['UK region']) distribution.regions.add(geo['UK region']);
        if (geo['TV Region']) distribution.tvRegions.add(geo['TV Region']);
        if (geo['Town/Area']) distribution.towns.add(geo['Town/Area']);
      }
    });
    
    return {
      ...distribution,
      regions: Array.from(distribution.regions),
      tvRegions: Array.from(distribution.tvRegions),
      towns: Array.from(distribution.towns).slice(0, 20) // Top 20 towns
    };
  }

  /**
   * Analyze campaign reach
   */
  private static analyzeCampaignReach(deliveryData: PostcodePerformance[], geoData: any[]) {
    const geoMap = new Map(geoData.map(g => [g['Postcode District'], g]));
    
    const reachData = {
      totalPostcodes: deliveryData.length,
      totalImpressions: deliveryData.reduce((sum, p) => sum + p.impressions, 0),
      totalCompletions: deliveryData.reduce((sum, p) => sum + p.completions, 0),
      totalSpend: deliveryData.reduce((sum, p) => sum + p.spend, 0),
      averageImpressionsPerPostcode: 0,
      averageCompletionsPerPostcode: 0,
      averageSpendPerPostcode: 0,
      topPerformingPostcodes: [] as any[],
      regionalCoverage: {} as Record<string, number>
    };
    
    // Calculate averages
    reachData.averageImpressionsPerPostcode = reachData.totalImpressions / reachData.totalPostcodes;
    reachData.averageCompletionsPerPostcode = reachData.totalCompletions / reachData.totalPostcodes;
    reachData.averageSpendPerPostcode = reachData.totalSpend / reachData.totalPostcodes;
    
    // Top performing postcodes
    reachData.topPerformingPostcodes = deliveryData
      .sort((a, b) => b.impressions - a.impressions)
      .slice(0, 10)
      .map(postcode => {
        const geo = geoMap.get(postcode.postcodeDistrict);
        return {
          postcode: postcode.postcodeDistrict,
          impressions: postcode.impressions,
          completions: postcode.completions,
          spend: postcode.spend,
          region: geo?.['UK region'] || 'Unknown',
          town: geo?.['Town/Area'] || 'Unknown'
        };
      });
    
    // Regional coverage
    deliveryData.forEach(postcode => {
      const geo = geoMap.get(postcode.postcodeDistrict);
      if (geo && geo['UK region']) {
        const region = geo['UK region'];
        reachData.regionalCoverage[region] = (reachData.regionalCoverage[region] || 0) + 1;
      }
    });
    
    return reachData;
  }

  /**
   * Analyze performance by area types
   */
  private static analyzeAreaTypes(deliveryData: PostcodePerformance[], geoData: any[]) {
    const geoMap = new Map(geoData.map(g => [g['Postcode District'], g]));
    
    const areaData: Record<string, { impressions: number; completions: number; spend: number; postcodes: number }> = {};
    
    deliveryData.forEach(postcode => {
      const geo = geoMap.get(postcode.postcodeDistrict);
      if (geo && geo['Town/Area']) {
        const town = geo['Town/Area'];
        let areaType = 'Other';
        
        // Categorize by town name patterns
        if (town.includes('London') || town.includes('Greater London')) areaType = 'London';
        else if (town.includes('Manchester') || town.includes('Birmingham') || town.includes('Leeds') || town.includes('Liverpool')) areaType = 'Major City';
        else if (town.includes('City') || town.includes('Metropolitan')) areaType = 'City';
        else if (town.includes('Borough') || town.includes('District')) areaType = 'Borough';
        else if (town.includes('County') || town.includes('Shire')) areaType = 'County';
        else if (town.includes('Village') || town.includes('Town')) areaType = 'Town/Village';
        
        if (!areaData[areaType]) {
          areaData[areaType] = { impressions: 0, completions: 0, spend: 0, postcodes: 0 };
        }
        areaData[areaType].impressions += postcode.impressions;
        areaData[areaType].completions += postcode.completions;
        areaData[areaType].spend += postcode.spend;
        areaData[areaType].postcodes += 1;
      }
    });
    
    return Object.entries(areaData)
      .map(([areaType, data]) => ({
        areaType,
        impressions: data.impressions,
        completions: data.completions,
        spend: data.spend,
        postcodes: data.postcodes,
        cpm: data.impressions > 0 ? (data.spend / data.impressions) * 1000 : 0,
        completionRate: data.impressions > 0 ? (data.completions / data.impressions) * 100 : 0
      }))
      .sort((a, b) => b.impressions - a.impressions);
  }
} 