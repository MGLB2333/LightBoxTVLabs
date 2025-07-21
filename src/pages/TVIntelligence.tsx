import React, { useState, useEffect, useCallback } from 'react';
import { useSetBanner } from '../components/layout/BannerContext';
import AIBannerButton from '../components/layout/AIBannerButton';
import AIChatDrawer from '../components/layout/AIChatDrawer';
import { SambaService, type SambaSpot, type NetworkStats, type AdvertiserStats, type BrandStats, type DaypartAnalysis } from '../lib/sambaService';
import { TVIntelligenceService, type CampaignData, type PostcodeData, type FilterState, type AudienceSegment } from '../lib/tvIntelligenceService';
import { 
  Eye, Users, MapPin, Zap,
  ChevronDown, ChevronRight, Download, Share2, Settings,
  PieChart as PieChartIcon, Activity, Layers, Monitor, Smartphone, Youtube,
  Loader2, Map, BarChart as BarChartIcon, PieChart as PieChartIcon2, Download as DownloadIcon, 
  Target as TargetIcon, Users as UsersIcon, TrendingUp as TrendingUpIcon
} from 'lucide-react';
import { 
  BarChart as RechartsBarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend
} from 'recharts';

const TVIntelligence: React.FC = () => {
  const setBanner = useSetBanner();
  const [activeTab, setActiveTab] = useState<'overview' | 'shareofvoice' | 'lineartv' | 'competitors' | 'spots'>('overview');
  const [showAIChat, setShowAIChat] = useState(false);
  
  // Dashboard states
  const [selectedCampaign, setSelectedCampaign] = useState<string>('');
  const [campaigns, setCampaigns] = useState<CampaignData[]>([]);
  const [postcodeData, setPostcodeData] = useState<PostcodeData[]>([]);
  const [audienceSegments, setAudienceSegments] = useState<AudienceSegment[]>([]);
  const [filters, setFilters] = useState<FilterState>({
    mediaType: 'all',
    audienceSegment: 'all',
    region: 'all',
    dateRange: {
      start: '2025-01-01',
      end: '2025-01-31'
    }
  });
  const [mapOverlay, setMapOverlay] = useState<'impressions' | 'reach' | 'opportunity'>('impressions');
  const [loading, setLoading] = useState(false);

  // Legacy states (keeping for other tabs)
  const [networkStats, setNetworkStats] = useState<NetworkStats[]>([]);
  const [advertiserStats, setAdvertiserStats] = useState<AdvertiserStats[]>([]);
  const [brandStats, setBrandStats] = useState<BrandStats[]>([]);
  const [spots, setSpots] = useState<SambaSpot[]>([]);
  const [daypartAnalysis, setDaypartAnalysis] = useState<DaypartAnalysis[]>([]);
  
  // Competitor analysis states
  const [selectedCompetitor, setSelectedCompetitor] = useState<string>('');
  const [competitorData, setCompetitorData] = useState<SambaSpot[]>([]);
  const [competitorLoading, setCompetitorLoading] = useState(false);

  // Legacy filter state for spots tab
  const [legacyFilters, setLegacyFilters] = useState({
    network: '',
    advertiser: '',
    brand: '',
    daypart: '',
    city: ''
  });

  // Helper functions for legacy tabs
  const processNetworkChartData = (stats: NetworkStats[]) => {
    return stats
      .sort((a, b) => b.spot_count - a.spot_count)
      .slice(0, 10)
      .map((network, index) => ({
        name: network.network,
        spots: network.spot_count,
        duration: Math.round(network.total_duration / 60),
        advertisers: network.unique_advertisers,
        value: network.spot_count, // For pie chart
        color: ['#02b3e5', '#3bc8ea', '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#ef4444'][index % 8]
      }));
  };

  const processDaypartData = (spots: SambaSpot[]) => {
    const hourData = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      impressions: 0,
      frequency: 0
    }));

    spots.forEach(spot => {
      if (spot.daypart) {
        // Extract hour from daypart (assuming format like "6-9am", "9pm-12am", etc.)
        const hourMatch = spot.daypart.match(/(\d+)/);
        if (hourMatch) {
          const hour = parseInt(hourMatch[1]);
          if (hour >= 0 && hour < 24) {
            hourData[hour].impressions += (spot as any).impressions || 0;
            hourData[hour].frequency += 1;
          }
        }
      }
    });

    return hourData;
  };

  const processCompetitorNetworkData = (spots: SambaSpot[]) => {
    const networkCounts = spots.reduce((acc, spot) => {
      if (spot.network) {
        acc[spot.network] = (acc[spot.network] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(networkCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([network, count], index) => ({
        name: network,
        value: count,
        color: ['#02b3e5', '#3bc8ea', '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#ef4444'][index % 8]
      }));
  };

  const processDaypartChartData = (analysis: any[]) => {
    return analysis
      .sort((a, b) => b.spot_count - a.spot_count)
      .map((daypart, index) => ({
        name: daypart.daypart,
        spots: daypart.spot_count,
        duration: Math.round(daypart.total_duration / 60),
        color: ['#02b3e5', '#3bc8ea', '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#ef4444'][index % 8]
      }));
  };

  // Load campaigns
  useEffect(() => {
    const loadCampaigns = async () => {
      try {
        // Use the organization ID from your auth context or default
        const organizationId = '16bb4799-c3b2-44c9-87a0-1d253bc83c15'; // Default org ID
        console.log('Loading campaigns for organization:', organizationId);
        const campaigns = await TVIntelligenceService.getCampaigns(organizationId);
        console.log('Loaded campaigns:', campaigns);
        console.log('Campaign IDs:', campaigns.map(c => ({ id: c.id, name: c.name, advertiser: c.advertiser })));
        setCampaigns(campaigns);
        
        if (campaigns.length > 0 && !selectedCampaign) {
          console.log('Setting first campaign as selected:', campaigns[0].id);
          setSelectedCampaign(campaigns[0].id);
        } else if (campaigns.length === 0) {
          console.warn('No campaigns found for organization:', organizationId);
        }
      } catch (error) {
        console.error('Error loading campaigns:', error);
      }
    };

    loadCampaigns();
  }, [selectedCampaign]);

  // Load postcode data
  useEffect(() => {
    if (!selectedCampaign) {
      console.log('No campaign selected, skipping postcode data load');
      return;
    }

    const loadPostcodeData = async () => {
      setLoading(true);
      try {
        // Use the organization ID from your auth context or default
        const organizationId = '16bb4799-c3b2-44c9-87a0-1d253bc83c15'; // Default org ID
        console.log('Loading postcode data for campaign:', selectedCampaign);
        console.log('Current filters:', filters);
        console.log('Selected campaign details:', campaigns.find(c => c.id === selectedCampaign));
        
        const postcodeData = await TVIntelligenceService.getPostcodeData(organizationId, selectedCampaign, filters);
        console.log('Loaded postcode data:', postcodeData);
        console.log('Postcode data length:', postcodeData.length);
        
        if (postcodeData.length === 0) {
          console.warn('No postcode data returned - this could be due to:');
          console.warn('1. No events for this campaign in the date range');
          console.warn('2. Campaign ID mismatch between campaigns and campaign_events tables');
          console.warn('3. No geo data found for the postcodes');
          console.warn('4. All events filtered out by media type or region');
        }
        
        setPostcodeData(postcodeData);
      } catch (error) {
        console.error('Error loading postcode data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPostcodeData();
  }, [selectedCampaign, filters, campaigns]);

  // Load audience segments
  useEffect(() => {
    const loadAudienceSegments = async () => {
      try {
        const segments = await TVIntelligenceService.getAudienceSegments();
        setAudienceSegments(segments);
      } catch (error) {
        console.error('Error loading audience segments:', error);
      }
    };

    loadAudienceSegments();
  }, []);

  // Calculate summary metrics
  const summaryMetrics = {
    totalImpressions: postcodeData.reduce((sum, p) => sum + p.impressions, 0),
    targetAudienceReached: postcodeData.reduce((sum, p) => sum + p.reach, 0),
    topPostcodes: postcodeData
      .sort((a, b) => b.impressions - a.impressions)
      .slice(0, 5),
    underexposedPostcodes: postcodeData.filter(p => p.reachPercentage < 50).length,
    averageOpportunityScore: postcodeData.length > 0 
      ? postcodeData.reduce((sum, p) => sum + p.opportunityScore, 0) / postcodeData.length 
      : 0
  };

  // Export functionality
  const handleExport = useCallback(async () => {
    if (!selectedCampaign) return;
    
    try {
      const organizationId = '16bb4799-c3b2-44c9-87a0-1d253bc83c15'; // Default org ID
      const csvContent = await TVIntelligenceService.exportCampaignData(organizationId, selectedCampaign, filters);
      
      // Create and download the CSV file
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tv-intelligence-${selectedCampaign}-${filters.dateRange.start}-${filters.dateRange.end}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting data:', error);
    }
  }, [selectedCampaign, filters]);

  // Set banner content
  useEffect(() => {
    setBanner(
      <div className="w-full">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-xl font-bold text-gray-900">TV Intelligence Dashboard</h1>
            <p className="text-gray-600 mt-1 text-sm">Interactive campaign analysis with ACR data and audience insights</p>
          </div>
          <div className="flex gap-2 items-center">
            <button className="px-3 py-1.5 bg-[#02b3e5] text-white rounded-md hover:bg-[#3bc8ea] flex items-center gap-2 text-sm" onClick={handleExport}>
              <DownloadIcon className="w-3 h-3" />
              Export Report
            </button>
            <AIBannerButton onClick={() => setShowAIChat(true)} />
          </div>
        </div>
        <nav className="mt-4 border-b border-gray-200 flex space-x-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-2 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'overview'
                ? 'border-[#02b3e5] text-[#02b3e5]'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Campaign Analysis
          </button>
          <button
            onClick={() => setActiveTab('shareofvoice')}
            className={`pb-2 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'shareofvoice'
                ? 'border-[#02b3e5] text-[#02b3e5]'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Share of Voice
          </button>
          <button
            onClick={() => setActiveTab('lineartv')}
            className={`pb-2 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'lineartv'
                ? 'border-[#02b3e5] text-[#02b3e5]'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Linear TV Reporting
          </button>
          <button
            onClick={() => setActiveTab('competitors')}
            className={`pb-2 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'competitors'
                ? 'border-[#02b3e5] text-[#02b3e5]'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Competitor Analysis
          </button>
          <button
            onClick={() => setActiveTab('spots')}
            className={`pb-2 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'spots'
                ? 'border-[#02b3e5] text-[#02b3e5]'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Spot Details
          </button>
        </nav>
      </div>
    );
    return () => setBanner(null);
  }, [setBanner, activeTab, selectedCampaign, filters]);

  const renderCampaignAnalysis = () => (
    <div className="flex h-full">
      {/* Left Sidebar */}
      <div className="w-64 flex-shrink-0">
        <div className="bg-gray-50 rounded-l-sm border border-gray-200 border-r-0 h-full">
          {/* Campaign Selector */}
          <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Campaign</h3>
            <select
              value={selectedCampaign}
              onChange={(e) => setSelectedCampaign(e.target.value)}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#02b3e5] focus:border-[#02b3e5] bg-white"
            >
              {campaigns.map(campaign => (
                <option key={campaign.id} value={campaign.id}>
                  {campaign.name} - {campaign.advertiser}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range */}
          <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Date Range</h3>
            <div className="space-y-2">
          <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={filters.dateRange.start}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    dateRange: { ...prev.dateRange, start: e.target.value }
                  }))}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#02b3e5] focus:border-[#02b3e5] bg-white"
                />
          </div>
          <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">End Date</label>
                <input
                  type="date"
                  value={filters.dateRange.end}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    dateRange: { ...prev.dateRange, end: e.target.value }
                  }))}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#02b3e5] focus:border-[#02b3e5] bg-white"
                />
          </div>
        </div>
      </div>

          {/* Filters */}
          <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Filters</h3>
            <div className="space-y-3">
              {/* Media Type */}
                <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Media Type</label>
                <div className="space-y-1">
                  {[
                    { value: 'all', label: 'All Media' },
                    { value: 'linear', label: 'Linear TV' },
                    { value: 'ctv', label: 'Connected TV' }
                  ].map(option => (
                    <label key={option.value} className="flex items-center">
                      <input
                        type="radio"
                        name="mediaType"
                        value={option.value}
                        checked={filters.mediaType === option.value}
                        onChange={(e) => setFilters(prev => ({ ...prev, mediaType: e.target.value as any }))}
                        className="mr-2 w-3 h-3"
                      />
                      <span className="text-xs text-gray-700">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Audience Segment */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Audience Segment</label>
                <select
                  value={filters.audienceSegment}
                  onChange={(e) => setFilters(prev => ({ ...prev, audienceSegment: e.target.value }))}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#02b3e5] focus:border-[#02b3e5] bg-white"
                >
                  <option value="all">All Segments</option>
                  {audienceSegments.map(segment => (
                    <option key={segment.id} value={segment.id}>{segment.name}</option>
                  ))}
                </select>
      </div>

              {/* Region */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Region</label>
                <select
                  value={filters.region}
                  onChange={(e) => setFilters(prev => ({ ...prev, region: e.target.value }))}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#02b3e5] focus:border-[#02b3e5] bg-white"
                >
                  <option value="all">All Regions</option>
                  <option value="london">London</option>
                  <option value="south-east">South East</option>
                  <option value="north-west">North West</option>
                  <option value="midlands">Midlands</option>
                  <option value="scotland">Scotland</option>
                </select>
              </div>
            </div>
              </div>

          {/* Map Overlay Controls */}
          <div className="px-4 py-3">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Map Overlay</h3>
            <div className="space-y-2">
              {[
                { value: 'impressions', label: 'Impressions', icon: Eye },
                { value: 'reach', label: 'Reach %', icon: Users },
                { value: 'opportunity', label: 'Opportunity Score', icon: TargetIcon }
              ].map(option => {
                const IconComponent = option.icon;
                return (
                  <button
                    key={option.value}
                    onClick={() => setMapOverlay(option.value as any)}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left transition-colors text-sm ${
                      mapOverlay === option.value
                        ? 'bg-[#02b3e5] text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                    }`}
                  >
                    <IconComponent className="w-3 h-3" />
                    <span className="text-xs font-medium">{option.label}</span>
                  </button>
                );
              })}
            </div>
              </div>
            </div>
              </div>

      {/* Main Content */}
      <div className="flex-1">
        {/* Interactive Map with Summary Metrics */}
        <div className="bg-white rounded-r-sm border border-gray-200 border-l-0 h-full">
          {/* Summary Metrics - Compact cards at top */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900">Interactive Postcode Map</h3>
              <p className="text-sm text-gray-600">Showing {mapOverlay} data across {postcodeData.length} postcode sectors</p>
        </div>

            {/* Compact Summary Metrics */}
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                <div className="flex items-center gap-2 mb-1">
                  <Eye className="w-4 h-4 text-[#02b3e5]" />
                  <span className="text-xs font-medium text-gray-700">Total Impressions</span>
                </div>
                <div className="text-lg font-bold text-[#02b3e5]">
                  {summaryMetrics.totalImpressions.toLocaleString()}
              </div>
            </div>

              <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                <div className="flex items-center gap-2 mb-1">
                  <TargetIcon className="w-4 h-4 text-[#02b3e5]" />
                  <span className="text-xs font-medium text-gray-700">Target Audience</span>
                </div>
                <div className="text-lg font-bold text-[#02b3e5]">
                  {summaryMetrics.targetAudienceReached.toLocaleString()}
              </div>
            </div>

              <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUpIcon className="w-4 h-4 text-[#02b3e5]" />
                  <span className="text-xs font-medium text-gray-700">Opportunity Score</span>
          </div>
                <div className="text-lg font-bold text-[#02b3e5]">
                  {summaryMetrics.averageOpportunityScore.toFixed(1)}
        </div>
      </div>

              <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                <div className="flex items-center gap-2 mb-1">
                  <UsersIcon className="w-4 h-4 text-[#02b3e5]" />
                  <span className="text-xs font-medium text-gray-700">Underexposed Areas</span>
          </div>
                <div className="text-lg font-bold text-[#02b3e5]">
                  {summaryMetrics.underexposedPostcodes}
                        </div>
              </div>
                    </div>
                  </div>
                  
          {/* Map Content */}
          <div className="px-6 py-6">
            <div className="h-96 bg-gray-100 rounded-lg flex items-center justify-center">
              {loading ? (
                <div className="text-center">
                  <Loader2 className="w-8 h-8 animate-spin text-[#02b3e5] mx-auto mb-2" />
                  <p className="text-gray-600">Loading map data...</p>
                        </div>
              ) : (
                <div className="text-center">
                  <Map className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-gray-900 mb-2">Interactive Map</h4>
                  <p className="text-gray-600 mb-4">Map visualization with {postcodeData.length} postcode sectors</p>
                  <div className="flex items-center justify-center gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-green-500 rounded"></div>
                      <span>High {mapOverlay}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                      <span>Medium {mapOverlay}</span>
                  </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-red-500 rounded"></div>
                      <span>Low {mapOverlay}</span>
                      </div>
                      </div>
                      </div>
              )}
                    </div>
                  </div>
                </div>
                
        {/* Top Postcodes Table */}
        <div className="bg-white rounded-sm border border-gray-200 mt-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Top 5 Postcodes by Exposure</h3>
                  </div>
          <div className="overflow-x-auto">
            <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Postcode
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Impressions
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reach %
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Opportunity Score
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
              </tr>
            </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {summaryMetrics.topPostcodes.map((postcode, index) => (
                  <tr key={postcode.postcode} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{postcode.postcode}</div>
                      <div className="text-xs text-gray-500">{postcode.sector}</div>
                  </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                      {postcode.impressions.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                      {postcode.reachPercentage.toFixed(1)}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                      {postcode.opportunityScore.toFixed(1)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {postcode.isIncremental && (
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                          Incremental
                        </span>
                      )}
                      {postcode.isLookalike && (
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                          Lookalike
                        </span>
                      )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </div>
      </div>
    </div>
  );

  const renderShareOfVoice = () => (
    <div className="space-y-6">
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-[#02b3e5]" />
        </div>
      ) : (
        <>
          {/* Share of Voice Chart */}
          <div className="bg-white rounded-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Network Distribution</h3>
            </div>
            <div className="px-6 py-6">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={processNetworkChartData(networkStats)}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${percent ? (percent * 100).toFixed(0) : 0}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {processNetworkChartData(networkStats).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: any) => [value.toLocaleString(), 'Spots']} />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Network Performance Chart */}
          <div className="bg-white rounded-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Network Performance</h3>
            </div>
            <div className="px-6 py-6">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsBarChart data={processNetworkChartData(networkStats)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="name" 
                      stroke="#6b7280"
                      fontSize={12}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis stroke="#6b7280" fontSize={12} />
                    <Tooltip 
                      formatter={(value: any) => [value.toLocaleString(), 'Spots']}
                    />
                    <Bar dataKey="spots" fill="#02b3e5" radius={[4, 4, 0, 0]} />
                  </RechartsBarChart>
                </ResponsiveContainer>
          </div>
        </div>
      </div>
        </>
      )}
    </div>
  );

  const renderLinearTVReporting = () => (
    <div className="space-y-6">
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-[#02b3e5]" />
        </div>
      ) : (
        <>
          {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <Eye className="w-6 h-6 text-[#02b3e5]" />
                  <h3 className="text-lg font-semibold text-gray-900">Impressions</h3>
              </div>
              </div>
              <div className="px-6 py-6">
                <div className="text-3xl font-bold text-[#02b3e5] mb-2">
                  {networkStats.reduce((sum, network) => sum + network.spot_count, 0).toLocaleString()}
                </div>
                <div className="text-sm text-gray-600">
                  Active hour: <strong>6 PM</strong><br />
                  Active day: <strong>Tuesday</strong>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <Users className="w-6 h-6 text-[#02b3e5]" />
                  <h3 className="text-lg font-semibold text-gray-900">Frequency</h3>
              </div>
              </div>
              <div className="px-6 py-6">
                <div className="text-3xl font-bold text-[#02b3e5] mb-2">3.3</div>
                <div className="text-sm text-gray-600">
                  Active hour: <strong>6 AM</strong><br />
                  Active day: <strong>Friday</strong>
                </div>
              </div>
              </div>
            </div>
            
          {/* Complex Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Impressions by Hour - Complex Line Chart */}
            <div className="bg-white rounded-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Impressions by Hour</h3>
              </div>
              <div className="px-6 py-6">
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={processDaypartData(spots)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis 
                        dataKey="hour" 
                        tickFormatter={(value) => `${value}:00`}
                        stroke="#6b7280"
                        fontSize={12}
                        tick={{ fill: '#6b7280' }}
                      />
                      <YAxis 
                        stroke="#6b7280" 
                        fontSize={12}
                        tick={{ fill: '#6b7280' }}
                        tickFormatter={(value) => `${value}M`}
                      />
                      <Tooltip 
                        formatter={(value: any) => [value.toLocaleString(), 'Impressions']}
                        labelFormatter={(label) => `${label}:00`}
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }}
                      />
                      <Legend />
                      <Line 
                        type="monotone"
                        dataKey="impressions"
                        stroke="#02b3e5"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 5, strokeWidth: 2, fill: '#02b3e5' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
            
            {/* Impressions/Frequency by Day - Complex Bar Chart */}
            <div className="bg-white rounded-md border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Impressions/Frequency by Day</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsBarChart data={[
                    { day: 'Monday', impressions: 1500000, frequency: 2.8 },
                    { day: 'Tuesday', impressions: 2800000, frequency: 3.1 },
                    { day: 'Wednesday', impressions: 2200000, frequency: 2.9 },
                    { day: 'Thursday', impressions: 2400000, frequency: 3.0 },
                    { day: 'Friday', impressions: 2600000, frequency: 3.2 },
                    { day: 'Saturday', impressions: 1800000, frequency: 2.5 },
                    { day: 'Sunday', impressions: 1600000, frequency: 2.4 }
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="day" 
                      stroke="#6b7280"
                      fontSize={12}
                      tick={{ fill: '#6b7280' }}
                    />
                    <YAxis 
                      stroke="#6b7280" 
                      fontSize={12}
                      tick={{ fill: '#6b7280' }}
                      tickFormatter={(value) => `${value}M`}
                    />
                    <Tooltip 
                      formatter={(value: any, name: string) => [
                        name === 'impressions' ? `${value.toLocaleString()}` : value.toFixed(1),
                        name === 'impressions' ? 'Impressions' : 'Frequency'
                      ]}
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }}
                    />
                    <Legend />
                    <Bar 
                      dataKey="impressions" 
                      fill="#fbbf24" 
                      radius={[4, 4, 0, 0]}
                      name="Impressions"
                    />
                    <Bar 
                      dataKey="frequency" 
                      fill="#ec4899" 
                      radius={[4, 4, 0, 0]}
                      name="Frequency"
                    />
                  </RechartsBarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Channel Performance - Horizontal Bar Chart with Scatter */}
          <div className="bg-white rounded-md border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Channel Performance</h3>
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsBarChart 
                  data={processNetworkChartData(networkStats).slice(0, 8)}
                  layout="horizontal"
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    type="number"
                    stroke="#6b7280"
                    fontSize={12}
                    tick={{ fill: '#6b7280' }}
                    tickFormatter={(value) => `${value}M`}
                  />
                  <YAxis 
                    type="category" 
                    dataKey="name"
                    stroke="#6b7280"
                    fontSize={12}
                    tick={{ fill: '#6b7280' }}
                    width={100}
                  />
                  <Tooltip 
                    formatter={(value: any, name: string) => [
                      name === 'spots' ? `${value.toLocaleString()}` : value.toFixed(1),
                      name === 'spots' ? 'Impressions' : 'Frequency'
                    ]}
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                  <Legend />
                  <Bar 
                    dataKey="spots" 
                    fill="#6366f1" 
                    radius={[0, 4, 4, 0]}
                    name="Impressions"
                  />
                  <Bar 
                    dataKey="advertisers" 
                    fill="#ec4899" 
                    radius={[0, 4, 4, 0]}
                    name="Frequency"
                  />
                </RechartsBarChart>
              </ResponsiveContainer>
      </div>
        </div>
        </>
      )}
    </div>
  );

  const renderCompetitorAnalysis = () => (
    <div className="space-y-6">
      {/* Competitor Selection */}
      <div className="bg-white rounded-md border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Competitor</h3>
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">Competitor</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              value={selectedCompetitor}
              onChange={(e) => setSelectedCompetitor(e.target.value)}
            >
              <option value="">Select a competitor...</option>
              {advertiserStats.slice(0, 50).map((advertiser) => (
                <option key={advertiser.advertiser} value={advertiser.advertiser}>
                  {advertiser.advertiser}
                </option>
              ))}
            </select>
              </div>
            <button
            onClick={async () => {
              if (!selectedCompetitor) return;
              setCompetitorLoading(true);
              try {
                const data = await SambaService.getSpots({ advertiser: selectedCompetitor });
                setCompetitorData(data);
              } catch (error) {
                console.error('Error loading competitor data:', error);
              } finally {
                setCompetitorLoading(false);
              }
            }}
            disabled={!selectedCompetitor || competitorLoading}
            className="px-4 py-2 bg-[#02b3e5] text-white rounded-md hover:bg-[#3bc8ea] disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {competitorLoading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading...
                </div>
            ) : (
              'Analyze'
            )}
            </button>
                </div>
                </div>
                  
      {/* Competitor Analysis Results */}
      {selectedCompetitor && competitorData.length > 0 && (
        <>
          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-md border border-gray-200 p-6">
              <div className="text-2xl font-bold text-blue-600">{competitorData.length}</div>
              <div className="text-sm text-blue-600">Total Spots</div>
              </div>
            <div className="bg-white rounded-md border border-gray-200 p-6">
              <div className="text-2xl font-bold text-green-600">
                {Math.round(competitorData.reduce((sum, spot) => sum + (spot.duration || 0), 0) / 60).toLocaleString()}
            </div>
              <div className="text-sm text-green-600">Total Minutes</div>
        </div>
            <div className="bg-white rounded-md border border-gray-200 p-6">
              <div className="text-2xl font-bold text-purple-600">
                {new Set(competitorData.map(spot => spot.network).filter(Boolean)).size}
      </div>
              <div className="text-sm text-purple-600">Networks Used</div>
                      </div>
      <div className="bg-white rounded-md border border-gray-200 p-6">
              <div className="text-2xl font-bold text-orange-600">
                {Math.round(competitorData.reduce((sum, spot) => sum + (spot.duration || 0), 0) / competitorData.length / 60)}
              </div>
              <div className="text-sm text-orange-600">Avg Spot Duration</div>
              </div>
              </div>
                
          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Share of Voice Chart */}
            <div className="bg-white rounded-md border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Network Distribution</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={processCompetitorNetworkData(competitorData)}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${percent ? (percent * 100).toFixed(0) : 0}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {processCompetitorNetworkData(competitorData).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: any) => [value, 'Spots']} />
                  </RechartsPieChart>
                </ResponsiveContainer>
            </div>
          </div>
          
            {/* Performance Comparison Chart */}
            <div className="bg-white rounded-md border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Daypart Strategy</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsBarChart data={processDaypartChartData(daypartAnalysis)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="name" 
                      stroke="#6b7280"
                      fontSize={12}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis stroke="#6b7280" fontSize={12} />
                    <Tooltip 
                      formatter={(value: any) => [value.toLocaleString(), 'Spots']}
                    />
                    <Bar dataKey="spots" fill="#ec4899" radius={[4, 4, 0, 0]} />
                  </RechartsBarChart>
                </ResponsiveContainer>
              </div>
              </div>
              </div>

          {/* Network Distribution */}
          <div className="bg-white rounded-md border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Network Distribution</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Network</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Spots</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration (min)</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Percentage</th>
              </tr>
            </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {Object.entries(
                    competitorData.reduce((acc, spot) => {
                      if (!spot.network) return acc;
                      if (!acc[spot.network]) {
                        acc[spot.network] = { spots: 0, duration: 0 };
                      }
                      acc[spot.network].spots++;
                      acc[spot.network].duration += spot.duration || 0;
                      return acc;
                    }, {} as Record<string, { spots: number; duration: number }>)
                  )
                    .sort(([, a], [, b]) => b.spots - a.spots)
                    .map(([network, stats]) => (
                      <tr key={network} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {network}
                  </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {stats.spots.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {Math.round(stats.duration / 60).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {Math.round((stats.spots / competitorData.length) * 100)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
            </div>
          </div>

          {/* Daypart Analysis */}
          <div className="bg-white rounded-md border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Daypart Strategy</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Daypart</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Spots</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration (min)</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Percentage</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {Object.entries(
                    competitorData.reduce((acc, spot) => {
                      if (!spot.daypart) return acc;
                      if (!acc[spot.daypart]) {
                        acc[spot.daypart] = { spots: 0, duration: 0 };
                      }
                      acc[spot.daypart].spots++;
                      acc[spot.daypart].duration += spot.duration || 0;
                      return acc;
                    }, {} as Record<string, { spots: number; duration: number }>)
                  )
                    .sort(([, a], [, b]) => b.spots - a.spots)
                    .map(([daypart, stats]) => (
                      <tr key={daypart} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {daypart}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {stats.spots.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {Math.round(stats.duration / 60).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {Math.round((stats.spots / competitorData.length) * 100)}%
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
        </div>
      </div>
        </>
      )}
    </div>
  );

  const renderSpotDetails = () => (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white rounded-md border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Spot Details & Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Network</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              value={legacyFilters.network}
              onChange={(e) => setLegacyFilters(prev => ({ ...prev, network: e.target.value }))}
            >
              <option value="">All Networks</option>
              {/* We'll populate this dynamically */}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Advertiser</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              value={legacyFilters.advertiser}
              onChange={(e) => setLegacyFilters(prev => ({ ...prev, advertiser: e.target.value }))}
            >
              <option value="">All Advertisers</option>
              {/* We'll populate this dynamically */}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Brand</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              value={legacyFilters.brand}
              onChange={(e) => setLegacyFilters(prev => ({ ...prev, brand: e.target.value }))}
            >
              <option value="">All Brands</option>
              {/* We'll populate this dynamically */}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Daypart</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              value={legacyFilters.daypart}
              onChange={(e) => setLegacyFilters(prev => ({ ...prev, daypart: e.target.value }))}
            >
              <option value="">All Dayparts</option>
              {/* We'll populate this dynamically */}
            </select>
        </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              value={legacyFilters.city}
              onChange={(e) => setLegacyFilters(prev => ({ ...prev, city: e.target.value }))}
            >
              <option value="">All Cities</option>
              {/* We'll populate this dynamically */}
            </select>
      </div>
          </div>
        </div>

      {/* Spots Table */}
        <div className="bg-white rounded-md border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Spot Details</h3>
          <div className="text-sm text-gray-500">
            {loading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading...
            </div>
            ) : (
              `${spots.length.toLocaleString()} spots found`
            )}
        </div>
      </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-[#02b3e5]" />
        </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Network</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Advertiser</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Brand</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Daypart</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">City</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Buy Type</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {spots.slice(0, 100).map((spot) => (
                  <tr key={spot._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {spot.network || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {spot.advertiser || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {spot.brand || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {spot.daypart || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {spot.duration ? `${Math.round(spot.duration / 60)}s` : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {spot.city || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {spot.buy_type || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="w-full space-y-6">
      {activeTab === 'overview' && renderCampaignAnalysis()}
      {activeTab === 'shareofvoice' && renderShareOfVoice()}
      {activeTab === 'lineartv' && renderLinearTVReporting()}
      {activeTab === 'competitors' && renderCompetitorAnalysis()}
      {activeTab === 'spots' && renderSpotDetails()}
      
      <AIChatDrawer 
        isOpen={showAIChat} 
        onClose={() => setShowAIChat(false)}
      />
    </div>
  );
};

export default TVIntelligence; 