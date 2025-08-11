import React, { useState, useEffect } from 'react';
import { useSetBanner } from '../components/layout/BannerContext';
import { BARBService, type BARBSpot, type BARBFilter, type BARBStats } from '../lib/barbService';
import { TVCampaignService, TVCampaign } from '../lib/tvCampaignService';
import { 
  Download, RefreshCw, Eye, BarChart3, FileText, PieChart, TrendingUp
} from 'lucide-react';

// Import new components
import TVIntelligenceFilters from '../components/TVIntelligenceFilters';
import TVIntelligenceSummary from '../components/TVIntelligenceSummary';
import TVIntelligenceSpotsTable from '../components/TVIntelligenceSpotsTable';
import TVIntelligenceChannelBreakdown from '../components/TVIntelligenceChannelBreakdown';
import TVIntelligenceAudienceBreakdown from '../components/TVIntelligenceAudienceBreakdown';
import PlanReconciliation from '../components/PlanReconciliation';

const BARBDataPuller: React.FC = () => {
  const setBanner = useSetBanner();
  const [activeMainTab, setActiveMainTab] = useState<'tv-intelligence' | 'reconciliation'>('reconciliation');
  const [activeSubTab, setActiveSubTab] = useState<'spots' | 'summary' | 'channels' | 'audiences'>('spots');
  
  // Filter states
  const [selectedAdvertiser, setSelectedAdvertiser] = useState<string>('A A AUTOMOBILE ASS');
  const [selectedBrand, setSelectedBrand] = useState<string>('');
  const [selectedAgency, setSelectedAgency] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedChannel, setSelectedChannel] = useState<string>('');
  
  // Data states
  const [spots, setSpots] = useState<BARBSpot[]>([]);
  const [stats, setStats] = useState<BARBStats | null>(null);
  const [channelBreakdown, setChannelBreakdown] = useState<any[]>([]);
  const [audienceBreakdown, setAudienceBreakdown] = useState<any[]>([]);
  
  // Plan Reconciliation states
  const [selectedCampaign, setSelectedCampaign] = useState<string>('');
  const [selectedCampaignDetails, setSelectedCampaignDetails] = useState<TVCampaign | null>(null);
  const [expandedSuppliers, setExpandedSuppliers] = useState<Set<string>>(new Set(['ITV Sales', 'Sky Media UK Sales', 'Channel 4']));
  
  // Dropdown options
  const [advertisers, setAdvertisers] = useState<string[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [agencies, setAgencies] = useState<string[]>([]);
  const [channels, setChannels] = useState<string[]>([]);
  
  // UI states
  const [loading, setLoading] = useState(false);

  // Set banner on mount
  useEffect(() => {
    setBanner(
      <div className="flex items-center justify-between w-full">
        <div>
          <h1 className="text-xl font-bold text-gray-900">TV Spot Analysis</h1>
          <p className="text-sm text-gray-600">Pull advertising spots data from BARB for campaign analysis</p>
        </div>

      </div>
    );
  }, [setBanner]);

  // Load dropdown options on mount
  useEffect(() => {
    loadDropdownOptions();
  }, []);

  // Load data when filters change
  useEffect(() => {
    loadData();
  }, [selectedAdvertiser, selectedBrand, selectedAgency, selectedDate, selectedChannel]);

  const loadDropdownOptions = async () => {
    try {
      const [advertisersData, brandsData, agenciesData, channelsData] = await Promise.all([
        BARBService.getAdvertisers(),
        BARBService.getBrands(),
        BARBService.getAgencies(),
        BARBService.getChannels()
      ]);

      setAdvertisers(advertisersData);
      setBrands(brandsData);
      setAgencies(agenciesData);
      setChannels(channelsData);
    } catch (error) {
      console.error('Error loading dropdown options:', error);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      
      const filters: BARBFilter = {
        advertiser: selectedAdvertiser,
        brand: selectedBrand,
        agency: selectedAgency,
        date: selectedDate,
        channel: selectedChannel
      };

      // Import BARBApiService dynamically
      const { BARBApiService } = await import('../lib/barbApiService');

      // Use BARB API for spots data to get real-time data with proper filtering
      const [spotsData, statsData, channelData, audienceData] = await Promise.all([
        BARBApiService.getAdvertisingSpots({
          advertiser: filters.advertiser,
          brand: filters.brand,
          agency: filters.agency,
          date: filters.date,
          channel: filters.channel
        }).then(spots => {
          console.log(`📊 Raw spots from BARB API: ${spots.length}`);
          console.log(`🔍 Filter values:`, filters);
          
          // Debug: Show first few advertisers in raw data
          const sampleAdvertisers = spots.slice(0, 5).map((spot: any) => spot.clearcast_information?.advertiser_name);
          console.log(`🔍 Sample advertisers in raw data:`, sampleAdvertisers);
          
          // Apply client-side filtering for advertiser (since API filtering may not work)
          let filteredSpots = spots;
          
          if (filters.advertiser && filters.advertiser.trim() !== '') {
            console.log(`🔍 Applying advertiser filter: "${filters.advertiser}"`);
            const beforeCount = filteredSpots.length;
            filteredSpots = spots.filter((spot: any) => {
              const advertiserName = spot.clearcast_information?.advertiser_name || '';
              const matches = advertiserName.toLowerCase().includes(filters.advertiser!.toLowerCase());
              if (matches) {
                console.log(`✅ Match found: "${advertiserName}"`);
              }
              return matches;
            });
            console.log(`🔍 Advertiser filter "${filters.advertiser}": ${beforeCount} → ${filteredSpots.length} spots`);
          } else {
            console.log(`⚠️ No advertiser filter applied - filter value: "${filters.advertiser}"`);
          }
          
          // Apply client-side filtering for brand
          if (filters.brand && filters.brand.trim() !== '') {
            const beforeCount = filteredSpots.length;
            filteredSpots = filteredSpots.filter((spot: any) => {
              const brandName = spot.clearcast_information?.product_name || '';
              return brandName.toLowerCase().includes(filters.brand!.toLowerCase());
            });
            console.log(`🔍 Brand filter "${filters.brand}": ${beforeCount} → ${filteredSpots.length} spots`);
          }
          
          // Apply client-side filtering for agency
          if (filters.agency && filters.agency.trim() !== '') {
            const beforeCount = filteredSpots.length;
            filteredSpots = filteredSpots.filter((spot: any) => {
              const agencyName = spot.clearcast_information?.buyer_name || '';
              return agencyName.toLowerCase().includes(filters.agency!.toLowerCase());
            });
            console.log(`🔍 Agency filter "${filters.agency}": ${beforeCount} → ${filteredSpots.length} spots`);
          }
          
          // Convert BARB API format to our internal format
          const convertedSpots = filteredSpots.map((spot: any) => ({
            id: spot.broadcaster_spot_number || spot.id || 'unknown',
            commercial_number: spot.commercial_number,
            date: spot.spot_start_datetime?.standard_datetime?.split(' ')[0] || 'unknown',
            time: spot.spot_start_datetime?.standard_datetime?.split(' ')[1] || 'unknown',
            channel: spot.station?.station_name || 'unknown',
            programme: spot.preceding_programme_name || 'unknown',
            advertiser: spot.clearcast_information?.advertiser_name || 'unknown',
            brand: spot.clearcast_information?.product_name || 'unknown',
            campaign: spot.campaign_approval_id || 'unknown',
            agency: spot.clearcast_information?.buyer_name || 'unknown',
            duration: spot.spot_duration || 0,
            impacts: spot.audience_views?.[0]?.audience_size_hundreds * 100 || 0,
            cpt: 0, // Calculate if needed
            daypart: 'unknown',
            region: 'National',
            audience_segment: spot.audience_views?.[0]?.description || 'unknown',
            spot_type: 'Commercial',
            clearance_status: 'unknown',
            audience_breakdown: spot.audience_views?.map((aud: any) => ({
              segment: aud.description,
              impacts: aud.audience_size_hundreds * 100,
              audience_code: aud.audience_code
            })) || []
          }));
          
          return convertedSpots;
        }),
        BARBService.getStats(filters),
        BARBService.getChannelBreakdown(filters),
        BARBService.getAudienceBreakdown(filters)
      ]);

      setSpots(spotsData);
      setStats(statsData);
      setChannelBreakdown(channelData);
      setAudienceBreakdown(audienceData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    loadData();
  };

  const handleExportData = () => {
    if (spots.length === 0) {
      alert('No data to export');
      return;
    }

    const csvContent = BARBService.exportToCSV(spots);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `barb_data_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFilterChange = (filters: {
    advertiser: string;
    brand: string;
    agency: string;
    date: string;
    channel: string;
  }) => {
    setSelectedAdvertiser(filters.advertiser);
    setSelectedBrand(filters.brand);
    setSelectedAgency(filters.agency);
    setSelectedDate(filters.date);
    setSelectedChannel(filters.channel);
  };

  const handleCampaignSelect = async (campaignId: string) => {
    setSelectedCampaign(campaignId);
    try {
      const campaignDetails = await TVCampaignService.getCampaign(campaignId);
      setSelectedCampaignDetails(campaignDetails);
      
      // Auto-expand all suppliers for the selected campaign
      const plans = await TVCampaignService.getCampaignPlans(campaignId);
      const allSuppliers = [...new Set(plans.map(plan => plan.supplier_name))];
      setExpandedSuppliers(new Set(allSuppliers));
    } catch (error) {
      console.error('Error loading campaign details:', error);
      setSelectedCampaignDetails(null);
    }
  };

  const handleCampaignClear = () => {
    setSelectedCampaign('');
    setSelectedCampaignDetails(null);
  };

  const handleSupplierToggle = (supplier: string) => {
    const newExpanded = new Set(expandedSuppliers);
    if (newExpanded.has(supplier)) {
      newExpanded.delete(supplier);
    } else {
      newExpanded.add(supplier);
    }
    setExpandedSuppliers(newExpanded);
  };

  return (
    <div className="w-full">
      {/* Main Tab Navigation */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'reconciliation', label: 'Plan Reconciliation', icon: Eye },
              { id: 'tv-intelligence', label: 'TV Intelligence', icon: BarChart3 }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveMainTab(tab.id as any)}
                className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm ${
                  activeMainTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* TV Intelligence Tab Content */}
      {activeMainTab === 'tv-intelligence' && (
        <div>
          <TVIntelligenceFilters
            selectedAdvertiser={selectedAdvertiser}
            selectedBrand={selectedBrand}
            selectedAgency={selectedAgency}
            selectedDate={selectedDate}
            selectedChannel={selectedChannel}
            advertisers={advertisers}
            brands={brands}
            agencies={agencies}
            channels={channels}
            onFilterChange={handleFilterChange}
          />
          
          <TVIntelligenceSummary stats={stats} />
          
          <div className="mb-4">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-6">
                {[
                  { id: 'spots', label: 'Spot Details', icon: FileText },
                  { id: 'summary', label: 'Summary', icon: BarChart3 },
                  { id: 'channels', label: 'Channel Breakdown', icon: PieChart },
                  { id: 'audiences', label: 'Audience Breakdown', icon: TrendingUp }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveSubTab(tab.id as any)}
                    className={`flex items-center gap-1 py-1.5 px-1 border-b-2 font-medium text-xs ${
                      activeSubTab === tab.id
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <tab.icon className="w-3 h-3" />
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>
          </div>
          
          {activeSubTab === 'spots' && <TVIntelligenceSpotsTable spots={spots} loading={loading} />}
          {activeSubTab === 'summary' && (
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="text-base font-semibold text-gray-900 mb-3">Data Summary</h3>
              <p className="text-sm text-gray-600">
                This data can be used to compare against your planned campaign delivery. 
                Use the filters above to select specific advertisers, brands, campaigns, or agencies 
                and pull the corresponding BARB spot-level data for analysis.
              </p>
            </div>
          )}
          {activeSubTab === 'channels' && <TVIntelligenceChannelBreakdown channelBreakdown={channelBreakdown} />}
          {activeSubTab === 'audiences' && <TVIntelligenceAudienceBreakdown audienceBreakdown={audienceBreakdown} />}
        </div>
      )}

      {/* Plan Reconciliation Tab Content */}
      {activeMainTab === 'reconciliation' && (
        <div className="w-full" style={{ maxWidth: 'calc(100vw - 20rem)', width: '100%', overflow: 'hidden' }}>
          <PlanReconciliation
            selectedCampaign={selectedCampaign}
            selectedCampaignDetails={selectedCampaignDetails}
            expandedSuppliers={expandedSuppliers}
            onCampaignSelect={handleCampaignSelect}
            onCampaignClear={handleCampaignClear}
            onSupplierToggle={handleSupplierToggle}
          />
        </div>
      )}
    </div>
  );
};

export default BARBDataPuller; 