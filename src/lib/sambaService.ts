import { supabase } from './supabase';

export interface SambaSpot {
  _id: string;
  smba_id: string | null;
  schedule_ts: number | null;
  exposure_ts: number | null;
  daypart: string | null;
  network: string | null;
  network_id: number | null;
  prior_title: string | null;
  prior_title_id: string | null;
  next_title: string | null;
  next_title_id: string | null;
  advertiser: string | null;
  advertiser_id: string | null;
  brand: string | null;
  brand_id: number | null;
  product: string | null;
  product_id: number | null;
  tv_spot_name: string | null;
  tv_spot_id: string | null;
  duration: number | null;
  buy_type: string | null;
  subdivision: string | null;
  city: string | null;
  postal_code: string | null;
}

export interface NetworkStats {
  network: string;
  spot_count: number;
  total_duration: number;
  unique_advertisers: number;
  unique_brands: number;
  avg_duration: number;
}

export interface AdvertiserStats {
  advertiser: string;
  spot_count: number;
  total_duration: number;
  networks: string[];
  brands: string[];
  avg_duration: number;
}

export interface BrandStats {
  brand: string;
  spot_count: number;
  total_duration: number;
  networks: string[];
  advertisers: string[];
  avg_duration: number;
}

export interface DaypartAnalysis {
  daypart: string;
  spot_count: number;
  total_duration: number;
  top_networks: string[];
  top_advertisers: string[];
}

export class SambaService {
  // Get all spots with optional filters
  static async getSpots(filters?: {
    network?: string;
    advertiser?: string;
    brand?: string;
    daypart?: string;
    city?: string;
  }): Promise<SambaSpot[]> {
    let query = supabase
      .from('samba_sample')
      .select('*');

    if (filters?.network) {
      query = query.eq('network', filters.network);
    }
    if (filters?.advertiser) {
      query = query.eq('advertiser', filters.advertiser);
    }
    if (filters?.brand) {
      query = query.eq('brand', filters.brand);
    }
    if (filters?.daypart) {
      query = query.eq('daypart', filters.daypart);
    }
    if (filters?.city) {
      query = query.eq('city', filters.city);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  // Get network statistics
  static async getNetworkStats(): Promise<NetworkStats[]> {
    const { data, error } = await supabase
      .from('samba_sample')
      .select('network, duration, advertiser, brand')
      .not('network', 'is', null);

    if (error) throw error;

    const networkMap = new Map<string, NetworkStats>();
    
    data?.forEach(spot => {
      if (!spot.network) return;
      
      if (!networkMap.has(spot.network)) {
        networkMap.set(spot.network, {
          network: spot.network,
          spot_count: 0,
          total_duration: 0,
          unique_advertisers: new Set<string>(),
          unique_brands: new Set<string>(),
          avg_duration: 0
        });
      }

      const stats = networkMap.get(spot.network)!;
      stats.spot_count++;
      if (spot.duration) stats.total_duration += spot.duration;
      if (spot.advertiser) stats.unique_advertisers.add(spot.advertiser);
      if (spot.brand) stats.unique_brands.add(spot.brand);
    });

    return Array.from(networkMap.values()).map(stats => ({
      network: stats.network,
      spot_count: stats.spot_count,
      total_duration: stats.total_duration,
      unique_advertisers: stats.unique_advertisers.size,
      unique_brands: stats.unique_brands.size,
      avg_duration: stats.spot_count > 0 ? Math.round(stats.total_duration / stats.spot_count) : 0
    }));
  }

  // Get advertiser statistics
  static async getAdvertiserStats(): Promise<AdvertiserStats[]> {
    const { data, error } = await supabase
      .from('samba_sample')
      .select('advertiser, duration, network, brand')
      .not('advertiser', 'is', null);

    if (error) throw error;

    const advertiserMap = new Map<string, AdvertiserStats>();
    
    data?.forEach(spot => {
      if (!spot.advertiser) return;
      
      if (!advertiserMap.has(spot.advertiser)) {
        advertiserMap.set(spot.advertiser, {
          advertiser: spot.advertiser,
          spot_count: 0,
          total_duration: 0,
          networks: [],
          brands: [],
          avg_duration: 0
        });
      }

      const stats = advertiserMap.get(spot.advertiser)!;
      stats.spot_count++;
      if (spot.duration) stats.total_duration += spot.duration;
      if (spot.network && !stats.networks.includes(spot.network)) {
        stats.networks.push(spot.network);
      }
      if (spot.brand && !stats.brands.includes(spot.brand)) {
        stats.brands.push(spot.brand);
      }
    });

    return Array.from(advertiserMap.values()).map(stats => ({
      ...stats,
      avg_duration: stats.spot_count > 0 ? Math.round(stats.total_duration / stats.spot_count) : 0
    }));
  }

  // Get brand statistics
  static async getBrandStats(): Promise<BrandStats[]> {
    const { data, error } = await supabase
      .from('samba_sample')
      .select('brand, duration, network, advertiser')
      .not('brand', 'is', null);

    if (error) throw error;

    const brandMap = new Map<string, BrandStats>();
    
    data?.forEach(spot => {
      if (!spot.brand) return;
      
      if (!brandMap.has(spot.brand)) {
        brandMap.set(spot.brand, {
          brand: spot.brand,
          spot_count: 0,
          total_duration: 0,
          networks: [],
          advertisers: [],
          avg_duration: 0
        });
      }

      const stats = brandMap.get(spot.brand)!;
      stats.spot_count++;
      if (spot.duration) stats.total_duration += spot.duration;
      if (spot.network && !stats.networks.includes(spot.network)) {
        stats.networks.push(spot.network);
      }
      if (spot.advertiser && !stats.advertisers.includes(spot.advertiser)) {
        stats.advertisers.push(spot.advertiser);
      }
    });

    return Array.from(brandMap.values()).map(stats => ({
      ...stats,
      avg_duration: stats.spot_count > 0 ? Math.round(stats.total_duration / stats.spot_count) : 0
    }));
  }

  // Get daypart analysis
  static async getDaypartAnalysis(): Promise<DaypartAnalysis[]> {
    const { data, error } = await supabase
      .from('samba_sample')
      .select('daypart, network, advertiser, duration')
      .not('daypart', 'is', null);

    if (error) throw error;

    const daypartMap = new Map<string, DaypartAnalysis>();
    
    data?.forEach(spot => {
      if (!spot.daypart) return;
      
      if (!daypartMap.has(spot.daypart)) {
        daypartMap.set(spot.daypart, {
          daypart: spot.daypart,
          spot_count: 0,
          total_duration: 0,
          top_networks: [],
          top_advertisers: []
        });
      }

      const stats = daypartMap.get(spot.daypart)!;
      stats.spot_count++;
      if (spot.duration) stats.total_duration += spot.duration;
      if (spot.network && !stats.top_networks.includes(spot.network)) {
        stats.top_networks.push(spot.network);
      }
      if (spot.advertiser && !stats.top_advertisers.includes(spot.advertiser)) {
        stats.top_advertisers.push(spot.advertiser);
      }
    });

    return Array.from(daypartMap.values());
  }

  // Get unique values for filters
  static async getUniqueNetworks(): Promise<string[]> {
    const { data, error } = await supabase
      .from('samba_sample')
      .select('network')
      .not('network', 'is', null);
    
    if (error) throw error;
    return [...new Set(data?.map(spot => spot.network).filter(Boolean))];
  }

  static async getUniqueAdvertisers(): Promise<string[]> {
    const { data, error } = await supabase
      .from('samba_sample')
      .select('advertiser')
      .not('advertiser', 'is', null);
    
    if (error) throw error;
    return [...new Set(data?.map(spot => spot.advertiser).filter(Boolean))];
  }

  static async getUniqueBrands(): Promise<string[]> {
    const { data, error } = await supabase
      .from('samba_sample')
      .select('brand')
      .not('brand', 'is', null);
    
    if (error) throw error;
    return [...new Set(data?.map(spot => spot.brand).filter(Boolean))];
  }

  static async getUniqueDayparts(): Promise<string[]> {
    const { data, error } = await supabase
      .from('samba_sample')
      .select('daypart')
      .not('daypart', 'is', null);
    
    if (error) throw error;
    return [...new Set(data?.map(spot => spot.daypart).filter(Boolean))];
  }

  static async getUniqueCities(): Promise<string[]> {
    const { data, error } = await supabase
      .from('samba_sample')
      .select('city')
      .not('city', 'is', null);
    
    if (error) throw error;
    return [...new Set(data?.map(spot => spot.city).filter(Boolean))];
  }
} 