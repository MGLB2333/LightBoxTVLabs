import { supabase } from './supabase';

export interface TVCampaign {
  id: string;
  organization_id: string;
  name: string;
  advertiser_name?: string;
  brand_name?: string;
  agency_name?: string;
  start_date?: string;
  end_date?: string;
  total_budget?: number;
  status: 'active' | 'paused' | 'completed' | 'draft';
  created_at: string;
  updated_at: string;
}

export interface TVCampaignPlan {
  id: string;
  campaign_id: string;
  supplier_name: string;
  group_name: string;
  buying_audience?: string;
  value_pot?: number;
  universe?: number;
  network_universe?: number;
  plan_tvr?: number;
  deal_tvr?: number;
  plan_value?: number;
  budget?: number;
  cpt?: number;
  conversion?: number;
  deal?: number;
  created_at: string;
  updated_at: string;
}

export interface TVCampaignActual {
  id: string;
  campaign_id: string;
  supplier_name: string;
  group_name: string;
  date: string;
  actual_tvr?: number;
  actual_value?: number;
  spots_count?: number;
  impacts?: number;
  // Additional BARB-specific fields
  commercial_title?: string;
  position_in_break?: string;
  break_title?: string;
  created_at: string;
}

export interface TVCampaignQuality {
  id: string;
  campaign_id: string;
  supplier_name: string;
  group_name: string;
  date: string;
  clearance_rate?: number;
  on_time_delivery_rate?: number;
  audience_quality_score?: number;
  created_at: string;
}

export interface CampaignPlanWithActuals extends TVCampaignPlan {
  actual_tvr?: number;
  actual_value?: number;
  spots_count?: number;
  impacts?: number;
  tvr_variance?: number;
  value_variance?: number;
}

export class TVCampaignService {
  // Get all campaigns for the current organization
  static async getCampaigns(): Promise<TVCampaign[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Get user's organization
      const { data: orgMember } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id)
        .single();

      if (!orgMember) throw new Error('User not in any organization');

      const { data, error } = await supabase
        .from('tv_campaigns')
        .select('*')
        .eq('organization_id', orgMember.organization_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      throw error;
    }
  }

  // Get a single campaign by ID
  static async getCampaign(campaignId: string): Promise<TVCampaign | null> {
    try {
      const { data, error } = await supabase
        .from('tv_campaigns')
        .select('*')
        .eq('id', campaignId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching campaign:', error);
      throw error;
    }
  }

  // Create a new campaign
  static async createCampaign(campaignData: Omit<TVCampaign, 'id' | 'created_at' | 'updated_at'>): Promise<TVCampaign> {
    try {
      const { data, error } = await supabase
        .from('tv_campaigns')
        .insert(campaignData)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating campaign:', error);
      throw error;
    }
  }

  // Update a campaign
  static async updateCampaign(campaignId: string, updates: Partial<TVCampaign>): Promise<TVCampaign> {
    try {
      const { data, error } = await supabase
        .from('tv_campaigns')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', campaignId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating campaign:', error);
      throw error;
    }
  }

  // Delete a campaign
  static async deleteCampaign(campaignId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('tv_campaigns')
        .delete()
        .eq('id', campaignId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting campaign:', error);
      throw error;
    }
  }

  // Get campaign plans
  static async getCampaignPlans(campaignId: string): Promise<TVCampaignPlan[]> {
    try {
      const { data, error } = await supabase
        .from('tv_campaign_plans')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('supplier_name, group_name');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching campaign plans:', error);
      throw error;
    }
  }

  // Get campaign plans with actuals (for reconciliation view)
  static async getCampaignPlansWithActuals(campaignId: string): Promise<CampaignPlanWithActuals[]> {
    try {
      // Get plans only - no actuals loaded initially
      const plans = await this.getCampaignPlans(campaignId);
      
      // Return plans with empty actuals - actuals will be loaded separately when sync is pressed
      const plansWithActuals: CampaignPlanWithActuals[] = plans.map(plan => ({
        ...plan,
        actual_tvr: 0,
        actual_value: 0,
        spots_count: 0,
        impacts: 0,
        tvr_variance: undefined,
        value_variance: undefined
      }));

      return plansWithActuals;
    } catch (error) {
      console.error('Error fetching campaign plans:', error);
      throw error;
    }
  }

  // New method to load actuals separately when sync button is pressed
  static async loadCampaignActuals(campaignId: string): Promise<CampaignPlanWithActuals[]> {
    try {
      // Get plans
      const plans = await this.getCampaignPlans(campaignId);
      
      // Import BARBApiService dynamically
      const { BARBApiService } = await import('./barbApiService');
      
      // Get campaign details
      const campaign = await this.getCampaign(campaignId);
      if (!campaign) throw new Error('Campaign not found');

      // Debug campaign details for Plan vs Actual
      console.log(`🔍 Plan vs Actual - Campaign details:`, {
        name: campaign.name,
        advertiser_name: campaign.advertiser_name,
        brand_name: campaign.brand_name,
        agency_name: campaign.agency_name,
        start_date: campaign.start_date
      });

      // Fetch ALL spots for August 2025 (explicit window) in one API call (no station filter)
      const allSpots = await BARBApiService.getAdvertisingSpots({
        advertiser: campaign.advertiser_name || '',
        brand: campaign.brand_name || '',
        agency: campaign.agency_name || '',
        dateFrom: '2025-08-01',
        dateTo: '2025-08-31'
        // No station filter - get all spots
      });

      console.log(`📊 Plan vs Actual - Found ${allSpots.length} total spots for campaign: ${campaign.name}`);
      
      // Debug: Check if advertiser filtering worked
      if (allSpots.length > 0) {
        const uniqueAdvertisers = [...new Set(allSpots.map((spot: any) => 
          spot.clearcast_information?.advertiser_name
        ).filter(Boolean))];
        console.log(`📢 Plan vs Actual - Unique advertisers in spots:`, uniqueAdvertisers.slice(0, 5));
        
        // Check if our target advertiser is actually in the data
        const targetAdvertiserCount = allSpots.filter((spot: any) => 
          spot.clearcast_information?.advertiser_name?.toLowerCase().includes(campaign.advertiser_name?.toLowerCase() || '')
        ).length;
        console.log(`🎯 Plan vs Actual - Spots for target advertiser "${campaign.advertiser_name}": ${targetAdvertiserCount}/${allSpots.length}`);
      }

      // CRITICAL FIX: Apply client-side filtering for advertiser since API filtering isn't working
      let filteredSpots = allSpots;
      if (campaign.advertiser_name && campaign.advertiser_name.trim() !== '') {
        const beforeCount = filteredSpots.length;
        filteredSpots = allSpots.filter((spot: any) => {
          const advertiserName = spot.clearcast_information?.advertiser_name || '';
          return advertiserName.toLowerCase().includes(campaign.advertiser_name!.toLowerCase());
        });
        console.log(`🔍 Plan vs Actual - Client-side advertiser filter "${campaign.advertiser_name}": ${beforeCount} → ${filteredSpots.length} spots`);
      }

      // Apply brand filtering if specified
      if (campaign.brand_name && campaign.brand_name.trim() !== '') {
        const beforeCount = filteredSpots.length;
        filteredSpots = filteredSpots.filter((spot: any) => {
          const brandName = spot.clearcast_information?.product_name || '';
          return brandName.toLowerCase().includes(campaign.brand_name!.toLowerCase());
        });
        console.log(`🔍 Plan vs Actual - Client-side brand filter "${campaign.brand_name}": ${beforeCount} → ${filteredSpots.length} spots`);
      }

      // Apply agency filtering if specified
      if (campaign.agency_name && campaign.agency_name.trim() !== '') {
        const beforeCount = filteredSpots.length;
        filteredSpots = filteredSpots.filter((spot: any) => {
          const agencyName = spot.clearcast_information?.buyer_name || '';
          return agencyName.toLowerCase().includes(campaign.agency_name!.toLowerCase());
        });
        console.log(`🔍 Plan vs Actual - Client-side agency filter "${campaign.agency_name}": ${beforeCount} → ${filteredSpots.length} spots`);
      }

      console.log(`📊 Plan vs Actual - Final filtered spots: ${filteredSpots.length}`);

      const spotsToProcess = filteredSpots;

      // Helpers
      const normalize = (s: string) => (s || '')
        .toLowerCase()
        .replace(/\s+/g, '')
        .replace(/\+1$/,'plus1')
        .replace(/hd$/,'')
        .replace(/[^a-z0-9]/g, '');

      const getStationSynonyms = (planStation: string): string[] => {
        const p = planStation.trim().toLowerCase();
        const synonyms: Record<string, string[]> = {
          // UKTV rebrands → U& equivalents and legacy names
          'u&alibi': ['u&alibi', 'u&alibiplus1', 'alibi', 'alibiplus1'],
          'u&drama': ['u&drama', 'dramaplus1', 'drama'],
          'u&eden': ['u&eden', 'u&edenplus1', 'eden', 'edenplus1'],
          'u&gold': ['u&gold', 'u&goldplus1', 'gold', 'goldplus1'],
          'u&w': ['u&w', 'u&wplus1', 'w', 'wplus1'],
          'u&yesterday': ['u&yesterday', 'yesterday', 'yesterdayplus1'],
          // ITV, Channel 4 strict
          'itv1': ['itv1'],
          'channel 4': ['channel 4'],
          // Sky brand tolerances
          'sky crime': ['skycrime', 'skycrimeplus1'],
          'sky cinema animation': ['skycinemaanimation'],
          'sky cinema comedy': ['skycinemacomedy'],
          'sky cinema sci-fi & horror': ['skycinemascifihorror'],
        };

        const key = p.replace(/\s+/g, ' ');
        const list = synonyms[key] || [];
        // Add generic forms for U&X style names
        if (p.startsWith('u&')) {
          const base = p.replace('u&','u');
          list.push(p, `${p}+1`, base, `${base}+1`);
        }
        // Always include the normalized original
        const norm = normalize(p);
        return Array.from(new Set(list.map(normalize).concat([norm])));
      };

      const isSameStation = (planStation: string, spotStation: string) => {
        const s = normalize(spotStation);
        const candidates = getStationSynonyms(planStation);
        if (!s || candidates.length === 0) return false;
        // exact or contains either side
        return candidates.some(c => c === s || c.includes(s) || s.includes(c));
      };

      const matchesAudience = (planAudience: string | undefined, description: string | undefined): boolean => {
        const a = (planAudience || '').toLowerCase();
        const d = (description || '').toLowerCase();
        if (!d) return false;
        if (!a) return d.includes('all homes');
        if (a.includes('hp') || a.includes('house')) return d.includes('house') && d.includes('child');
        if (a.includes('adult')) return d.includes('adult');
        if (a.includes('all home')) return d.includes('all homes');
        return false;
      };

      const plansWithActuals: CampaignPlanWithActuals[] = [];

      for (const plan of plans) {
        try {
          // 1) Slice spots strictly for this plan's station
          let planSpots = spotsToProcess.filter((spot: any) => {
            const spotName: string = spot.station?.station_name || '';
            return spotName && isSameStation(plan.group_name, spotName);
          });
          if (planSpots.length === 0) {
            planSpots = spotsToProcess.filter((spot: any) => spot.station?.group_name === plan.group_name || spot.group_name === plan.group_name);
          }

          // 2) Enforce advertiser/brand/agency again
          planSpots = planSpots.filter((spot: any) => {
            const adv = (spot.clearcast_information?.advertiser_name || '').toLowerCase();
            const br = (spot.clearcast_information?.product_name || '').toLowerCase();
            const ag = (spot.clearcast_information?.buyer_name || '').toLowerCase();
            const wantAdv = (campaign.advertiser_name || '').toLowerCase();
            const wantBr = (campaign.brand_name || '').toLowerCase();
            const wantAg = (campaign.agency_name || '').toLowerCase();
            const advOk = wantAdv ? adv.includes(wantAdv) : true;
            const brOk = wantBr ? br.includes(wantBr) : true;
            const agOk = wantAg ? ag.includes(wantAg) : true;
            return advOk && brOk && agOk;
          });

          if (planSpots.length === 0) {
            plansWithActuals.push({
              ...plan,
              actual_tvr: 0,
              actual_value: 0,
              spots_count: 0,
              impacts: 0,
              tvr_variance: plan.deal_tvr ? 0 - plan.deal_tvr : undefined,
              value_variance: plan.cpt && plan.deal_tvr ? (0 - plan.deal_tvr) * plan.cpt : undefined
            });
            continue;
          }

          // 3) Weighted sums across audience views matching plan audience
          let sumAudienceHundreds = 0;
          let sumTargetHundreds = 0;
          let counted = 0;
          for (const spot of planSpots) {
            const views: any[] = spot.audience_views || [];
          // prefer exact plan audience match; else pick the largest audience view to avoid zeros
          let view = views.find(v => matchesAudience(plan.buying_audience || '', v.description));
          if (!view) {
            // choose audience view with max audience_size_hundreds
            view = views.reduce((best, cur) => {
              const size = cur?.audience_size_hundreds || 0;
              const bestSize = best?.audience_size_hundreds || 0;
              return size > bestSize ? cur : best;
            }, undefined as any);
          }
            if (view && view.audience_size_hundreds && view.audience_size_hundreds > 0) {
              sumAudienceHundreds += view.audience_size_hundreds;
              if (view.audience_target_size_hundreds && view.audience_target_size_hundreds > 0) {
                sumTargetHundreds += view.audience_target_size_hundreds;
              }
              counted += 1;
            }
          }

          let actual_tvr = 0;
          if (sumAudienceHundreds > 0) {
            if (sumTargetHundreds > 0) {
              actual_tvr = (sumAudienceHundreds / sumTargetHundreds) * 100;
            } else {
              const { BARBApiService } = await import('./barbApiService');
              const universe = BARBApiService.getUniverseSize(plan.buying_audience);
              actual_tvr = universe > 0 ? (sumAudienceHundreds / universe) * 100 : 0;
            }
          }

          // If future window returns no audience, fall back to a recent historical window to provide an estimate
          if (actual_tvr === 0 && counted === 0) {
            try {
              const { BARBApiService } = await import('./barbApiService');
              const histSpots = await BARBApiService.getAdvertisingSpots({
                advertiser: campaign.advertiser_name || '',
                brand: campaign.brand_name || '',
                agency: campaign.agency_name || '',
                dateFrom: '2024-12-24',
                dateTo: '2024-12-31'
              });
              let histPlanSpots = histSpots.filter((spot: any) => {
                const spotName: string = spot.station?.station_name || '';
                return spotName && isSameStation(plan.group_name, spotName);
              });
              let hAudience = 0;
              let hTarget = 0;
              for (const spot of histPlanSpots) {
                const views: any[] = spot.audience_views || [];
                let view = views.find(v => matchesAudience(plan.buying_audience || '', v.description));
                if (!view) {
                  view = views.reduce((best, cur) => (cur?.audience_size_hundreds || 0) > (best?.audience_size_hundreds || 0) ? cur : best, undefined as any);
                }
                if (view && view.audience_size_hundreds && view.audience_size_hundreds > 0) {
                  hAudience += view.audience_size_hundreds;
                  if (view.audience_target_size_hundreds && view.audience_target_size_hundreds > 0) {
                    hTarget += view.audience_target_size_hundreds;
                  }
                }
              }
              if (hAudience > 0) {
                if (hTarget > 0) {
                  actual_tvr = (hAudience / hTarget) * 100;
                } else {
                  const { BARBApiService: BA2 } = await import('./barbApiService');
                  const universe = BA2.getUniverseSize(plan.buying_audience);
                  actual_tvr = universe > 0 ? (hAudience / universe) * 100 : 0;
                }
              }
            } catch (e) {
              console.warn('Historical fallback failed for plan', plan.group_name, e);
            }
          }

          const roundedTVR = Math.round(actual_tvr * 10) / 10;
          const tvrVariance = plan.deal_tvr ? roundedTVR - plan.deal_tvr : undefined;
          const valueVariance = tvrVariance !== undefined && plan.cpt ? tvrVariance * plan.cpt : undefined;

          plansWithActuals.push({
            ...plan,
            actual_tvr: roundedTVR,
            actual_value: 0,
            spots_count: counted,
            impacts: Math.round(sumAudienceHundreds * 100), // back to people
            tvr_variance: tvrVariance,
            value_variance: valueVariance
          });
        } catch (err) {
          console.error(`Error calculating TVR for plan ${plan.group_name}:`, err);
          plansWithActuals.push({
            ...plan,
            actual_tvr: 0,
            actual_value: 0,
            spots_count: 0,
            impacts: 0,
            tvr_variance: plan.deal_tvr ? 0 - plan.deal_tvr : undefined,
            value_variance: plan.cpt && plan.deal_tvr ? (0 - plan.deal_tvr) * plan.cpt : undefined
          });
        }
      }

      return plansWithActuals;
          } catch (error) {
      console.error('Error loading campaign actuals:', error);
      throw error;
    }
  }

  // Original method as fallback when optimized version doesn't find sufficient data
  private static async loadCampaignActualsOriginal(campaignId: string): Promise<CampaignPlanWithActuals[]> {
    try {
      // Get plans
      const plans = await this.getCampaignPlans(campaignId);
      
      // Import BARBApiService dynamically
      const { BARBApiService } = await import('./barbApiService');
      
      // Get campaign details
      const campaign = await this.getCampaign(campaignId);
      if (!campaign) throw new Error('Campaign not found');

      // Get unique stations from all plans
      const uniqueStations = [...new Set(plans.map(plan => plan.group_name))];

      // Batch calculate TVR for all unique stations at once
      const stationTVRResults = new Map<string, {
        tvr: number;
        impacts: number;
        spots_count: number;
        total_duration: number;
      }>();

      // Calculate TVR for each unique station (much fewer API calls)
      await Promise.all(
        uniqueStations.map(async (stationName) => {
          try {
            const tvrResult = await BARBApiService.calculateTVR({
              advertiser: campaign.advertiser_name || '',
              brand: campaign.brand_name || '',
              agency: campaign.agency_name || '',
              date: campaign.start_date || '',
              buying_audience: 'Houseperson with children 0-15',
              station: stationName
            });

            stationTVRResults.set(stationName, tvrResult);
          } catch (error) {
            console.error(`Error calculating TVR for station ${stationName}:`, error);
            stationTVRResults.set(stationName, {
              tvr: 0,
              impacts: 0,
              spots_count: 0,
              total_duration: 0
            });
          }
        })
      );

      // Map TVR results back to plans
      const plansWithActuals: CampaignPlanWithActuals[] = plans.map((plan) => {
        const tvrResult = stationTVRResults.get(plan.group_name) || {
          tvr: 0,
          impacts: 0,
          spots_count: 0,
          total_duration: 0
        };

        const actual_tvr = tvrResult.tvr;
        const tvrVariance = actual_tvr && plan.deal_tvr ? actual_tvr - plan.deal_tvr : undefined;
        const valueVariance = tvrVariance !== undefined && plan.cpt ? tvrVariance * plan.cpt : undefined;

        return {
          ...plan,
          actual_tvr: actual_tvr || 0,
          actual_value: 0,
          spots_count: tvrResult.spots_count || 0,
          impacts: tvrResult.impacts || 0,
          tvr_variance: tvrVariance,
          value_variance: valueVariance
        };
      });

      return plansWithActuals;
    } catch (error) {
      console.error('Error loading campaign actuals (fallback):', error);
      throw error;
    }
  }



  // Create or update campaign plans
  static async upsertCampaignPlans(campaignId: string, plans: Omit<TVCampaignPlan, 'id' | 'campaign_id' | 'created_at' | 'updated_at'>[]): Promise<void> {
    try {
      const plansWithCampaignId = plans.map(plan => ({
        ...plan,
        campaign_id: campaignId
      }));

      const { error } = await supabase
        .from('tv_campaign_plans')
        .upsert(plansWithCampaignId, {
          onConflict: 'campaign_id,supplier_name,group_name'
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error upserting campaign plans:', error);
      throw error;
    }
  }

  // Update a specific campaign plan
  static async updateCampaignPlan(planId: string, updates: Partial<TVCampaignPlan>): Promise<void> {
    try {
      const { error } = await supabase
        .from('tv_campaign_plans')
        .update(updates)
        .eq('id', planId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating campaign plan:', error);
      throw error;
    }
  }

  // Delete a specific campaign plan
  static async deleteCampaignPlan(planId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('tv_campaign_plans')
        .delete()
        .eq('id', planId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting campaign plan:', error);
      throw error;
    }
  }

  // Create a new campaign plan
  static async createCampaignPlan(planData: Omit<TVCampaignPlan, 'id' | 'created_at' | 'updated_at'>): Promise<TVCampaignPlan> {
    try {
      const { data, error } = await supabase
        .from('tv_campaign_plans')
        .insert([planData])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating campaign plan:', error);
      throw error;
    }
  }

  // Get actual TVR data from BARB for a campaign (live from API)
  static async getCampaignActuals(campaignId: string): Promise<TVCampaignActual[]> {
    try {
      // Get campaign details to use as filters
      const campaign = await this.getCampaign(campaignId);
      if (!campaign) throw new Error('Campaign not found');

      // Get campaign plans to get buying audience information
      const plans = await this.getCampaignPlans(campaignId);
      
      // Import BARBApiService dynamically
      const { BARBApiService } = await import('./barbApiService');

      // Get spots from BARB API to extract sales house and station data
      const spots = await BARBApiService.getAdvertisingSpots({
        advertiser: campaign.advertiser_name || '',
        brand: campaign.brand_name || '',
        agency: campaign.agency_name || '',
        date: campaign.start_date || '2025-08-05'
      });

      // Create a map to store calculated TVR by sales house and station
      const tvrCalculations = new Map<string, {
        supplier_name: string; // sales_house_name
        group_name: string; // station_name
        buying_audience: string;
        tvr: number;
        impacts: number;
        spots_count: number;
      }>();


      
      // Calculate TVR only for the specific plan entries (station + audience combinations)
      for (const plan of plans) {
        const salesHouseName = plan.supplier_name;
        const stationName = plan.group_name;
        const buyingAudience = plan.buying_audience;
        
        const tvrKey = `${salesHouseName}_${stationName}_Houseperson_with_children_0_15`;
        
        if (!tvrCalculations.has(tvrKey)) {
          try {
            
            // Calculate TVR for this specific plan's sales house + station + buying audience
            const tvrResult = await BARBApiService.calculateTVR({
              advertiser: campaign.advertiser_name || '',
              brand: campaign.brand_name || '',
              agency: campaign.agency_name || '',
              date: campaign.start_date || '',
              buying_audience: 'Houseperson with children 0-15', // Always use this audience
              station: stationName
            });



            tvrCalculations.set(tvrKey, {
              supplier_name: salesHouseName,
              group_name: stationName,
              buying_audience: 'Houseperson with children 0-15',
              tvr: tvrResult.tvr,
              impacts: tvrResult.impacts,
              spots_count: tvrResult.spots_count
            });
          } catch (error) {
            console.error(`Error calculating TVR for ${tvrKey}:`, error);
            // Set default values if calculation fails
            tvrCalculations.set(tvrKey, {
              supplier_name: salesHouseName,
              group_name: stationName,
              buying_audience: 'Houseperson with children 0-15',
              tvr: 0,
              impacts: 0,
              spots_count: 0
            });
          }
        }
      }

      // Convert TVR calculations to actuals format
      const actuals = Array.from(tvrCalculations.values()).map((calc, index) => ({
        id: `barb_${calc.supplier_name}_${calc.group_name}_${calc.buying_audience}_${index}`,
        campaign_id: campaignId,
        supplier_name: calc.supplier_name, // sales_house_name (e.g., "Sky Media")
        group_name: calc.group_name, // station_name (e.g., "Premier Sports UK 1")
        date: campaign.start_date || '2025-08-05',
        spots_count: calc.spots_count,
        impacts: calc.impacts,
        actual_value: 0, // Will be calculated based on CPT if needed
        actual_tvr: calc.tvr,
        created_at: new Date().toISOString()
      }));



      return actuals;
    } catch (error) {
      console.error('Error fetching campaign actuals from BARB API:', error);
      throw error;
    }
  }

  // Update actual TVR data from BARB (no longer needed - using live API)
  static async updateCampaignActuals(campaignId: string, actuals: Omit<TVCampaignActual, 'id' | 'campaign_id' | 'created_at'>[]): Promise<void> {
    // This function is no longer needed since we fetch data live from BARB API
  }

  // Get campaign quality metrics
  static async getCampaignQuality(campaignId: string): Promise<TVCampaignQuality[]> {
    try {
      const { data, error } = await supabase
        .from('tv_campaign_quality')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('date', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching campaign quality:', error);
      throw error;
    }
  }

  // Update campaign quality metrics
  static async updateCampaignQuality(campaignId: string, quality: Omit<TVCampaignQuality, 'id' | 'campaign_id' | 'created_at'>[]): Promise<void> {
    try {
      const qualityWithCampaignId = quality.map(q => ({
        ...q,
        campaign_id: campaignId
      }));

      const { error } = await supabase
        .from('tv_campaign_quality')
        .upsert(qualityWithCampaignId, {
          onConflict: 'campaign_id,supplier_name,group_name,date'
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error updating campaign quality:', error);
      throw error;
    }
  }

  // Sync actual TVR data from BARB API (no longer needed - using live API)
  static async syncActualsFromBARB(campaignId: string): Promise<void> {
    // This function is no longer needed since we fetch data live from BARB API
  }

  // Get raw BARB spots for a campaign (for Quality analysis - no audience expansion)
  static async getCampaignSpotsRaw(campaignId: string): Promise<any[]> {
    try {
      // Get campaign details to use as filters
      const campaign = await this.getCampaign(campaignId);
      if (!campaign) throw new Error('Campaign not found');

      // Import BARBApiService dynamically
      const { BARBApiService } = await import('./barbApiService');

      // Use campaign data for filters
      const barbFilters = {
        advertiser: campaign.advertiser_name || '',
        brand: campaign.brand_name || '',
        agency: campaign.agency_name || '',
        date: campaign.start_date || '',
        channel: ''
      };

      console.log(`🔍 NEW: Campaign details (Raw Spots):`, {
        name: campaign.name,
        advertiser_name: campaign.advertiser_name,
        brand_name: campaign.brand_name,
        agency_name: campaign.agency_name
      });

      // Get spots from BARB API
      const rawSpots = await BARBApiService.getAdvertisingSpots(barbFilters);
      
      // Apply client-side filtering for advertiser (since API filtering may not work)
      let filteredSpots = rawSpots || [];
      
      if (barbFilters.advertiser && barbFilters.advertiser.trim() !== '') {
        const beforeCount = filteredSpots.length;
        filteredSpots = rawSpots.filter((spot: any) => {
          const advertiserName = spot.clearcast_information?.advertiser_name || '';
          return advertiserName.toLowerCase().includes(barbFilters.advertiser!.toLowerCase());
        });
        console.log(`🔍 Raw spots advertiser filter "${barbFilters.advertiser}": ${beforeCount} → ${filteredSpots.length} spots`);
      }
      
      // Apply client-side filtering for brand
      if (barbFilters.brand && barbFilters.brand.trim() !== '') {
        const beforeCount = filteredSpots.length;
        filteredSpots = filteredSpots.filter((spot: any) => {
          const brandName = spot.clearcast_information?.product_name || '';
          return brandName.toLowerCase().includes(barbFilters.brand!.toLowerCase());
        });
        console.log(`🔍 Raw spots brand filter "${barbFilters.brand}": ${beforeCount} → ${filteredSpots.length} spots`);
      }
      
      // Apply client-side filtering for agency
      if (barbFilters.agency && barbFilters.agency.trim() !== '') {
        const beforeCount = filteredSpots.length;
        filteredSpots = filteredSpots.filter((spot: any) => {
          const agencyName = spot.clearcast_information?.buyer_name || '';
          return agencyName.toLowerCase().includes(barbFilters.agency!.toLowerCase());
        });
        console.log(`🔍 Raw spots agency filter "${barbFilters.agency}": ${beforeCount} → ${filteredSpots.length} spots`);
      }
      
      console.log(`📊 Final raw spots for campaign: ${campaign.name} - ${filteredSpots?.length || 0} spots`);
      
      // Return raw spots without audience expansion
      return filteredSpots || [];
      
    } catch (error) {
      console.error('Error fetching campaign raw spots:', error);
      return [];
    }
  }

  // Get individual BARB spots for a campaign with specific filters (with audience expansion for detailed analysis)
  static async getCampaignSpots(campaignId: string): Promise<any[]> {
    try {
      // Get campaign details to use as filters
      const campaign = await this.getCampaign(campaignId);
      if (!campaign) throw new Error('Campaign not found');

      // Import BARBApiService dynamically
      const { BARBApiService } = await import('./barbApiService');

      // Use campaign data for filters
      const barbFilters = {
        advertiser: campaign.advertiser_name || '',
        brand: campaign.brand_name || '',
        agency: campaign.agency_name || '',
        date: campaign.start_date || '',
        channel: ''
      };

      console.log(`🔍 Campaign details:`, {
        name: campaign.name,
        advertiser_name: campaign.advertiser_name,
        brand_name: campaign.brand_name,
        agency_name: campaign.agency_name
      });
      console.log(`🔍 BARB filters:`, barbFilters);

      // Get spots from BARB API
      const rawSpots = await BARBApiService.getAdvertisingSpots(barbFilters);
      
      console.log(`📊 Raw spots from BARB API: ${rawSpots?.length || 0}`);
      
      // Apply client-side filtering for advertiser (since API filtering may not work)
      let filteredSpots = rawSpots || [];
      
      if (barbFilters.advertiser && barbFilters.advertiser.trim() !== '') {
        console.log(`🔍 Applying advertiser filter: "${barbFilters.advertiser}"`);
        const beforeCount = filteredSpots.length;
        filteredSpots = rawSpots.filter((spot: any) => {
          const advertiserName = spot.clearcast_information?.advertiser_name || '';
          const matches = advertiserName.toLowerCase().includes(barbFilters.advertiser!.toLowerCase());
          return matches;
        });
        console.log(`🔍 Advertiser filter "${barbFilters.advertiser}": ${beforeCount} → ${filteredSpots.length} spots`);
      }
      
      // Apply client-side filtering for brand
      if (barbFilters.brand && barbFilters.brand.trim() !== '') {
        const beforeCount = filteredSpots.length;
        filteredSpots = filteredSpots.filter((spot: any) => {
          const brandName = spot.clearcast_information?.product_name || '';
          return brandName.toLowerCase().includes(barbFilters.brand!.toLowerCase());
        });
        console.log(`🔍 Brand filter "${barbFilters.brand}": ${beforeCount} → ${filteredSpots.length} spots`);
      }
      
      // Apply client-side filtering for agency
      if (barbFilters.agency && barbFilters.agency.trim() !== '') {
        const beforeCount = filteredSpots.length;
        filteredSpots = filteredSpots.filter((spot: any) => {
          const agencyName = spot.clearcast_information?.buyer_name || '';
          return agencyName.toLowerCase().includes(barbFilters.agency!.toLowerCase());
        });
        console.log(`🔍 Agency filter "${barbFilters.agency}": ${beforeCount} → ${filteredSpots.length} spots`);
      }
      
      const spots = filteredSpots;
      console.log(`📊 Final filtered spots for campaign: ${campaign.name} - ${spots?.length || 0} spots`);
      
      // Transform the spots to match the notebook format with all fields
      // Create separate entries for each audience in audience_views
      const transformedSpots: any[] = [];
      
      spots.forEach((spot: any) => {
        // If there are audience views, create a separate entry for each audience
        if (spot.audience_views && spot.audience_views.length > 0) {
          spot.audience_views.forEach((audience: any) => {
            transformedSpots.push({
              // Panel and region information
              panel_region: spot.panel?.panel_region || 'Unknown',
              
              // Station information
              station_name: spot.station?.station_name || 'Unknown',
              
              // Spot details
              spot_type: spot.spot_type || 'Commercial',
              spot_start_datetime: spot.spot_start_datetime?.standard_datetime || spot.spot_start_datetime || 'Unknown',
              spot_duration: spot.spot_duration || 0,
              
              // Programme information - these fields exist directly in the response
              preceding_programme_name: spot.preceding_programme_name || 'Unknown',
              succeeding_programme_name: spot.succeeding_programme_name || 'Unknown',
              
              // Break information - these fields exist directly in the response
              break_type: spot.break_type || 'Unknown',
              position_in_break: spot.position_in_break || 'Unknown',
              broadcaster_spot_number: spot.broadcaster_spot_number || 'Unknown',
              
              // Clearcast information - nested in clearcast_information object
              clearcast_buyer_code: spot.clearcast_information?.buyer_code || 'Unknown',
              clearcast_buyer_name: spot.clearcast_information?.buyer_name || 'Unknown',
              clearcast_advertiser_code: spot.clearcast_information?.advertiser_code || 'Unknown',
              clearcast_advertiser_name: spot.clearcast_information?.advertiser_name || 'Unknown',
              
              // Campaign information
              campaign_approval_id: spot.campaign_approval_id || 'Unknown',
              
              // Sales house information - nested in sales_house object
              sales_house_name: spot.sales_house?.sales_house_name || 'Unknown',
              
              // Audience information from this specific audience view
              audience_name: audience.description || audience.audience_name || 'Unknown',
              audience_size_hundreds: audience.audience_size_hundreds || 0,
              audience_target_size_hundreds: audience.target_size_in_hundreds || audience.audience_target_size_hundreds || 0,
              
              // Transmission date - extract from spot_start_datetime
              date_of_transmission: spot.spot_start_datetime?.standard_datetime?.split(' ')[0] || 
                                   spot.spot_start_datetime?.split(' ')[0] || 
                                   'Unknown',
              
              // Additional fields for compatibility
              id: spot.id || spot.spot_id,
              advertiser_name: spot.advertiser_name || spot.clearcast_information?.advertiser_name || 'Unknown',
              brand_name: spot.brand_name || spot.clearcast_information?.brand_name || 'Unknown',
              buyer_name: spot.buyer_name || spot.clearcast_information?.buyer_name || 'Unknown',
              programme_title: spot.clearcast_information?.programme_title || 
                              spot.clearcast_information?.programme_name || 
                              spot.programme_title || 
                              spot.programme_name || 
                              'Unknown',
              clearcast_commercial_title: spot.clearcast_information?.commercial_title || 
                                         spot.clearcast_information?.commercial_name || 
                                         spot.commercial_title || 
                                         spot.commercial_name || 'Unknown',
              break_title: spot.clearcast_information?.break_title || 
                          spot.break_title || 'Unknown',
              commercial_duration: spot.clearcast_information?.commercial_duration || 
                                 spot.commercial_duration || 
                                 spot.spot_duration || 0,
              panel_name: spot.panel?.panel_name || 'Unknown',
              clearance_status: spot.clearcast_information?.clearance_status || 'Unknown',
              cpt: spot.clearcast_information?.cpt || 0,
              
              // Calculated fields
              audience_size: (audience.audience_size_hundreds || 0) * 100,
              audience_target_size: (audience.target_size_in_hundreds || audience.audience_target_size_hundreds || 0) * 100,
              audience_penetration: audience.audience_size_hundreds && audience.target_size_in_hundreds 
                ? (audience.audience_size_hundreds / audience.target_size_in_hundreds) 
                : 0
            });
          });
        } else {
          // Fallback if no audience_views - create one entry with fallback audience data
          transformedSpots.push({
            // Panel and region information
            panel_region: spot.panel?.panel_region || 'Unknown',
            
            // Station information
            station_name: spot.station?.station_name || 'Unknown',
            
            // Spot details
            spot_type: spot.spot_type || 'Commercial',
            spot_start_datetime: spot.spot_start_datetime?.standard_datetime || spot.spot_start_datetime || 'Unknown',
            spot_duration: spot.spot_duration || 0,
            
            // Programme information - these fields exist directly in the response
            preceding_programme_name: spot.preceding_programme_name || 'Unknown',
            succeeding_programme_name: spot.succeeding_programme_name || 'Unknown',
            
            // Break information - these fields exist directly in the response
            break_type: spot.break_type || 'Unknown',
            position_in_break: spot.position_in_break || 'Unknown',
            broadcaster_spot_number: spot.broadcaster_spot_number || 'Unknown',
            
            // Clearcast information - nested in clearcast_information object
            clearcast_buyer_code: spot.clearcast_information?.buyer_code || 'Unknown',
            clearcast_buyer_name: spot.clearcast_information?.buyer_name || 'Unknown',
            clearcast_advertiser_code: spot.clearcast_information?.advertiser_code || 'Unknown',
            clearcast_advertiser_name: spot.clearcast_information?.advertiser_name || 'Unknown',
            
            // Campaign information
            campaign_approval_id: spot.campaign_approval_id || 'Unknown',
            
            // Sales house information - nested in sales_house object
            sales_house_name: spot.sales_house?.sales_house_name || 'Unknown',
            
            // Fallback audience information
            audience_name: spot.audience?.audience_name || spot.audience_name || spot.audience_definition?.audience_name || 'Unknown',
            audience_size_hundreds: spot.audience?.audience_size_hundreds || spot.audience_size_hundreds || 0,
            audience_target_size_hundreds: spot.audience?.audience_target_size_hundreds || spot.audience_target_size_hundreds || 0,
            
            // Transmission date - extract from spot_start_datetime
            date_of_transmission: spot.spot_start_datetime?.standard_datetime?.split(' ')[0] || 
                                 spot.spot_start_datetime?.split(' ')[0] || 
                                 'Unknown',
            
            // Additional fields for compatibility
            id: spot.id || spot.spot_id,
            advertiser_name: spot.advertiser_name || spot.clearcast_information?.advertiser_name || 'Unknown',
            brand_name: spot.brand_name || spot.clearcast_information?.brand_name || 'Unknown',
            buyer_name: spot.buyer_name || spot.clearcast_information?.buyer_name || 'Unknown',
            programme_title: spot.clearcast_information?.programme_title || 
                            spot.clearcast_information?.programme_name || 
                            spot.programme_title || 
                            spot.programme_name || 
                            'Unknown',
            clearcast_commercial_title: spot.clearcast_information?.commercial_title || 
                                       spot.clearcast_information?.commercial_name || 
                                       spot.commercial_title || 
                                       spot.commercial_name || 'Unknown',
            break_title: spot.clearcast_information?.break_title || 
                        spot.break_title || 'Unknown',
            commercial_duration: spot.clearcast_information?.commercial_duration || 
                               spot.commercial_duration || 
                               spot.spot_duration || 0,
            panel_name: spot.panel?.panel_name || 'Unknown',
            clearance_status: spot.clearcast_information?.clearance_status || 'Unknown',
            cpt: spot.clearcast_information?.cpt || 0,
            
            // Calculated fields
            audience_size: (spot.audience?.audience_size_hundreds || 0) * 100,
            audience_target_size: (spot.audience?.audience_target_size_hundreds || 0) * 100,
            audience_penetration: spot.audience?.audience_size_hundreds && spot.audience?.audience_target_size_hundreds 
              ? (spot.audience.audience_size_hundreds / spot.audience.audience_target_size_hundreds) 
              : 0
          });
        }
      });
      
      return transformedSpots || [];
    } catch (error) {
      console.error('Error getting campaign spots:', error);
      throw error;
    }
  }

  // New method to get original spots for matrix calculation
  static async getOriginalCampaignSpots(campaignId: string): Promise<any[]> {
    try {
      // Get campaign details to use as filters
      const campaign = await this.getCampaign(campaignId);
      if (!campaign) throw new Error('Campaign not found');

      // Import BARBApiService dynamically
      const { BARBApiService } = await import('./barbApiService');

      // Use specific filters as requested
      const barbFilters = {
        advertiser: 'A A AUTOMOBILE ASS', // Specific advertiser
        brand: campaign.brand_name || '',
        agency: 'THE7STARS UK LIMITED', // Specific agency
        date: '2025-08-01', // Start date: 1st Aug 2025
        channel: ''
      };

      // Get spots from BARB API with date range (1st Aug to 31st Aug 2025)
      const spots = await BARBApiService.getAdvertisingSpots({
        ...barbFilters,
        date: '2025-08-01' // The method handles date range internally
      });
      
      // Return the original spots without audience expansion
      return spots || [];
    } catch (error) {
      console.error('Error getting original campaign spots:', error);
      throw error;
    }
  }
} 