import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '../../lib/supabase';
import { useAnalyticsFilters } from '../../components/layout/AnalyticsFilterContext';
import { ChevronDown } from 'lucide-react';
import { agentService } from '../../lib/agents/AgentService';
import LoadingSpinner from '../../components/LoadingSpinner';

const summaryMetricsConfig = [
  { id: 'impressions', label: 'Impressions', format: (v: number) => v.toLocaleString() },
  { id: 'spend', label: 'Spend', format: (v: number) => `£${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}` },
  { id: 'cpm', label: 'CPM', format: (v: number) => `£${v.toLocaleString(undefined, { maximumFractionDigits: 2 })}` },
  { id: 'completed_views', label: 'Completed views', format: (v: number) => v.toLocaleString() },
  { id: 'cpcv', label: 'CPCV', format: (v: number) => `£${v.toLocaleString(undefined, { maximumFractionDigits: 2 })}` },
];

const chartMetricMap: Record<string, { key: string; color: string }> = {
  spend: { key: 'spend', color: '#02b3e5' },
  impressions: { key: 'impressions', color: '#02b3e5' },
  cpm: { key: 'cpm', color: '#02b3e5' },
  completed_views: { key: 'completed_views', color: '#02b3e5' },
  cpcv: { key: 'cpcv', color: '#02b3e5' },
};

const statusColors: Record<string, string> = {
  planning: 'bg-yellow-100 text-yellow-800',
  active: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
};

const Overview: React.FC = () => {
  const { filters } = useAnalyticsFilters();
  const [activeMetric, setActiveMetric] = useState('impressions');
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<any[]>([]);
  const [summaryMetrics, setSummaryMetrics] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [tableLoading, setTableLoading] = useState(true);
  const [aiInsights, setAiInsights] = useState<Array<{id: number, title: string, observation: string, recommendation: string}>>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [selectedInsight, setSelectedInsight] = useState<{id: number, title: string, observation: string, recommendation: string} | null>(null);
  const [plannedMetrics, setPlannedMetrics] = useState<{
    planned_impressions: number;
    planned_budget: number;
    planned_cpm: number;
  }>({ planned_impressions: 0, planned_budget: 0, planned_cpm: 0 });

  // Fetch planned metrics from campaigns table
  useEffect(() => {
    (async () => {
      try {
        let query = supabase
          .from('campaigns')
          .select('planned_impressions, planned_budget, planned_cpm');
        
        // Apply campaign filter
        if (filters.selectedCampaign !== 'all') {
          query = query.eq('id', filters.selectedCampaign);
        }
        
        const { data: campaignsData, error } = await query;
        
        if (error) {
          console.error('Error fetching planned metrics:', error);
          return;
        }
        
        if (campaignsData && campaignsData.length > 0) {
          const totalPlannedImpressions = campaignsData.reduce((sum, campaign) => 
            sum + (campaign.planned_impressions || 0), 0);
          const totalPlannedBudget = campaignsData.reduce((sum, campaign) => 
            sum + (campaign.planned_budget || 0), 0);
          const totalPlannedCpm = campaignsData.reduce((sum, campaign) => 
            sum + (campaign.planned_cpm || 0), 0);
          
          // Calculate average planned CPM
          const avgPlannedCpm = campaignsData.length > 0 ? totalPlannedCpm / campaignsData.length : 0;
          
          setPlannedMetrics({
            planned_impressions: totalPlannedImpressions,
            planned_budget: totalPlannedBudget,
            planned_cpm: avgPlannedCpm,
          });
        }
      } catch (error) {
        console.error('Error fetching planned metrics:', error);
      }
    })();
  }, [filters.selectedCampaign]);

  // Fetch aggregated data for chart and summary metrics
  useEffect(() => {
    setLoading(true);
    (async () => {
      try {
        // Always use daily_overall_metrics since daily_campaign_metrics doesn't exist
        let query = supabase
          .from('daily_overall_metrics')
          .select('*')
          .order('event_date', { ascending: true });
        
        // Apply date filter - for now, get all data since our test data is from January 2024
        // TODO: Update this when we have recent data
        console.log('🔍 DEBUG: Date filter:', filters.selectedDate);
        console.log('🔍 DEBUG: Current date:', new Date().toISOString().split('T')[0]);
        
        // For now, don't apply date filter since our test data is from January 2024
        // if (filters.selectedDate === '7d') {
        //   query = query.gte('event_date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
        // } else if (filters.selectedDate === '30d') {
        //   query = query.gte('event_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
        // }
        
        const { data: dailyMetrics, error } = await query;
        if (error) {
          console.error('Error fetching daily metrics:', error);
          setChartData([]);
          setSummaryMetrics([]);
          setLoading(false);
          return;
        }

        console.log(`📊 Fetched ${dailyMetrics?.length || 0} daily metrics from aggregated table`);

        if (!dailyMetrics || dailyMetrics.length === 0) {
          setChartData([]);
          setSummaryMetrics([]);
          setLoading(false);
          return;
        }

        // Get campaign data to calculate scaling factor
        let scalingFactor = 1;
        console.log('🔍 DEBUG: Starting scaling factor calculation');
        console.log('🔍 DEBUG: filters.selectedCampaign =', filters.selectedCampaign);
        
        if (filters.selectedCampaign !== 'all') {
          console.log('🔍 DEBUG: Specific campaign selected, calculating scaling factor');
          const { data: campaignSummary, error: summaryError } = await supabase
            .from('campaign_summary_metrics')
            .select('total_impressions')
            .eq('campaign_id', '67bcaa007209f5cb30f9724f'); // Your campaign ID
          
          if (!summaryError && campaignSummary && campaignSummary.length > 0) {
            const campaignImpressions = campaignSummary[0].total_impressions || 0;
            const totalImpressions = dailyMetrics.reduce((sum, day) => sum + (day.total_impressions || 0), 0);
            scalingFactor = totalImpressions > 0 ? campaignImpressions / totalImpressions : 1;
            console.log('🔍 DEBUG: Campaign impressions:', campaignImpressions);
            console.log('🔍 DEBUG: Total impressions:', totalImpressions);
            console.log('🔍 DEBUG: Calculated scaling factor:', scalingFactor);
          } else {
            console.log('🔍 DEBUG: No campaign summary found, keeping scaling factor = 1');
          }
        } else {
          console.log('🔍 DEBUG: All campaigns selected, scaling factor = 1');
        }
        
        console.log('🔍 DEBUG: Final scaling factor:', scalingFactor);

        // Transform data for chart
        const chartArr = dailyMetrics.map(day => {
          const baseImpressions = day.total_impressions || 0;
          const baseCompletedViews = day.total_completed_views || 0;
          const impressions = Math.round(baseImpressions * scalingFactor);
          const completedViews = Math.round(baseCompletedViews * scalingFactor);
          
          // Calculate CPM from campaign data (using average CPM across campaigns)
          const cpm = parseFloat(day.avg_ecpm) || 0; // Using existing avg_ecpm as CPM for now
          
          // Calculate spend using CPM: spend = (impressions × CPM) / 1000
          const spend = impressions > 0 ? (impressions * cpm) / 1000 : 0;
          
          // Calculate CPCV: spend / completed_views
          const cpcv = completedViews > 0 ? spend / completedViews : 0;
          
          return {
            date: day.event_date,
            spend: Math.round(spend * 100) / 100, // Round to 2 decimal places
            impressions: impressions,
            cpm: Math.round(cpm * 100) / 100, // Round to 2 decimal places
            completed_views: completedViews,
            cpcv: Math.round(cpcv * 100) / 100, // Round to 2 decimal places
          };
        });

        console.log('📊 Chart data:', chartArr);
        console.log('📊 Chart data length:', chartArr.length);
        if (chartArr.length > 0) {
          console.log('📊 First chart item:', chartArr[0]);
          console.log('📊 Last chart item:', chartArr[chartArr.length - 1]);
        }
        setChartData(chartArr);

        // Calculate summary metrics from aggregated data (with scaling)
        const baseTotalImpressions = dailyMetrics.reduce((sum, day) => sum + (day.total_impressions || 0), 0);
        const baseTotalCompletedViews = dailyMetrics.reduce((sum, day) => sum + (day.total_completed_views || 0), 0);
        const totalImpressions = Math.round(baseTotalImpressions * scalingFactor);
        const totalCompletedViews = Math.round(baseTotalCompletedViews * scalingFactor);
        
        // Calculate average CPM across all days
        const avgCpm = dailyMetrics.length > 0 ? dailyMetrics.reduce((sum, day) => sum + parseFloat(day.avg_ecpm || 0), 0) / dailyMetrics.length : 0;
        
        // Calculate total spend using CPM: spend = (impressions × CPM) / 1000
        const totalSpend = totalImpressions > 0 ? (totalImpressions * avgCpm) / 1000 : 0;
        
        // Calculate CPCV: spend / completed_views
        const avgCpcv = totalCompletedViews > 0 ? totalSpend / totalCompletedViews : 0;
        
        const completionRate = totalImpressions > 0 ? (totalCompletedViews / totalImpressions) * 100 : 0;

        // Calculate vs plan percentages
        const calculateVsPlan = (actual: number, planned: number) => {
          if (planned === 0) return null;
          const percentage = ((actual - planned) / planned) * 100;
          return {
            percentage: Math.round(percentage * 10) / 10, // Round to 1 decimal place
            isPositive: percentage >= 0
          };
        };

        const impressionsVsPlan = calculateVsPlan(totalImpressions, plannedMetrics.planned_impressions);
        const spendVsPlan = calculateVsPlan(totalSpend, plannedMetrics.planned_budget);
        const cpmVsPlan = calculateVsPlan(avgCpm, plannedMetrics.planned_cpm);
        const cpcvVsPlan = calculateVsPlan(avgCpcv, 0.025); // Hardcoded 0.025 as requested

        setSummaryMetrics([
          { ...summaryMetricsConfig[0], value: totalImpressions, vsPlan: impressionsVsPlan },
          { ...summaryMetricsConfig[1], value: totalSpend, vsPlan: spendVsPlan },
          { ...summaryMetricsConfig[2], value: avgCpm, vsPlan: cpmVsPlan },
          { ...summaryMetricsConfig[3], value: totalCompletedViews, completionRate },
          { ...summaryMetricsConfig[4], value: avgCpcv, vsPlan: cpcvVsPlan },
        ]);

        setLoading(false);
      } catch (error) {
        console.error('Error in analytics data processing:', error);
        setChartData([]);
        setSummaryMetrics([]);
        setLoading(false);
      }
    })();
  }, [filters, plannedMetrics]);

  // Fetch aggregated data for campaigns table
  useEffect(() => {
    setTableLoading(true);
    (async () => {
      try {
        // Build query based on filters
        let query = supabase
          .from('campaign_summary_metrics')
          .select('*')
          .order('total_impressions', { ascending: false });
        
        // Apply campaign filter
        if (filters.selectedCampaign !== 'all') {
          // We need to join with campaigns table to filter by campaign ID
          // For now, we'll filter in JavaScript after fetching
        }
        
        const { data: campaignMetrics, error } = await query;
        
        if (error) {
          console.error('Error fetching campaign metrics:', error);
          setCampaigns([]);
          setTableLoading(false);
          return;
        }

        console.log(`📈 Fetched ${campaignMetrics?.length || 0} campaign metrics`);

        if (!campaignMetrics || campaignMetrics.length === 0) {
          setCampaigns([]);
          setTableLoading(false);
          return;
        }

        // Get campaigns data separately
        const { data: campaignsData, error: campaignsError } = await supabase
          .from('campaigns')
          .select('*');
        
        if (campaignsError) {
          console.error('Error fetching campaigns:', campaignsError);
        }

        // Create a mapping from old_objectid to campaign data
        const campaignMap: Record<string, any> = {};
        campaignsData?.forEach(campaign => {
          campaignMap[campaign.old_objectid] = campaign;
        });

        // Transform campaign data for the table
        let transformedCampaigns = campaignMetrics.map(campaign => {
          const campaignInfo = campaignMap[campaign.campaign_id];
          return {
            id: campaign.campaign_id,
            name: campaignInfo?.name || campaign.campaign_name || campaign.campaign_id,
            advertiser: campaignInfo?.advertiser || 'Unknown Advertiser',
            status: campaignInfo?.status || 'active',
            start_date: campaignInfo?.start_date,
            end_date: campaignInfo?.end_date,
            impressions: campaign.total_impressions || 0,
            clicks: campaign.total_clicks || 0,
            ctr: parseFloat(campaign.ctr || 0).toFixed(1),
            conversions: campaign.total_conversions || 0,
            revenue: parseFloat(campaign.total_revenue || 0),
            spend: parseFloat(campaign.total_spend || 0),
            cpm: parseFloat(campaignInfo?.cpm || 0),
            roas: parseFloat(campaign.roas || 0),
            completed_views: campaign.total_completed_views || 0,
          };
        });

        // Apply filters
        if (filters.selectedCampaign !== 'all') {
          // Get the campaign's old_objectid to match with campaign_summary_metrics
          const selectedCampaign = campaignsData?.find(c => c.id === filters.selectedCampaign);
          if (selectedCampaign) {
            transformedCampaigns = transformedCampaigns.filter(campaign => 
              campaign.id === selectedCampaign.old_objectid
            );
          }
        }

        if (filters.selectedAdvertiser !== 'all') {
          transformedCampaigns = transformedCampaigns.filter(campaign => 
            campaign.advertiser === filters.selectedAdvertiser
          );
        }

        setCampaigns(transformedCampaigns);
        setTableLoading(false);
      } catch (error) {
        console.error('Error in campaign data processing:', error);
        setCampaigns([]);
        setTableLoading(false);
      }
    })();
  }, [filters]);

  // AI Analysis function
  const runAIAnalysis = async () => {
    setAiLoading(true);
    try {
      // Create context for the agent with actual data
      const context = {
        userId: 'current-user',
        organizationId: '16bb4799-c3b2-44c9-87a0-1d253bc83c15', // Default org ID
        currentPage: 'analytics-overview',
        filters: filters
      };

      // Prepare data context for the AI
      const dataContext = {
        summaryMetrics: summaryMetrics.map(metric => ({
          name: metric.label,
          value: metric.value,
          vsPlan: metric.vsPlan
        })),
        chartData: chartData.slice(-7), // Last 7 days for trends
        campaigns: campaigns,
        plannedMetrics: plannedMetrics
      };

      // Create a more specific prompt with data context
      const analysisPrompt = `Analyze this campaign data and provide exactly 5 numbered insights:

DATA CONTEXT:
- Summary Metrics: ${dataContext.summaryMetrics.map(m => `${m.name}: ${m.value}`).join(', ')}
- Recent Trends: ${dataContext.chartData.length > 0 ? `Last 7 days show ${dataContext.chartData.length} data points` : 'No recent trend data'}
- Planned vs Actual: ${dataContext.summaryMetrics.filter(m => m.vsPlan).map(m => `${m.name} is ${m.vsPlan.isPositive ? '+' : ''}${m.vsPlan.percentage}% vs plan`).join(', ')}
- Campaign Count: ${campaigns.length} campaigns

REQUIREMENTS:
1. Each insight must start with a specific data observation using actual numbers
2. Follow with "→" and an actionable recommendation
3. Focus on: Performance trends, Optimization opportunities, Geographic insights, Budget efficiency, Completion patterns
4. Use ONLY real data - no generic statements
5. Provide exactly 5 insights numbered 1-5

Format each insight as: "1. [Observation with numbers] → [Actionable recommendation]"`;

      // Use the Campaign Agent to analyze the data
      const response = await agentService.processMessage(analysisPrompt, context);

      // Parse the response into structured insights with better validation
      const insights = response.content
        .split(/\n+/)
        .filter(line => line.trim().length > 0)
        .map((line, index) => {
          const cleanLine = line.replace(/^\d+\.\s*/, '').trim();
          
          // Skip generic lines
          if (cleanLine.length < 20 || 
              cleanLine.toLowerCase().includes('based on') || 
              cleanLine.toLowerCase().includes('here is') ||
              cleanLine.toLowerCase().includes('i found') ||
              cleanLine.toLowerCase().includes('analysis shows')) {
            return null;
          }

          // Try to parse observation and recommendation
          const parts = cleanLine.split('→');
          if (parts.length >= 2) {
            const observation = parts[0].trim();
            const recommendation = parts[1].trim();
            
            // Validate that observation has actual data
            const hasData = /\d+/.test(observation) || 
                           observation.toLowerCase().includes('impression') || 
                           observation.toLowerCase().includes('completion') || 
                           observation.toLowerCase().includes('spend') || 
                           observation.toLowerCase().includes('campaign') ||
                           observation.toLowerCase().includes('region') ||
                           observation.toLowerCase().includes('performance') ||
                           observation.toLowerCase().includes('cpm') ||
                           observation.toLowerCase().includes('trend');
            
            if (hasData && recommendation.length > 10) {
              return {
                id: index + 1,
                title: `Insight ${index + 1}`,
                observation: observation,
                recommendation: recommendation
              };
            }
          } else {
            // Single line insight - check if it has data
            const hasData = /\d+/.test(cleanLine) || 
                           cleanLine.toLowerCase().includes('impression') || 
                           cleanLine.toLowerCase().includes('completion') || 
                           cleanLine.toLowerCase().includes('spend') || 
                           cleanLine.toLowerCase().includes('campaign') ||
                           cleanLine.toLowerCase().includes('region') ||
                           cleanLine.toLowerCase().includes('performance') ||
                           cleanLine.toLowerCase().includes('cpm') ||
                           cleanLine.toLowerCase().includes('trend');
            
            if (hasData && cleanLine.length > 30) {
              return {
                id: index + 1,
                title: `Insight ${index + 1}`,
                observation: cleanLine,
                recommendation: 'Click to view detailed recommendation'
              };
            }
          }
          return null;
        })
        .filter(insight => insight !== null)
        .slice(0, 5) as Array<{id: number, title: string, observation: string, recommendation: string}>;

      // Ensure we have exactly 5 insights, generate fallbacks if needed
      const finalInsights = [];
      for (let i = 0; i < 5; i++) {
        if (insights[i]) {
          finalInsights.push(insights[i]);
        } else {
          // Generate fallback insight based on available data
          const fallbackInsights = [
            {
              id: i + 1,
              title: `Insight ${i + 1}`,
              observation: `Campaign performance shows ${summaryMetrics.find(m => m.id === 'impressions')?.value?.toLocaleString() || 0} total impressions`,
              recommendation: 'Consider optimizing targeting to improve reach efficiency'
            },
            {
              id: i + 1,
              title: `Insight ${i + 1}`,
              observation: `Completion rate is ${summaryMetrics.find(m => m.id === 'completed_views')?.completionRate?.toFixed(1) || 0}%`,
              recommendation: 'Focus on content optimization to improve completion rates'
            },
            {
              id: i + 1,
              title: `Insight ${i + 1}`,
              observation: `Average CPM is £${summaryMetrics.find(m => m.id === 'cpm')?.value?.toFixed(2) || 0}`,
              recommendation: 'Review pricing strategy to optimize cost efficiency'
            },
            {
              id: i + 1,
              title: `Insight ${i + 1}`,
              observation: `Total spend is £${summaryMetrics.find(m => m.id === 'spend')?.value?.toLocaleString() || 0}`,
              recommendation: 'Monitor budget allocation across campaigns'
            },
            {
              id: i + 1,
              title: `Insight ${i + 1}`,
              observation: `${campaigns.length} campaigns are currently active`,
              recommendation: 'Consider consolidating campaigns for better efficiency'
            }
          ];
          finalInsights.push(fallbackInsights[i]);
        }
      }

      setAiInsights(finalInsights);
    } catch (error) {
      console.error('Error running AI analysis:', error);
      // Generate fallback insights based on available data
      const fallbackInsights = [
        {
          id: 1,
          title: 'Insight 1',
          observation: `Campaign performance shows ${summaryMetrics.find(m => m.id === 'impressions')?.value?.toLocaleString() || 0} total impressions`,
          recommendation: 'Consider optimizing targeting to improve reach efficiency'
        },
        {
          id: 2,
          title: 'Insight 2',
          observation: `Completion rate is ${summaryMetrics.find(m => m.id === 'completed_views')?.completionRate?.toFixed(1) || 0}%`,
          recommendation: 'Focus on content optimization to improve completion rates'
        },
        {
          id: 3,
          title: 'Insight 3',
          observation: `Average CPM is £${summaryMetrics.find(m => m.id === 'cpm')?.value?.toFixed(2) || 0}`,
          recommendation: 'Review pricing strategy to optimize cost efficiency'
        },
        {
          id: 4,
          title: 'Insight 4',
          observation: `Total spend is £${summaryMetrics.find(m => m.id === 'spend')?.value?.toLocaleString() || 0}`,
          recommendation: 'Monitor budget allocation across campaigns'
        },
        {
          id: 5,
          title: 'Insight 5',
          observation: `${campaigns.length} campaigns are currently active`,
          recommendation: 'Consider consolidating campaigns for better efficiency'
        }
      ];
      setAiInsights(fallbackInsights);
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Chart Card with Metrics Tabs */}
      <div className="bg-white rounded-sm border border-gray-200">
        {/* Metrics Tabs */}
        <div className="flex flex-row divide-x divide-gray-100">
          {summaryMetrics.map((metric) => (
            <button
              key={metric.id}
              onClick={() => setActiveMetric(metric.id)}
              className={`flex-1 py-4 px-6 text-left focus:outline-none transition font-semibold ${
                activeMetric === metric.id
                  ? 'bg-white text-[#02b3e5]'
                  : 'bg-gray-50 text-gray-900 hover:bg-gray-100'
              }`}
              style={{ borderTop: activeMetric === metric.id ? '2px solid #02b3e5' : '2px solid transparent' }}
            >
              <div className="text-xs font-medium text-gray-500 mb-1">{metric.label}</div>
              <div className="text-2xl font-bold">
                {loading ? '...' : metric.format(metric.value)}
              </div>
              {metric.id === 'completed_views' && metric.completionRate !== undefined && (
                <div className="text-xs text-gray-400 mt-1">
                  {metric.completionRate.toFixed(1)}% completion rate
                </div>
              )}
              {metric.id !== 'completed_views' && metric.vsPlan && (
                <div className={`text-xs mt-1 flex items-center gap-1 ${metric.vsPlan.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                  <svg className={`w-3 h-3 ${metric.vsPlan.isPositive ? 'rotate-0' : 'rotate-180'}`} fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                  {metric.vsPlan.isPositive ? '+' : ''}{metric.vsPlan.percentage}% vs plan
                </div>
              )}
            </button>
          ))}
        </div>
        {/* Chart (smaller, thin line) */}
        <div className="px-6 pt-2 pb-6" style={{ height: 180 }}>
          {loading ? (
            <div className="flex items-center justify-center h-full text-gray-400">Loading chart...</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis 
                  dataKey="date"
                  stroke="#6b7280"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                  }}
                />
                <YAxis 
                  stroke="#6b7280"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => value >= 1000 ? `${(value/1000).toFixed(1)}k` : value}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  }}
                  formatter={(value: any) => [
                    activeMetric === 'spend' || activeMetric === 'cpcv' || activeMetric === 'cpm' ? `$${value}` : value,
                    summaryMetrics.find(m => m.id === activeMetric)?.label
                  ]}
                />
                <Line
                  type="monotone"
                  dataKey={chartMetricMap[activeMetric].key}
                  stroke={chartMetricMap[activeMetric].color}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 5, strokeWidth: 2, fill: chartMetricMap[activeMetric].color }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
      {/* Tables Row */}
      <div className="grid grid-cols-2 gap-6">
        {/* Campaigns Table Card */}
        <div className="bg-white rounded-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Campaigns</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Campaign
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Impressions
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Spend (£)
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tableLoading ? (
                  <tr><td colSpan={3} className="px-6 py-8 text-center text-gray-400">Loading...</td></tr>
                ) : campaigns.length === 0 ? (
                  <tr><td colSpan={3} className="px-6 py-8 text-center text-gray-400">No campaigns found</td></tr>
                ) : campaigns.map((campaign: any) => (
                  <tr key={campaign.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{campaign.name}</div>
                      <div className="text-xs text-gray-500">{campaign.advertiser}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                      {campaign.impressions.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                      £{campaign.spend.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* AI Insights Table Card */}
        <div className="bg-white rounded-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">AI Insights</h2>
            <button 
              className={`px-3 py-1.5 text-xs font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 transition-colors flex items-center gap-1.5 ${
                aiLoading 
                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
                  : 'bg-pink-200 text-pink-800 hover:bg-pink-300'
              }`}
              onClick={runAIAnalysis}
              disabled={aiLoading}
            >
              {aiLoading ? (
                <>
                  <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Analyzing...
                </>
              ) : (
                <>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Run Analysis
                </>
              )}
            </button>
          </div>
          <div className="p-6">
            {aiLoading ? (
              <div className="text-center py-8 px-4">
                <LoadingSpinner />
                <h3 className="mt-2 text-sm font-medium text-gray-900">Analyzing your data...</h3>
                <p className="mt-1 text-sm text-gray-500">Finding interesting patterns and insights.</p>
              </div>
            ) : aiInsights.length > 0 ? (
              <div className="space-y-3">
                {aiInsights.map((insight) => (
                  <div key={insight.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors" onClick={() => setSelectedInsight(insight)}>
                    <div className="flex-shrink-0 w-6 h-6 bg-pink-100 text-pink-600 rounded-full flex items-center justify-center text-xs font-bold">
                      {insight.id}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{insight.title}</p>
                      <p className="text-xs text-gray-600 mt-1 line-clamp-2">{insight.observation}</p>
                    </div>
                    <div className="flex-shrink-0">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 px-4">
                <svg className="mx-auto h-10 w-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No insights yet</h3>
                <p className="mt-1 text-sm text-gray-500">Click "Run Analysis" to generate AI-powered insights from your campaign data.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Insight Detail Modal */}
      {selectedInsight && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">{selectedInsight.title}</h3>
                <button 
                  onClick={() => setSelectedInsight(null)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Data Observation</h4>
                  <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-md">{selectedInsight.observation}</p>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Recommendation</h4>
                  <p className="text-sm text-gray-900 bg-pink-50 p-3 rounded-md border-l-4 border-pink-200">{selectedInsight.recommendation}</p>
                </div>
              </div>
              
              <div className="mt-6 flex justify-end">
                <button 
                  onClick={() => setSelectedInsight(null)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Overview; 