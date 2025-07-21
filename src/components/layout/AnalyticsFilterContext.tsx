import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

interface FilterState {
  selectedCampaign: string;
  selectedAdvertiser: string;
  selectedDate: string;
}

interface AnalyticsFilterContextType {
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  campaigns: Array<{ id: string; name: string }>;
  advertisers: Array<{ id: string; name: string }>;
  loading: boolean;
}

const AnalyticsFilterContext = createContext<AnalyticsFilterContextType | undefined>(undefined);

export const useAnalyticsFilters = () => {
  const context = useContext(AnalyticsFilterContext);
  if (context === undefined) {
    throw new Error('useAnalyticsFilters must be used within an AnalyticsFilterProvider');
  }
  return context;
};

export const AnalyticsFilterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [filters, setFilters] = useState<FilterState>({
    selectedCampaign: 'all',
    selectedAdvertiser: 'all',
    selectedDate: 'all',
  });
  
  const [campaigns, setCampaigns] = useState<Array<{ id: string; name: string }>>([
    { id: 'all', name: 'All campaigns' }
  ]);
  
  const [advertisers, setAdvertisers] = useState<Array<{ id: string; name: string }>>([
    { id: 'all', name: 'All advertisers' }
  ]);
  
  const [loading, setLoading] = useState(true);

  // Fetch campaigns and advertisers from database
  useEffect(() => {
    const fetchFilterData = async () => {
      try {
        // Fetch campaigns
        const { data: campaignsData, error: campaignsError } = await supabase
          .from('campaigns')
          .select('id, name, advertiser')
          .order('name');
        
        if (!campaignsError && campaignsData) {
          const campaignOptions = [
            { id: 'all', name: 'All campaigns' },
            ...campaignsData.map(campaign => ({
              id: campaign.id,
              name: campaign.name || 'Unnamed Campaign'
            }))
          ];
          setCampaigns(campaignOptions);
          
          // Extract unique advertisers
          const uniqueAdvertisers = new Set<string>();
          campaignsData.forEach(campaign => {
            if (campaign.advertiser) {
              uniqueAdvertisers.add(campaign.advertiser);
            }
          });
          
          const advertiserOptions = [
            { id: 'all', name: 'All advertisers' },
            ...Array.from(uniqueAdvertisers).map(advertiser => ({
              id: advertiser,
              name: advertiser
            }))
          ];
          setAdvertisers(advertiserOptions);
        }
      } catch (error) {
        console.error('Error fetching filter data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFilterData();
  }, []);

  const value = {
    filters,
    setFilters,
    campaigns,
    advertisers,
    loading,
  };

  return (
    <AnalyticsFilterContext.Provider value={value}>
      {children}
    </AnalyticsFilterContext.Provider>
  );
}; 