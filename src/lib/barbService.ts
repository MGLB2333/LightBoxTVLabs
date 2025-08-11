import { supabase } from './supabase';

export interface BARBSpot {
  id: string;
  commercial_number?: string;
  date: string;
  time: string;
  channel: string;
  programme: string;
  advertiser: string;
  brand: string;
  campaign: string;
  agency: string;
  duration: number;
  impacts: number;
  cpt: number;
  daypart: string;
  region: string;
  audience_segment: string;
  spot_type: string;
  clearance_status: string;
  // New BARB fields from the API
  commercial_title?: string;
  position_in_break?: string;
  break_title?: string;
  commercial_duration?: number;
  audience_breakdown?: Array<{
    segment: string;
    impacts: number;
    audience_code?: string;
  }>;
}

export interface BARBFilter {
  advertiser?: string;
  brand?: string;
  campaign?: string;
  agency?: string;
  date?: string;
  channel?: string;
  region?: string;
}

export interface BARBStats {
  total_spots: number;
  total_impacts: number;
  total_duration: number;
  avg_cpt: number;
  unique_channels: number;
  unique_programmes: number;
}

export class BARBService {
  // Get spots from database
  static async getSpots(filters: BARBFilter): Promise<BARBSpot[]> {
    try {
      let query = supabase
        .from('barb_spots')
        .select('*');

      // Apply filters
      if (filters.date) {
        query = query.eq('date', filters.date);
      }
      if (filters.advertiser) {
        query = query.eq('advertiser_name', filters.advertiser);
      }
      if (filters.brand) {
        query = query.eq('brand_name', filters.brand);
      }
      if (filters.campaign) {
        query = query.eq('campaign_name', filters.campaign);
      }
      if (filters.agency) {
        query = query.eq('buyer_name', filters.agency);
      }
      if (filters.channel) {
        query = query.eq('channel_name', filters.channel);
      }

      const { data: spots, error } = await query;

      if (error) {
        console.error('Error fetching spots from database:', error);
        throw error;
      }

      // Convert database format to our internal format
      // Each row in the database represents a unique broadcast event + audience segment combination
      // We need to deduplicate by broadcaster_spot_number to show unique broadcast events
      const spotMap = new Map();
      
      (spots || []).forEach(spot => {
        // Extract broadcaster_spot_number from the ID (format: "BURTTUI214030_200001_202508_50")
        // The broadcaster_spot_number is the part before the first underscore
        const broadcasterSpotNumber = spot.id.split('_')[0];
        
        if (!spotMap.has(broadcasterSpotNumber)) {
          // Create new spot entry for this unique broadcast event
          spotMap.set(broadcasterSpotNumber, {
            id: broadcasterSpotNumber, // Use broadcaster_spot_number as the unique ID
            commercial_number: spot.commercial_number, // Links same commercials across different airings
            date: spot.date,
            time: spot.time,
            channel: spot.channel_name,
            programme: spot.programme_title ? (spot.programme_title + (spot.programme_episode_title ? ` - ${spot.programme_episode_title}` : '')) : 'Unknown Programme',
            advertiser: spot.advertiser_name,
            brand: spot.brand_name,
            campaign: spot.campaign_name,
            agency: spot.buyer_name,
            duration: spot.duration,
            impacts: 0, // Will be aggregated across audience segments
            cpt: 0, // Will be calculated
            daypart: spot.daypart || 'Unknown',
            region: spot.region || 'National',
            audience_segment: 'All Segments', // Show aggregated view
            spot_type: 'Commercial',
            clearance_status: spot.clearance_status || 'Unknown',
            audience_breakdown: [] // Store individual audience measurements
          });
        }
        
        // Add audience measurement to this broadcast event
        const existingSpot = spotMap.get(broadcasterSpotNumber);
        existingSpot.audience_breakdown.push({
          segment: spot.audience_segment || 'Unknown',
          impacts: spot.impacts || 0,
          audience_code: spot.audience_code
        });
        
        // Aggregate impacts across all audience segments for this broadcast event
        existingSpot.impacts += spot.impacts || 0;
      });
      
      // Calculate average CPT and return unique broadcast events
      return Array.from(spotMap.values()).map(spot => ({
        ...spot,
        cpt: spot.impacts > 0 ? (spot.impacts / spot.audience_breakdown.length) : 0
      }));
    } catch (error) {
      console.error('Error fetching spots from database:', error);
      
      // Fallback to mock data if database fails
      const mockSpots: BARBSpot[] = [
      {
        id: '1',
        date: '2025-01-20',
        time: '19:30',
        channel: 'ITV1',
        programme: 'Coronation Street',
        advertiser: 'Tesco',
        brand: 'Tesco',
        campaign: 'Summer Food',
        agency: 'MediaCom',
        duration: 30,
        impacts: 2500000,
        cpt: 12.50,
        daypart: '19:00-22:00',
        region: 'National',
        audience_segment: 'ABC1 Adults',
        spot_type: 'Commercial',
        clearance_status: 'Cleared'
      },
      {
        id: '2',
        date: '2025-01-20',
        time: '20:15',
        channel: 'Channel 4',
        programme: 'Gogglebox',
        advertiser: 'Tesco',
        brand: 'Tesco',
        campaign: 'Summer Food',
        agency: 'MediaCom',
        duration: 30,
        impacts: 1800000,
        cpt: 15.20,
        daypart: '19:00-22:00',
        region: 'National',
        audience_segment: 'ABC1 Adults',
        spot_type: 'Commercial',
        clearance_status: 'Cleared'
      },
      {
        id: '3',
        date: '2025-01-20',
        time: '21:00',
        channel: 'BBC One',
        programme: 'EastEnders',
        advertiser: 'Tesco',
        brand: 'Tesco',
        campaign: 'Summer Food',
        agency: 'MediaCom',
        duration: 30,
        impacts: 3200000,
        cpt: 10.80,
        daypart: '19:00-22:00',
        region: 'National',
        audience_segment: 'ABC1 Adults',
        spot_type: 'Commercial',
        clearance_status: 'Cleared'
      },
      {
        id: '4',
        date: '2025-01-20',
        time: '22:30',
        channel: 'ITV1',
        programme: 'News at Ten',
        advertiser: 'Tesco',
        brand: 'Tesco',
        campaign: 'Summer Food',
        agency: 'MediaCom',
        duration: 30,
        impacts: 1500000,
        cpt: 18.40,
        daypart: '22:00-24:00',
        region: 'National',
        audience_segment: 'ABC1 Adults',
        spot_type: 'Commercial',
        clearance_status: 'Cleared'
      },
      {
        id: '5',
        date: '2025-01-20',
        time: '18:45',
        channel: 'Channel 5',
        programme: 'Neighbours',
        advertiser: 'Tesco',
        brand: 'Tesco',
        campaign: 'Summer Food',
        agency: 'MediaCom',
        duration: 30,
        impacts: 800000,
        cpt: 22.10,
        daypart: '18:00-19:00',
        region: 'National',
        audience_segment: 'ABC1 Adults',
        spot_type: 'Commercial',
        clearance_status: 'Cleared'
      }
    ];

    // Apply filters
    let filteredSpots = mockSpots;
    
    if (filters.advertiser) {
      filteredSpots = filteredSpots.filter(spot => 
        spot.advertiser.toLowerCase().includes(filters.advertiser!.toLowerCase())
      );
    }
    
    if (filters.brand) {
      filteredSpots = filteredSpots.filter(spot => 
        spot.brand.toLowerCase().includes(filters.brand!.toLowerCase())
      );
    }
    
    if (filters.campaign) {
      filteredSpots = filteredSpots.filter(spot => 
        spot.campaign.toLowerCase().includes(filters.campaign!.toLowerCase())
      );
    }
    
    if (filters.agency) {
      filteredSpots = filteredSpots.filter(spot => 
        spot.agency.toLowerCase().includes(filters.agency!.toLowerCase())
      );
    }
    
    if (filters.date) {
      filteredSpots = filteredSpots.filter(spot => spot.date === filters.date);
    }
    
    if (filters.channel) {
      filteredSpots = filteredSpots.filter(spot => 
        spot.channel.toLowerCase().includes(filters.channel!.toLowerCase())
      );
    }
    
    if (filters.region) {
      filteredSpots = filteredSpots.filter(spot => 
        spot.region.toLowerCase().includes(filters.region!.toLowerCase())
      );
    }

    return filteredSpots;
    }
  }

  // Get unique advertisers for dropdown
  static async getAdvertisers(): Promise<string[]> {
    try {
      const { data: advertisers, error } = await supabase
        .from('barb_advertisers')
        .select('name')
        .order('name');

      if (error) {
        console.error('Error fetching advertisers from database:', error);
        return [];
      }

      return advertisers?.map(adv => adv.name) || [];
    } catch (error) {
      console.error('Error fetching advertisers from database:', error);
      return [];
    }
  }

  // Get unique brands for dropdown
  static async getBrands(): Promise<string[]> {
    try {
      const { data: brands, error } = await supabase
        .from('barb_brands')
        .select('name')
        .order('name');

      if (error) {
        console.error('Error fetching brands from database:', error);
        return [];
      }

      return brands?.map(brand => brand.name) || [];
    } catch (error) {
      console.error('Error fetching brands from database:', error);
      return [];
    }
  }

  // Get unique campaigns for dropdown
  static async getCampaigns(): Promise<string[]> {
    try {
      const { data: campaigns, error } = await supabase
        .from('barb_campaigns')
        .select('name')
        .order('name');

      if (error) {
        console.error('Error fetching campaigns from database:', error);
        return [];
      }

      return campaigns?.map(campaign => campaign.name) || [];
    } catch (error) {
      console.error('Error fetching campaigns from database:', error);
      return [];
    }
  }

  // Get unique agencies for dropdown
  static async getAgencies(): Promise<string[]> {
    try {
      const { data: buyers, error } = await supabase
        .from('barb_buyers')
        .select('name')
        .order('name');

      if (error) {
        console.error('Error fetching buyers from database:', error);
        return [];
      }

      return buyers?.map(buyer => buyer.name) || [];
    } catch (error) {
      console.error('Error fetching buyers from database:', error);
      return [];
    }
  }

  // Get unique channels for dropdown
  static async getChannels(): Promise<string[]> {
    try {
      const { data: stations, error } = await supabase
        .from('barb_stations')
        .select('name')
        .order('name');

      if (error) {
        console.error('Error fetching stations from database:', error);
        return [];
      }

      return stations?.map(station => station.name) || [];
    } catch (error) {
      console.error('Error fetching stations from database:', error);
      return [];
    }
  }

  // Get statistics for the filtered data
  static async getStats(filters: BARBFilter): Promise<BARBStats> {
    const spots = await this.getSpots(filters);
    
    const total_spots = spots.length;
    const total_impacts = spots.reduce((sum, spot) => sum + spot.impacts, 0);
    const total_duration = spots.reduce((sum, spot) => sum + spot.duration, 0);
    const avg_cpt = total_impacts > 0 ? (spots.reduce((sum, spot) => sum + spot.cpt, 0) / spots.length) : 0;
    const unique_channels = new Set(spots.map(spot => spot.channel)).size;
    const unique_programmes = new Set(spots.map(spot => spot.programme)).size;

    return {
      total_spots,
      total_impacts,
      total_duration,
      avg_cpt,
      unique_channels,
      unique_programmes
    };
  }

  // Get data grouped by channel
  static async getChannelBreakdown(filters: BARBFilter) {
    const spots = await this.getSpots(filters);
    
    const channelData = spots.reduce((acc, spot) => {
      if (!acc[spot.channel]) {
        acc[spot.channel] = {
          channel: spot.channel,
          spots: 0,
          impacts: 0,
          duration: 0,
          avg_cpt: 0,
          programmes: new Set()
        };
      }
      
      acc[spot.channel].spots += 1;
      acc[spot.channel].impacts += spot.impacts;
      acc[spot.channel].duration += spot.duration;
      acc[spot.channel].programmes.add(spot.programme);
      
      return acc;
    }, {} as Record<string, any>);

    return Object.values(channelData).map(channel => ({
      ...channel,
      programmes: channel.programmes.size,
      avg_cpt: channel.impacts > 0 ? (channel.impacts / channel.spots) : 0
    }));
  }

  // Get data grouped by audience segment
  static async getAudienceBreakdown(filters: BARBFilter) {
    const spots = await this.getSpots(filters);
    
    const audienceData = spots.reduce((acc, spot) => {
      // Use audience_breakdown if available, otherwise fall back to audience_segment
      if (spot.audience_breakdown && spot.audience_breakdown.length > 0) {
        spot.audience_breakdown.forEach(audience => {
          const audienceSegment = audience.segment || 'Unknown';
          if (!acc[audienceSegment]) {
            acc[audienceSegment] = {
              audience_segment: audienceSegment,
              spots: 0,
              impacts: 0,
              duration: 0,
              avg_cpt: 0,
              channels: new Set()
            };
          }
          
          acc[audienceSegment].spots += 1;
          acc[audienceSegment].impacts += audience.impacts;
          acc[audienceSegment].duration += spot.duration;
          acc[audienceSegment].channels.add(spot.channel);
        });
      } else {
        // Fallback for spots without audience_breakdown
        const audienceSegment = spot.audience_segment || 'Unknown';
        if (!acc[audienceSegment]) {
          acc[audienceSegment] = {
            audience_segment: audienceSegment,
            spots: 0,
            impacts: 0,
            duration: 0,
            avg_cpt: 0,
            channels: new Set()
          };
        }
        
        acc[audienceSegment].spots += 1;
        acc[audienceSegment].impacts += spot.impacts;
        acc[audienceSegment].duration += spot.duration;
        acc[audienceSegment].channels.add(spot.channel);
      }
      
      return acc;
    }, {} as Record<string, any>);

    return Object.values(audienceData).map(audience => ({
      ...audience,
      channels: audience.channels.size,
      avg_cpt: audience.impacts > 0 ? (audience.impacts / audience.spots) : 0
    }));
  }

  // Export data to CSV
  static exportToCSV(spots: BARBSpot[]): string {
    const headers = [
      'Date', 'Time', 'Channel', 'Programme', 'Advertiser', 'Brand', 
      'Agency', 'Duration', 'Impacts', 'CPT', 'Region', 
      'Audience Segment', 'Spot Type'
    ];
    
    const csvContent = [
      headers.join(','),
      ...spots.map(spot => [
        spot.date,
        spot.time,
        spot.channel,
        spot.programme,
        spot.advertiser,
        spot.brand,
        spot.agency,
        spot.duration,
        spot.impacts,
        spot.cpt,
        spot.region,
        spot.audience_segment,
        spot.spot_type
      ].join(','))
    ].join('\n');
    
    return csvContent;
  }
} 