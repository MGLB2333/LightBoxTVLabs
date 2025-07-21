import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { youtubeAnalyticsService, type YouTubeCampaign, type YouTubeMetrics, type YouTubePerformanceData } from '../../lib/youtubeAnalyticsService';
import { ChevronDown, Play, Pause, Calendar, DollarSign, Eye, MousePointer, TrendingUp, Users, Target } from 'lucide-react';

const summaryMetricsConfig = [
  { 
    id: 'impressions', 
    label: 'Impressions', 
    format: (v: number) => v.toLocaleString(),
    icon: Eye,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50'
  },
  { 
    id: 'views', 
    label: 'Views', 
    format: (v: number) => v.toLocaleString(),
    icon: Play,
    color: 'text-green-600',
    bgColor: 'bg-green-50'
  },
  { 
    id: 'clicks', 
    label: 'Clicks', 
    format: (v: number) => v.toLocaleString(),
    icon: MousePointer,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50'
  },
  { 
    id: 'cost', 
    label: 'Spend', 
    format: (v: number) => `£${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
    icon: DollarSign,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50'
  },
  { 
    id: 'conversions', 
    label: 'Conversions', 
    format: (v: number) => v.toLocaleString(),
    icon: Target,
    color: 'text-red-600',
    bgColor: 'bg-red-50'
  },
];

const chartMetricMap: Record<string, { key: string; color: string; label: string }> = {
  impressions: { key: 'impressions', color: '#3B82F6', label: 'Impressions' },
  views: { key: 'views', color: '#10B981', label: 'Views' },
  clicks: { key: 'clicks', color: '#8B5CF6', label: 'Clicks' },
  cost: { key: 'cost', color: '#F59E0B', label: 'Cost' },
  conversions: { key: 'conversions', color: '#EF4444', label: 'Conversions' },
  ctr: { key: 'ctr', color: '#06B6D4', label: 'CTR (%)' },
  viewRate: { key: 'viewRate', color: '#84CC16', label: 'View Rate (%)' },
  cpm: { key: 'cpm', color: '#F97316', label: 'CPM' },
  cpv: { key: 'cpv', color: '#EC4899', label: 'CPV' },
};

const statusColors: Record<string, string> = {
  ENABLED: 'bg-green-100 text-green-800',
  PAUSED: 'bg-yellow-100 text-yellow-800',
  REMOVED: 'bg-red-100 text-red-800',
};

const YouTubeAnalytics: React.FC = () => {
  const [activeMetric, setActiveMetric] = useState('impressions');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartData, setChartData] = useState<YouTubePerformanceData[]>([]);
  const [summaryMetrics, setSummaryMetrics] = useState<YouTubeMetrics | null>(null);
  const [campaigns, setCampaigns] = useState<YouTubeCampaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<string>('all');
  const [campaignDropdownOpen, setCampaignDropdownOpen] = useState(false);
  const [dateRange, setDateRange] = useState('all');

  // Fetch campaigns
  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        setError(null);
        const campaignsData = await youtubeAnalyticsService.getYouTubeCampaigns();
        setCampaigns(campaignsData);
      } catch (error: any) {
        console.error('Error fetching campaigns:', error);
        setError(error.message || 'Failed to fetch campaigns');
      }
    };
    fetchCampaigns();
  }, []);

  // Fetch metrics and chart data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        setError(null);
        const days = dateRange === 'all' ? 365 : parseInt(dateRange.replace('d', ''));
        const [metrics, performanceData] = await Promise.all([
          youtubeAnalyticsService.getYouTubeMetrics(selectedCampaign),
          youtubeAnalyticsService.getYouTubePerformanceData(selectedCampaign, days)
        ]);
        
        setSummaryMetrics(metrics);
        setChartData(performanceData);
      } catch (error: any) {
        console.error('Error fetching YouTube analytics data:', error);
        setError(error.message || 'Failed to fetch analytics data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedCampaign, dateRange]);

  const selectedCampaignData = campaigns.find(c => c.id === selectedCampaign);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#02b3e5]"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md text-center">
          <div className="text-red-600 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-red-800 mb-2">Connection Required</h3>
          <p className="text-red-700 mb-4">{error}</p>
          <p className="text-sm text-red-600">
            Please connect your Google Ads account in the Integrations page to view YouTube campaign analytics.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Campaign Selector */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">YouTube Campaign Analytics</h2>
          <div className="flex items-center space-x-4">
            {/* Date Range Selector */}
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Date Range:</span>
              <select
                className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#02b3e5]"
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
              >
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
                <option value="all">All Time</option>
              </select>
            </div>
            
            {/* Campaign Dropdown */}
            <div className="relative">
              <button
                onClick={() => setCampaignDropdownOpen(!campaignDropdownOpen)}
                className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-md bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#02b3e5]"
              >
                <span className="text-sm font-medium">
                  {selectedCampaign === 'all' ? 'All Campaigns' : selectedCampaignData?.name || 'Select Campaign'}
                </span>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </button>
              
              {campaignDropdownOpen && (
                <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-10 min-w-64">
                  <div className="py-1">
                    <button
                      onClick={() => {
                        setSelectedCampaign('all');
                        setCampaignDropdownOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${
                        selectedCampaign === 'all' ? 'bg-[#02b3e5] text-white' : 'text-gray-700'
                      }`}
                    >
                      All Campaigns
                    </button>
                    {campaigns.map((campaign) => (
                      <button
                        key={campaign.id}
                        onClick={() => {
                          setSelectedCampaign(campaign.id);
                          setCampaignDropdownOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center justify-between ${
                          selectedCampaign === campaign.id ? 'bg-[#02b3e5] text-white' : 'text-gray-700'
                        }`}
                      >
                        <span className="truncate">{campaign.name}</span>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          statusColors[campaign.status] || 'bg-gray-100 text-gray-800'
                        }`}>
                          {campaign.status}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Campaign Info */}
        {selectedCampaignData && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <Calendar className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-600">Campaign Period</p>
                <p className="font-medium">
                  {selectedCampaignData.startDate} - {selectedCampaignData.endDate || 'Ongoing'}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <DollarSign className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-600">Budget</p>
                <p className="font-medium">
                  £{selectedCampaignData.budget.toLocaleString()} ({selectedCampaignData.budgetType})
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <TrendingUp className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-600">Status</p>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  statusColors[selectedCampaignData.status] || 'bg-gray-100 text-gray-800'
                }`}>
                  {selectedCampaignData.status}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Summary Metrics */}
      {summaryMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {summaryMetricsConfig.map((metric) => {
            const Icon = metric.icon;
            const value = summaryMetrics[metric.id as keyof YouTubeMetrics] as number || 0;
            return (
              <div key={metric.id} className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">{metric.label}</p>
                    <p className="text-2xl font-bold text-gray-900">{metric.format(value)}</p>
                  </div>
                  <div className={`p-2 rounded-lg ${metric.bgColor}`}>
                    <Icon className={`w-5 h-5 ${metric.color}`} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Performance Metrics */}
      {summaryMetrics && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Key Performance Indicators */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Key Performance Indicators</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">CTR</span>
                <span className="font-semibold">{summaryMetrics.averageCtr?.toFixed(2) || 'N/A'}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">View Rate</span>
                <span className="font-semibold">{summaryMetrics.averageViewRate?.toFixed(2) || 'N/A'}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">CPC</span>
                <span className="font-semibold">£{summaryMetrics.averageCpc?.toFixed(2) || 'N/A'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">CPM</span>
                <span className="font-semibold">£{summaryMetrics.averageCpm?.toFixed(2) || 'N/A'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">CPV</span>
                <span className="font-semibold">£{summaryMetrics.averageCpv?.toFixed(3) || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Budget Overview */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Budget Overview</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total Budget</span>
                <span className="font-semibold">£{summaryMetrics.totalBudget?.toLocaleString() || 'N/A'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Spent</span>
                <span className="font-semibold text-orange-600">£{summaryMetrics.budgetSpent?.toLocaleString() || 'N/A'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Remaining</span>
                <span className="font-semibold text-green-600">£{summaryMetrics.budgetRemaining?.toLocaleString() || 'N/A'}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-[#02b3e5] h-2 rounded-full" 
                  style={{ width: `${summaryMetrics.totalBudget > 0 ? (summaryMetrics.budgetSpent / summaryMetrics.totalBudget) * 100 : 0}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-500 text-center">
                {summaryMetrics.totalBudget > 0 ? ((summaryMetrics.budgetSpent / summaryMetrics.totalBudget) * 100).toFixed(1) : '0'}% spent
              </p>
            </div>
          </div>

          {/* Campaign Status Distribution */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Campaign Status</h3>
            <div className="space-y-3">
              {Object.entries(
                campaigns.reduce((acc, campaign) => {
                  acc[campaign.status] = (acc[campaign.status] || 0) + 1;
                  return acc;
                }, {} as Record<string, number>)
              ).map(([status, count]) => (
                <div key={status} className="flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${
                      status === 'ENABLED' ? 'bg-green-500' : 
                      status === 'PAUSED' ? 'bg-yellow-500' : 'bg-red-500'
                    }`}></div>
                    <span className="text-sm text-gray-600">{status}</span>
                  </div>
                  <span className="font-semibold">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Performance Chart */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Performance Over Time</h3>
          <div className="flex space-x-2">
            {Object.entries(chartMetricMap).map(([key, config]) => (
              <button
                key={key}
                onClick={() => setActiveMetric(key)}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  activeMetric === key
                    ? 'bg-[#02b3e5] text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {config.label}
              </button>
            ))}
          </div>
        </div>
        
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="date" 
                stroke="#6b7280"
                fontSize={12}
                tickFormatter={(value) => new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
              />
              <YAxis 
                stroke="#6b7280"
                fontSize={12}
                tickFormatter={(value) => {
                  if (activeMetric === 'cost' || activeMetric === 'cpm' || activeMetric === 'cpv') {
                    return `£${(value || 0).toLocaleString()}`;
                  }
                  return (value || 0).toLocaleString();
                }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
                labelFormatter={(value) => new Date(value).toLocaleDateString('en-GB', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
                formatter={(value: any, name: string) => {
                  if (name === 'Cost' || name === 'CPM' || name === 'CPV') {
                    return [`£${(Number(value) || 0).toLocaleString()}`, name];
                  }
                  return [(value || 0).toLocaleString(), name];
                }}
              />
              <Line
                type="monotone"
                dataKey={chartMetricMap[activeMetric]?.key}
                stroke={chartMetricMap[activeMetric]?.color}
                strokeWidth={2}
                dot={{ fill: chartMetricMap[activeMetric]?.color, strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: chartMetricMap[activeMetric]?.color, strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Campaigns Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">YouTube Campaigns</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Campaign</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Impressions</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Views</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Clicks</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cost</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CTR</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">View Rate</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {campaigns.map((campaign) => (
                <tr key={campaign.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{campaign.name}</div>
                      <div className="text-sm text-gray-500">{campaign.startDate} - {campaign.endDate || 'Ongoing'}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      statusColors[campaign.status] || 'bg-gray-100 text-gray-800'
                    }`}>
                      {campaign.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {(campaign.impressions || 0).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {(campaign.views || 0).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {(campaign.clicks || 0).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    £{(campaign.cost || 0).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {(campaign.ctr || 0).toFixed(2)}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {(campaign.viewRate || 0).toFixed(2)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default YouTubeAnalytics; 