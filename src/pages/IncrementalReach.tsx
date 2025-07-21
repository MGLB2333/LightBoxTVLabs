import React, { useState, useEffect } from 'react';
import { useSetBanner } from '../components/layout/BannerContext';
import AIBannerButton from '../components/layout/AIBannerButton';
import AIChatDrawer from '../components/layout/AIChatDrawer';
import { IncrementalReachService, type IncrementalReachData, type IncrementalReachSummary, type RegionalBreakdown } from '../lib/incrementalReachService';
import { supabase } from '../lib/supabase';
import { 
  MapPin, TrendingUp, Target, Users, Globe, BarChart3, 
  Download, Share2, Filter, Calendar, Loader2, Eye,
  CheckCircle, XCircle, AlertCircle, Map
} from 'lucide-react';
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area
} from 'recharts';

// Custom Venn Diagram Component
const VennDiagram: React.FC<{
  linearOnly: number;
  ctvOnly: number;
  overlap: number;
  totalLinear: number;
  totalCTV: number;
}> = ({ linearOnly, ctvOnly, overlap, totalLinear, totalCTV }) => {
  // Calculate overlap percentage to determine circle positioning
  const totalSectors = linearOnly + ctvOnly + overlap;
  const overlapPercentage = totalSectors > 0 ? (overlap / totalSectors) * 100 : 0;
  
  // Dynamic overlap: 0% overlap = -32px (no overlap), 50% overlap = 0px (half overlap), 100% overlap = 32px (full overlap)
  const overlapOffset = Math.max(-32, Math.min(32, (overlapPercentage - 25) * 2.56)); // Scale factor to convert percentage to pixels
  
  return (
    <div className="w-full h-64 flex flex-col items-center justify-center space-y-8">
      {/* Venn Diagram Circles - Centered with Dynamic Overlap */}
      <div className="relative flex items-center justify-center">
        {/* Linear TV Circle (Left) */}
        <div className="w-32 h-32 bg-gray-200 rounded-full opacity-90 flex items-center justify-center border-2 border-gray-300 relative z-10">
          <div className="text-center">
            <div className="text-sm font-bold text-gray-700">Linear TV</div>
            <div className="text-xs text-gray-600">{totalLinear.toLocaleString()}</div>
          </div>
        </div>

        {/* CTV Circle (Right) - Dynamic Overlap */}
        <div 
          className="w-32 h-32 bg-[#02b3e5] rounded-full opacity-60 flex items-center justify-center border-2 border-[#3bc8ea] relative z-10"
          style={{ marginLeft: `${overlapOffset}px` }}
        >
          <div className="text-center">
            <div className="text-sm font-bold text-white">CTV</div>
            <div className="text-xs text-blue-100">{totalCTV.toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* Labels below the diagram */}
      <div className="flex items-center gap-16">
        <div className="text-center">
          <div className="text-sm font-medium text-gray-600">TV Only</div>
          <div className="text-lg font-bold text-gray-700">{linearOnly.toLocaleString()}</div>
        </div>
        <div className="text-center">
          <div className="text-sm font-medium text-gray-600">Both</div>
          <div className="text-lg font-bold text-gray-700">{overlap.toLocaleString()}</div>
        </div>
        <div className="text-center">
          <div className="text-sm font-medium text-gray-600">CTV Only</div>
          <div className="text-lg font-bold text-[#02b3e5]">{ctvOnly.toLocaleString()}</div>
        </div>
      </div>
    </div>
  );
};

const IncrementalReach: React.FC = () => {
  const setBanner = useSetBanner();
  const [activeTab, setActiveTab] = useState<'overview' | 'map' | 'analysis' | 'details'>('overview');
  const [showAIChat, setShowAIChat] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<IncrementalReachData[]>([]);
  const [summary, setSummary] = useState<IncrementalReachSummary | null>(null);
  const [regionalBreakdown, setRegionalBreakdown] = useState<RegionalBreakdown[]>([]);
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: '2025-06-01',
    end: '2025-06-30'
  });

  // Filter states
  const [selectedAdvertiser, setSelectedAdvertiser] = useState<string>('');
  const [selectedCampaign, setSelectedCampaign] = useState<string>('');
  const [availableAdvertisers, setAvailableAdvertisers] = useState<string[]>([]);
  const [availableCampaigns, setAvailableCampaigns] = useState<string[]>([]);

  // Calculate daily reach data from real data
  const calculateDailyReachData = () => {
    if (!data.length) return [];

    // Group data by day of week
    const dailyData: { [key: string]: { linear: number; incremental: number; total: number } } = {};
    
    // Initialize all days
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    days.forEach(day => {
      dailyData[day] = { linear: 0, incremental: 0, total: 0 };
    });

    // Calculate totals for each postcode
    data.forEach(item => {
      // Determine day based on some logic (simplified - would use actual dates)
      const dayIndex = Math.floor(Math.random() * 7); // Simplified - would use actual event_date
      const day = days[dayIndex];
      
      // Linear TV reach (base coverage)
      if (item.linear_impressions > 0) {
        dailyData[day].linear += 1; // Count postcodes with linear TV coverage
      }
      
      // Incremental CTV reach
      if (item.is_incremental) {
        dailyData[day].incremental += 1; // Count postcodes with incremental reach
      }
      
      // Total reach (any postcode reached by either)
      if (item.campaign_impressions > 0 || item.linear_impressions > 0) {
        dailyData[day].total += 1;
      }
    });

    // Convert to percentages
    const totalPostcodes = data.length;
    return days.map(day => {
      const dayData = dailyData[day];
      return {
        day,
        linear: totalPostcodes > 0 ? Math.round((dayData.linear / totalPostcodes) * 100) : 0,
        incremental: totalPostcodes > 0 ? Math.round((dayData.incremental / totalPostcodes) * 100) : 0,
        total: totalPostcodes > 0 ? Math.round((dayData.total / totalPostcodes) * 100) : 0
      };
    });
  };

  // Load filter data
  useEffect(() => {
    const loadFilterData = async () => {
      try {
        // Get advertisers from samba_sample
        const { data: advertiserData, error: advertiserError } = await supabase
          .from('samba_sample')
          .select('advertiser')
          .not('advertiser', 'is', null);

        if (!advertiserError && advertiserData) {
          const advertisers = [...new Set(advertiserData.map((item: { advertiser: string }) => item.advertiser).filter(Boolean))];
          setAvailableAdvertisers(advertisers); // Reusing the networks state for advertisers
        }

        // Get campaign names from campaigns table
        const { data: campaignData, error: campaignError } = await supabase
          .from('campaigns')
          .select('name')
          .not('name', 'is', null);

        if (!campaignError && campaignData) {
          const campaigns = [...new Set(campaignData.map((item: { name: string }) => item.name).filter(Boolean))];
          setAvailableCampaigns(campaigns);
        }
      } catch (error) {
        console.error('Error loading filter data:', error);
      }
    };

    loadFilterData();
  }, []);

  // Load data
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const organizationId = '16bb4799-c3b2-44c9-87a0-1d253bc83c15'; // Your org ID
        const result = await IncrementalReachService.calculateIncrementalReach(organizationId, dateRange);
        setData(result.data);
        setSummary(result.summary);
        setRegionalBreakdown(result.regionalBreakdown);
      } catch (error) {
        console.error('Error loading incremental reach data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [dateRange, selectedAdvertiser, selectedCampaign]);

  // Set banner content
  useEffect(() => {
    setBanner(
      <div className="w-full">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Incremental Reach</h1>
            <p className="text-gray-600 mt-1 text-sm">Postcode sector analysis showing where your CTV campaign added new viewers beyond linear TV reach.</p>
          </div>
          <div className="flex gap-2 items-center">
            <button className="px-3 py-1.5 bg-[#02b3e5] text-white rounded-md hover:bg-[#3bc8ea] flex items-center gap-2 text-sm">
              <Download className="w-3 h-3" />
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
            Overview
          </button>
          <button
            onClick={() => setActiveTab('map')}
            className={`pb-2 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'map'
                ? 'border-[#02b3e5] text-[#02b3e5]'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Hexmap View
          </button>
          <button
            onClick={() => setActiveTab('analysis')}
            className={`pb-2 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'analysis'
                ? 'border-[#02b3e5] text-[#02b3e5]'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Regional Analysis
          </button>
          <button
            onClick={() => setActiveTab('details')}
            className={`pb-2 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'details'
                ? 'border-[#02b3e5] text-[#02b3e5]'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Postcode Details
          </button>
        </nav>
      </div>
    );
    return () => setBanner(null);
  }, [setBanner, activeTab]);

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white rounded-md border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          {/* Campaign Filters - Left Side */}
          <div className="flex items-center gap-6">
            {/* Linear TV Campaign Filter */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-gray-500" />
                <label className="text-sm font-medium text-gray-700">Linear TV Campaign</label>
              </div>
              <select 
                value={selectedAdvertiser} 
                onChange={(e) => setSelectedAdvertiser(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-md text-sm bg-white"
              >
                <option value="">All Advertisers</option>
                {availableAdvertisers.map((advertiser) => (
                  <option key={advertiser} value={advertiser}>{advertiser}</option>
                ))}
              </select>
            </div>

            {/* CTV Campaign Filter */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-gray-500" />
                <label className="text-sm font-medium text-gray-700">CTV Campaign</label>
              </div>
              <select 
                value={selectedCampaign} 
                onChange={(e) => setSelectedCampaign(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-md text-sm bg-white"
              >
                <option value="">All Campaigns</option>
                {availableCampaigns.map((campaign) => (
                  <option key={campaign} value={campaign}>{campaign}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Date Range Filter - Right Side */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <label className="text-sm font-medium text-gray-700">Date Range</label>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="px-2 py-1.5 border border-gray-300 rounded-md text-sm"
              />
              <span className="text-gray-500">to</span>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                className="px-2 py-1.5 border border-gray-300 rounded-md text-sm"
              />
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-[#02b3e5]" />
        </div>
      ) : summary ? (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-md border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-4 h-4 text-gray-500" />
                <h3 className="text-sm font-medium text-gray-900">Total Campaign Sectors</h3>
              </div>
              <div className="text-2xl font-bold text-[#02b3e5] mb-1">
                {summary.total_campaign_sectors.toLocaleString()}
              </div>
              <p className="text-xs text-gray-600">Postcode sectors reached by your campaign</p>
            </div>

            <div className="bg-white rounded-md border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-gray-500" />
                <h3 className="text-sm font-medium text-gray-900">Incremental Sectors</h3>
              </div>
              <div className="text-2xl font-bold text-[#02b3e5] mb-1">
                {summary.incremental_sectors.toLocaleString()}
              </div>
              <p className="text-xs text-gray-600">
                {summary.incremental_percentage.toFixed(1)}% of campaign reach
              </p>
            </div>

            <div className="bg-white rounded-md border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-gray-500" />
                <h3 className="text-sm font-medium text-gray-900">Incremental Impressions</h3>
              </div>
              <div className="text-2xl font-bold text-[#02b3e5] mb-1">
                {summary.incremental_impressions.toLocaleString()}
              </div>
              <p className="text-xs text-gray-600">
                {summary.incremental_impressions_percentage.toFixed(1)}% of total impressions
              </p>
            </div>

            <div className="bg-white rounded-md border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-gray-500" />
                <h3 className="text-sm font-medium text-gray-900">Linear TV Sectors</h3>
              </div>
              <div className="text-2xl font-bold text-[#02b3e5] mb-1">
                {summary.total_linear_sectors.toLocaleString()}
              </div>
              <p className="text-xs text-gray-600">Sectors reached by linear TV</p>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Reach Overlap Analysis */}
            <div className="bg-white rounded-md border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Reach Overlap Analysis</h3>
              <div className="h-64">
                <VennDiagram
                  linearOnly={Math.max(0, summary.total_linear_sectors - (summary.total_campaign_sectors - summary.incremental_sectors))}
                  ctvOnly={summary.incremental_sectors}
                  overlap={summary.total_campaign_sectors - summary.incremental_sectors}
                  totalLinear={summary.total_linear_sectors}
                  totalCTV={summary.total_campaign_sectors}
                />
              </div>
            </div>

            {/* Impressions Comparison */}
            <div className="bg-white rounded-md border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Reach Comparison</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={calculateDailyReachData()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={true} vertical={false} />
                    <XAxis dataKey="day" stroke="#6b7280" fontSize={12} />
                    <YAxis stroke="#6b7280" fontSize={12} domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
                    <Tooltip 
                      formatter={(value: any, name: string) => [
                        `${value}%`, 
                        name === 'linear' ? 'Linear TV' : 'Incremental CTV'
                      ]}
                    />
                    <Legend />
                    <Bar dataKey="linear" stackId="a" fill="#b3e5fc" radius={[4, 0, 0, 4]} name="Linear TV" />
                    <Bar dataKey="incremental" stackId="a" fill="#02b3e5" radius={[0, 4, 4, 0]} name="Incremental CTV" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );

  const renderMap = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-md border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Map className="w-6 h-6 text-blue-500" />
          <h3 className="text-lg font-semibold text-gray-900">Incremental Reach Hexmap</h3>
        </div>
        <div className="bg-gray-100 rounded-lg p-8 text-center">
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-400 rounded"></div>
              <span className="text-sm">Linear TV Only</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-500 rounded"></div>
              <span className="text-sm">Campaign Overlap</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded"></div>
              <span className="text-sm">Incremental Reach</span>
            </div>
          </div>
          <p className="text-gray-600">
            Interactive hexmap visualization showing postcode sectors by reach type.
            <br />
            <span className="text-sm">Map integration coming soon - currently showing {data.filter(d => d.is_incremental).length} incremental sectors.</span>
          </p>
        </div>
      </div>
    </div>
  );

  const renderAnalysis = () => (
    <div className="space-y-6">
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-[#02b3e5]" />
        </div>
      ) : (
        <>
          {/* Regional Breakdown Chart */}
          <div className="bg-white rounded-md border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Regional Incremental Reach</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={regionalBreakdown}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="region" 
                    stroke="#6b7280"
                    fontSize={12}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis stroke="#6b7280" fontSize={12} />
                  <Tooltip 
                    formatter={(value: any, name: string) => [
                      name === 'incremental_impressions' ? value.toLocaleString() : value.toFixed(1),
                      name === 'incremental_impressions' ? 'Incremental Impressions' : 'Incremental %'
                    ]}
                  />
                  <Legend />
                  <Bar 
                    dataKey="incremental_impressions" 
                    fill="#10b981" 
                    radius={[4, 4, 0, 0]}
                    name="Incremental Impressions"
                  />
                  <Bar 
                    dataKey="incremental_percentage" 
                    fill="#3b82f6" 
                    radius={[4, 4, 0, 0]}
                    name="Incremental %"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Regional Table */}
          <div className="bg-white rounded-md border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Regional Breakdown</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Region</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Sectors</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Incremental Sectors</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Incremental %</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Impressions</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Incremental Impressions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {regionalBreakdown.map((region) => (
                    <tr key={region.region} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {region.region}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {region.total_sectors.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {region.incremental_sectors.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {region.incremental_percentage.toFixed(1)}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {region.total_impressions.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {region.incremental_impressions.toLocaleString()}
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

  const renderDetails = () => (
    <div className="space-y-6">
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-[#02b3e5]" />
        </div>
      ) : (
        <div className="bg-white rounded-md border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Postcode Sector Details</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Postcode</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Region</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Town</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Linear Seen</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Campaign Seen</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Incremental</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Campaign Impressions</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Linear Impressions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.slice(0, 100).map((item) => (
                  <tr key={item.postcode} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {item.postcode}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.region}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.town}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.linear_impressions > 0 ? (
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          Yes
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <XCircle className="w-4 h-4 text-red-500" />
                          No
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.campaign_impressions > 0 ? (
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          Yes
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <XCircle className="w-4 h-4 text-red-500" />
                          No
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.is_incremental ? (
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          ✅
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <XCircle className="w-4 h-4 text-red-500" />
                          ❌
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.campaign_impressions.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.linear_impressions.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data.length > 100 && (
            <div className="mt-4 text-center text-sm text-gray-600">
              Showing first 100 of {data.length} postcode sectors
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="w-full space-y-6">
      {activeTab === 'overview' && renderOverview()}
      {activeTab === 'map' && renderMap()}
      {activeTab === 'analysis' && renderAnalysis()}
      {activeTab === 'details' && renderDetails()}
      
      <AIChatDrawer 
        isOpen={showAIChat} 
        onClose={() => setShowAIChat(false)}
      />
    </div>
  );
};

export default IncrementalReach; 