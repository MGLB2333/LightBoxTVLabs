import { supabase } from './supabase';

// Types for TV Intelligence Dashboard
export interface CampaignData {
  id: string;
  name: string;
  advertiser: string;
  startDate: string;
  endDate: string;
  totalImpressions: number;
  targetAudience: string;
  budget: number;
}

export interface PostcodeData {
  postcode: string;
  sector: string;
  latitude: number;
  longitude: number;
  impressions: number;
  reach: number;
  reachPercentage: number;
  audienceSegments: {
    [key: string]: number; // segment name -> percentage
  };
  opportunityScore: number;
  isIncremental: boolean;
  isLookalike: boolean;
}

export interface AudienceSegment {
  id: string;
  name: string;
  description: string;
  size: number; // total population
  matchScore: number; // how well campaign matches this segment
}

export interface FilterState {
  mediaType: 'linear' | 'ctv' | 'all';
  audienceSegment: string;
  region: string;
  dateRange: {
    start: string;
    end: string;
  };
}

export interface CampaignEvent {
  id: string;
  organization_id: string;
  campaign_id: string;
  event_date: string;
  event_time: string;
  event_type: string;
  bundle_id: string;
  pub_name: string;
  brand: string;
  channel_name: string;
  content_genre: string;
  content_title: string;
  content_series: string;
  geo: string;
  ip_parsed: string;
}

export interface GeoLookup {
  "Postcode District": string;
  "Latitude": number;
  "Longitude": number;
  "Region": string;
  "Town": string;
}

export class TVIntelligenceService {
  // Get all campaigns for the organization
  static async getCampaigns(organizationId: string): Promise<CampaignData[]> {
    try {
      // First try to get campaigns from the campaigns table
      const { data: campaignsData, error: campaignsError } = await supabase
        .from('campaigns')
        .select('id, name, advertiser, start_date, end_date, old_objectid')
        .eq('organization_id', organizationId);

      if (campaignsError) {
        console.warn('Error fetching campaigns table:', campaignsError);
      }

      // If we have campaigns data, use it
      if (campaignsData && campaignsData.length > 0) {
        const campaigns: CampaignData[] = campaignsData.map(campaign => ({
          id: campaign.old_objectid || campaign.id, // Use old_objectid to match campaign_events
          name: campaign.name || 'Unknown Campaign',
          advertiser: campaign.advertiser || 'Unknown',
          startDate: campaign.start_date || '2025-01-01',
          endDate: campaign.end_date || '2025-01-31',
          totalImpressions: 0, // Will be updated below
          targetAudience: 'ABC1 Adults 25-54',
          budget: 0
        }));

        // Get campaign summary metrics for additional data
        const campaignIds = campaigns.map(c => c.id);
        const { data: campaignMetrics, error: metricsError } = await supabase
          .from('campaign_summary_metrics')
          .select('*')
          .eq('organization_id', organizationId)
          .in('campaign_id', campaignIds);

        if (!metricsError && campaignMetrics) {
          // Update campaigns with metrics data
          campaigns.forEach(campaign => {
            const metrics = campaignMetrics.find(m => m.campaign_id === campaign.id);
            if (metrics) {
              campaign.totalImpressions = metrics.total_impressions || 0;
              campaign.budget = metrics.total_spend || 0;
            }
          });
        }

        return campaigns.sort((a, b) => b.totalImpressions - a.totalImpressions);
      }

      // Fallback: Get unique campaign IDs from campaign_events
      const { data: campaignIds, error: campaignError } = await supabase
        .from('campaign_events')
        .select('campaign_id, organization_id')
        .eq('organization_id', organizationId)
        .not('campaign_id', 'is', null);

      if (campaignError) throw campaignError;

      // Get unique campaign IDs
      const uniqueCampaignIds = [...new Set(campaignIds?.map(c => c.campaign_id).filter(Boolean))];

      // Get campaign summary metrics for additional data
      const { data: campaignMetrics, error: metricsError } = await supabase
        .from('campaign_summary_metrics')
        .select('*')
        .eq('organization_id', organizationId)
        .in('campaign_id', uniqueCampaignIds);

      if (metricsError) throw metricsError;

      // Create campaign data objects
      const campaigns: CampaignData[] = uniqueCampaignIds.map(campaignId => {
        const metrics = campaignMetrics?.find(m => m.campaign_id === campaignId);
        return {
          id: campaignId,
          name: campaignId.substring(0, 8) + '...', // Use first 8 chars as name
          advertiser: 'Unknown',
          startDate: '2025-01-01',
          endDate: '2025-01-31',
          totalImpressions: metrics?.total_impressions || 0,
          targetAudience: 'ABC1 Adults 25-54',
          budget: metrics?.total_spend || 0
        };
      });

      return campaigns.sort((a, b) => b.totalImpressions - a.totalImpressions);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      return [];
    }
  }

  // Get postcode data for a specific campaign
  static async getPostcodeData(
    organizationId: string,
    campaignId: string,
    filters: FilterState
  ): Promise<PostcodeData[]> {
    try {
      console.log('TVIntelligenceService.getPostcodeData called with:', { organizationId, campaignId, filters });
      
      // Build query for campaign events
      let query = supabase
        .from('campaign_events')
        .select('geo, event_type, event_date, pub_name, channel_name, content_genre')
        .eq('organization_id', organizationId)
        .eq('campaign_id', campaignId)
        .not('geo', 'is', null)
        .neq('geo', '');

      console.log('Query built for campaign_events with campaign_id:', campaignId);

      // Apply date range filter
      if (filters.dateRange.start && filters.dateRange.end) {
        query = query.gte('event_date', filters.dateRange.start).lte('event_date', filters.dateRange.end);
        console.log('Applied date range filter:', filters.dateRange.start, 'to', filters.dateRange.end);
      }

      // Apply media type filter
      if (filters.mediaType !== 'all') {
        if (filters.mediaType === 'linear') {
          query = query.eq('channel_name', 'Linear TV');
        } else if (filters.mediaType === 'ctv') {
          query = query.eq('channel_name', 'Connected TV');
        }
        console.log('Applied media type filter:', filters.mediaType);
      }

      const { data: eventsData, error: eventsError } = await query;
      if (eventsError) {
        console.error('Error fetching campaign events:', eventsError);
        throw eventsError;
      }

      console.log('Events data loaded:', eventsData?.length, 'events');
      if (eventsData && eventsData.length > 0) {
        console.log('Sample events:', eventsData.slice(0, 3));
      }

      if (!eventsData || eventsData.length === 0) {
        console.log('No events data found for campaign:', campaignId);
        console.log('This could mean:');
        console.log('1. Campaign ID does not exist in campaign_events table');
        console.log('2. Date range filter excludes all events');
        console.log('3. Media type filter excludes all events');
        console.log('4. Organization ID does not match');
        return [];
      }

      // Get unique postcodes
      const postcodes = [...new Set(eventsData.map(e => e.geo).filter(Boolean))];
      console.log('Unique postcodes found:', postcodes.length, postcodes.slice(0, 5));

      if (postcodes.length === 0) {
        console.log('No valid postcodes found in events data');
        return [];
      }

      // Get geographic coordinates
      const { data: geoData, error: geoError } = await supabase
        .from('Geo_lookup')
        .select('"Postcode District", "Latitude", "Longitude", "Region", "Town/Area"')
        .in('"Postcode District"', postcodes);

      if (geoError) {
        console.error('Error fetching geo data:', geoError);
        throw geoError;
      }

      console.log('Geo data loaded:', geoData?.length, 'coordinates');
      if (geoData && geoData.length > 0) {
        console.log('Sample geo data:', geoData.slice(0, 3));
      }

      if (!geoData || geoData.length === 0) {
        console.log('No geo data found for postcodes:', postcodes.slice(0, 5));
        console.log('This could mean:');
        console.log('1. Postcode format mismatch between campaign_events and Geo_lookup');
        console.log('2. Postcodes in events do not exist in Geo_lookup table');
        return [];
      }

      // Process postcode data
      const postcodeMap = new Map<string, PostcodeData>();

      geoData?.forEach(geo => {
        const sector = geo["Postcode District"];
        const events = eventsData.filter(e => e.geo === sector);
        const impressions = events.filter(e => e.event_type === 'impression').length;
        const completions = events.filter(e => e.event_type === 'videocomplete').length;

        // Calculate reach (estimate as 80% of impressions)
        const reach = Math.floor(impressions * 0.8);
        
        // Calculate reach percentage (mock calculation)
        const reachPercentage = Math.min(100, Math.random() * 100);

        // Calculate opportunity score based on various factors
        const opportunityScore = this.calculateOpportunityScore(impressions, reachPercentage, events as CampaignEvent[]);

        postcodeMap.set(sector, {
          postcode: sector,
          sector: sector,
          latitude: geo.Latitude,
          longitude: geo.Longitude,
          impressions,
          reach,
          reachPercentage,
          audienceSegments: this.generateAudienceSegments(events as CampaignEvent[]),
          opportunityScore,
          isIncremental: Math.random() > 0.7, // 30% chance of being incremental
          isLookalike: Math.random() > 0.8 // 20% chance of being lookalike
        });
      });

      // Apply region filter if specified
      let result = Array.from(postcodeMap.values());
      if (filters.region !== 'all') {
        result = result.filter(p => {
          const region = geoData?.find(g => g["Postcode District"] === p.postcode)?.["Region"];
          return region?.toLowerCase().includes(filters.region.toLowerCase());
        });
      }

      console.log('Final postcode data:', result.length, 'postcodes');
      return result;
    } catch (error) {
      console.error('Error fetching postcode data:', error);
      return [];
    }
  }

  // Get audience segments
  static async getAudienceSegments(): Promise<AudienceSegment[]> {
    // Mock audience segments - in a real implementation, this would come from Experian or similar
    return [
      {
        id: 'abc1-25-54',
        name: 'ABC1 Adults 25-54',
        description: 'High-income professionals aged 25-54',
        size: 15000000,
        matchScore: 85
      },
      {
        id: 'families',
        name: 'Families with Children',
        description: 'Households with children under 18',
        size: 8000000,
        matchScore: 72
      },
      {
        id: 'high-income',
        name: 'High Income Professionals',
        description: 'Professionals with household income £75k+',
        size: 5000000,
        matchScore: 91
      },
      {
        id: 'young-pros',
        name: 'Young Professionals',
        description: 'Professionals aged 25-35',
        size: 6000000,
        matchScore: 78
      }
    ];
  }

  // Get summary metrics for a campaign
  static async getSummaryMetrics(
    organizationId: string,
    campaignId: string,
    filters: FilterState
  ): Promise<{
    totalImpressions: number;
    targetAudienceReached: number;
    averageOpportunityScore: number;
    underexposedPostcodes: number;
    topPostcodes: PostcodeData[];
  }> {
    const postcodeData = await this.getPostcodeData(organizationId, campaignId, filters);

    const totalImpressions = postcodeData.reduce((sum, p) => sum + p.impressions, 0);
    const targetAudienceReached = postcodeData.reduce((sum, p) => sum + p.reach, 0);
    const averageOpportunityScore = postcodeData.length > 0 
      ? postcodeData.reduce((sum, p) => sum + p.opportunityScore, 0) / postcodeData.length 
      : 0;
    const underexposedPostcodes = postcodeData.filter(p => p.reachPercentage < 50).length;
    const topPostcodes = postcodeData
      .sort((a, b) => b.impressions - a.impressions)
      .slice(0, 5);

    return {
      totalImpressions,
      targetAudienceReached,
      averageOpportunityScore,
      underexposedPostcodes,
      topPostcodes
    };
  }

  // Helper method to calculate opportunity score
  private static calculateOpportunityScore(
    impressions: number,
    reachPercentage: number,
    events: CampaignEvent[]
  ): number {
    // Base score from impressions
    let score = Math.min(100, impressions / 1000 * 20);

    // Adjust based on reach percentage
    if (reachPercentage < 30) {
      score += 30; // High opportunity for low reach areas
    } else if (reachPercentage < 60) {
      score += 15; // Medium opportunity
    }

    // Adjust based on content performance
    const completionRate = events.filter(e => e.event_type === 'videocomplete').length / 
                          events.filter(e => e.event_type === 'impression').length;
    if (completionRate > 0.8) {
      score += 20; // High completion rate indicates good content
    }

    // Adjust based on content genre
    const genres = events.map(e => e.content_genre).filter(Boolean);
    const premiumGenres = ['drama', 'sport', 'news'];
    const hasPremiumContent = genres.some(g => premiumGenres.includes(g.toLowerCase()));
    if (hasPremiumContent) {
      score += 10;
    }

    return Math.min(100, score);
  }

  // Helper method to generate audience segments
  private static generateAudienceSegments(events: CampaignEvent[]): { [key: string]: number } {
    const segments = {
      'ABC1 Adults 25-54': Math.random() * 100,
      'Families with Children': Math.random() * 100,
      'High Income Professionals': Math.random() * 100,
      'Young Professionals': Math.random() * 100
    };

    // Adjust based on content genre
    const genres = events.map(e => e.content_genre).filter(Boolean);
    if (genres.some(g => g.toLowerCase().includes('sport'))) {
      segments['ABC1 Adults 25-54'] += 20;
    }
    if (genres.some(g => g.toLowerCase().includes('children'))) {
      segments['Families with Children'] += 30;
    }

    return segments;
  }

  // Get regions for filter dropdown
  static async getRegions(): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('Geo_lookup')
        .select('"Region"')
        .not('"Region"', 'is', null);

      if (error) throw error;

      const regions = [...new Set(data?.map(item => item['Region']).filter(Boolean))];
      return ['all', ...regions.sort()];
    } catch (error) {
      console.error('Error fetching regions:', error);
      return ['all', 'London', 'South East', 'North West', 'Midlands', 'Scotland'];
    }
  }

  // Export campaign data to CSV
  static async exportCampaignData(
    organizationId: string,
    campaignId: string,
    filters: FilterState
  ): Promise<string> {
    const postcodeData = await this.getPostcodeData(organizationId, campaignId, filters);
    
    // Create CSV content
    const headers = ['Postcode', 'Impressions', 'Reach', 'Reach %', 'Opportunity Score', 'Latitude', 'Longitude'];
    const rows = postcodeData.map(p => [
      p.postcode,
      p.impressions,
      p.reach,
      p.reachPercentage.toFixed(1),
      p.opportunityScore.toFixed(1),
      p.latitude,
      p.longitude
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    return csvContent;
  }
} 