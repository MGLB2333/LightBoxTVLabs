import { supabase } from './supabase';

export interface PostcodeSector {
  postcode: string;
  latitude: number;
  longitude: number;
  region: string;
  town: string;
}

export interface LinearTVReach {
  postcode: string;
  impressions: number;
  reach_percentage: number;
  date: string;
}

export interface CampaignReach {
  postcode: string;
  impressions: number;
  reach_percentage: number;
  date: string;
  campaign_id: string;
}

export interface IncrementalReachData {
  postcode: string;
  latitude: number;
  longitude: number;
  region: string;
  town: string;
  linear_impressions: number;
  campaign_impressions: number;
  is_incremental: boolean;
  incremental_impressions: number;
  incremental_percentage: number;
}

export interface IncrementalReachSummary {
  total_campaign_sectors: number;
  total_linear_sectors: number;
  incremental_sectors: number;
  incremental_percentage: number;
  total_campaign_impressions: number;
  total_linear_impressions: number;
  incremental_impressions: number;
  incremental_impressions_percentage: number;
  // New metrics
  cost_per_incremental_impression: number;
  incremental_reach_efficiency: number;
  audience_quality_score: number;
  time_coverage_advantage: number;
}

export interface RegionalBreakdown {
  region: string;
  total_sectors: number;
  incremental_sectors: number;
  incremental_percentage: number;
  total_impressions: number;
  incremental_impressions: number;
  // New metrics
  cost_efficiency: number;
  audience_density: number;
}

export interface TimeBasedAnalysis {
  hour: number;
  ctv_impressions: number;
  linear_impressions: number;
  incremental_impressions: number;
  ctv_reach_percentage: number;
  linear_reach_percentage: number;
  incremental_reach_percentage: number;
}

export interface AudienceQualityMetrics {
  postcode: string;
  region: string;
  ctv_impressions: number;
  linear_impressions: number;
  audience_density: number;
  income_level: string;
  age_demographic: string;
  viewing_behavior_score: number;
  incremental_value_score: number;
}

export interface CompetitiveAnalysis {
  competitor: string;
  linear_tv_presence: number;
  ctv_gap_opportunity: number;
  market_share_linear: number;
  potential_incremental_reach: number;
  recommended_ctv_investment: number;
}

export class IncrementalReachService {
  // Get campaign reach data from campaign_events
  static async getCampaignReach(organizationId: string, dateRange?: { start: string; end: string }): Promise<CampaignReach[]> {
    let query = supabase
      .from('campaign_events')
      .select('geo, event_type, event_date, campaign_id')
      .eq('organization_id', organizationId)
      .not('geo', 'is', null)
      .neq('geo', '');

    if (dateRange) {
      query = query.gte('event_date', dateRange.start).lte('event_date', dateRange.end);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Aggregate by postcode
    const postcodeMap = new Map<string, CampaignReach>();
    
    data?.forEach(event => {
      if (!event.geo) return;
      
      if (!postcodeMap.has(event.geo)) {
        postcodeMap.set(event.geo, {
          postcode: event.geo,
          impressions: 0,
          reach_percentage: 0,
          date: event.event_date,
          campaign_id: event.campaign_id || 'unknown'
        });
      }

      const reach = postcodeMap.get(event.geo)!;
      if (event.event_type === 'impression') {
        reach.impressions++;
      }
    });

    // Calculate reach percentages
    const totalImpressions = Array.from(postcodeMap.values()).reduce((sum, reach) => sum + reach.impressions, 0);
    postcodeMap.forEach(reach => {
      reach.reach_percentage = totalImpressions > 0 ? (reach.impressions / totalImpressions) * 100 : 0;
    });

    return Array.from(postcodeMap.values());
  }

  // Get linear TV reach data from samba_sample
  static async getLinearTVReach(dateRange?: { start: string; end: string }): Promise<LinearTVReach[]> {
    let query = supabase
      .from('samba_sample')
      .select('city, duration, network, advertiser, brand, postal_code')
      .not('city', 'is', null);

    const { data, error } = await query;
    if (error) throw error;

    // Aggregate by city (since postal_code might be empty)
    const cityMap = new Map<string, LinearTVReach>();
    
    data?.forEach(spot => {
      // Use postal_code if available, otherwise use city as a fallback
      const locationKey = spot.postal_code || spot.city;
      if (!locationKey) return;
      
      if (!cityMap.has(locationKey)) {
        cityMap.set(locationKey, {
          postcode: locationKey,
          impressions: 0,
          reach_percentage: 0,
          date: '2025-06-01' // Using a default date since samba_sample doesn't have dates
        });
      }

      const reach = cityMap.get(locationKey)!;
      // Estimate impressions based on duration (30 seconds = 1 impression)
      const estimatedImpressions = Math.floor((spot.duration || 30) / 30);
      reach.impressions += estimatedImpressions;
    });

    // Calculate reach percentages
    const totalImpressions = Array.from(cityMap.values()).reduce((sum, reach) => sum + reach.impressions, 0);
    cityMap.forEach(reach => {
      reach.reach_percentage = totalImpressions > 0 ? (reach.impressions / totalImpressions) * 100 : 0;
    });

    return Array.from(cityMap.values());
  }

  // Get postcode coordinates from Geo_lookup
  static async getPostcodeCoordinates(locationKeys: string[]): Promise<PostcodeSector[]> {
    // First try to match by postcode district
    const { data: postcodeData, error: postcodeError } = await supabase
      .from('Geo_lookup')
      .select('"Postcode District", "Latitude", "Longitude", "Town/Area", "Region"')
      .in('"Postcode District"', locationKeys);

    if (postcodeError) {
      console.warn('Error fetching postcode data:', postcodeError);
    }

    // Then try to match by town/area for any remaining locations
    const matchedPostcodes = postcodeData?.map(item => item['Postcode District']) || [];
    const unmatchedLocations = locationKeys.filter(key => !matchedPostcodes.includes(key));

    let townData: any[] = [];
    if (unmatchedLocations.length > 0) {
      const { data: townMatchData, error: townError } = await supabase
        .from('Geo_lookup')
        .select('"Postcode District", "Latitude", "Longitude", "Town/Area", "Region"')
        .in('"Town/Area"', unmatchedLocations);

      if (townError) {
        console.warn('Error fetching town data:', townError);
      } else {
        townData = townMatchData || [];
      }
    }

    // Combine results
    const allData = [...(postcodeData || []), ...townData];
    const matchedLocations = new Set(allData.map(item => item['Postcode District']));

    // Create fallback coordinates for unmatched locations
    const fallbackCoordinates: { [key: string]: { lat: number; lng: number; region: string } } = {
      'London': { lat: 51.5074, lng: -0.1278, region: 'Greater London' },
      'Manchester': { lat: 53.4808, lng: -2.2426, region: 'North West' },
      'Birmingham': { lat: 52.4862, lng: -1.8904, region: 'West Midlands' },
      'Leeds': { lat: 53.8008, lng: -1.5491, region: 'Yorkshire and the Humber' },
      'Liverpool': { lat: 53.4084, lng: -2.9916, region: 'North West' },
      'Sheffield': { lat: 53.3811, lng: -1.4701, region: 'Yorkshire and the Humber' },
      'Edinburgh': { lat: 55.9533, lng: -3.1883, region: 'Scotland' },
      'Bristol': { lat: 51.4545, lng: -2.5879, region: 'South West' },
      'Glasgow': { lat: 55.8642, lng: -4.2518, region: 'Scotland' },
      'Cardiff': { lat: 51.4816, lng: -3.1791, region: 'Wales' }
    };

    const result: PostcodeSector[] = [];

    // Add matched locations
    allData.forEach(item => {
      result.push({
        postcode: item['Postcode District'],
        latitude: item['Latitude'],
        longitude: item['Longitude'],
        region: item['Region'] || 'Unknown',
        town: item['Town/Area'] || 'Unknown'
      });
    });

    // Add fallback coordinates for unmatched locations
    locationKeys.forEach(location => {
      if (!matchedLocations.has(location)) {
        const fallback = fallbackCoordinates[location];
        if (fallback) {
          result.push({
            postcode: location,
            latitude: fallback.lat,
            longitude: fallback.lng,
            region: fallback.region,
            town: location
          });
        }
      }
    });

    return result;
  }

  // Calculate incremental reach
  static async calculateIncrementalReach(organizationId: string, dateRange?: { start: string; end: string }): Promise<{
    data: IncrementalReachData[];
    summary: IncrementalReachSummary;
    regionalBreakdown: RegionalBreakdown[];
  }> {
    const campaignReach = await this.getCampaignReach(organizationId, dateRange);
    const linearReach = await this.getLinearTVReach(dateRange);
    
    const allPostcodes = new Set([
      ...campaignReach.map(r => r.postcode),
      ...linearReach.map(r => r.postcode)
    ]);
    
    const coordinates = await this.getPostcodeCoordinates(Array.from(allPostcodes));

    // Create maps for easy lookup
    const campaignMap = new Map(campaignReach.map(r => [r.postcode, r]));
    const linearMap = new Map(linearReach.map(r => [r.postcode, r]));
    const coordMap = new Map(coordinates.map(c => [c.postcode, c]));

    // Calculate incremental reach
    const incrementalData: IncrementalReachData[] = [];

    allPostcodes.forEach(postcode => {
      const campaign = campaignMap.get(postcode);
      const linear = linearMap.get(postcode);
      const coord = coordMap.get(postcode);

      if (!coord) return; // Skip if no coordinates

      const campaignImpressions = campaign?.impressions || 0;
      const linearImpressions = linear?.impressions || 0;
      const isIncremental = campaignImpressions > 0 && linearImpressions === 0;
      const incrementalImpressions = isIncremental ? campaignImpressions : 0;
      const incrementalPercentage = campaignImpressions > 0 ? (incrementalImpressions / campaignImpressions) * 100 : 0;

      incrementalData.push({
        postcode: coord.postcode,
        latitude: coord.latitude,
        longitude: coord.longitude,
        region: coord.region,
        town: coord.town,
        linear_impressions: linearImpressions,
        campaign_impressions: campaignImpressions,
        is_incremental: isIncremental,
        incremental_impressions: incrementalImpressions,
        incremental_percentage: incrementalPercentage
      });
    });

    // Calculate summary
    const totalCampaignSectors = campaignMap.size;
    const totalLinearSectors = linearMap.size;
    const incrementalSectors = incrementalData.filter(d => d.is_incremental).length;
    const totalCampaignImpressions = Array.from(campaignMap.values()).reduce((sum, r) => sum + r.impressions, 0);
    const totalLinearImpressions = Array.from(linearMap.values()).reduce((sum, r) => sum + r.impressions, 0);
    const incrementalImpressions = incrementalData.reduce((sum, d) => sum + d.incremental_impressions, 0);

    const summary: IncrementalReachSummary = {
      total_campaign_sectors: totalCampaignSectors,
      total_linear_sectors: totalLinearSectors,
      incremental_sectors: incrementalSectors,
      incremental_percentage: totalCampaignSectors > 0 ? (incrementalSectors / totalCampaignSectors) * 100 : 0,
      total_campaign_impressions: totalCampaignImpressions,
      total_linear_impressions: totalLinearImpressions,
      incremental_impressions: incrementalImpressions,
      incremental_impressions_percentage: totalCampaignImpressions > 0 ? (incrementalImpressions / totalCampaignImpressions) * 100 : 0,
      // New metrics
      cost_per_incremental_impression: incrementalImpressions > 0 ? 0.15 : 0, // Estimated CPM for CTV
      incremental_reach_efficiency: incrementalSectors > 0 ? (incrementalImpressions / incrementalSectors) : 0,
      audience_quality_score: this.calculateAudienceQualityScore(incrementalData),
      time_coverage_advantage: this.calculateTimeCoverageAdvantage(campaignReach, linearReach)
    };

    // Calculate regional breakdown
    const regionalMap = new Map<string, RegionalBreakdown>();
    incrementalData.forEach(d => {
      if (!regionalMap.has(d.region)) {
        regionalMap.set(d.region, {
          region: d.region,
          total_sectors: 0,
          incremental_sectors: 0,
          incremental_percentage: 0,
          total_impressions: 0,
          incremental_impressions: 0,
          cost_efficiency: 0,
          audience_density: 0
        });
      }

      const breakdown = regionalMap.get(d.region)!;
      breakdown.total_sectors++;
      breakdown.total_impressions += d.campaign_impressions;
      
      if (d.is_incremental) {
        breakdown.incremental_sectors++;
        breakdown.incremental_impressions += d.incremental_impressions;
      }
    });

    // Calculate percentages and additional metrics
    regionalMap.forEach(breakdown => {
      breakdown.incremental_percentage = breakdown.total_sectors > 0 ? (breakdown.incremental_sectors / breakdown.total_sectors) * 100 : 0;
      breakdown.cost_efficiency = breakdown.incremental_impressions > 0 ? (breakdown.incremental_impressions / breakdown.incremental_sectors) * 0.15 : 0;
      breakdown.audience_density = breakdown.total_sectors > 0 ? (breakdown.total_impressions / breakdown.total_sectors) : 0;
    });

    const regionalBreakdown = Array.from(regionalMap.values()).sort((a, b) => b.incremental_impressions - a.incremental_impressions);

    return {
      data: incrementalData,
      summary,
      regionalBreakdown
    };
  }

  // Get H3 hexagon data for mapping
  static async getH3HexagonData(organizationId: string, resolution: number = 6): Promise<Array<{
    h3Index: string;
    postcodes: string[];
    campaignImpressions: number;
    linearImpressions: number;
    incrementalImpressions: number;
    isIncremental: boolean;
  }>> {
    const { data: incrementalData } = await this.calculateIncrementalReach(organizationId);
    
    // Group by H3 hexagons (simplified approach)
    const hexagonMap = new Map<string, {
      h3Index: string;
      postcodes: string[];
      campaignImpressions: number;
      linearImpressions: number;
      incrementalImpressions: number;
      isIncremental: boolean;
    }>();

    incrementalData.forEach(d => {
      // Create a simple H3-like index based on lat/lng grid
      const h3Index = `h3_${resolution}_${Math.floor((d.latitude + 90) * Math.pow(2, resolution))}_${Math.floor((d.longitude + 180) * Math.pow(2, resolution))}`;
      
      if (!hexagonMap.has(h3Index)) {
        hexagonMap.set(h3Index, {
          h3Index,
          postcodes: [],
          campaignImpressions: 0,
          linearImpressions: 0,
          incrementalImpressions: 0,
          isIncremental: false
        });
      }

      const hexagon = hexagonMap.get(h3Index)!;
      hexagon.postcodes.push(d.postcode);
      hexagon.campaignImpressions += d.campaign_impressions;
      hexagon.linearImpressions += d.linear_impressions;
      hexagon.incrementalImpressions += d.incremental_impressions;
      hexagon.isIncremental = hexagon.isIncremental || d.is_incremental;
    });

    return Array.from(hexagonMap.values());
  }

  // Helper methods for new metrics
  private static calculateAudienceQualityScore(incrementalData: IncrementalReachData[]): number {
    if (incrementalData.length === 0) return 0;
    
    // Calculate based on impression density and regional distribution
    const avgImpressionsPerSector = incrementalData.reduce((sum, d) => sum + d.campaign_impressions, 0) / incrementalData.length;
    const regionalDiversity = new Set(incrementalData.map(d => d.region)).size;
    
    return Math.min(100, (avgImpressionsPerSector / 100) * regionalDiversity);
  }

  private static calculateTimeCoverageAdvantage(campaignReach: CampaignReach[], linearReach: LinearTVReach[]): number {
    // Calculate how much additional time coverage CTV provides
    const ctvSectors = campaignReach.length;
    const linearSectors = linearReach.length;
    
    if (linearSectors === 0) return 100;
    return Math.min(100, ((ctvSectors - linearSectors) / linearSectors) * 100);
  }

  // Get time-based analysis for CTV vs Linear TV
  static async getTimeBasedAnalysis(organizationId: string): Promise<TimeBasedAnalysis[]> {
    const campaignReach = await this.getCampaignReach(organizationId);
    const linearReach = await this.getLinearTVReach();
    
    // Group by hour (simplified - using event_time from campaign_events)
    const hourlyData = new Map<number, TimeBasedAnalysis>();
    
    // Initialize 24 hours
    for (let hour = 0; hour < 24; hour++) {
      hourlyData.set(hour, {
        hour,
        ctv_impressions: 0,
        linear_impressions: 0,
        incremental_impressions: 0,
        ctv_reach_percentage: 0,
        linear_reach_percentage: 0,
        incremental_reach_percentage: 0
      });
    }
    
    // Add CTV data (simplified - assuming even distribution)
    campaignReach.forEach(reach => {
      const hour = Math.floor(Math.random() * 24); // Simplified - would use actual event_time
      const data = hourlyData.get(hour)!;
      data.ctv_impressions += reach.impressions;
    });
    
    // Add Linear TV data (simplified - assuming prime time focus)
    linearReach.forEach(reach => {
      const hour = Math.random() > 0.5 ? 20 : 21; // Simplified - would use actual daypart data
      const data = hourlyData.get(hour)!;
      data.linear_impressions += reach.impressions;
    });
    
    // Calculate incremental and percentages
    hourlyData.forEach(data => {
      data.incremental_impressions = Math.max(0, data.ctv_impressions - data.linear_impressions);
      
      const totalCTV = Array.from(hourlyData.values()).reduce((sum, d) => sum + d.ctv_impressions, 0);
      const totalLinear = Array.from(hourlyData.values()).reduce((sum, d) => sum + d.linear_impressions, 0);
      const totalIncremental = Array.from(hourlyData.values()).reduce((sum, d) => sum + d.incremental_impressions, 0);
      
      data.ctv_reach_percentage = totalCTV > 0 ? (data.ctv_impressions / totalCTV) * 100 : 0;
      data.linear_reach_percentage = totalLinear > 0 ? (data.linear_impressions / totalLinear) * 100 : 0;
      data.incremental_reach_percentage = totalIncremental > 0 ? (data.incremental_impressions / totalIncremental) * 100 : 0;
    });
    
    return Array.from(hourlyData.values());
  }

  // Get competitive analysis
  static async getCompetitiveAnalysis(): Promise<CompetitiveAnalysis[]> {
    // Get advertisers from samba_sample (linear TV competitors)
    const { data: linearAdvertisers, error } = await supabase
      .from('samba_sample')
      .select('advertiser, network, duration')
      .not('advertiser', 'is', null);
    
    if (error) throw error;
    
    // Group by advertiser
    const advertiserMap = new Map<string, CompetitiveAnalysis>();
    
    linearAdvertisers?.forEach(spot => {
      if (!spot.advertiser) return;
      
      if (!advertiserMap.has(spot.advertiser)) {
        advertiserMap.set(spot.advertiser, {
          competitor: spot.advertiser,
          linear_tv_presence: 0,
          ctv_gap_opportunity: 0,
          market_share_linear: 0,
          potential_incremental_reach: 0,
          recommended_ctv_investment: 0
        });
      }
      
      const analysis = advertiserMap.get(spot.advertiser)!;
      analysis.linear_tv_presence += spot.duration || 0;
    });
    
    // Calculate additional metrics
    const totalLinearPresence = Array.from(advertiserMap.values()).reduce((sum, a) => sum + a.linear_tv_presence, 0);
    
    advertiserMap.forEach(analysis => {
      analysis.market_share_linear = totalLinearPresence > 0 ? (analysis.linear_tv_presence / totalLinearPresence) * 100 : 0;
      analysis.ctv_gap_opportunity = 100 - analysis.market_share_linear; // Opportunity for CTV
      analysis.potential_incremental_reach = analysis.ctv_gap_opportunity * 1000; // Simplified calculation
      analysis.recommended_ctv_investment = analysis.potential_incremental_reach * 0.15; // Estimated CPM
    });
    
    return Array.from(advertiserMap.values()).sort((a, b) => b.ctv_gap_opportunity - a.ctv_gap_opportunity);
  }

  // Get audience quality metrics
  static async getAudienceQualityMetrics(organizationId: string): Promise<AudienceQualityMetrics[]> {
    const { data: incrementalData } = await this.calculateIncrementalReach(organizationId);
    
    return incrementalData.map(d => ({
      postcode: d.postcode,
      region: d.region,
      ctv_impressions: d.campaign_impressions,
      linear_impressions: d.linear_impressions,
      audience_density: d.campaign_impressions / 1000, // Simplified
      income_level: this.getIncomeLevel(d.region),
      age_demographic: this.getAgeDemographic(d.region),
      viewing_behavior_score: Math.random() * 100, // Would be based on actual viewing data
      incremental_value_score: d.incremental_percentage
    }));
  }

  private static getIncomeLevel(region: string): string {
    const highIncomeRegions = ['Greater London', 'South East'];
    const mediumIncomeRegions = ['South West', 'East of England'];
    
    if (highIncomeRegions.includes(region)) return 'High';
    if (mediumIncomeRegions.includes(region)) return 'Medium';
    return 'Standard';
  }

  private static getAgeDemographic(region: string): string {
    const youngRegions = ['Greater London', 'Scotland'];
    const mixedRegions = ['North West', 'Yorkshire and the Humber'];
    
    if (youngRegions.includes(region)) return '18-34';
    if (mixedRegions.includes(region)) return '25-54';
    return '35+';
  }
} 