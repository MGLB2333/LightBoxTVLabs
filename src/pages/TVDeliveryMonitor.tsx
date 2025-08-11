import React, { useState, useEffect, useRef } from 'react';
import { useSetBanner } from '../components/layout/BannerContext';
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, MoreHorizontal, AlertTriangle, TrendingDown as TrendingDownIcon, CheckCircle, MessageSquare, Download, RefreshCw, Target, Flag, Calculator } from 'lucide-react';
import { supabase } from '../lib/supabase';

const tabs = [
  { id: 'channel', name: 'Channel Performance' },
  { id: 'summary', name: 'Campaign Summary' },
  { id: 'weekly', name: 'Weekly Breakdown' },
  { id: 'daypart', name: 'Daypart Performance' },
  { id: 'demographic', name: 'Demographic Breakdown' },
  { id: 'spots', name: 'Spot List' },
];

const ROWS_PER_PAGE = 25;

type ActionType = 
  | { label: string; icon: any; action: string; disabled?: never; tooltip?: never; }
  | { label: string; icon: any; disabled: boolean; tooltip: string; action?: never; };

// Mock data for each tab - updated to match Supabase structure with variance
const mockCampaignSummary = [
  { Campaign: 'Summer Launch', Metric: 'Total Spots', Planned: 120, Delivered: 118, Variance: '-1.7%' },
  { Campaign: 'Summer Launch', Metric: 'Total Impacts', Planned: 45000000, Delivered: 44250000, Variance: '-1.7%' },
  { Campaign: 'Summer Launch', Metric: 'CPT (£)', Planned: 2.50, Delivered: 2.48, Variance: '-0.8%' },
  { Campaign: 'Summer Launch', Metric: 'Reach', Planned: 8500000, Delivered: 8325000, Variance: '-2.1%' },
  { Campaign: 'Summer Launch', Metric: 'Frequency', Planned: 5.3, Delivered: 5.3, Variance: '0.0%' },
  { Campaign: 'Summer Launch', Metric: 'Spend (£)', Planned: 112500, Delivered: 109800, Variance: '-2.4%' },
];

const mockWeeklyBreakdown = [
  { Campaign: 'Summer Launch', Week: 'Week 1 (Jan 1-7)', 'Planned Spots': 200, 'Delivered Spots': 195, 'Variance Spots': '-2.5%', 'Planned Impacts': 7500000, 'Delivered Impacts': 7350000, 'Variance Impacts': '-2.0%', 'Planned CPT': 2.45, 'Delivered CPT': 2.48, 'Variance CPT': '1.2%', Reach: 1400000, Frequency: 5.4 },
  { Campaign: 'Summer Launch', Week: 'Week 2 (Jan 8-14)', 'Planned Spots': 195, 'Delivered Spots': 190, 'Variance Spots': '-2.6%', 'Planned Impacts': 7350000, 'Delivered Impacts': 7200000, 'Variance Impacts': '-2.0%', 'Planned CPT': 2.48, 'Delivered CPT': 2.50, 'Variance CPT': '0.8%', Reach: 1380000, Frequency: 5.3 },
  { Campaign: 'Summer Launch', Week: 'Week 3 (Jan 15-21)', 'Planned Spots': 210, 'Delivered Spots': 208, 'Variance Spots': '-1.0%', 'Planned Impacts': 7800000, 'Delivered Impacts': 7750000, 'Variance Impacts': '-0.6%', 'Planned CPT': 2.42, 'Delivered CPT': 2.43, 'Variance CPT': '0.4%', Reach: 1450000, Frequency: 5.4 },
  { Campaign: 'Summer Launch', Week: 'Week 4 (Jan 22-28)', 'Planned Spots': 205, 'Delivered Spots': 202, 'Variance Spots': '-1.5%', 'Planned Impacts': 7650000, 'Delivered Impacts': 7600000, 'Variance Impacts': '-0.7%', 'Planned CPT': 2.46, 'Delivered CPT': 2.47, 'Variance CPT': '0.4%', Reach: 1420000, Frequency: 5.4 },
  { Campaign: 'Summer Launch', Week: 'Week 5 (Jan 29-Feb 4)', 'Planned Spots': 190, 'Delivered Spots': 185, 'Variance Spots': '-2.6%', 'Planned Impacts': 7200000, 'Delivered Impacts': 7050000, 'Variance Impacts': '-2.1%', 'Planned CPT': 2.50, 'Delivered CPT': 2.52, 'Variance CPT': '0.8%', Reach: 1350000, Frequency: 5.3 },
  { Campaign: 'Summer Launch', Week: 'Week 6 (Feb 5-11)', 'Planned Spots': 185, 'Delivered Spots': 180, 'Variance Spots': '-2.7%', 'Planned Impacts': 6750000, 'Delivered Impacts': 6600000, 'Variance Impacts': '-2.2%', 'Planned CPT': 2.52, 'Delivered CPT': 2.55, 'Variance CPT': '1.2%', Reach: 1280000, Frequency: 5.3 },
];

const mockChannelPerformance = [
  { Campaign: 'Summer Launch', Channel: 'ITV1', 'Planned Spots': 450, 'Delivered Spots': 445, 'Variance Spots': '-1.1%', 'Planned Impacts': 16875000, 'Delivered Impacts': 16650000, 'Variance Impacts': '-1.3%', 'Planned CPT': 2.35, 'Delivered CPT': 2.36, 'Variance CPT': '0.4%', 'Share of Impacts': 38.1 },
  { Campaign: 'Summer Launch', Channel: 'Channel 4', 'Planned Spots': 320, 'Delivered Spots': 315, 'Variance Spots': '-1.6%', 'Planned Impacts': 12000000, 'Delivered Impacts': 11850000, 'Variance Impacts': '-1.3%', 'Planned CPT': 2.60, 'Delivered CPT': 2.61, 'Variance CPT': '0.4%', 'Share of Impacts': 27.1 },
  { Campaign: 'Summer Launch', Channel: 'Sky One', 'Planned Spots': 280, 'Delivered Spots': 275, 'Variance Spots': '-1.8%', 'Planned Impacts': 8400000, 'Delivered Impacts': 8250000, 'Variance Impacts': '-1.8%', 'Planned CPT': 2.85, 'Delivered CPT': 2.87, 'Variance CPT': '0.7%', 'Share of Impacts': 19.0 },
  { Campaign: 'Summer Launch', Channel: 'BBC One', 'Planned Spots': 135, 'Delivered Spots': 133, 'Variance Spots': '-1.5%', 'Planned Impacts': 4725000, 'Delivered Impacts': 4650000, 'Variance Impacts': '-1.6%', 'Planned CPT': 2.20, 'Delivered CPT': 2.21, 'Variance CPT': '0.5%', 'Share of Impacts': 10.7 },
  { Campaign: 'Summer Launch', Channel: 'Channel 5', 'Planned Spots': 15, 'Delivered Spots': 15, 'Variance Spots': '0.0%', 'Planned Impacts': 2250000, 'Delivered Impacts': 2250000, 'Variance Impacts': '0.0%', 'Planned CPT': 3.10, 'Delivered CPT': 3.10, 'Variance CPT': '0.0%', 'Share of Impacts': 5.1 },
];

const mockDaypartPerformance = [
  { Campaign: 'Summer Launch', Daypart: 'Breakfast (06:00-09:00)', 'Planned Spots': 180, 'Delivered Spots': 178, 'Variance Spots': '-1.1%', 'Planned Impacts': 5400000, 'Delivered Impacts': 5350000, 'Variance Impacts': '-0.9%', 'Planned CPT': 2.80, 'Delivered CPT': 2.81, 'Variance CPT': '0.4%' },
  { Campaign: 'Summer Launch', Daypart: 'Daytime (09:00-17:00)', 'Planned Spots': 240, 'Delivered Spots': 235, 'Variance Spots': '-2.1%', 'Planned Impacts': 7200000, 'Delivered Impacts': 7050000, 'Variance Impacts': '-2.1%', 'Planned CPT': 2.60, 'Delivered CPT': 2.62, 'Variance CPT': '0.8%' },
  { Campaign: 'Summer Launch', Daypart: 'Peak (17:00-23:00)', 'Planned Spots': 480, 'Delivered Spots': 475, 'Variance Spots': '-1.0%', 'Planned Impacts': 19200000, 'Delivered Impacts': 19000000, 'Variance Impacts': '-1.0%', 'Planned CPT': 2.30, 'Delivered CPT': 2.31, 'Variance CPT': '0.4%' },
  { Campaign: 'Summer Launch', Daypart: 'Late Night (23:00-06:00)', 'Planned Spots': 285, 'Delivered Spots': 280, 'Variance Spots': '-1.8%', 'Planned Impacts': 8550000, 'Delivered Impacts': 8400000, 'Variance Impacts': '-1.8%', 'Planned CPT': 2.90, 'Delivered CPT': 2.92, 'Variance CPT': '0.7%' },
];

const mockDemographicBreakdown = [
  { Campaign: 'Summer Launch', AudienceGroup: 'Adults 16-34', 'Planned Impacts': 13275000, 'Delivered Impacts': 13050000, 'Variance Impacts': '-1.7%', 'Share of Total': 30.0 },
  { Campaign: 'Summer Launch', AudienceGroup: 'Adults 35-54', 'Planned Impacts': 17700000, 'Delivered Impacts': 17400000, 'Variance Impacts': '-1.7%', 'Share of Total': 40.0 },
  { Campaign: 'Summer Launch', AudienceGroup: 'Adults 55+', 'Planned Impacts': 13275000, 'Delivered Impacts': 13050000, 'Variance Impacts': '-1.7%', 'Share of Total': 30.0 },
  { Campaign: 'Summer Launch', AudienceGroup: 'Men 16-34', 'Planned Impacts': 6640000, 'Delivered Impacts': 6525000, 'Variance Impacts': '-1.7%', 'Share of Total': 15.0 },
  { Campaign: 'Summer Launch', AudienceGroup: 'Women 16-34', 'Planned Impacts': 6640000, 'Delivered Impacts': 6525000, 'Variance Impacts': '-1.7%', 'Share of Total': 15.0 },
  { Campaign: 'Summer Launch', AudienceGroup: 'Men 35-54', 'Planned Impacts': 8850000, 'Delivered Impacts': 8700000, 'Variance Impacts': '-1.7%', 'Share of Total': 20.0 },
  { Campaign: 'Summer Launch', AudienceGroup: 'Women 35-54', 'Planned Impacts': 8850000, 'Delivered Impacts': 8700000, 'Variance Impacts': '-1.7%', 'Share of Total': 20.0 },
];

const mockSpotList = [
  { Campaign: 'Summer Launch', Date: '2025-01-15', Time: '19:30', Channel: 'ITV1', Programme: 'Coronation Street', SpotLength: 30, 'Planned Impacts': 450000, 'Delivered Impacts': 445000, 'Variance Impacts': '-1.1%', 'Planned CPT': 2.35, 'Delivered CPT': 2.36, 'Variance CPT': '0.4%' },
  { Campaign: 'Summer Launch', Date: '2025-01-15', Time: '20:00', Channel: 'Channel 4', Programme: 'Gogglebox', SpotLength: 30, 'Planned Impacts': 380000, 'Delivered Impacts': 375000, 'Variance Impacts': '-1.3%', 'Planned CPT': 2.60, 'Delivered CPT': 2.61, 'Variance CPT': '0.4%' },
  { Campaign: 'Summer Launch', Date: '2025-01-15', Time: '21:00', Channel: 'ITV1', Programme: 'Emmerdale', SpotLength: 30, 'Planned Impacts': 420000, 'Delivered Impacts': 415000, 'Variance Impacts': '-1.2%', 'Planned CPT': 2.35, 'Delivered CPT': 2.36, 'Variance CPT': '0.4%' },
  { Campaign: 'Summer Launch', Date: '2025-01-16', Time: '19:30', Channel: 'ITV1', Programme: 'Coronation Street', SpotLength: 30, 'Planned Impacts': 460000, 'Delivered Impacts': 455000, 'Variance Impacts': '-1.1%', 'Planned CPT': 2.35, 'Delivered CPT': 2.36, 'Variance CPT': '0.4%' },
  { Campaign: 'Summer Launch', Date: '2025-01-16', Time: '20:00', Channel: 'Channel 4', Programme: 'Gogglebox', SpotLength: 30, 'Planned Impacts': 390000, 'Delivered Impacts': 385000, 'Variance Impacts': '-1.3%', 'Planned CPT': 2.60, 'Delivered CPT': 2.61, 'Variance CPT': '0.4%' },
  { Campaign: 'Summer Launch', Date: '2025-01-16', Time: '21:00', Channel: 'ITV1', Programme: 'Emmerdale', SpotLength: 30, 'Planned Impacts': 430000, 'Delivered Impacts': 425000, 'Variance Impacts': '-1.2%', 'Planned CPT': 2.35, 'Delivered CPT': 2.36, 'Variance CPT': '0.4%' },
  { Campaign: 'Summer Launch', Date: '2025-01-17', Time: '19:30', Channel: 'ITV1', Programme: 'Coronation Street', SpotLength: 30, 'Planned Impacts': 470000, 'Delivered Impacts': 465000, 'Variance Impacts': '-1.1%', 'Planned CPT': 2.35, 'Delivered CPT': 2.36, 'Variance CPT': '0.4%' },
  { Campaign: 'Summer Launch', Date: '2025-01-17', Time: '20:00', Channel: 'Channel 4', Programme: 'Gogglebox', SpotLength: 30, 'Planned Impacts': 400000, 'Delivered Impacts': 395000, 'Variance Impacts': '-1.3%', 'Planned CPT': 2.60, 'Delivered CPT': 2.61, 'Variance CPT': '0.4%' },
  { Campaign: 'Summer Launch', Date: '2025-01-17', Time: '21:00', Channel: 'ITV1', Programme: 'Emmerdale', SpotLength: 30, 'Planned Impacts': 440000, 'Delivered Impacts': 435000, 'Variance Impacts': '-1.1%', 'Planned CPT': 2.35, 'Delivered CPT': 2.36, 'Variance CPT': '0.4%' },
  { Campaign: 'Summer Launch', Date: '2025-01-18', Time: '19:30', Channel: 'ITV1', Programme: 'Coronation Street', SpotLength: 30, 'Planned Impacts': 480000, 'Delivered Impacts': 475000, 'Variance Impacts': '-1.0%', 'Planned CPT': 2.35, 'Delivered CPT': 2.36, 'Variance CPT': '0.4%' },
  { Campaign: 'Summer Launch', Date: '2025-01-18', Time: '20:00', Channel: 'Channel 4', Programme: 'Gogglebox', SpotLength: 30, 'Planned Impacts': 410000, 'Delivered Impacts': 405000, 'Variance Impacts': '-1.2%', 'Planned CPT': 2.60, 'Delivered CPT': 2.61, 'Variance CPT': '0.4%' },
  { Campaign: 'Summer Launch', Date: '2025-01-18', Time: '21:00', Channel: 'ITV1', Programme: 'Emmerdale', SpotLength: 30, 'Planned Impacts': 450000, 'Delivered Impacts': 445000, 'Variance Impacts': '-1.1%', 'Planned CPT': 2.35, 'Delivered CPT': 2.36, 'Variance CPT': '0.4%' },
];

const TVDeliveryMonitor: React.FC = () => {
  const setBanner = useSetBanner();
  const [activeTab, setActiveTab] = useState('channel');
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedCampaign, setSelectedCampaign] = useState('all');
  const [selectedDateRange, setSelectedDateRange] = useState('last-week');
  const [allData, setAllData] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<string[]>([]);
  const [openDropdown, setOpenDropdown] = useState<number | null>(null);
  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);
  const [showAlert, setShowAlert] = useState<boolean>(false);
  const [alertMessage, setAlertMessage] = useState<string>('');
  const [alertType, setAlertType] = useState<'warning' | 'error' | 'success'>('warning');

  // Move getCurrentData definition before getCampaignStatus
  const getCurrentData = () => {
    // Filter data based on selected campaign
    let filteredData = allData;
    if (selectedCampaign !== 'all') {
      filteredData = allData.filter(item => item.Campaign === selectedCampaign);
    }

    switch (activeTab) {
      case 'summary':
        // Filter for summary metrics (where Metric is not null)
        return filteredData.filter(item => item.Metric && !item.Channel && !item.Week);
      case 'weekly':
        // Filter for weekly data (where Week is not null)
        return filteredData.filter(item => item.Week);
      case 'channel':
        // Filter for channel data (where Channel is not null)
        return filteredData.filter(item => item.Channel);
      case 'daypart':
        // For now, return mock data since daypart isn't in the table structure
        return mockDaypartPerformance;
      case 'demographic':
        // Filter for demographic data (where AudienceGroup would be, but using Metric for now)
        return filteredData.filter(item => item.Metric && item.Metric.includes('Adults') || item.Metric.includes('Men') || item.Metric.includes('Women'));
      case 'spots':
        // For now, return mock data since spot-level data isn't in the table structure
        return mockSpotList;
      default:
        return [];
    }
  };

  // Calculate campaign status
  const getCampaignStatus = () => {
    const summaryData = getCurrentData().filter(item => item.Metric && !item.Channel && !item.Week);
    if (summaryData.length === 0) return { status: 'unknown', message: 'No data available' };
    
    const spotsVariance = summaryData.find(item => item.Metric === 'Total Spots')?.Variance;
    const impactsVariance = summaryData.find(item => item.Metric === 'Total Impacts')?.Variance;
    
    if (!spotsVariance || !impactsVariance) return { status: 'unknown', message: 'Incomplete data' };
    
    const spotsValue = parseFloat(spotsVariance.replace('%', ''));
    const impactsValue = parseFloat(impactsVariance.replace('%', ''));
    
    if (spotsValue >= -2 && impactsValue >= -2) {
      return { status: 'on-track', message: 'Campaign is on track' };
    } else if (spotsValue < -5 || impactsValue < -5) {
      return { status: 'behind', message: 'Campaign is significantly behind plan' };
    } else {
      return { status: 'behind', message: 'Campaign is behind plan' };
    }
  };

  // Memoize campaign status to prevent unnecessary re-renders
  const campaignStatus = React.useMemo(() => getCampaignStatus(), [allData, selectedCampaign, activeTab]);

  // Export report function
  const handleExportReport = () => {
    const data = getCurrentData();
    const csvContent = [
      ['Campaign', 'Metric', 'Planned', 'Delivered', 'Variance'],
      ...data.map(row => [
        row.Campaign || '',
        row.Metric || row.Channel || row.Week || '',
        row.Planned || row['Planned Spots'] || row['Planned Impacts'] || '',
        row.Delivered || row['Delivered Spots'] || row['Delivered Impacts'] || '',
        row.Variance || row['Variance Spots'] || row['Variance Impacts'] || ''
      ])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tv-delivery-report-${selectedCampaign}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Set banner content
  useEffect(() => {
    setBanner(
      <div className="w-full">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900">TV Delivery Monitor</h1>
              <p className="text-sm text-gray-600 mt-1">Verify and analyse BARB spot-level data against planned campaign delivery</p>
            </div>
            {campaignStatus.status !== 'unknown' && (
              <div className={`px-3 py-1.5 rounded-full text-xs font-medium ${
                campaignStatus.status === 'on-track' ? 'bg-green-100 text-green-800' :
                campaignStatus.status === 'behind' ? 'bg-red-100 text-red-800' :
                'bg-yellow-100 text-yellow-800'
              }`}>
                {campaignStatus.status === 'on-track' ? '✓ On Track' :
                 campaignStatus.status === 'behind' ? '⚠ Behind' : '? Unknown'}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowUploadModal(true)}
              className="px-3 py-1.5 text-xs bg-[#02b3e5] text-white rounded hover:bg-[#02b3e5]/80 transition-colors flex items-center gap-1"
            >
              <Download className="w-3 h-3" />
              Upload Plan
            </button>
            <button
              onClick={handleExportReport}
              className="px-3 py-1.5 text-xs border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors flex items-center gap-1"
            >
              <Download className="w-3 h-3" />
              Export Report
            </button>
          </div>
        </div>
      </div>
    );
    return () => setBanner(null);
  }, [setBanner, campaignStatus, selectedCampaign]);



  // Fetch data from Supabase
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('TVmonitorMock')
          .select('*');

        if (error) {
          console.error('Error fetching TV monitor data:', error);
          return;
        }

        if (data) {
          setAllData(data);
          // Extract unique campaigns
          const uniqueCampaigns = [...new Set(data.map(item => item.Campaign).filter(Boolean))];
          setCampaigns(uniqueCampaigns);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Check for alerts when data changes - memoized to prevent infinite loops
  useEffect(() => {
    if (allData.length > 0) {
      // Only check alerts if we haven't already shown one for this data
      const summaryData = allData.filter(item => 
        item.Campaign === (selectedCampaign === 'all' ? item.Campaign : selectedCampaign) &&
        item.Metric && !item.Channel && !item.Week
      );
      
      const alerts: string[] = [];
      summaryData.forEach(item => {
        if (item.Variance) {
          const variance = parseFloat(item.Variance.replace('%', ''));
          if (variance < -5) {
            alerts.push(`${item.Metric} is ${Math.abs(variance).toFixed(1)}% behind plan`);
          }
        }
      });
      
      if (alerts.length > 0 && !showAlert) {
        setAlertMessage(`⚠️ Under-delivery detected: ${alerts.join(', ')}`);
        setAlertType('warning');
        setShowAlert(true);
      }
    }
  }, [allData, selectedCampaign, showAlert]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const SortableHeader: React.FC<{ field: string; children: React.ReactNode }> = ({ field, children }) => (
    <th 
      className="px-4 py-3 text-left font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {children}
        {sortField === field && (
          sortDirection === 'asc' ? 
            <TrendingUp className="w-4 h-4" /> : 
            <TrendingDown className="w-4 h-4" />
        )}
      </div>
    </th>
  );

  const getTableHeaders = () => {
    switch (activeTab) {
      case 'summary':
        return (
          <>
            <th className="px-2 py-1.5 text-left font-semibold text-gray-700 text-xs border border-gray-200">Metric</th>
            <th className="px-2 py-1.5 text-right font-semibold text-gray-700 text-xs border border-gray-200">Planned</th>
            <th className="px-2 py-1.5 text-right font-semibold text-gray-700 text-xs border border-gray-200">Delivered</th>
            <th className="px-2 py-1.5 text-right font-semibold text-gray-700 text-xs border border-gray-200">Variance</th>
            <th className="px-2 py-1.5 text-center font-semibold text-gray-700 text-xs w-20 border border-gray-200">Actions</th>
          </>
        );
      case 'weekly':
        return (
          <>
            <th className="px-2 py-1.5 text-left font-semibold text-gray-700 text-xs border border-gray-200">Week</th>
            <th className="px-2 py-1.5 text-right font-semibold text-gray-700 text-xs border border-gray-200">P. Spots</th>
            <th className="px-2 py-1.5 text-right font-semibold text-gray-700 text-xs border border-gray-200">D. Spots</th>
            <th className="px-2 py-1.5 text-right font-semibold text-gray-700 text-xs border border-gray-200">Var.</th>
            <th className="px-2 py-1.5 text-right font-semibold text-gray-700 text-xs border border-gray-200">P. Impacts</th>
            <th className="px-2 py-1.5 text-right font-semibold text-gray-700 text-xs border border-gray-200">D. Impacts</th>
            <th className="px-2 py-1.5 text-right font-semibold text-gray-700 text-xs border border-gray-200">Var.</th>
            <th className="px-2 py-1.5 text-right font-semibold text-gray-700 text-xs border border-gray-200">P. CPT</th>
            <th className="px-2 py-1.5 text-right font-semibold text-gray-700 text-xs border border-gray-200">D. CPT</th>
            <th className="px-2 py-1.5 text-right font-semibold text-gray-700 text-xs border border-gray-200">Var.</th>
            <th className="px-2 py-1.5 text-center font-semibold text-gray-700 text-xs w-20 border border-gray-200">Actions</th>
          </>
        );
      case 'channel':
        return (
          <>
            <th className="px-2 py-1.5 text-left font-semibold text-gray-700 text-xs border border-gray-200">Channel</th>
            <th className="px-2 py-1.5 text-right font-semibold text-gray-700 text-xs border border-gray-200">P. Spots</th>
            <th className="px-2 py-1.5 text-right font-semibold text-gray-700 text-xs border border-gray-200">D. Spots</th>
            <th className="px-2 py-1.5 text-right font-semibold text-gray-700 text-xs border border-gray-200">Var.</th>
            <th className="px-2 py-1.5 text-right font-semibold text-gray-700 text-xs border border-gray-200">P. Impacts</th>
            <th className="px-2 py-1.5 text-right font-semibold text-gray-700 text-xs border border-gray-200">D. Impacts</th>
            <th className="px-2 py-1.5 text-right font-semibold text-gray-700 text-xs border border-gray-200">Var.</th>
            <th className="px-2 py-1.5 text-right font-semibold text-gray-700 text-xs border border-gray-200">P. CPT</th>
            <th className="px-2 py-1.5 text-right font-semibold text-gray-700 text-xs border border-gray-200">D. CPT</th>
            <th className="px-2 py-1.5 text-right font-semibold text-gray-700 text-xs border border-gray-200">Var.</th>
            <th className="px-2 py-1.5 text-right font-semibold text-gray-700 text-xs border border-gray-200">% Total</th>
            <th className="px-2 py-1.5 text-center font-semibold text-gray-700 text-xs w-20 border border-gray-200">Actions</th>
          </>
        );
      case 'daypart':
        return (
          <>
            <th className="px-2 py-1.5 text-left font-semibold text-gray-700 text-xs border border-gray-200">Daypart</th>
            <th className="px-2 py-1.5 text-right font-semibold text-gray-700 text-xs border border-gray-200">P. Spots</th>
            <th className="px-2 py-1.5 text-right font-semibold text-gray-700 text-xs border border-gray-200">D. Spots</th>
            <th className="px-2 py-1.5 text-right font-semibold text-gray-700 text-xs border border-gray-200">Var.</th>
            <th className="px-2 py-1.5 text-right font-semibold text-gray-700 text-xs border border-gray-200">P. Impacts</th>
            <th className="px-2 py-1.5 text-right font-semibold text-gray-700 text-xs border border-gray-200">D. Impacts</th>
            <th className="px-2 py-1.5 text-right font-semibold text-gray-700 text-xs border border-gray-200">Var.</th>
            <th className="px-2 py-1.5 text-right font-semibold text-gray-700 text-xs border border-gray-200">P. CPT</th>
            <th className="px-2 py-1.5 text-right font-semibold text-gray-700 text-xs border border-gray-200">D. CPT</th>
            <th className="px-2 py-1.5 text-right font-semibold text-gray-700 text-xs border border-gray-200">Var.</th>
            <th className="px-2 py-1.5 text-center font-semibold text-gray-700 text-xs w-20 border border-gray-200">Actions</th>
          </>
        );
      case 'demographic':
        return (
          <>
            <th className="px-2 py-1.5 text-left font-semibold text-gray-700 text-xs border border-gray-200">Audience Group</th>
            <th className="px-2 py-1.5 text-right font-semibold text-gray-700 text-xs border border-gray-200">P. Impacts</th>
            <th className="px-2 py-1.5 text-right font-semibold text-gray-700 text-xs border border-gray-200">D. Impacts</th>
            <th className="px-2 py-1.5 text-right font-semibold text-gray-700 text-xs border border-gray-200">Variance</th>
            <th className="px-2 py-1.5 text-right font-semibold text-gray-700 text-xs border border-gray-200">% Total</th>
            <th className="px-2 py-1.5 text-center font-semibold text-gray-700 text-xs w-20 border border-gray-200">Actions</th>
          </>
        );
      case 'spots':
        return (
          <>
            <th className="px-2 py-1.5 text-left font-semibold text-gray-700 text-xs border border-gray-200">Date</th>
            <th className="px-2 py-1.5 text-left font-semibold text-gray-700 text-xs border border-gray-200">Time</th>
            <th className="px-2 py-1.5 text-left font-semibold text-gray-700 text-xs border border-gray-200">Channel</th>
            <th className="px-2 py-1.5 text-left font-semibold text-gray-700 text-xs border border-gray-200">Programme</th>
            <th className="px-2 py-1.5 text-right font-semibold text-gray-700 text-xs border border-gray-200">Length</th>
            <th className="px-2 py-1.5 text-right font-semibold text-gray-700 text-xs border border-gray-200">P. Impacts</th>
            <th className="px-2 py-1.5 text-right font-semibold text-gray-700 text-xs border border-gray-200">D. Impacts</th>
            <th className="px-2 py-1.5 text-right font-semibold text-gray-700 text-xs border border-gray-200">Variance</th>
            <th className="px-2 py-1.5 text-right font-semibold text-gray-700 text-xs border border-gray-200">P. CPT</th>
            <th className="px-2 py-1.5 text-right font-semibold text-gray-700 text-xs border border-gray-200">D. CPT</th>
            <th className="px-2 py-1.5 text-right font-semibold text-gray-700 text-xs border border-gray-200">Variance</th>
            <th className="px-2 py-1.5 text-center font-semibold text-gray-700 text-xs w-20 border border-gray-200">Actions</th>
          </>
        );
      default:
        return null;
    }
  };

  const renderTableRow = (row: any, index: number) => {
    const getVarianceBackground = (variance: string) => {
      if (!variance) return 'bg-gray-50';
      const value = parseFloat(variance.replace('%', ''));
      return value >= 0 ? 'bg-green-50' : 'bg-red-50';
    };

    const getVarianceIcon = (variance: string) => {
      if (!variance) return null;
      const value = parseFloat(variance.replace('%', ''));
      return value >= 0 ? <TrendingUp className="w-4 h-4 text-green-600" /> : <TrendingDown className="w-4 h-4 text-red-600" />;
    };

    const renderVariance = (variance: string) => (
      <div className={`flex items-center justify-end gap-1 h-full w-full px-2 ${getVarianceBackground(variance)}`}>
        {getVarianceIcon(variance)}
        <span className="text-gray-700 font-medium text-xs">{variance || '-'}</span>
      </div>
    );

    const formatNumber = (value: string | number) => {
      if (!value) return '-';
      const num = typeof value === 'string' ? parseFloat(value) : value;
      if (isNaN(num)) return value;
      return num.toLocaleString();
    };

    const formatCurrency = (value: string | number) => {
      if (!value) return '-';
      const num = typeof value === 'string' ? parseFloat(value) : value;
      if (isNaN(num)) return value;
      return `£${num.toFixed(2)}`;
    };

    switch (activeTab) {
      case 'summary':
        return (
          <tr key={index} className="hover:bg-gray-50 border-b border-gray-200">
            <td className="px-2 py-1.5 font-medium text-gray-900 text-xs border border-gray-200">{row.Metric || '-'}</td>
            <td className="px-2 py-1.5 text-right text-xs border border-gray-200">{formatNumber(row.Planned)}</td>
            <td className="px-2 py-1.5 text-right text-xs border border-gray-200">{formatNumber(row.Delivered)}</td>
            <td className="text-right text-xs border border-gray-200 p-0 h-8">
              {renderVariance(row.Variance)}
            </td>
            <td className="px-2 py-1.5 text-center border border-gray-200">
              <ActionsDropdown row={row} rowIndex={startIndex + index} />
            </td>
          </tr>
        );
      case 'weekly':
        return (
          <tr key={index} className="hover:bg-gray-50 border-b border-gray-200">
            <td className="px-2 py-1.5 font-medium text-gray-900 text-xs border border-gray-200">{row.Week || '-'}</td>
            <td className="px-2 py-1.5 text-right text-xs border border-gray-200">{formatNumber(row['Planned Spots'])}</td>
            <td className="px-2 py-1.5 text-right text-xs border border-gray-200">{formatNumber(row['Delivered Spots'])}</td>
            <td className="text-right text-xs border border-gray-200 p-0 h-8">
              {renderVariance(row['Variance Spots'])}
            </td>
            <td className="px-2 py-1.5 text-right text-xs border border-gray-200">{formatNumber(row['Planned Impacts'])}</td>
            <td className="px-2 py-1.5 text-right text-xs border border-gray-200">{formatNumber(row['Delivered Impacts'])}</td>
            <td className="text-right text-xs border border-gray-200 p-0 h-8">
              {renderVariance(row['Variance Impacts'])}
            </td>
            <td className="px-2 py-1.5 text-right text-xs border border-gray-200">{formatCurrency(row['Planned CPT'])}</td>
            <td className="px-2 py-1.5 text-right text-xs border border-gray-200">{formatCurrency(row['Delivered CPT'])}</td>
            <td className="text-right text-xs border border-gray-200 p-0 h-8">
              {renderVariance(row['Variance CPT'])}
            </td>
            <td className="px-2 py-1.5 text-center border border-gray-200">
              <ActionsDropdown row={row} rowIndex={startIndex + index} />
            </td>
          </tr>
        );
      case 'channel':
        return (
          <tr key={index} className="hover:bg-gray-50 border-b border-gray-200">
            <td className="px-2 py-1.5 font-medium text-gray-900 text-xs border border-gray-200">{row.Channel || '-'}</td>
            <td className="px-2 py-1.5 text-right text-xs border border-gray-200">{formatNumber(row['Planned Spots'])}</td>
            <td className="px-2 py-1.5 text-right text-xs border border-gray-200">{formatNumber(row['Delivered Spots'])}</td>
            <td className="text-right text-xs border border-gray-200 p-0 h-8">
              {renderVariance(row['Variance Spots'])}
            </td>
            <td className="px-2 py-1.5 text-right text-xs border border-gray-200">{formatNumber(row['Planned Impacts'])}</td>
            <td className="px-2 py-1.5 text-right text-xs border border-gray-200">{formatNumber(row['Delivered Impacts'])}</td>
            <td className="text-right text-xs border border-gray-200 p-0 h-8">
              {renderVariance(row['Variance Impacts'])}
            </td>
            <td className="px-2 py-1.5 text-right text-xs border border-gray-200">{formatCurrency(row['Planned CPT'])}</td>
            <td className="px-2 py-1.5 text-right text-xs border border-gray-200">{formatCurrency(row['Delivered CPT'])}</td>
            <td className="text-right text-xs border border-gray-200 p-0 h-8">
              {renderVariance(row['Variance CPT'])}
            </td>
            <td className="px-2 py-1.5 text-right text-xs border border-gray-200">{row['Share of Impacts'] ? `${parseFloat(row['Share of Impacts']).toFixed(1)}%` : '-'}</td>
            <td className="px-2 py-1.5 text-center border border-gray-200">
              <ActionsDropdown row={row} rowIndex={startIndex + index} />
            </td>
          </tr>
        );
      case 'daypart':
        return (
          <tr key={index} className="hover:bg-gray-50 border-b border-gray-200">
            <td className="px-2 py-1.5 font-medium text-gray-900 text-xs border border-gray-200">{row.Daypart}</td>
            <td className="px-2 py-1.5 text-right text-xs border border-gray-200">{formatNumber(row['Planned Spots'])}</td>
            <td className="px-2 py-1.5 text-right text-xs border border-gray-200">{formatNumber(row['Delivered Spots'])}</td>
            <td className="text-right text-xs border border-gray-200 p-0 h-8">
              {renderVariance(row['Variance Spots'])}
            </td>
            <td className="px-2 py-1.5 text-right text-xs border border-gray-200">{formatNumber(row['Planned Impacts'])}</td>
            <td className="px-2 py-1.5 text-right text-xs border border-gray-200">{formatNumber(row['Delivered Impacts'])}</td>
            <td className="text-right text-xs border border-gray-200 p-0 h-8">
              {renderVariance(row['Variance Impacts'])}
            </td>
            <td className="px-2 py-1.5 text-right text-xs border border-gray-200">{formatCurrency(row['Planned CPT'])}</td>
            <td className="px-2 py-1.5 text-right text-xs border border-gray-200">{formatCurrency(row['Delivered CPT'])}</td>
            <td className="text-right text-xs border border-gray-200 p-0 h-8">
              {renderVariance(row['Variance CPT'])}
            </td>
            <td className="px-2 py-1.5 text-center border border-gray-200">
              <ActionsDropdown row={row} rowIndex={startIndex + index} />
            </td>
          </tr>
        );
      case 'demographic':
        return (
          <tr key={index} className="hover:bg-gray-50 border-b border-gray-200">
            <td className="px-2 py-1.5 font-medium text-gray-900 text-xs border border-gray-200">{row.Metric || '-'}</td>
            <td className="px-2 py-1.5 text-right text-xs border border-gray-200">{formatNumber(row['Planned Impacts'])}</td>
            <td className="px-2 py-1.5 text-right text-xs border border-gray-200">{formatNumber(row['Delivered Impacts'])}</td>
            <td className="text-right text-xs border border-gray-200 p-0 h-8">
              {renderVariance(row['Variance Impacts'])}
            </td>
            <td className="px-2 py-1.5 text-right text-xs border border-gray-200">{row['Share of Impacts'] ? `${parseFloat(row['Share of Impacts']).toFixed(1)}%` : '-'}</td>
            <td className="px-2 py-1.5 text-center border border-gray-200">
              <ActionsDropdown row={row} rowIndex={startIndex + index} />
            </td>
          </tr>
        );
      case 'spots':
        return (
          <tr key={index} className="hover:bg-gray-50 border-b border-gray-200">
            <td className="px-2 py-1.5 text-gray-900 text-xs border border-gray-200">{row.Date}</td>
            <td className="px-2 py-1.5 text-gray-900 text-xs border border-gray-200">{row.Time}</td>
            <td className="px-2 py-1.5 font-medium text-gray-900 text-xs border border-gray-200">{row.Channel}</td>
            <td className="px-2 py-1.5 text-gray-900 text-xs border border-gray-200">{row.Programme}</td>
            <td className="px-2 py-1.5 text-right text-xs border border-gray-200">{row.SpotLength}s</td>
            <td className="px-2 py-1.5 text-right text-xs border border-gray-200">{formatNumber(row['Planned Impacts'])}</td>
            <td className="px-2 py-1.5 text-right text-xs border border-gray-200">{formatNumber(row['Delivered Impacts'])}</td>
            <td className="text-right text-xs border border-gray-200 p-0 h-8">
              {renderVariance(row['Variance Impacts'])}
            </td>
            <td className="px-2 py-1.5 text-right text-xs border border-gray-200">{formatCurrency(row['Planned CPT'])}</td>
            <td className="px-2 py-1.5 text-right text-xs border border-gray-200">{formatCurrency(row['Delivered CPT'])}</td>
            <td className="text-right text-xs border border-gray-200 p-0 h-8">
              {renderVariance(row['Variance CPT'])}
            </td>
            <td className="px-2 py-1.5 text-center border border-gray-200">
              <ActionsDropdown row={row} rowIndex={startIndex + index} />
            </td>
          </tr>
        );
      default:
        return null;
    }
  };

  const currentData = getCurrentData();
  const totalPages = Math.ceil(currentData.length / ROWS_PER_PAGE);
  const startIndex = (currentPage - 1) * ROWS_PER_PAGE;
  const endIndex = startIndex + ROWS_PER_PAGE;
  const paginatedData = currentData.slice(startIndex, endIndex);

  // Reset to first page when data changes
  useEffect(() => {
    setCurrentPage(1);
  }, [currentData.length]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openDropdown !== null) {
        setOpenDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openDropdown]);

  // Analyze row performance and determine available actions
  const getRowActions = (row: any): ActionType[] => {
    const actions: ActionType[] = [];
    
    // Check if we have planned data
    const hasPlannedData = row.Planned || row['Planned Spots'] || row['Planned Impacts'];
    if (!hasPlannedData) {
      return [{ 
        label: 'No planned data available', 
        icon: AlertTriangle, 
        disabled: true,
        tooltip: 'No planned data available'
      }];
    }

    // Check for delivery shortfalls
    const hasDeliveryShortfall = 
      (row.Delivered && row.Planned && parseFloat(row.Delivered) < parseFloat(row.Planned)) ||
      (row['Delivered Spots'] && row['Planned Spots'] && parseFloat(row['Delivered Spots']) < parseFloat(row['Planned Spots'])) ||
      (row['Delivered Impacts'] && row['Planned Impacts'] && parseFloat(row['Delivered Impacts']) < parseFloat(row['Planned Impacts']));

    // Check for CPT inefficiency
    const hasCPTInefficiency = 
      row['Delivered CPT'] && row['Planned CPT'] && 
      parseFloat(row['Delivered CPT']) > parseFloat(row['Planned CPT']);

    // Check for over-delivery
    const hasOverDelivery = 
      (row.Delivered && row.Planned && parseFloat(row.Delivered) > parseFloat(row.Planned) * 1.05) ||
      (row['Delivered Spots'] && row['Planned Spots'] && parseFloat(row['Delivered Spots']) > parseFloat(row['Planned Spots']) * 1.05) ||
      (row['Delivered Impacts'] && row['Planned Impacts'] && parseFloat(row['Delivered Impacts']) > parseFloat(row['Planned Impacts']) * 1.05);

    if (hasDeliveryShortfall) {
      actions.push(
        { label: 'Request Makegood', icon: RefreshCw, action: 'makegood' },
        { label: 'Reallocate Budget/Spots', icon: Target, action: 'reallocate' },
        { label: 'Reforecast Campaign Delivery', icon: Calculator, action: 'reforecast' },
        { label: 'Flag to Sales House', icon: Flag, action: 'flag_sales' }
      );
    }

    if (hasCPTInefficiency) {
      actions.push(
        { label: 'Optimise for Efficiency', icon: TrendingDownIcon, action: 'optimise' },
        { label: 'Flag to Trading Team', icon: Flag, action: 'flag_trading' }
      );
    }

    if (hasOverDelivery) {
      actions.push(
        { label: 'Review Over-delivery', icon: AlertTriangle, action: 'review_over' }
      );
    }

    // If everything is on track or no issues detected
    if (!hasDeliveryShortfall && !hasCPTInefficiency && !hasOverDelivery) {
      actions.push(
        { label: 'Mark as Approved', icon: CheckCircle, action: 'approve' },
        { label: 'Add Comment', icon: MessageSquare, action: 'comment' },
        { label: 'Export Row Data', icon: Download, action: 'export' }
      );
    }

    // Always available actions
    actions.push(
      { label: 'Export Row Data', icon: Download, action: 'export' }
    );

    // PCA-ready summary action for summary tab
    if (row.Metric && !row.Channel && !row.Week) {
      actions.push(
        { label: 'Generate PCA Summary', icon: Download, action: 'pca_summary' }
      );
    }

    return actions;
  };

  const handleActionClick = (action: string, row: any) => {
    console.log(`Action ${action} clicked for row:`, row);
    setOpenDropdown(null);
    
    switch (action) {
      case 'makegood':
        setAlertMessage(`Makegood request initiated for ${row.Metric || row.Channel || row.Week}`);
        setAlertType('success');
        setShowAlert(true);
        break;
      case 'reallocate':
        setAlertMessage(`Budget reallocation panel opened for ${row.Metric || row.Channel || row.Week}`);
        setAlertType('success');
        setShowAlert(true);
        break;
      case 'reforecast':
        setAlertMessage(`Reforecasting delivery for ${row.Metric || row.Channel || row.Week}`);
        setAlertType('success');
        setShowAlert(true);
        break;
      case 'flag_sales':
        setAlertMessage(`Flagged to sales house for ${row.Metric || row.Channel || row.Week}`);
        setAlertType('warning');
        setShowAlert(true);
        break;
      case 'flag_trading':
        setAlertMessage(`Flagged to trading team for ${row.Metric || row.Channel || row.Week}`);
        setAlertType('warning');
        setShowAlert(true);
        break;
      case 'optimise':
        setAlertMessage(`Optimization suggestions generated for ${row.Metric || row.Channel || row.Week}`);
        setAlertType('success');
        setShowAlert(true);
        break;
      case 'review_over':
        setAlertMessage(`Over-delivery review initiated for ${row.Metric || row.Channel || row.Week}`);
        setAlertType('warning');
        setShowAlert(true);
        break;
      case 'approve':
        setAlertMessage(`Marked as approved for ${row.Metric || row.Channel || row.Week}`);
        setAlertType('success');
        setShowAlert(true);
        break;
      case 'comment':
        setAlertMessage(`Comment modal opened for ${row.Metric || row.Channel || row.Week}`);
        setAlertType('success');
        setShowAlert(true);
        break;
      case 'export':
        // Export single row data
        const csvContent = [
          ['Campaign', 'Metric', 'Planned', 'Delivered', 'Variance'],
          [
            row.Campaign || '',
            row.Metric || row.Channel || row.Week || '',
            row.Planned || row['Planned Spots'] || row['Planned Impacts'] || '',
            row.Delivered || row['Delivered Spots'] || row['Delivered Impacts'] || '',
            row.Variance || row['Variance Spots'] || row['Variance Impacts'] || ''
          ]
        ].map(row => row.join(',')).join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `tv-delivery-row-${row.Metric || row.Channel || row.Week}-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
        break;
      case 'pca_summary':
        setAlertMessage(`PCA summary generated for ${row.Metric}`);
        setAlertType('success');
        setShowAlert(true);
        break;
    }
  };

  // Actions dropdown component
  const ActionsDropdown: React.FC<{ row: any; rowIndex: number }> = ({ row, rowIndex }) => {
    const actions = getRowActions(row);
    const isOpen = openDropdown === rowIndex;

    return (
      <div className="relative">
        <button
          className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            setOpenDropdown(isOpen ? null : rowIndex);
          }}
          title="Next steps based on performance"
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>
        
        {isOpen && (
          <div className="absolute right-0 top-6 z-50 w-56 bg-white border border-gray-200 rounded-md shadow-lg py-1">
            {actions.map((action, actionIndex) => {
              const IconComponent = action.icon;
              return (
                <button
                  key={actionIndex}
                  className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-gray-50 transition-colors ${
                    'disabled' in action && action.disabled ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700'
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!('disabled' in action) || !action.disabled) {
                      if ('action' in action && action.action) {
                        handleActionClick(action.action, row);
                      }
                    }
                  }}
                  disabled={'disabled' in action ? action.disabled : false}
                  title={'tooltip' in action ? action.tooltip : ''}
                >
                  <IconComponent className="w-4 h-4" />
                  {action.label}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full">
      {/* Campaign and Date Selection */}
      <div className="bg-white border border-gray-200 rounded-sm shadow-sm p-3 mb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Campaign</label>
              <select 
                className="border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#02b3e5] min-w-[180px]"
                value={selectedCampaign}
                onChange={(e) => setSelectedCampaign(e.target.value)}
              >
                <option value="all">All Campaigns</option>
                {campaigns.map(campaign => (
                  <option key={campaign} value={campaign}>{campaign}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Date Range</label>
              <select 
                className="border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#02b3e5]"
                value={selectedDateRange}
                onChange={(e) => setSelectedDateRange(e.target.value)}
              >
                <option value="yesterday">Yesterday</option>
                <option value="last-week">Last Week</option>
                <option value="last-month">Last Month</option>
                <option value="all-time">All Time</option>
              </select>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-500">Total Records</div>
            <div className="text-sm font-semibold text-gray-900">{getCurrentData().length.toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-3">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-1.5 -mb-px border-b-2 font-medium text-xs transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-[#02b3e5] text-[#02b3e5] bg-white'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 bg-transparent'
            }`}
          >
            {tab.name}
          </button>
        ))}
      </div>

      {/* Data Grid */}
      <div className="bg-white border border-gray-200 rounded-sm shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full w-full border-collapse">
            <thead className="bg-gray-50">
              <tr>
                {getTableHeaders()}
              </tr>
            </thead>
            <tbody className="bg-white">
              {loading ? (
                <tr>
                  <td colSpan={activeTab === 'summary' ? 5 : activeTab === 'weekly' ? 11 : activeTab === 'channel' ? 12 : activeTab === 'daypart' ? 11 : activeTab === 'demographic' ? 6 : 12} className="px-2 py-6 text-center text-gray-400 text-xs">
                    Loading...
                  </td>
                </tr>
              ) : paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={activeTab === 'summary' ? 5 : activeTab === 'weekly' ? 11 : activeTab === 'channel' ? 12 : activeTab === 'daypart' ? 11 : activeTab === 'demographic' ? 6 : 12} className="px-2 py-6 text-center text-gray-400 text-xs">
                    No data found
                  </td>
                </tr>
              ) : (
                paginatedData.map((row, index) => renderTableRow(row, startIndex + index))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-3 py-2 border-t border-gray-200">
            <div className="text-xs text-gray-500">
              Showing {startIndex + 1} to {Math.min(endIndex, currentData.length)} of {currentData.length.toLocaleString()} results
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-2 py-1 text-xs border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                <ChevronLeft className="w-3 h-3" />
              </button>
              <span className="text-xs text-gray-700 px-2">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="px-2 py-1 text-xs border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Alert System */}
      {showAlert && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg max-w-md ${
          alertType === 'warning' ? 'bg-yellow-50 border border-yellow-200 text-yellow-800' :
          alertType === 'error' ? 'bg-red-50 border border-red-200 text-red-800' :
          'bg-green-50 border border-green-200 text-green-800'
        }`}>
          <div className="flex items-start gap-3">
            <AlertTriangle className={`w-5 h-5 mt-0.5 ${
              alertType === 'warning' ? 'text-yellow-600' :
              alertType === 'error' ? 'text-red-600' :
              'text-green-600'
            }`} />
            <div className="flex-1">
              <p className="text-sm font-medium">{alertMessage}</p>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => setShowAlert(false)}
                  className="text-xs px-2 py-1 rounded bg-white/50 hover:bg-white/70 transition-colors"
                >
                  Dismiss
                </button>
                <button
                  onClick={() => {
                    setShowAlert(false);
                    // Could open a detailed analysis panel here
                  }}
                  className="text-xs px-2 py-1 rounded bg-white/50 hover:bg-white/70 transition-colors"
                >
                  View Details
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload Media Plan Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Upload Media Plan</h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Campaign Name
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#02b3e5]"
                  placeholder="Enter campaign name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Media Plan File
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <Download className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600 mb-2">
                    Drag and drop your media plan file here, or click to browse
                  </p>
                  <button className="px-4 py-2 bg-[#02b3e5] text-white rounded-md hover:bg-[#02b3e5]/80 transition-colors">
                    Choose File
                  </button>
                  <p className="text-xs text-gray-500 mt-2">
                    Supports CSV, Excel (.xlsx), or PDF files
                  </p>
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    // Handle file upload logic here
                    setShowUploadModal(false);
                    setAlertMessage('Media plan uploaded successfully!');
                    setAlertType('success');
                    setShowAlert(true);
                  }}
                  className="flex-1 px-4 py-2 bg-[#02b3e5] text-white rounded-md hover:bg-[#02b3e5]/80 transition-colors"
                >
                  Upload Plan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TVDeliveryMonitor; 