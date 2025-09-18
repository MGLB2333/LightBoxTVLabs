import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, ChevronRight, Plus, RefreshCw, BarChart3, CheckCircle, FileText, Filter, Edit3, X } from 'lucide-react';
import { TVCampaignService, TVCampaign, CampaignPlanWithActuals } from '../lib/tvCampaignService';
import CreateCampaignModal from './CreateCampaignModal';

interface PlanReconciliationProps {
  selectedCampaign: string;
  selectedCampaignDetails: any;
  expandedSuppliers: Set<string>;
  onCampaignSelect: (campaign: string) => void;
  onCampaignClear: () => void;
  onSupplierToggle: (supplier: string) => void;
}

// Mock data from the spreadsheet for Co-op Food campaign
const mockCampaignData: CampaignPlanWithActuals[] = [
  // ITV1 Group - HP+CH Audience
  {
    id: 'itv1-carlton-hpch',
    campaign_id: 'coop-food-campaign',
    supplier_name: 'ITV1',
    group_name: 'Carlton',
    buying_audience: 'HP+CH',
    budget: 43723,
    plan_tvr: 11.40,
    deal_tvr: 23.28,
    plan_value: 43723,
    cpt: 239.78,
    universe: 1418,
    conversion: 1.10,
    deal: 0.65,
    value_pot: 28420,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    actual_tvr: 18.45,
    actual_value: 34659,
    spots_count: 0,
    impacts: 0,
    tvr_variance: -4.83,
    value_variance: -9064
  },
  {
    id: 'itv1-lwt-hpch',
    campaign_id: 'coop-food-campaign',
    supplier_name: 'ITV1',
    group_name: 'LWT',
    buying_audience: 'HP+CH',
    budget: 25314,
    plan_tvr: 5.31,
    deal_tvr: 11.08,
    plan_value: 25314,
    cpt: 291.56,
    universe: 1418,
    conversion: 1.10,
    deal: 0.65,
    value_pot: 16454,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    actual_tvr: 5.17,
    actual_value: 11810,
    spots_count: 0,
    impacts: 0,
    tvr_variance: -5.91,
    value_variance: -13504
  },
  {
    id: 'itv1-midwest-hpch',
    campaign_id: 'coop-food-campaign',
    supplier_name: 'ITV1',
    group_name: 'Midwest',
    buying_audience: 'HP+CH',
    budget: 57531,
    plan_tvr: 21.59,
    deal_tvr: 33.41,
    plan_value: 57531,
    cpt: 185.73,
    universe: 1678,
    conversion: 1.40,
    deal: 0.65,
    value_pot: 37395,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    actual_tvr: 18.39,
    actual_value: 31665,
    spots_count: 0,
    impacts: 0,
    tvr_variance: -15.02,
    value_variance: -25866
  },
  {
    id: 'itv1-north-hpch',
    campaign_id: 'coop-food-campaign',
    supplier_name: 'ITV1',
    group_name: 'North',
    buying_audience: 'HP+CH',
    budget: 46025,
    plan_tvr: 18.11,
    deal_tvr: 19.31,
    plan_value: 46025,
    cpt: 242.72,
    universe: 1777,
    conversion: 1.80,
    deal: 0.65,
    value_pot: 29916,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    actual_tvr: 13.09,
    actual_value: 31195,
    spots_count: 0,
    impacts: 0,
    tvr_variance: -6.22,
    value_variance: -14830
  },
  {
    id: 'itv1-stv-hpch',
    campaign_id: 'coop-food-campaign',
    supplier_name: 'ITV1',
    group_name: 'STV',
    buying_audience: 'HP+CH',
    budget: 9205,
    plan_tvr: 14.85,
    deal_tvr: 13.48,
    plan_value: 9205,
    cpt: 252.31,
    universe: 490,
    conversion: 2.10,
    deal: 0.65,
    value_pot: 5983,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    actual_tvr: 4.88,
    actual_value: 3333,
    spots_count: 0,
    impacts: 0,
    tvr_variance: -8.60,
    value_variance: -5872
  },
  {
    id: 'itv1-seast-hpch',
    campaign_id: 'coop-food-campaign',
    supplier_name: 'ITV1',
    group_name: 'Seast',
    buying_audience: 'HP+CH',
    budget: 43723,
    plan_tvr: 13.87,
    deal_tvr: 24.22,
    plan_value: 43723,
    cpt: 251.54,
    universe: 1299,
    conversion: 1.70,
    deal: 0.65,
    value_pot: 28420,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    actual_tvr: 10.92,
    actual_value: 19713,
    spots_count: 0,
    impacts: 0,
    tvr_variance: -13.30,
    value_variance: -24010
  },
  {
    id: 'itv1-ulster-hpch',
    campaign_id: 'coop-food-campaign',
    supplier_name: 'ITV1',
    group_name: 'Ulster',
    buying_audience: 'HP+CH',
    budget: 4602,
    plan_tvr: 35.54,
    deal_tvr: 44.26,
    plan_value: 4602,
    cpt: 96.02,
    universe: 196,
    conversion: 1.60,
    deal: 0.65,
    value_pot: 2991,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    actual_tvr: 27.03,
    actual_value: 2810,
    spots_count: 0,
    impacts: 0,
    tvr_variance: -17.23,
    value_variance: -1792
  },

  // ITV1 Group - ABC1HP Audience (No Budget)
  {
    id: 'itv1-lwt-abc1hp',
    campaign_id: 'coop-food-campaign',
    supplier_name: 'ITV1',
    group_name: 'LWT',
    buying_audience: 'ABC1HP',
    budget: 0,
    plan_tvr: 0.00,
    deal_tvr: 0.00,
    plan_value: 0,
    cpt: 71.05,
    universe: 1418,
    conversion: 1.10,
    deal: 0.65,
    value_pot: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    actual_tvr: 2.31,
    actual_value: 1286,
    spots_count: 0,
    impacts: 0,
    tvr_variance: 2.31,
    value_variance: 1286
  },
  {
    id: 'itv1-midwest-abc1hp',
    campaign_id: 'coop-food-campaign',
    supplier_name: 'ITV1',
    group_name: 'Midwest',
    buying_audience: 'ABC1HP',
    budget: 0,
    plan_tvr: 0.00,
    deal_tvr: 0.00,
    plan_value: 0,
    cpt: 50.92,
    universe: 1678,
    conversion: 1.35,
    deal: 0.65,
    value_pot: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    actual_tvr: 8.32,
    actual_value: 3927,
    spots_count: 0,
    impacts: 0,
    tvr_variance: 8.32,
    value_variance: 3927
  },
  {
    id: 'itv1-north-abc1hp',
    campaign_id: 'coop-food-campaign',
    supplier_name: 'ITV1',
    group_name: 'North',
    buying_audience: 'ABC1HP',
    budget: 0,
    plan_tvr: 0.00,
    deal_tvr: 0.00,
    plan_value: 0,
    cpt: 45.58,
    universe: 1777,
    conversion: 1.80,
    deal: 0.65,
    value_pot: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    actual_tvr: 4.32,
    actual_value: 1933,
    spots_count: 0,
    impacts: 0,
    tvr_variance: 4.32,
    value_variance: 1933
  },
  {
    id: 'itv1-stv-abc1hp',
    campaign_id: 'coop-food-campaign',
    supplier_name: 'ITV1',
    group_name: 'STV',
    buying_audience: 'ABC1HP',
    budget: 0,
    plan_tvr: 0.00,
    deal_tvr: 0.00,
    plan_value: 0,
    cpt: 44.27,
    universe: 490,
    conversion: 2.10,
    deal: 0.65,
    value_pot: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    actual_tvr: 2.98,
    actual_value: 357,
    spots_count: 0,
    impacts: 0,
    tvr_variance: 2.98,
    value_variance: 357
  },
  {
    id: 'itv1-seast-abc1hp',
    campaign_id: 'coop-food-campaign',
    supplier_name: 'ITV1',
    group_name: 'Seast',
    buying_audience: 'ABC1HP',
    budget: 0,
    plan_tvr: 0.00,
    deal_tvr: 0.00,
    plan_value: 0,
    cpt: 43.91,
    universe: 1299,
    conversion: 1.70,
    deal: 0.65,
    value_pot: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    actual_tvr: 10.43,
    actual_value: 3287,
    spots_count: 0,
    impacts: 0,
    tvr_variance: 10.43,
    value_variance: 3287
  },
  {
    id: 'itv1-ulster-abc1hp',
    campaign_id: 'coop-food-campaign',
    supplier_name: 'ITV1',
    group_name: 'Ulster',
    buying_audience: 'ABC1HP',
    budget: 0,
    plan_tvr: 0.00,
    deal_tvr: 0.00,
    plan_value: 0,
    cpt: 34.29,
    universe: 196,
    conversion: 1.60,
    deal: 0.65,
    value_pot: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    actual_tvr: 15.57,
    actual_value: 578,
    spots_count: 0,
    impacts: 0,
    tvr_variance: 15.57,
    value_variance: 578
  },

  // C4 Group (Channel 4)
  {
    id: 'c4-main-abc1adults',
    campaign_id: 'coop-food-campaign',
    supplier_name: 'C4',
    group_name: 'C4',
    buying_audience: 'ABC1 Adults',
    budget: 62604,
    plan_tvr: 13.09,
    deal_tvr: 16.08,
    plan_value: 62604,
    cpt: 29.65,
    universe: 29933,
    conversion: 1.10,
    deal: 1.00,
    value_pot: 62604,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    actual_tvr: 14.99,
    actual_value: 54359,
    spots_count: 0,
    impacts: 0,
    tvr_variance: -1.09,
    value_variance: -8245
  },
  {
    id: 'c4-owned-hpch',
    campaign_id: 'coop-food-campaign',
    supplier_name: 'C4',
    group_name: 'C4OWNED',
    buying_audience: 'HP+CH',
    budget: 31851,
    plan_tvr: 14.13,
    deal_tvr: 5.90,
    plan_value: 31851,
    cpt: 53.05,
    universe: 29933,
    conversion: 1.10,
    deal: 1.00,
    value_pot: 31851,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    actual_tvr: 19.95,
    actual_value: 508500,
    spots_count: 0,
    impacts: 0,
    tvr_variance: 14.05,
    value_variance: 189649
  },
  {
    id: 'c4-sales-hpch',
    campaign_id: 'coop-food-campaign',
    supplier_name: 'C4',
    group_name: 'C4SALES',
    buying_audience: 'HP+CH',
    budget: 15376,
    plan_tvr: 4.95,
    deal_tvr: 7.72,
    plan_value: 15376,
    cpt: 80.64,
    universe: 6852,
    conversion: 2.00,
    deal: 1.00,
    value_pot: 15376,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    actual_tvr: 7.86,
    actual_value: 16031,
    spots_count: 0,
    impacts: 0,
    tvr_variance: 0.14,
    value_variance: 655
  },
  {
    id: 'c4-tv-1634ads',
    campaign_id: 'coop-food-campaign',
    supplier_name: 'C4',
    group_name: 'C4TV',
    buying_audience: '1634Ads',
    budget: 0,
    plan_tvr: 0.00,
    deal_tvr: 0.00,
    plan_value: 0,
    cpt: 226.27,
    universe: 6846,
    conversion: 1.10,
    deal: 1.00,
    value_pot: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    actual_tvr: 0.14,
    actual_value: 1843,
    spots_count: 0,
    impacts: 0,
    tvr_variance: 0.14,
    value_variance: 1843
  },

  // Sky Media Group
  {
    id: 'sky-hpch',
    campaign_id: 'coop-food-campaign',
    supplier_name: 'Sky Media',
    group_name: 'Sky Media',
    buying_audience: 'HP+CH',
    budget: 75313,
    plan_tvr: 18.97,
    deal_tvr: 24.52,
    plan_value: 75313,
    cpt: 86.97,
    universe: 6834,
    conversion: 1.80,
    deal: 0.85,
    value_pot: 64016,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    actual_tvr: 27.55,
    actual_value: 88307,
    spots_count: 0,
    impacts: 0,
    tvr_variance: 3.03,
    value_variance: 12994
  },
  {
    id: 'sky-abc1adults',
    campaign_id: 'coop-food-campaign',
    supplier_name: 'Sky Media',
    group_name: 'Sky Media',
    buying_audience: 'ABC1 Adults',
    budget: 18828,
    plan_tvr: 5.23,
    deal_tvr: 6.74,
    plan_value: 18828,
    cpt: 12.91,
    universe: 29933,
    conversion: 1.20,
    deal: 0.85,
    value_pot: 16004,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    actual_tvr: 6.30,
    actual_value: 17587,
    spots_count: 0,
    impacts: 0,
    tvr_variance: -0.44,
    value_variance: -1241
  }
];

// Mock daypart analysis data for Co-op Food campaign based on the Daypart Name table
const mockDaypartData = {
  'BREAKFAST': { spots: [], totalImps: 204, totalTVR: 2.53 },
  'COFFEE': { spots: [], totalImps: 263, totalTVR: 3.26 },
  'DAYTIME': { spots: [], totalImps: 205, totalTVR: 2.53 },
  'PREPEAK': { spots: [], totalImps: 315, totalTVR: 3.91 },
  'EARLYPEAK': { spots: [], totalImps: 1062, totalTVR: 13.17 },
  'LATEPEAK': { spots: [], totalImps: 2013, totalTVR: 24.96 },
  'POSTPEAK': { spots: [], totalImps: 618, totalTVR: 7.67 },
  'NIGHTTIME': { spots: [], totalImps: 545, totalTVR: 6.76 }
};

// Mock position in break analysis data for Co-op Food campaign based on the PIB table
const mockPositionData = {
  '1st Position': { spots: [], totalImps: 236, totalTVR: 2.92 },
  '2nd Position': { spots: [], totalImps: 116, totalTVR: 1.43 },
  '3rd Position': { spots: [], totalImps: 124, totalTVR: 1.54 },
  'Penultimate Position': { spots: [], totalImps: 88, totalTVR: 1.09 },
  'Last Position': { spots: [], totalImps: 144, totalTVR: 1.79 },
  'Other': { spots: [], totalImps: 1995, totalTVR: 24.74 }
};

const PlanReconciliation: React.FC<PlanReconciliationProps> = ({
  selectedCampaign,
  selectedCampaignDetails,
  expandedSuppliers,
  onCampaignSelect,
  onCampaignClear,
  onSupplierToggle
}) => {
  const [activeTab, setActiveTab] = useState<'plan-vs-actual' | 'quality' | 'spots' | 'spot-analysis' | 'station-analysis'>('plan-vs-actual');
  const [campaigns, setCampaigns] = useState<TVCampaign[]>([]);
  const [campaignPlans, setCampaignPlans] = useState<CampaignPlanWithActuals[]>([]);
  const [campaignSpots, setCampaignSpots] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<string>('');
  
  // Edit modal state
  const [isEditing, setIsEditing] = useState(false);

  const [editingPlans, setEditingPlans] = useState<CampaignPlanWithActuals[]>([]);
  const [modalActiveTab, setModalActiveTab] = useState<'details' | 'plans'>('details');
  
  // Quality tab filters
  const [selectedAudience, setSelectedAudience] = useState<string>('');
  const [selectedStation, setSelectedStation] = useState<string>('');
  const [selectedSalesHouse, setSelectedSalesHouse] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  
  // Spots tab filter
  const [selectedSpotsAudience, setSelectedSpotsAudience] = useState<string>('All Audiences');
  const [barbSyncRun, setBarbSyncRun] = useState<boolean>(false);
  
  // Audience change modal
  const [showAudienceChangeModal, setShowAudienceChangeModal] = useState<boolean>(false);

  // Load campaigns on mount
  useEffect(() => {
    loadCampaigns();
  }, []);

  // Load campaign plans when selected campaign changes
  useEffect(() => {
    if (selectedCampaign) {
      loadCampaignPlans(selectedCampaign);
      loadCampaignSpots(selectedCampaign);
      // Don't reset barbSyncRun here - let it persist until user clicks sync
      
      // Auto-set station filter to Sky Media for Co-op Food campaign
      if (selectedCampaign === 'coop-food-campaign') {
        setSelectedStation('Sky Media');
      }
    } else {
      setCampaignPlans([]);
      setCampaignSpots([]);
      setBarbSyncRun(false);
      setSelectedStation('');
    }
  }, [selectedCampaign]);

  const loadCampaigns = async () => {
    try {
      setIsLoading(true);
      const campaignsData = await TVCampaignService.getCampaigns();
      // Add mock campaign to the list
      const mockCampaign: TVCampaign = {
        id: 'coop-food-campaign',
        organization_id: 'mock-org',
        name: 'Co-op Food - Price Match & Fresh Food',
        advertiser_name: 'Co-operative Group',
        brand_name: 'Co-op Food',
        agency_name: 'The7stars UK Limited',
        total_budget: 204000,
        status: 'active',
        start_date: '2025-08-01',
        end_date: '2025-08-19',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      setCampaigns([mockCampaign, ...campaignsData]);
    } catch (error) {
      console.error('Error loading campaigns:', error);
      // If API fails, just show mock campaign
      const mockCampaign: TVCampaign = {
        id: 'coop-food-campaign',
        organization_id: 'mock-org',
        name: 'Co-op Food - Price Match & Fresh Food',
        advertiser_name: 'Co-operative Group',
        brand_name: 'Co-op Food',
        agency_name: 'The7stars UK Limited',
        total_budget: 204000,
        status: 'active',
        start_date: '2025-08-01',
        end_date: '2025-08-19',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      setCampaigns([mockCampaign]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadCampaignPlans = async (campaignId: string) => {
    try {
      setIsLoading(true);
      if (campaignId === 'coop-food-campaign') {
        // Use mock data for the Co-op Food campaign
        setCampaignPlans(mockCampaignData);
      } else {
        // Use getCampaignPlansWithActuals for real campaigns
      const plansData = await TVCampaignService.getCampaignPlansWithActuals(campaignId);
      setCampaignPlans(plansData);
      }
    } catch (error) {
      console.error('Error loading campaign plans:', error);
      // Fallback to mock data if API fails
      setCampaignPlans(mockCampaignData);
    } finally {
      setIsLoading(false);
    }
  };

  const loadCampaignSpots = async (campaignId: string) => {
    try {
      // Use raw spots for Quality analysis to avoid audience expansion inflation
      const spotsData = await TVCampaignService.getCampaignSpotsRaw(campaignId);
      console.log(`🔍 NEW: Loaded raw campaign spots for BOTH Quality & Spots tabs: ${spotsData.length} spots`);
      console.log(`🔍 Sample spot structure:`, spotsData[0] ? {
        hasStation: !!spotsData[0].station,
        stationName: spotsData[0].station?.station_name,
        hasAudienceViews: !!spotsData[0].audience_views,
        audienceViewsCount: spotsData[0].audience_views?.length,
        firstAudienceDesc: spotsData[0].audience_views?.[0]?.description
      } : 'No spots');
      setCampaignSpots(spotsData);
    } catch (error) {
      console.error('Error loading campaign spots:', error);
      setCampaignSpots([]);
    }
  };



  const handleRefreshData = async () => {
    if (!selectedCampaign) return;
    
    try {
      setIsLoading(true);
      await loadCampaignPlans(selectedCampaign);
      await loadCampaignSpots(selectedCampaign);
      setLastRefreshed(new Date().toLocaleString());
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateCampaign = (newCampaign: TVCampaign) => {
    setCampaigns(prev => [newCampaign, ...prev]);
    // Optionally select the new campaign
    onCampaignSelect(newCampaign.id);
  };

  const handleSyncFromBARB = async () => {
    if (!selectedCampaign) return;
    
    try {
      setIsLoading(true);
      setLoadingProgress(0);
      console.log('🔄 Syncing BARB data for campaign:', selectedCampaign);
      
      // Simulate progress updates during the sync process
      const progressInterval = setInterval(() => {
        setLoadingProgress(prev => {
          if (prev >= 90) return prev; // Stop at 90% until completion
          return prev + Math.random() * 15; // Random increments
        });
      }, 200);
      
      // Start progress
      setLoadingProgress(10);
      
      // Load campaign plans with actuals from BARB API
      const plansWithActuals = await TVCampaignService.loadCampaignActuals(selectedCampaign);
      
      // Complete the progress
      clearInterval(progressInterval);
      setLoadingProgress(100);
      
      console.log('✅ Sync complete. Plans with actuals:', plansWithActuals.map(p => ({ 
        supplier: p.supplier_name, 
        group: p.group_name, 
        actual_tvr: p.actual_tvr 
      })));
      
      setCampaignPlans(plansWithActuals);
      setLastRefreshed(new Date().toLocaleTimeString());
      setBarbSyncRun(true);
      
      // Keep progress bar visible briefly to show completion
      setTimeout(() => {
        setLoadingProgress(0);
      }, 500);
      
    } catch (error) {
      console.error('Error syncing from BARB:', error);
      alert('Error syncing BARB data. Please try again.');
      setLoadingProgress(0);
    } finally {
      setIsLoading(false);
    }
  };



  // Handle edit mode toggle
  const handleEditToggle = async () => {
    if (!isEditing) {
      // Entering edit mode
      setEditingPlans([...campaignPlans]);
    }
    setIsEditing(!isEditing);
  };

  // Handle plan updates
  const handlePlanUpdate = (planId: string, field: string, value: string) => {
    setEditingPlans(prev => prev.map(plan => {
      if (plan.id === planId) {
        // Handle numeric fields
        if (['budget', 'plan_tvr', 'deal_tvr', 'plan_value', 'cpt'].includes(field)) {
          const numValue = value === '' ? null : parseFloat(value);
          return { ...plan, [field]: numValue };
        }
        return { ...plan, [field]: value };
      }
      return plan;
    }));
  };

  // Handle plan deletion
  const handleDeletePlan = (planId: string) => {
    setEditingPlans(prev => prev.filter(plan => plan.id !== planId));
  };

  // Handle adding new plan
  const handleAddPlan = () => {
    const newPlan: CampaignPlanWithActuals = {
      id: `new_${Date.now()}`, // Temporary ID for new plans
      campaign_id: selectedCampaign,
      supplier_name: '',
      group_name: '',
      buying_audience: '',
      budget: undefined,
      plan_tvr: undefined,
      deal_tvr: undefined,
      plan_value: undefined,
      cpt: undefined,

      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      actual_tvr: 0,
      actual_value: 0,
      spots_count: 0,
      impacts: 0,
      tvr_variance: undefined,
      value_variance: undefined
    };
    setEditingPlans(prev => [...prev, newPlan]);
  };



  // Save plan changes
  const handleSaveChanges = async () => {
    try {
      setIsLoading(true);
      
      // Find deleted plans (plans that exist in campaignPlans but not in editingPlans)
      const deletedPlans = campaignPlans.filter(originalPlan => 
        !editingPlans.find(editingPlan => editingPlan.id === originalPlan.id)
      );
      
      // Delete removed plans
      for (const deletedPlan of deletedPlans) {
        await TVCampaignService.deleteCampaignPlan(deletedPlan.id);
      }
      
      // Handle new and modified plans
      for (const plan of editingPlans) {
        const originalPlan = campaignPlans.find(p => p.id === plan.id);
        
        if (plan.id.startsWith('new_')) {
          // Create new plan
          await TVCampaignService.createCampaignPlan({
            campaign_id: plan.campaign_id,
            supplier_name: plan.supplier_name,
            group_name: plan.group_name,
            buying_audience: plan.buying_audience,
            budget: plan.budget,
            plan_tvr: plan.plan_tvr,
            deal_tvr: plan.deal_tvr,
            plan_value: plan.plan_value,
            cpt: plan.cpt
          });
        } else if (originalPlan && (
          originalPlan.supplier_name !== plan.supplier_name ||
          originalPlan.group_name !== plan.group_name ||
          originalPlan.buying_audience !== plan.buying_audience ||
          originalPlan.budget !== plan.budget ||
          originalPlan.plan_tvr !== plan.plan_tvr ||
          originalPlan.deal_tvr !== plan.deal_tvr
        )) {
          // Update existing plan
          await TVCampaignService.updateCampaignPlan(plan.id, {
            supplier_name: plan.supplier_name,
            group_name: plan.group_name,
            buying_audience: plan.buying_audience,
            budget: plan.budget,
            plan_tvr: plan.plan_tvr,
            deal_tvr: plan.deal_tvr
          });
        }
      }
      
      // Reload plans to reflect changes
      await loadCampaignPlans(selectedCampaign);
      setIsEditing(false);
      setEditingPlans([]);
    } catch (error) {
      console.error('Error saving plan changes:', error);
      alert('Error saving changes. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Group plans by supplier for display
  const groupedPlans = campaignPlans.reduce((acc, plan) => {
    if (!acc[plan.supplier_name]) {
      acc[plan.supplier_name] = [];
    }
    acc[plan.supplier_name].push(plan);
    return acc;
  }, {} as Record<string, CampaignPlanWithActuals[]>);

  // Calculate totals
  const totals = Object.values(groupedPlans).flat().reduce((acc, plan) => {
    acc.budget += plan.budget || 0;
    acc.planValue += plan.plan_value || 0;
    acc.actualValue += plan.actual_value || 0;
    acc.valuePot += plan.value_pot || 0;
    // Calculate planned TVR for each plan and sum them
    const calculatedPlanTVR = plan.budget && plan.cpt && plan.universe 
      ? (plan.budget / plan.cpt) / (plan.universe / 1000)
      : 0;
    acc.planTVR += calculatedPlanTVR;
    acc.dealTVR += calculatedPlanTVR; // Use same calculated value as Plan TVR
    acc.actualTVR += plan.actual_tvr || 0;
    acc.spotsCount += plan.spots_count || 0;
    acc.impacts += plan.impacts || 0;
    acc.cpt += plan.cpt || 0;
    acc.valueVariance += plan.value_variance || 0;
    return acc;
  }, {
    budget: 0,
    planValue: 0,
    actualValue: 0,
    valuePot: 0,
    planTVR: 0,
    dealTVR: 0,
    actualTVR: 0,
    spotsCount: 0,
    impacts: 0,
    cpt: 0,
    valueVariance: 0
  });

  const avgCPT = totals.cpt / Object.values(groupedPlans).flat().length || 0;

  const getVarianceColor = (variance: number, type?: 'spots' | 'impacts' | 'cpt') => {
    if (variance === 0) return 'text-gray-600';
    return variance > 0 ? 'text-green-600' : 'text-red-600';
  };

  const getVarianceBackground = (variance: number, type?: 'spots' | 'impacts' | 'cpt') => {
    if (variance === 0) return 'bg-gray-50';
    return variance > 0 ? 'bg-green-50' : 'bg-red-50';
  };

  // Quality analysis helper functions
  const getDaypartFromTime = (timeString: string): string => {
    if (!timeString) return 'Unknown';
    
    // Extract hour from time string (assuming format like "2025-08-01 06:30:00")
    const hour = parseInt(timeString.split(' ')[1]?.split(':')[0] || '0');
    
    if (hour >= 6 && hour < 9) return 'BREAKFAST';
    if (hour >= 9 && hour < 12) return 'COFFEE';
    if (hour >= 12 && hour < 17) return 'DAYTIME';
    if (hour >= 17 && hour < 19) return 'PREPEAK';
    if (hour >= 19 && hour < 21) return 'EARLYPEAK';
    if (hour >= 21 && hour < 23) return 'LATEPEAK';
    if (hour >= 23 || hour < 1) return 'POSTPEAK';
    if (hour >= 1 && hour < 6) return 'NIGHTTIME';
    
    return 'Unknown';
  };

  // Get unique audiences and stations for filters - updated for raw spot structure
  const uniqueAudiences = useMemo(() => {
    const audiences = new Set<string>();
    campaignSpots.forEach(spot => {
      if (spot.audience_views && Array.isArray(spot.audience_views)) {
        spot.audience_views.forEach((audience: any) => {
          // Debug: Log audience structure
          if (campaignSpots.indexOf(spot) === 0 && spot.audience_views.indexOf(audience) < 3) {
            console.log(`🔍 Audience structure debug:`, audience);
          }
          
          // Try different possible property names
          const audienceDesc = audience.audience_description || audience.description || audience.name || audience.audience_name;
          if (audienceDesc) {
            audiences.add(audienceDesc);
          }
        });
      }
    });
    console.log(`🔍 Found ${audiences.size} unique audiences:`, Array.from(audiences));
    return Array.from(audiences).sort();
  }, [campaignSpots]);

  const uniqueStations = useMemo(() => {
    const stations = [...new Set(campaignSpots.map(spot => spot.station?.station_name).filter(Boolean))];
    return stations.sort();
  }, [campaignSpots]);

  const uniqueSalesHouses = useMemo(() => {
    // Extract sales house names from spot.sales_house.sales_house_name
    const salesHouses = [...new Set(campaignSpots.map(spot => spot.sales_house?.sales_house_name).filter(Boolean))];
    console.log(`🔍 Found ${salesHouses.length} unique sales houses:`, salesHouses);
    return salesHouses.sort();
  }, [campaignSpots]);

  // Get unique audiences from spots for spots tab filter - use raw spot format
  const uniqueSpotsAudiences = useMemo(() => {
    console.log(`🔍 Spots Tab Audiences Processing:`, {
      totalSpots: campaignSpots.length,
      firstSpotStructure: campaignSpots[0] ? {
        hasAudienceViews: !!campaignSpots[0].audience_views,
        audienceViewsLength: campaignSpots[0].audience_views?.length,
        firstAudience: campaignSpots[0].audience_views?.[0]?.description
      } : 'No spots'
    });
    
    if (campaignSpots.length === 0) {
      console.log(`⚠️ Spots Tab: No campaign spots loaded yet`);
      return [];
    }
    
    const audiences = new Set<string>();
    campaignSpots.forEach(spot => {
      if (spot.audience_views && Array.isArray(spot.audience_views)) {
        spot.audience_views.forEach((audience: any) => {
          if (audience.description) {
            audiences.add(audience.description);
          }
        });
      }
    });
    
    const result = Array.from(audiences).sort();
    console.log(`🔍 Spots Tab Audiences Result:`, {
      uniqueAudiences: result.length,
      audiences: result.slice(0, 5)
    });
    
    return result;
  }, [campaignSpots]);

  // Filter spots based on selected audience for spots tab - use raw spot format
  const filteredSpotsForTable = useMemo(() => {
    const filtered = campaignSpots.filter(spot => {
      // For raw spots, check if any audience in audience_views matches the selected audience
      const audienceMatch = selectedSpotsAudience === 'All Audiences' || !selectedSpotsAudience || 
        (spot.audience_views && spot.audience_views.some((aud: any) => aud.description === selectedSpotsAudience));
      return audienceMatch;
    });
    
    console.log(`🔍 DETAILED Spots Tab Filtering:`, {
      totalSpots: campaignSpots.length,
      selectedAudience: `"${selectedSpotsAudience}"`,
      filteredSpots: filtered.length,
      availableAudiences: uniqueSpotsAudiences.length,
      filterMatch: selectedSpotsAudience === 'All Audiences' ? 'SHOW ALL' : `FILTER BY: "${selectedSpotsAudience}"`,
      firstSpotAudiences: campaignSpots[0]?.audience_views?.map((aud: any) => aud.description).slice(0, 3) || [],
      filterTest: campaignSpots.length > 0 ? {
        testAllAudiences: selectedSpotsAudience === 'All Audiences',
        testEmpty: !selectedSpotsAudience,
        hasAudienceViews: !!campaignSpots[0]?.audience_views,
        exactMatch: campaignSpots[0]?.audience_views?.some((aud: any) => aud.description === selectedSpotsAudience)
      } : 'No spots to test'
    });
    
    return filtered;
  }, [campaignSpots, selectedSpotsAudience, uniqueSpotsAudiences]);

  // Group spots by audience for display
  const groupedSpotsByAudience = useMemo(() => {
    const grouped: Record<string, any[]> = {};
    
    filteredSpotsForTable.forEach(spot => {
      const audience = spot.audience_name || 'Unknown';
      if (!grouped[audience]) {
        grouped[audience] = [];
      }
      grouped[audience].push(spot);
    });
    
    return grouped;
  }, [filteredSpotsForTable]);

  // Create a flat list of spots - show one row per spot for the selected audience
  const spotsWithCounts = useMemo(() => {
    const spots: any[] = [];
    
    // For each spot, show only the selected audience data (or first audience if "All Audiences")
    filteredSpotsForTable.forEach(spot => {
      const station = spot.station?.station_name || 'Unknown';
      
      if (spot.audience_views && Array.isArray(spot.audience_views)) {
        let targetAudience;
        
        if (selectedSpotsAudience === 'All Audiences' || !selectedSpotsAudience) {
          // Show "All Homes" if available, or first audience
          targetAudience = spot.audience_views.find((aud: any) => 
            aud.description === 'All Homes'
          ) || spot.audience_views[0];
        } else {
          // Show the selected audience
          targetAudience = spot.audience_views.find((aud: any) => 
            aud.description === selectedSpotsAudience
          );
        }
        
        if (targetAudience) {
          const audienceName = targetAudience.description || 'Unknown';
          const audienceSize = targetAudience.audience_size_hundreds || 0;
          
          // Create one row per spot (not per audience)
          spots.push({
            station_name: station,
            audience_name: audienceName,
            audienceSpotCount: 1, // Each raw spot represents 1 spot
            spot_type: spot.spot_type || 'Unknown',
            spot_duration: spot.spot_duration || 0,
            preceding_programme_name: spot.preceding_programme_name || '',
            succeeding_programme_name: spot.succeeding_programme_name || '',
            position_in_break: spot.position_in_break || 'other',
            clearcast_buyer_code: spot.clearcast_information?.buyer_code || '',
            clearcast_buyer_name: spot.clearcast_information?.buyer_name || '',
            clearcast_advertiser_code: spot.clearcast_information?.advertiser_code || '',
            clearcast_advertiser_name: spot.clearcast_information?.advertiser_name || '',
            sales_house_name: spot.sales_house?.sales_house_name || '',
            audience_size_hundreds: audienceSize,
            audience_target_size_hundreds: targetAudience.target_size_in_hundreds || 0
          });
        }
      }
    });
    
    console.log(`🔍 DETAILED Spots Tab Data Processing:`, {
      totalRawSpots: filteredSpotsForTable.length,
      expandedSpotRows: spots.length,
      expansionRatio: filteredSpotsForTable.length > 0 ? `${spots.length}/${filteredSpotsForTable.length} = ${(spots.length / filteredSpotsForTable.length).toFixed(1)}x` : '0x',
      firstRawSpot: filteredSpotsForTable[0] ? {
        station: filteredSpotsForTable[0].station?.station_name,
        audienceViews: filteredSpotsForTable[0].audience_views?.length,
        firstAudience: filteredSpotsForTable[0].audience_views?.[0]?.description
      } : 'No raw spots',
      firstExpandedSpot: spots[0] ? {
        stationName: spots[0].station_name,
        audienceName: spots[0].audience_name,
        hasAllFields: !!(spots[0].station_name && spots[0].audience_name)
      } : 'No expanded spots'
    });
    
    return spots;
  }, [filteredSpotsForTable]);

  // Create matrix data for spot analysis tab - use same data as Quality tab
  const spotAnalysisMatrix = useMemo(() => {
    if (campaignSpots.length === 0) {
      return { matrix: {}, stations: [], audiences: [], maxValue: 0 };
    }
    
    // Extract unique stations and audiences from campaign spots (raw format)
    const stations = [...new Set(campaignSpots.map(spot => spot.station?.station_name).filter(Boolean))].sort();
    const audiences = [...new Set(campaignSpots.flatMap(spot => 
      spot.audience_views?.map((aud: any) => aud.description) || []
    ).filter(Boolean))].sort();
    
    // Create matrix with counts
    const matrix: Record<string, Record<string, number>> = {};
    
    stations.forEach(station => {
      matrix[station] = {};
      audiences.forEach(audience => {
        matrix[station][audience] = 0;
      });
    });
    
    // The key insight: Each spot appears in ALL audiences, so we need to count it differently
    // Instead of counting per station-audience, we should count per station and show audience distribution
    

    
    // Count unique spots per station first
    const spotsPerStation: Record<string, Set<string>> = {};
    
    campaignSpots.forEach(spot => {
      const station = spot.station?.station_name || 'Unknown';
      const spotId = `${spot.commercial_number || ''}-${spot.spot_start_datetime?.standard_datetime || ''}-${spot.station?.station_name || ''}`;
      
      if (!spotsPerStation[station]) {
        spotsPerStation[station] = new Set();
      }
      spotsPerStation[station].add(spotId);
    });
    
    console.log('🔍 Spots per station:', Object.fromEntries(
      Object.entries(spotsPerStation).map(([station, spots]) => [station, spots.size])
    ));
    
    // Instead of showing spot counts (which are the same for all audiences),
    // let's show the total audience size (impressions) for each station-audience combination
    // This will give different values for different audiences
    campaignSpots.forEach(spot => {
      const station = spot.station?.station_name || 'Unknown';
      
      if (spot.audience_views && spot.audience_views.length > 0) {
        spot.audience_views.forEach((audience: any) => {
          const audienceName = audience.description || 'Unknown';
          const audienceSize = audience.audience_size_hundreds || 0;
          
          if (!matrix[station]) {
            matrix[station] = {};
          }
          if (!matrix[station][audienceName]) {
            matrix[station][audienceName] = 0;
          }
          // Sum up the audience sizes for all spots in this station-audience combination
          matrix[station][audienceName] += audienceSize;
        });
      }
    });
    
    console.log('🔍 Final matrix:', matrix);
    
    // Calculate max value for heatmap
    let maxValue = 0;
    stations.forEach(station => {
      audiences.forEach(audience => {
        const value = matrix[station]?.[audience] || 0;
        if (value > maxValue) {
          maxValue = value;
        }
      });
    });
    
    return { matrix, stations, audiences, maxValue };
  }, [campaignSpots]);

  // Function to get heatmap background color based on value
  const getHeatmapColor = (value: number, maxValue: number) => {
    if (value === 0 || maxValue === 0) return 'bg-white';
    
    // Calculate intensity (0 to 1)
    const intensity = value / maxValue;
    
    // Create blue gradient from light to dark
    // Light blue: #dbeafe (opacity 0.1) to Dark blue: #1e40af (opacity 1.0)
    const opacity = 0.1 + (intensity * 0.9); // Range from 0.1 to 1.0
    
    // Use different shades of blue based on intensity
    if (intensity <= 0.2) return 'bg-blue-50';      // Very light
    if (intensity <= 0.4) return 'bg-blue-100';     // Light
    if (intensity <= 0.6) return 'bg-blue-200';     // Medium light
    if (intensity <= 0.8) return 'bg-blue-300';     // Medium
    return 'bg-blue-400';                           // Dark
  };

  // Filter raw spots based on selected audience, station, sales house, and date for quality tab
  const filteredSpots = useMemo(() => {
    const filtered = campaignSpots.filter(spot => {
      // Audience filtering - check inside audience_views array for raw spots
      let audienceMatch = true;
      if (selectedAudience && selectedAudience !== 'All Homes') {
        audienceMatch = spot.audience_views && spot.audience_views.some((audience: any) => 
          audience.description && audience.description.includes(selectedAudience)
        );
      }
      
      // Station filtering - use nested station object for raw spots
      const stationMatch = !selectedStation || (spot.station?.station_name === selectedStation);
      
      // Sales house filtering - use spot.sales_house.sales_house_name for raw spots
      const salesHouseMatch = !selectedSalesHouse || (spot.sales_house?.sales_house_name === selectedSalesHouse);
      
      // Date filtering - use spot_start_datetime.standard_datetime for raw spots with validation
      let dateMatch = true;
      if (selectedDate) {
        try {
          const spotDateTimeString = spot.spot_start_datetime?.standard_datetime;
          if (spotDateTimeString) {
            const spotDate = new Date(spotDateTimeString);
            if (!isNaN(spotDate.getTime())) {
              const spotDateString = spotDate.toISOString().split('T')[0];
              dateMatch = spotDateString === selectedDate;
            } else {
              console.warn(`Invalid date string for spot:`, spotDateTimeString);
              dateMatch = false; // Exclude spots with invalid dates
            }
          } else {
            console.warn(`Missing standard_datetime for spot:`, spot.spot_start_datetime);
            dateMatch = false; // Exclude spots without date
          }
        } catch (error) {
          console.warn(`Date parsing error for spot:`, spot.spot_start_datetime, error);
          dateMatch = false; // Exclude spots with unparseable dates
        }
      }
      
      return audienceMatch && stationMatch && salesHouseMatch && dateMatch;
    });
    
    console.log(`🔍 Spot Analysis Filtering (Raw Spots):`, {
      totalSpots: campaignSpots.length,
      filteredSpots: filtered.length,
      filters: {
        audience: selectedAudience,
        station: selectedStation,
        salesHouse: selectedSalesHouse,
        date: selectedDate
      }
    });
    
    // Debug: Check why spots are being filtered out
    if (campaignSpots.length > 0 && filtered.length === 0) {
      const testSpot = campaignSpots[0];
      console.log(`🚨 DEBUG: Why are all spots filtered out?`, {
        sampleSpot: {
          station_name: testSpot.station?.station_name,
          sales_house_name: testSpot.station?.sales_house_name,
          spot_date: testSpot.spot_start_datetime?.standard_datetime,
          audience_views_count: testSpot.audience_views?.length || 0
        },
        filters: {
          selectedAudience,
          selectedStation, 
          selectedSalesHouse,
          selectedDate
        },
        filterTests: {
          audienceTest: !selectedAudience || selectedAudience === 'All Homes' || (testSpot.audience_views && testSpot.audience_views.some((audience: any) => 
            audience.description && audience.description.includes(selectedAudience)
          )),
          stationTest: !selectedStation || (testSpot.station?.station_name === selectedStation),
          salesHouseTest: !selectedSalesHouse || (testSpot.sales_house?.sales_house_name === selectedSalesHouse),
          dateTest: !selectedDate || (() => {
            try {
              const spotDateTimeString = testSpot.spot_start_datetime?.standard_datetime;
              if (spotDateTimeString) {
                const spotDate = new Date(spotDateTimeString);
                if (!isNaN(spotDate.getTime())) {
                  const spotDateString = spotDate.toISOString().split('T')[0];
                  return spotDateString === selectedDate;
                }
              }
              return false;
            } catch (error) {
              return false;
            }
          })()
        }
      });
    }
    
    // Debug: Show sample raw spot structure
    if (campaignSpots.length > 0) {
      const sampleSpot = campaignSpots[0];
      console.log(`🔍 Sample raw spot structure:`, {
        id: sampleSpot.id,
        spot_start_datetime: sampleSpot.spot_start_datetime,
        station: sampleSpot.station,
        audience_views: {
          value: sampleSpot.audience_views,
          type: typeof sampleSpot.audience_views,
          isArray: Array.isArray(sampleSpot.audience_views),
          length: Array.isArray(sampleSpot.audience_views) ? sampleSpot.audience_views.length : 'N/A'
        },
        position_in_break: sampleSpot.position_in_break
      });
    }
    
    // Sample impression values - extract from audience_views for raw spots
    if (filtered.length > 0) {
      const sampleImpressions = filtered.slice(0, 3).map(spot => {
        // Find the matching audience segment for impression calculation
        let audienceSize = 0;
        let audienceName = 'No audience match';
        
        if (spot.audience_views && spot.audience_views.length > 0) {
          // Find audience matching the selected filter, or use first one if "All Homes"
          const matchingAudience = selectedAudience === 'All Homes' || !selectedAudience
            ? spot.audience_views[0]
            : spot.audience_views.find((aud: any) => 
                aud.description && aud.description.includes(selectedAudience)
              ) || spot.audience_views[0];
          
          if (matchingAudience) {
            audienceSize = matchingAudience.audience_size_hundreds || 0;
            audienceName = matchingAudience.description || 'Unknown';
          }
        }
        
        return {
          audience_size_hundreds: audienceSize,
          calculated_impressions: audienceSize * 100,
          station: spot.station?.station_name || 'Unknown',
          audience: audienceName,
          spot_id: spot.id,
          spot_start_datetime: spot.spot_start_datetime?.standard_datetime
        };
      });
      console.log(`📊 Sample impression calculations (Raw Spots):`, sampleImpressions);
      
      // Raw spots should have unique IDs and start times (no duplicates expected)
      const uniqueSpotIds = new Set(filtered.map(spot => spot.id));
      const uniqueStartTimes = new Set(filtered.map(spot => spot.spot_start_datetime?.standard_datetime));
      console.log(`🔍 Duplicate analysis (Raw Spots):`, {
        totalSpots: filtered.length,
        uniqueSpotIds: uniqueSpotIds.size,
        uniqueStartTimes: uniqueStartTimes.size,
        duplicateRatio: `${((filtered.length / uniqueStartTimes.size) || 1).toFixed(1)}x`
      });
    }
    
    return filtered;
  }, [campaignSpots, selectedAudience, selectedStation, selectedSalesHouse, selectedDate]);



  // Analyze raw spots by daypart
  const daypartAnalysis = useMemo(() => {
    // If Co-op Food campaign is selected, return mock daypart data
    if (selectedCampaign === 'coop-food-campaign') {
      return mockDaypartData;
    }
    
    // Raw spots are already unique, no deduplication needed
    console.log(`🔧 Raw spots analysis: ${filteredSpots.length} spots (no deduplication needed)`);
    
    const analysis: Record<string, { spots: any[], totalImps: number, totalTVR: number }> = {};
    
    filteredSpots.forEach(spot => {
      // Validate date before processing
      let daypart = 'Unknown';
      try {
        const spotDateTimeString = spot.spot_start_datetime?.standard_datetime;
        if (spotDateTimeString) {
          const spotDate = new Date(spotDateTimeString);
          if (!isNaN(spotDate.getTime())) {
            daypart = getDaypartFromTime(spotDateTimeString);
          } else {
            console.warn(`Invalid date string in daypart analysis:`, spotDateTimeString);
          }
        } else {
          console.warn(`Missing standard_datetime in daypart analysis:`, spot.spot_start_datetime);
        }
      } catch (error) {
        console.warn(`Date parsing error in daypart analysis:`, spot.spot_start_datetime, error);
      }
      
      if (!analysis[daypart]) {
        analysis[daypart] = { spots: [], totalImps: 0, totalTVR: 0 };
      }
      
      analysis[daypart].spots.push(spot);
      
      // Extract impressions from the matching audience segment
      let audienceSize = 0;
      let matchingAudience = null;
      if (spot.audience_views && spot.audience_views.length > 0) {
        // Find audience matching the selected filter, or use first one if "All Homes"
        matchingAudience = selectedAudience === 'All Homes' || !selectedAudience
          ? spot.audience_views[0]
          : spot.audience_views.find((aud: any) => 
              aud.description && aud.description.includes(selectedAudience)
            ) || spot.audience_views[0];
        
        if (matchingAudience) {
          audienceSize = matchingAudience.audience_size_hundreds || 0;
        }
      }
      
      // Impressions: audience_size_hundreds represents hundreds (multiply by 100)
      analysis[daypart].totalImps += audienceSize * 100;
      
      // Debug: Log high impression values
      if (audienceSize > 100) {
        console.log(`🚨 High audience_size_hundreds detected:`, {
          daypart,
          station: spot.station?.station_name,
          audienceSize,
          impressions: audienceSize * 100,
          audienceDescription: matchingAudience?.description
        });
      }
      // Calculate TVR (assuming universe size of 1000 for demo)
      analysis[daypart].totalTVR += (audienceSize / 10);
    });
    
    // Debug: Show daypart totals
    const totalImpressions = Object.values(analysis).reduce((sum, d) => sum + d.totalImps, 0);
    console.log(`📊 Daypart Analysis Summary (Raw Spots):`, {
      totalImpressions: totalImpressions.toLocaleString(),
      daypartCount: Object.keys(analysis).length,
      daypartBreakdown: Object.entries(analysis).map(([daypart, data]) => ({
        daypart,
        impressions: data.totalImps.toLocaleString(),
        spots: data.spots.length
      }))
    });
    
    return analysis;
  }, [filteredSpots, selectedAudience, selectedCampaign]);

  // Analyze raw spots by position in break
  const positionAnalysis = useMemo(() => {
    // If Co-op Food campaign is selected, return mock position data
    if (selectedCampaign === 'coop-food-campaign') {
      return mockPositionData;
    }
    
    // Raw spots are already unique, no deduplication needed
    const analysis: Record<string, { spots: any[], totalImps: number, totalTVR: number }> = {};
    
    filteredSpots.forEach(spot => {
      const position = spot.position_in_break || 'Unknown';
      if (!analysis[position]) {
        analysis[position] = { spots: [], totalImps: 0, totalTVR: 0 };
      }
      
      analysis[position].spots.push(spot);
      
      // Extract impressions from the matching audience segment
      let audienceSize = 0;
      let matchingAudience = null;
      if (spot.audience_views && spot.audience_views.length > 0) {
        // Find audience matching the selected filter, or use first one if "All Homes"
        matchingAudience = selectedAudience === 'All Homes' || !selectedAudience
          ? spot.audience_views[0]
          : spot.audience_views.find((aud: any) => 
              aud.description && aud.description.includes(selectedAudience)
            ) || spot.audience_views[0];
        
        if (matchingAudience) {
          audienceSize = matchingAudience.audience_size_hundreds || 0;
        }
      }
      
      // Impressions: audience_size_hundreds represents hundreds (multiply by 100)
      analysis[position].totalImps += audienceSize * 100;
      
      // Debug: Log high impression values for position analysis too
      if (audienceSize > 100) {
        console.log(`🚨 High audience_size_hundreds detected (Position):`, {
          position,
          station: spot.station?.station_name,
          audienceSize,
          impressions: audienceSize * 100,
          audienceDescription: matchingAudience?.description
        });
      }
      
      // Calculate TVR (assuming universe size of 1000 for demo)
      analysis[position].totalTVR += (audienceSize / 10);
    });
    
    return analysis;
  }, [filteredSpots, selectedAudience, selectedCampaign]);



  return (
    <div className="space-y-6" style={{ maxWidth: 'calc(100vw - 20rem)', width: '100%', overflow: 'hidden' }}>
      {/* Campaign Selection */}
      <div className="bg-white rounded-lg border border-gray-200 p-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-900">Select Campaign</h3>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 hover:border-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <Plus className="w-3 h-3" />
            Create Campaign
          </button>
        </div>
        
        {selectedCampaign ? (
          <div className="flex items-center gap-2">
            <div className="flex-1 px-3 py-1.5 text-sm bg-blue-50 border border-blue-200 rounded-md text-blue-900">
              {campaigns.find(c => c.id === selectedCampaign)?.name || selectedCampaignDetails?.name || 'Selected Campaign'}
            </div>
            <button
              onClick={onCampaignClear}
              className="px-2 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-500"
            >
              Clear
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <select
              value={selectedCampaign}
              onChange={(e) => {
                if (e.target.value) {
                  onCampaignSelect(e.target.value);
                } else {
                  onCampaignClear();
                }
              }}
              className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">{selectedCampaign ? (campaigns.find(c => c.id === selectedCampaign)?.name || 'Select a campaign...') : 'Select a campaign...'}</option>
              {campaigns.map((campaign) => (
                <option key={campaign.id} value={campaign.id}>
                  {campaign.name}
                </option>
              ))}
            </select>
            {campaigns.length === 0 && (
              <div className="px-3 py-1.5 text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-md">
                No campaigns
              </div>
            )}
          </div>
        )}
      </div>

      {/* Empty State */}
      {!selectedCampaign && (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Campaign to Begin</h3>
          <p className="text-sm text-gray-500 mb-4">Choose a campaign from the dropdown above to view plan vs actual performance data</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <Plus className="w-4 h-4" />
            Create New Campaign
          </button>
        </div>
      )}

      {/* Campaign Details */}
      {selectedCampaign && selectedCampaignDetails && (
        <div className="bg-white rounded-lg border border-gray-200 p-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-900">Campaign Details</h3>
            <button
              onClick={() => setShowDetailsModal(true)}
              className="text-xs font-medium text-gray-600 hover:text-gray-800 focus:outline-none focus:ring-1 focus:ring-gray-500"
            >
              View Details
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div>
              <span className="text-gray-500">Advertiser:</span>
              <p className="font-medium">{selectedCampaignDetails.advertiser_name || 'N/A'}</p>
            </div>
            <div>
              <span className="text-gray-500">Brand:</span>
              <p className="font-medium">{selectedCampaignDetails.brand_name || 'N/A'}</p>
            </div>
            <div>
              <span className="text-gray-500">Agency:</span>
              <p className="font-medium">{selectedCampaignDetails.agency_name || 'N/A'}</p>
            </div>
            <div>
              <span className="text-gray-500">Budget:</span>
              <p className="font-medium">{selectedCampaignDetails.total_budget ? `£${selectedCampaignDetails.total_budget.toLocaleString()}` : 'N/A'}</p>
            </div>
          </div>
        </div>
      )}

      {/* Plan vs Actual Table */}
      {selectedCampaign && (
        <div className="bg-white rounded-lg border border-gray-200">
          {/* Table Header with Tabs */}
          <div className="border-b border-gray-200">
            <div className="flex items-center justify-between p-4">
              <div className="flex space-x-1">
                <button
                  onClick={() => setActiveTab('plan-vs-actual')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    activeTab === 'plan-vs-actual'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Plan vs Actual
                </button>
                <button
                  onClick={() => setActiveTab('quality')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    activeTab === 'quality'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Quality
                </button>
                <button
                  onClick={() => setActiveTab('spots')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    activeTab === 'spots'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <FileText className="w-3 h-3 inline mr-1" />
                  Spots
                </button>
                <button
                  onClick={() => setActiveTab('spot-analysis')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    activeTab === 'spot-analysis'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <BarChart3 className="w-3 h-3 inline mr-1" />
                  Spot Analysis
                </button>
                <button
                  onClick={() => setActiveTab('station-analysis')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    activeTab === 'station-analysis'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <BarChart3 className="w-3 h-3 inline mr-1" />
                  Station Analysis
                </button>

              </div>
              
              <div className="flex flex-col items-end gap-1">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-gray-400" />
                  <button
                    onClick={() => setShowAudienceChangeModal(true)}
                    disabled={isLoading}
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-700 bg-white border border-blue-300 rounded hover:bg-blue-50 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                  >
                    <Plus className="w-3 h-3" />
                    Change of Audience
                  </button>
                  <button
                    onClick={handleSyncFromBARB}
                    disabled={isLoading}
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-white bg-blue-600 border border-blue-600 rounded hover:bg-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
                    Sync BARB Data
                  </button>
                </div>
                {lastRefreshed && (
                  <span className="text-xs text-gray-500">Last refreshed: {lastRefreshed}</span>
                )}
              </div>
            </div>
          </div>

          {/* Table Content */}
          {activeTab === 'plan-vs-actual' && (
            <div className="w-full overflow-hidden">
              {/* Loading Bar */}
              {(isLoading || loadingProgress > 0) && (
                <div className="w-full h-1 bg-gray-200 relative overflow-hidden">
                  <div 
                    className="absolute top-0 left-0 h-full bg-blue-500 transition-all duration-300 ease-out"
                    style={{
                      width: `${loadingProgress}%`
                    }}
                  ></div>
                </div>
              )}
              <div className="overflow-x-auto" style={{ maxWidth: 'calc(100vw - 20rem)', width: 'calc(100vw - 20rem)' }}>
                <table className="w-full border-collapse" style={{ minWidth: '1000px' }}>
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-auto min-w-0 whitespace-nowrap sticky left-0 bg-gray-50 z-10 border-r border-gray-200">Group/Station</th>
                      <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32 whitespace-nowrap border-r border-gray-200">Buying Audience</th>
                      <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-20 whitespace-nowrap border-r border-gray-200">Budget</th>
                      <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-20 whitespace-nowrap border-r border-gray-200">CPT</th>
                      <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-20 whitespace-nowrap border-r border-gray-200">Universe</th>
                      <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-20 whitespace-nowrap border-r border-gray-200">Conversion</th>
                      <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-20 whitespace-nowrap border-r border-gray-200">Deal</th>
                      <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-24 whitespace-nowrap border-r border-gray-200">Value Pot</th>
                                            <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-20 whitespace-nowrap border-r border-gray-200">Plan TVR</th>
                      <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-20 whitespace-nowrap border-r border-gray-200">Deal TVR</th>
                      <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-20 whitespace-nowrap border-r border-gray-200">Actual TVR</th>
                      <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-20 whitespace-nowrap border-r border-gray-200">TVR +/-</th>
                      <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-20 whitespace-nowrap">Value +/-</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {Object.entries(groupedPlans).map(([supplier, groups]) => (
                      <React.Fragment key={supplier}>
                        {/* Supplier Row */}
                        <tr 
                          className="bg-blue-50 cursor-pointer hover:bg-blue-100"
                          onClick={() => onSupplierToggle(supplier)}
                        >
                          <td 
                            colSpan={16} 
                            className="px-2 py-2 text-sm font-medium text-gray-900 whitespace-nowrap"
                          >
                            <div className="flex items-center gap-2">
                              {expandedSuppliers.has(supplier) ? (
                                <ChevronDown className="w-4 h-4" />
                              ) : (
                                <ChevronRight className="w-4 h-4" />
                              )}
                              {supplier}
                            </div>
                          </td>
                        </tr>
                        
                        {/* Group Rows */}
                        {expandedSuppliers.has(supplier) && groups.map((group, index) => (
                          <tr key={`${supplier}-${group.group_name}-${index}`} className="hover:bg-gray-50">
                            <td className="px-2 py-1.5 text-xs text-gray-900 w-auto min-w-0 whitespace-nowrap sticky left-0 bg-white z-10 border-r border-gray-200">{group.group_name}</td>
                            <td className="px-2 py-1.5 text-xs text-gray-900 w-32 whitespace-nowrap border-r border-gray-200">{group.buying_audience || 'N/A'}</td>
                            <td className="px-2 py-1.5 text-xs text-center text-gray-900 whitespace-nowrap border-r border-gray-200">£{group.budget?.toLocaleString() || '0'}</td>
                            <td className="px-2 py-1.5 text-xs text-center text-gray-900 whitespace-nowrap border-r border-gray-200">{group.cpt?.toFixed(2) || '0.00'}</td>
                            <td className="px-2 py-1.5 text-xs text-center text-gray-900 whitespace-nowrap border-r border-gray-200">{group.universe?.toLocaleString() || '0'}</td>
                            <td className="px-2 py-1.5 text-xs text-center text-gray-900 whitespace-nowrap border-r border-gray-200">{group.conversion?.toFixed(2) || '0.00'}</td>
                            <td className="px-2 py-1.5 text-xs text-center text-gray-900 whitespace-nowrap border-r border-gray-200">£{group.deal?.toLocaleString() || '0'}</td>
                            <td className="px-2 py-1.5 text-xs text-center text-gray-900 whitespace-nowrap border-r border-gray-200">£{group.value_pot?.toLocaleString() || '0'}</td>
                            <td className="px-2 py-1.5 text-xs text-center text-gray-600 whitespace-nowrap bg-gray-100 border-r border-gray-200">
                              {group.plan_tvr?.toFixed(1) || '0.0'}
                            </td>
                                                        <td className="px-2 py-1.5 text-xs text-center text-gray-600 whitespace-nowrap bg-gray-100 border-r border-gray-200">
                              {group.deal_tvr?.toFixed(1) || '0.0'}
                            </td>
                            <td className="px-2 py-1.5 text-xs text-center text-gray-600 whitespace-nowrap bg-gray-100 border-r border-gray-200">
                              {isLoading ? (
                                <div className="flex items-center justify-center">
                                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
                                </div>
                              ) : (
                                group.actual_tvr?.toFixed(1) || '0.0'
                              )}
                            </td>
                            <td className={`px-2 py-1.5 text-xs text-center whitespace-nowrap border-r border-gray-200 ${getVarianceBackground(group.tvr_variance || 0)}`}>
                              {isLoading ? (
                                <div className="flex items-center justify-center">
                                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
                                </div>
                              ) : (
                                group.tvr_variance ? (group.tvr_variance > 0 ? '+' : '') + group.tvr_variance.toFixed(1) : '0.0'
                              )}
                            </td>
                            <td className={`px-2 py-1.5 text-xs text-center whitespace-nowrap ${getVarianceBackground(group.value_variance || 0)}`}>
                              {isLoading ? (
                                <div className="flex items-center justify-center">
                                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
                                </div>
                              ) : (
                                group.value_variance ? (group.value_variance > 0 ? '+' : '') + '£' + group.value_variance.toLocaleString() : '£0'
                              )}
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50">
                    <tr className="border-t-2 border-gray-300">
                      <td className="px-2 py-2 text-xs text-gray-600 w-auto min-w-0 whitespace-nowrap sticky left-0 bg-gray-50 z-10 border-r border-gray-200">
                        {Object.keys(groupedPlans).length} suppliers
                      </td>
                      <td className="px-2 py-2 text-xs text-gray-600 w-32 whitespace-nowrap border-r border-gray-200">-</td>
                      <td className="px-2 py-2 text-xs text-center font-bold text-gray-900 w-20 whitespace-nowrap border-r border-gray-200">£{totals.budget.toLocaleString()}</td>
                      <td className="px-2 py-2 text-xs text-center font-bold text-gray-900 w-20 whitespace-nowrap border-r border-gray-200">{avgCPT.toFixed(2)}</td>
                      <td className="px-2 py-2 text-xs text-center font-bold text-gray-900 w-20 whitespace-nowrap border-r border-gray-200">-</td>
                      <td className="px-2 py-2 text-xs text-center font-bold text-gray-900 w-20 whitespace-nowrap border-r border-gray-200">-</td>
                      <td className="px-2 py-2 text-xs text-center font-bold text-gray-900 w-20 whitespace-nowrap border-r border-gray-200">-</td>
                      <td className="px-2 py-2 text-xs text-center font-bold text-gray-900 w-24 whitespace-nowrap border-r border-gray-200">£{totals.valuePot.toLocaleString()}</td>
                                            <td className="px-2 py-2 text-xs text-center font-bold text-gray-600 w-20 whitespace-nowrap bg-gray-100 border-r border-gray-200">{totals.planTVR.toFixed(1)}</td>
                      <td className="px-2 py-2 text-xs text-center font-bold text-gray-600 w-20 whitespace-nowrap bg-gray-100 border-r border-gray-200">{totals.dealTVR.toFixed(1)}</td>
                      <td className="px-2 py-2 text-xs text-center font-bold text-gray-600 w-20 whitespace-nowrap bg-gray-100 border-r border-gray-200">
                        {totals.actualTVR.toFixed(1)}
                      </td>
                      <td className={`px-2 py-2 text-xs text-center font-bold w-20 whitespace-nowrap border-r border-gray-200 ${getVarianceBackground((totals.actualTVR - totals.dealTVR))}`}>
                        {(totals.actualTVR - totals.dealTVR) > 0 ? '+' : ''}{(totals.actualTVR - totals.dealTVR).toFixed(1)}
                      </td>
                      <td className={`px-2 py-2 text-xs text-center font-bold w-20 whitespace-nowrap ${getVarianceBackground(totals.valueVariance)}`}>
                        {totals.valueVariance > 0 ? '+' : ''}£{totals.valueVariance.toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* Quality Tab Content */}
          {activeTab === 'quality' && (
            <div className="p-6 space-y-6">
              {/* Filters */}
              <div className="bg-white rounded-lg border border-gray-200 p-3">
                <h3 className="text-xs font-semibold text-gray-900 mb-2">Quality Analysis Filters</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Date</label>
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Audience</label>
                    <select
                      value={selectedAudience}
                      onChange={(e) => setSelectedAudience(e.target.value)}
                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">All Audiences</option>
                      {uniqueAudiences.map((audience) => (
                        <option key={audience} value={audience}>
                          {audience}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Station</label>
                    <select
                      value={selectedStation}
                      onChange={(e) => setSelectedStation(e.target.value)}
                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">All Stations</option>
                      {uniqueStations.map((station) => (
                        <option key={station} value={station}>
                          {station}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Sales House</label>
                    <select
                      value={selectedSalesHouse}
                      onChange={(e) => setSelectedSalesHouse(e.target.value)}
                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">All Sales Houses</option>
                      {uniqueSalesHouses.map((salesHouse) => (
                        <option key={salesHouse} value={salesHouse}>
                          {salesHouse}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Analysis Tables - Side by Side */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Daypart Analysis Table */}
                <div className="bg-white rounded-lg border border-gray-200">
                  <div className="px-3 py-2 border-b border-gray-200">
                    <h3 className="text-xs font-semibold text-gray-900">Daypart Analysis</h3>
                    <p className="text-xs text-gray-500">Performance breakdown by time of day</p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">Daypart</th>
                          <th className="px-2 py-1 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">Impressions</th>
                          <th className="px-2 py-1 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">TVR</th>
                          <th className="px-2 py-1 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">TVR %</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {Object.entries(daypartAnalysis).map(([daypart, data]) => {
                          const totalTVR = Object.values(daypartAnalysis).reduce((sum, d) => sum + d.totalTVR, 0);
                          const tvrPercentage = totalTVR > 0 ? (data.totalTVR / totalTVR) * 100 : 0;
                          
                          return (
                            <tr key={daypart} className="hover:bg-gray-50">
                              <td className="px-2 py-1 text-xs text-gray-900 border-r border-gray-200">{daypart}</td>
                              <td className="px-2 py-1 text-xs text-center text-gray-900 border-r border-gray-200">{data.totalImps.toLocaleString()}</td>
                              <td className="px-2 py-1 text-xs text-center text-gray-900 border-r border-gray-200">{data.totalTVR.toFixed(2)}</td>
                              <td className="px-2 py-1 text-xs text-center text-gray-900">{tvrPercentage.toFixed(1)}%</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Position in Break Analysis Table */}
                <div className="bg-white rounded-lg border border-gray-200">
                  <div className="px-3 py-2 border-b border-gray-200">
                    <h3 className="text-xs font-semibold text-gray-900">Position in Break Analysis</h3>
                    <p className="text-xs text-gray-500">Performance breakdown by position within commercial breaks</p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">Position</th>
                          <th className="px-2 py-1 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">Impressions</th>
                          <th className="px-2 py-1 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">TVR</th>
                          <th className="px-2 py-1 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">TVR %</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {Object.entries(positionAnalysis).map(([position, data]) => {
                          const totalTVR = Object.values(positionAnalysis).reduce((sum, d) => sum + d.totalTVR, 0);
                          const tvrPercentage = totalTVR > 0 ? (data.totalTVR / totalTVR) * 100 : 0;
                          
                          return (
                            <tr key={position} className="hover:bg-gray-50">
                              <td className="px-2 py-1 text-xs text-gray-900 border-r border-gray-200">{position}</td>
                              <td className="px-2 py-1 text-xs text-center text-gray-900 border-r border-gray-200">{data.totalImps.toLocaleString()}</td>
                              <td className="px-2 py-1 text-xs text-center text-gray-900 border-r border-gray-200">{data.totalTVR.toFixed(2)}</td>
                              <td className="px-2 py-1 text-xs text-center text-gray-900">{tvrPercentage.toFixed(1)}%</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Summary */}
              {filteredSpots.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">
                    Showing analysis for {filteredSpots.length} spots
                    {selectedDate && ` • Date: ${selectedDate}`}
                    {selectedAudience && ` • Audience: ${selectedAudience}`}
                    {selectedStation && ` • Station: ${selectedStation}`}
                    {selectedSalesHouse && ` • Sales House: ${selectedSalesHouse}`}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Spots Tab Content */}
          {activeTab === 'spots' && (
            <div className="space-y-4">
              {/* Audience Filter */}
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 max-w-xs">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Select Audience</label>
                  <select
                    value={selectedSpotsAudience}
                    onChange={(e) => setSelectedSpotsAudience(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="All Audiences">All Audiences</option>
                    <option value="All Homes">All Homes</option>
                    <option value="Adults 16+">Adults 16+</option>
                    <option value="Housewives">Housewives</option>
                    <option value="ABC1 Adults">ABC1 Adults</option>
                    <option value="Men 16+">Men 16+</option>
                    <option value="Women 16+">Women 16+</option>
                    <option value="Adults 25-54">Adults 25-54</option>
                    <option value="Adults 35-64">Adults 35-64</option>
                  </select>
                </div>
                {selectedSpotsAudience && selectedSpotsAudience !== 'All Audiences' && (
                  <button
                    onClick={() => setSelectedSpotsAudience('All Audiences')}
                    className="px-3 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500"
                  >
                    Clear Filter
                  </button>
                )}
              </div>

              {/* Mock Spot Data Table */}
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-200">
                  <h4 className="text-sm font-semibold text-gray-900">
                    Spot Details {selectedSpotsAudience !== 'All Audiences' ? `- ${selectedSpotsAudience}` : ''}
                  </h4>
                </div>
                
                                <div className="overflow-x-auto">
                  <table className="w-full text-xs table-auto">
                  <thead className="bg-gray-50">
                    <tr>
                        <th className="px-2 py-1.5 text-left font-medium text-gray-500 uppercase tracking-wider w-24">Date</th>
                        <th className="px-2 py-1.5 text-left font-medium text-gray-500 uppercase tracking-wider w-20">Time</th>
                        <th className="px-2 py-1.5 text-left font-medium text-gray-500 uppercase tracking-wider w-16">Channel</th>
                        <th className="px-2 py-1.5 text-left font-medium text-gray-500 uppercase tracking-wider w-32">Programme</th>
                        <th className="px-2 py-1.5 text-left font-medium text-gray-500 uppercase tracking-wider w-40">Ad Name</th>
                        <th className="px-2 py-1.5 text-center font-medium text-gray-500 uppercase tracking-wider w-16">Position</th>
                        <th className="px-2 py-1.5 text-left font-medium text-gray-500 uppercase tracking-wider w-20">Break</th>
                        <th className="px-2 py-1.5 text-left font-medium text-gray-500 uppercase tracking-wider w-24">Advertiser</th>
                        <th className="px-2 py-1.5 text-left font-medium text-gray-500 uppercase tracking-wider w-16">Brand</th>
                        <th className="px-2 py-1.5 text-left font-medium text-gray-500 uppercase tracking-wider w-20">Agency</th>
                        <th className="px-2 py-1.5 text-center font-medium text-gray-500 uppercase tracking-wider w-16">Duration</th>
                        <th className="px-2 py-1.5 text-center font-medium text-gray-500 uppercase tracking-wider w-20">Impacts</th>
                        <th className="px-2 py-1.5 text-center font-medium text-gray-500 uppercase tracking-wider w-16">CPT</th>
                        <th className="px-2 py-1.5 text-left font-medium text-gray-500 uppercase tracking-wider w-20">Region</th>
                        <th className="px-2 py-1.5 text-left font-medium text-gray-500 uppercase tracking-wider w-24">Audience</th>
                        <th className="px-2 py-1.5 text-left font-medium text-gray-500 uppercase tracking-wider w-20">Spot Type</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                      {[
                        {
                          date: '2024-01-15', time: '19:30:00', channel: 'ITV1', programme: 'Coronation Street',
                          adName: 'Co-op Food - Fresh & Local', position: '1st', break: 'Break 1',
                          advertiser: 'Co-op Food', brand: 'Co-op', agency: 'The7stars',
                          duration: 30, impacts: 1247, cpt: 185, region: 'London', audience: 'ABC1 Adults', spotType: 'Standard'
                        },
                        {
                          date: '2024-01-15', time: '20:00:00', channel: 'ITV1', programme: 'Emmerdale',
                          adName: 'Co-op Food - Quality Value', position: '2nd', break: 'Break 2',
                          advertiser: 'Co-op Food', brand: 'Co-op', agency: 'The7stars',
                          duration: 30, impacts: 1156, cpt: 192, region: 'London', audience: 'ABC1 Adults', spotType: 'Standard'
                        },
                        {
                          date: '2024-01-15', time: '21:00:00', channel: 'Channel 4', programme: 'The Chase',
                          adName: 'Co-op Food - Community Spirit', position: '3rd', break: 'Break 1',
                          advertiser: 'Co-op Food', brand: 'Co-op', agency: 'The7stars',
                          duration: 30, impacts: 892, cpt: 165, region: 'London', audience: 'ABC1 Adults', spotType: 'Standard'
                        },
                        {
                          date: '2024-01-16', time: '19:30:00', channel: 'ITV1', programme: 'Coronation Street',
                          adName: 'Co-op Food - Fresh & Local', position: '1st', break: 'Break 1',
                          advertiser: 'Co-op Food', brand: 'Co-op', agency: 'The7stars',
                          duration: 30, impacts: 1289, cpt: 182, region: 'London', audience: 'ABC1 Adults', spotType: 'Standard'
                        },
                        {
                          date: '2024-01-16', time: '20:30:00', channel: 'Channel 4', programme: 'Gogglebox',
                          adName: 'Co-op Food - Quality Value', position: '2nd', break: 'Break 2',
                          advertiser: 'Co-op Food', brand: 'Co-op', agency: 'The7stars',
                          duration: 30, impacts: 756, cpt: 158, region: 'London', audience: 'ABC1 Adults', spotType: 'Standard'
                        },
                        {
                          date: '2024-01-17', time: '19:00:00', channel: 'ITV1', programme: 'The One Show',
                          adName: 'Co-op Food - Community Spirit', position: '1st', break: 'Break 1',
                          advertiser: 'Co-op Food', brand: 'Co-op', agency: 'The7stars',
                          duration: 30, impacts: 634, cpt: 175, region: 'London', audience: 'ABC1 Adults', spotType: 'Standard'
                        },
                        {
                          date: '2024-01-17', time: '21:00:00', channel: 'Channel 5', programme: 'Celebrity Big Brother',
                          adName: 'Co-op Food - Fresh & Local', position: '3rd', break: 'Break 1',
                          advertiser: 'Co-op Food', brand: 'Co-op', agency: 'The7stars',
                          duration: 30, impacts: 445, cpt: 142, region: 'London', audience: 'ABC1 Adults', spotType: 'Standard'
                        },
                        {
                          date: '2024-01-18', time: '19:30:00', channel: 'ITV1', programme: 'Coronation Street',
                          adName: 'Co-op Food - Quality Value', position: '2nd', break: 'Break 1',
                          advertiser: 'Co-op Food', brand: 'Co-op', agency: 'The7stars',
                          duration: 30, impacts: 1203, cpt: 188, region: 'London', audience: 'ABC1 Adults', spotType: 'Standard'
                        },
                        {
                          date: '2024-01-18', time: '20:00:00', channel: 'ITV2', programme: 'Love Island',
                          adName: 'Co-op Food - Community Spirit', position: '1st', break: 'Break 2',
                          advertiser: 'Co-op Food', brand: 'Co-op', agency: 'The7stars',
                          duration: 30, impacts: 567, cpt: 195, region: 'London', audience: 'ABC1 Adults', spotType: 'Standard'
                        },
                        {
                          date: '2024-01-19', time: '19:30:00', channel: 'Channel 4', programme: 'Hollyoaks',
                          adName: 'Co-op Food - Fresh & Local', position: '2nd', break: 'Break 1',
                          advertiser: 'Co-op Food', brand: 'Co-op', agency: 'The7stars',
                          duration: 30, impacts: 423, cpt: 168, region: 'London', audience: 'ABC1 Adults', spotType: 'Standard'
                        }
                      ].map((spot, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-2 py-1.5 text-gray-900 w-24">
                            <div className="truncate" title={spot.date}>
                              {spot.date}
                            </div>
                          </td>
                          <td className="px-2 py-1.5 text-gray-900 w-20">
                            <div className="truncate" title={spot.time}>
                              {spot.time}
                            </div>
                          </td>
                          <td className="px-2 py-1.5 text-gray-900 font-medium w-16">
                            <div className="truncate" title={spot.channel}>
                              {spot.channel}
                            </div>
                          </td>
                          <td className="px-2 py-1.5 text-gray-900 w-32">
                            <div className="truncate" title={spot.programme}>
                              {spot.programme}
                            </div>
                          </td>
                          <td className="px-2 py-1.5 text-gray-900 font-medium w-40">
                            <div className="truncate" title={spot.adName}>
                              {spot.adName}
                            </div>
                          </td>
                          <td className="px-2 py-1.5 text-center text-gray-900 w-16">
                            <div className="truncate" title={spot.position}>
                              {spot.position}
                            </div>
                          </td>
                          <td className="px-2 py-1.5 text-gray-900 w-20">
                            <div className="truncate" title={spot.break}>
                              {spot.break}
                            </div>
                          </td>
                          <td className="px-2 py-1.5 text-gray-900 w-24">
                            <div className="truncate" title={spot.advertiser}>
                              {spot.advertiser}
                            </div>
                          </td>
                          <td className="px-2 py-1.5 text-gray-900 w-16">
                            <div className="truncate" title={spot.brand}>
                              {spot.brand}
                            </div>
                          </td>
                          <td className="px-2 py-1.5 text-gray-900 w-20">
                            <div className="truncate" title={spot.agency}>
                              {spot.agency}
                            </div>
                          </td>
                          <td className="px-2 py-1.5 text-center text-gray-900 w-16">
                            <div className="truncate" title={`${spot.duration}s`}>
                              {spot.duration}s
                            </div>
                          </td>
                          <td className="px-2 py-1.5 text-center text-gray-900 font-medium w-20">
                            <div className="truncate" title={spot.impacts.toLocaleString()}>
                              {spot.impacts.toLocaleString()}
                            </div>
                          </td>
                          <td className="px-2 py-1.5 text-center text-gray-900 w-16">
                            <div className="truncate" title={`£${spot.cpt}`}>
                              £{spot.cpt}
                            </div>
                          </td>
                          <td className="px-2 py-1.5 text-gray-900 w-20">
                            <div className="truncate" title={spot.region}>
                              {spot.region}
                            </div>
                          </td>
                          <td className="px-2 py-1.5 text-gray-900 w-24">
                            <div className="truncate" title={spot.audience}>
                              {spot.audience}
                            </div>
                          </td>
                          <td className="px-2 py-1.5 text-gray-900 w-20">
                            <div className="truncate" title={spot.spotType}>
                              {spot.spotType}
                            </div>
                        </td>
                      </tr>
                      ))}
                  </tbody>
                </table>
              </div>
                
                {/* Summary Footer */}
                <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-500">
                      Showing 10 spots for {selectedSpotsAudience !== 'All Audiences' ? selectedSpotsAudience : 'All Audiences'}
                  </p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>Total Impacts: 8,612</span>
                      <span>Avg CPT: £175</span>
                      <span>Total Duration: 5:00</span>
                </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Spot Analysis Tab Content */}
          {activeTab === 'spot-analysis' && (
            <div className="space-y-4">
              {/* Key Metrics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="bg-white border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-gray-500">Total Spots</p>
                      <p className="text-lg font-semibold text-gray-900">{filteredSpots.length}</p>
                    </div>
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-gray-500">Avg. CPT</p>
                      <p className="text-lg font-semibold text-gray-900">£{filteredSpots.length > 0 ? (filteredSpots.reduce((sum, spot) => sum + (spot.cpt || 0), 0) / filteredSpots.length).toFixed(0) : '0'}</p>
                    </div>
                    <div className="p-2 bg-green-100 rounded-lg">
                      <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-gray-500">Peak Performance</p>
                      <p className="text-lg font-semibold text-gray-900">LATEPEAK</p>
                    </div>
                    <div className="p-2 bg-yellow-100 rounded-lg">
                      <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-gray-500">Top Station</p>
                      <p className="text-lg font-semibold text-gray-900">ITV1</p>
                    </div>
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m0 0V1a1 1 0 011-1h2a1 1 0 011 1v18a1 1 0 01-1 1H4a1 1 0 01-1-1V1a1 1 0 011-1h2a1 1 0 011 1v3z" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              {/* Daypart Performance Analysis */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Daypart Performance Analysis</h4>
                <div className="space-y-2">
                  {[
                    { daypart: 'LATEPEAK', spots: 45, avgCPT: 185, performance: 'Excellent', color: 'bg-green-100 text-green-800' },
                    { daypart: 'EARLYPEAK', spots: 32, avgCPT: 198, performance: 'Good', color: 'bg-blue-100 text-blue-800' },
                    { daypart: 'PREPEAK', spots: 28, avgCPT: 165, performance: 'Good', color: 'bg-blue-100 text-blue-800' },
                    { daypart: 'POSTPEAK', spots: 22, avgCPT: 142, performance: 'Fair', color: 'bg-yellow-100 text-yellow-800' },
                    { daypart: 'DAYTIME', spots: 18, avgCPT: 125, performance: 'Fair', color: 'bg-yellow-100 text-yellow-800' },
                    { daypart: 'BREAKFAST', spots: 12, avgCPT: 98, performance: 'Poor', color: 'bg-red-100 text-red-800' }
                  ].map((item) => (
                    <div key={item.daypart} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-medium text-gray-900 w-20">{item.daypart}</span>
                        <span className="text-xs text-gray-600">{item.spots} spots</span>
                        <span className="text-xs text-gray-600">£{item.avgCPT} avg CPT</span>
                      </div>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${item.color}`}>
                        {item.performance}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Station Performance & Schedule Insights */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Station Performance */}
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Station Performance</h4>
                  <div className="space-y-2">
                    {[
                      { station: 'ITV1', spots: 67, reach: '2.4M', efficiency: 'High', cpt: 185 },
                      { station: 'Channel 4', spots: 34, reach: '1.8M', efficiency: 'Medium', cpt: 198 },
                      { station: 'Sky Media', spots: 28, reach: '1.2M', efficiency: 'Medium', cpt: 165 },
                      { station: 'Channel 5', spots: 19, reach: '0.9M', efficiency: 'Low', cpt: 142 }
                    ].map((item) => (
                      <div key={item.station} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-medium text-gray-900 w-20">{item.station}</span>
                          <span className="text-xs text-gray-600">{item.spots} spots</span>
                          <span className="text-xs text-gray-600">{item.reach} reach</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-600">£{item.cpt}</span>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            item.efficiency === 'High' ? 'bg-green-100 text-green-800' :
                            item.efficiency === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {item.efficiency}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Schedule Optimization Insights */}
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Schedule Optimization Insights</h4>
                  <div className="space-y-3">
                    <div className="p-3 bg-green-50 border border-green-200 rounded">
                      <div className="flex items-start gap-2">
                        <svg className="w-4 h-4 text-green-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div>
                          <p className="text-xs font-medium text-green-800">Optimal Timing</p>
                          <p className="text-xs text-green-700">LATEPEAK shows 23% better CPT efficiency than EARLYPEAK</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                      <div className="flex items-start gap-2">
                        <svg className="w-4 h-4 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div>
                          <p className="text-xs font-medium text-blue-800">Opportunity</p>
                          <p className="text-xs text-blue-700">Consider increasing BREAKFAST allocation - 40% lower CPT</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                      <div className="flex items-start gap-2">
                        <svg className="w-4 h-4 text-yellow-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                        <div>
                          <p className="text-xs font-medium text-yellow-800">Watch</p>
                          <p className="text-xs text-yellow-700">Channel 5 showing declining efficiency - review placement</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Competitive Analysis */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Competitive Analysis</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                  <thead className="bg-gray-50">
                    <tr>
                        <th className="px-3 py-2 text-left font-medium text-gray-500">Time Slot</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-500">Programme</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-500">Your Spots</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-500">Competitors</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-500">Clutter Index</th>
                    </tr>
                  </thead>
                    <tbody className="divide-y divide-gray-200">
                      {[
                        { time: '19:30', programme: 'Coronation Street', yourSpots: 2, competitors: 4, clutter: 'High' },
                        { time: '20:00', programme: 'Emmerdale', yourSpots: 1, competitors: 3, clutter: 'Medium' },
                        { time: '21:00', programme: 'The Chase', yourSpots: 3, competitors: 2, clutter: 'Low' },
                        { time: '22:00', programme: 'News at Ten', yourSpots: 1, competitors: 5, clutter: 'High' }
                      ].map((item, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-3 py-2 font-medium text-gray-900">{item.time}</td>
                          <td className="px-3 py-2 text-gray-600">{item.programme}</td>
                          <td className="px-3 py-2 text-gray-900">{item.yourSpots}</td>
                          <td className="px-3 py-2 text-gray-600">{item.competitors}</td>
                          <td className="px-3 py-2">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              item.clutter === 'High' ? 'bg-red-100 text-red-800' :
                              item.clutter === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {item.clutter}
                            </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
                </div>
            </div>
          )}

          {/* Station Analysis Tab Content */}
          {activeTab === 'station-analysis' && (
            <div className="space-y-4">
              {/* Station-Audience Heatmap */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-900 mb-4">Station-Audience Reach Analysis</h4>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-xs">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-gray-500 border-r border-gray-200 sticky left-0 bg-gray-50 z-10">
                        Station
                      </th>
                        {['All Homes', 'Adults 16+', 'Housewives', 'ABC1 Adults', 'Men 16+', 'Women 16+', 'Adults 25-54', 'Adults 35-64'].map((audience) => (
                          <th key={audience} className="px-2 py-2 text-center font-medium text-gray-500 border-r border-gray-200 min-w-[100px]">
                          {audience}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                      {[
                        { station: 'ITV1', data: [12.4, 15.2, 18.7, 22.1, 8.9, 11.3, 16.8, 14.2] },
                        { station: 'ITV2', data: [4.2, 5.1, 6.8, 7.9, 3.2, 4.1, 5.4, 4.8] },
                        { station: 'ITV3', data: [3.1, 3.7, 4.2, 4.8, 2.1, 2.8, 3.6, 3.2] },
                        { station: 'Channel 4', data: [8.7, 10.4, 12.1, 14.2, 6.8, 8.9, 11.2, 9.8] },
                        { station: 'E4', data: [2.8, 3.4, 4.1, 4.9, 2.2, 2.9, 3.7, 3.1] },
                        { station: 'More4', data: [1.9, 2.3, 2.8, 3.2, 1.5, 1.9, 2.4, 2.1] },
                        { station: 'Channel 5', data: [5.2, 6.1, 7.4, 8.8, 4.1, 5.3, 6.7, 5.9] },
                        { station: '5STAR', data: [1.8, 2.1, 2.5, 2.9, 1.4, 1.7, 2.2, 1.9] },
                        { station: 'Sky One', data: [2.4, 2.9, 3.5, 4.1, 1.9, 2.4, 3.1, 2.7] },
                        { station: 'Sky Atlantic', data: [1.1, 1.3, 1.6, 1.9, 0.9, 1.1, 1.4, 1.2] },
                        { station: 'Sky Witness', data: [2.1, 2.5, 3.0, 3.6, 1.7, 2.1, 2.7, 2.3] },
                        { station: 'Sky Crime', data: [1.3, 1.6, 1.9, 2.2, 1.1, 1.3, 1.7, 1.4] }
                      ].map((row) => {
                        return (
                          <tr key={row.station} className="hover:bg-gray-50">
                            <td className="px-3 py-2 font-medium text-gray-900 border-r border-gray-200 sticky left-0 bg-white z-10">
                              {row.station}
                        </td>
                            {row.data.map((value, index) => {
                              // Convert percentage to intensity (0-1 scale)
                              const intensity = value / 25; // Assuming max reach is around 25%
                              const colorClass = intensity > 0.8 ? 'bg-blue-900' :
                                               intensity > 0.6 ? 'bg-blue-700' :
                                               intensity > 0.4 ? 'bg-blue-500' :
                                               intensity > 0.2 ? 'bg-blue-300' :
                                               'bg-blue-100';
                              const textClass = intensity > 0.4 ? 'text-white font-medium' : 'text-blue-900 font-medium';
                              
                          return (
                            <td 
                                  key={index}
                                  className={`px-2 py-2 text-center border-r border-gray-200 ${colorClass} ${textClass}`}
                            >
                                  {value.toFixed(1)}%
                            </td>
                          );
                        })}
                      </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
                
                                {/* Heatmap Legend */}
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-gray-500">Target Audience Reach %:</span>
                    <div className="flex items-center gap-1">
                      <div className="w-4 h-4 bg-blue-100 border border-gray-300"></div>
                      <span className="text-xs text-gray-600">0-5%</span>
                </div>
                    <div className="flex items-center gap-1">
                      <div className="w-4 h-4 bg-blue-300 border border-gray-300"></div>
                      <span className="text-xs text-gray-600">5-10%</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-4 h-4 bg-blue-500 border border-gray-300"></div>
                      <span className="text-xs text-gray-600">10-15%</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-4 h-4 bg-blue-700 border border-gray-300"></div>
                      <span className="text-xs text-gray-600">15-20%</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-4 h-4 bg-blue-900 border border-gray-300"></div>
                      <span className="text-xs text-gray-600">20%+</span>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    Mean % of target audience reached by campaign spots
                  </div>
                </div>
              </div>

              {/* Station Performance Summary */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Top Performing Stations */}
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Top Performing Stations by Reach</h4>
                  <div className="space-y-2">
                    {[
                      { station: 'ITV1', reach: '22.1%', audience: 'ABC1 Adults', efficiency: 'Excellent' },
                      { station: 'Channel 4', reach: '14.2%', audience: 'ABC1 Adults', efficiency: 'Good' },
                      { station: 'Channel 5', reach: '8.8%', audience: 'ABC1 Adults', efficiency: 'Good' },
                      { station: 'ITV2', reach: '7.9%', audience: 'ABC1 Adults', efficiency: 'Fair' },
                      { station: 'E4', reach: '4.9%', audience: 'ABC1 Adults', efficiency: 'Fair' }
                    ].map((item, index) => (
                      <div key={item.station} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-medium text-gray-900 w-6">#{index + 1}</span>
                          <span className="text-xs font-medium text-gray-900 w-20">{item.station}</span>
                          <span className="text-xs text-gray-600">{item.reach}</span>
                        </div>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          item.efficiency === 'Excellent' ? 'bg-green-100 text-green-800' :
                          item.efficiency === 'Good' ? 'bg-blue-100 text-blue-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {item.efficiency}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Audience Concentration Analysis */}
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Audience Concentration Analysis</h4>
                  <div className="space-y-3">
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                      <div className="flex items-start gap-2">
                        <svg className="w-4 h-4 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        <div>
                          <p className="text-xs font-medium text-blue-800">ITV1 Dominance</p>
                          <p className="text-xs text-blue-700">ITV1 shows highest reach across all audience segments</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-3 bg-green-50 border border-green-200 rounded">
                      <div className="flex items-start gap-2">
                        <svg className="w-4 h-4 text-green-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                        <div>
                          <p className="text-xs font-medium text-green-800">Targeted Reach</p>
                          <p className="text-xs text-green-700">Channel 4 excels in ABC1 Adults and Women 16+ segments</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                      <div className="flex items-start gap-2">
                        <svg className="w-4 h-4 text-yellow-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                        <div>
                          <p className="text-xs font-medium text-yellow-800">Opportunity</p>
                          <p className="text-xs text-yellow-700">Sky channels show potential for premium audience targeting</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}


        </div>
      )}

      {/* Create Campaign Modal */}
      <CreateCampaignModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCampaignCreated={handleCreateCampaign}
      />

      {/* Campaign Details Modal */}
      {showDetailsModal && selectedCampaignDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Campaign Details</h2>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-full p-1"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Modal Tabs */}
            <div className="border-b border-gray-200">
              <div className="flex space-x-1 p-4 pb-0">
                <button
                  onClick={() => setModalActiveTab('details')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    modalActiveTab === 'details'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Details
                </button>
                <button
                  onClick={() => setModalActiveTab('plans')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    modalActiveTab === 'plans'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Plans
                </button>
              </div>
            </div>
            
            <div className="p-4 space-y-4">
              {/* Details Tab */}
              {modalActiveTab === 'details' && (
                <>
                  {/* Basic Information */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 mb-3">Basic Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Campaign Name</label>
                        <p className="text-sm text-gray-900 bg-gray-50 px-2 py-1.5 rounded">{selectedCampaignDetails.name}</p>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          selectedCampaignDetails.status === 'active' ? 'bg-green-100 text-green-800' :
                          selectedCampaignDetails.status === 'paused' ? 'bg-yellow-100 text-yellow-800' :
                          selectedCampaignDetails.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {selectedCampaignDetails.status?.charAt(0).toUpperCase() + selectedCampaignDetails.status?.slice(1)}
                        </span>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Advertiser</label>
                        <p className="text-sm text-gray-900 bg-gray-50 px-2 py-1.5 rounded">{selectedCampaignDetails.advertiser_name || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Brand</label>
                        <p className="text-sm text-gray-900 bg-gray-50 px-2 py-1.5 rounded">{selectedCampaignDetails.brand_name || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Agency</label>
                        <p className="text-sm text-gray-900 bg-gray-50 px-2 py-1.5 rounded">{selectedCampaignDetails.agency_name || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Total Budget</label>
                        <p className="text-sm text-gray-900 bg-gray-50 px-2 py-1.5 rounded">
                          {selectedCampaignDetails.total_budget ? `£${selectedCampaignDetails.total_budget.toLocaleString()}` : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Campaign Dates */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 mb-3">Campaign Period</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Start Date</label>
                        <p className="text-sm text-gray-900 bg-gray-50 px-2 py-1.5 rounded">
                          {selectedCampaignDetails.start_date ? new Date(selectedCampaignDetails.start_date).toLocaleDateString() : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">End Date</label>
                        <p className="text-sm text-gray-900 bg-gray-50 px-2 py-1.5 rounded">
                          {selectedCampaignDetails.end_date ? new Date(selectedCampaignDetails.end_date).toLocaleDateString() : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Metadata */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 mb-3">Metadata</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Created</label>
                        <p className="text-sm text-gray-900 bg-gray-50 px-2 py-1.5 rounded">
                          {selectedCampaignDetails.created_at ? new Date(selectedCampaignDetails.created_at).toLocaleString() : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Last Updated</label>
                        <p className="text-sm text-gray-900 bg-gray-50 px-2 py-1.5 rounded">
                          {selectedCampaignDetails.updated_at ? new Date(selectedCampaignDetails.updated_at).toLocaleString() : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Plans Tab */}
              {modalActiveTab === 'plans' && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-gray-900">Campaign Plans</h3>
                    <div className="flex items-center gap-2">
                      {!isEditing ? (
                        <button
                          onClick={handleEditToggle}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Edit Plans
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={handleSaveChanges}
                            disabled={isLoading}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-white bg-green-600 border border-green-600 rounded hover:bg-green-700 focus:outline-none focus:ring-1 focus:ring-green-500 disabled:opacity-50"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Save
                          </button>
                          <button
                            onClick={() => {
                              setIsEditing(false);
                              setEditingPlans([]);
                            }}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded hover:bg-gray-200 focus:outline-none focus:ring-1 focus:ring-gray-500"
                          >
                            Cancel
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    {/* Add Row Button */}
                    {isEditing && (
                      <button
                        onClick={handleAddPlan}
                        className="w-full py-2 px-3 text-sm text-blue-600 border-2 border-dashed border-blue-300 rounded hover:border-blue-400 hover:bg-blue-50 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
                      >
                        <div className="flex items-center justify-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                          Add New Plan
                        </div>
                      </button>
                    )}
                    
                    {(isEditing ? editingPlans : campaignPlans).map((plan) => (
                      <div key={plan.id} className="border border-gray-200 rounded p-3">
                        <div className="flex items-center gap-3">
                          {/* Sales House */}
                          <div className="flex-1 min-w-0">
                            <label className="block text-xs font-medium text-gray-700 mb-1">Sales House</label>
                            {isEditing ? (
                              <select
                                value={plan.supplier_name}
                                onChange={(e) => handlePlanUpdate(plan.id, 'supplier_name', e.target.value)}
                                className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                              >
                                <option value="">Select...</option>
                                <option value="ITV Sales">ITV Sales</option>
                                <option value="Sky Media">Sky Media</option>
                                <option value="Channel 4 Sales">Channel 4 Sales</option>
                                <option value="Channel 5 Sales">Channel 5 Sales</option>
                                <option value="UKTV Sales">UKTV Sales</option>
                                <option value="Discovery Networks">Discovery Networks</option>
                                <option value="ViacomCBS">ViacomCBS</option>
                                <option value="WarnerMedia">WarnerMedia</option>
                                <option value="Disney">Disney</option>
                                <option value="BBC Studios">BBC Studios</option>
                              </select>
                            ) : (
                              <p className="text-xs text-gray-900 bg-gray-50 px-2 py-1 rounded truncate">{plan.supplier_name}</p>
                            )}
                          </div>

                          {/* Station */}
                          <div className="flex-1 min-w-0">
                            <label className="block text-xs font-medium text-gray-700 mb-1">Station</label>
                            {isEditing ? (
                              <input
                                type="text"
                                value={plan.group_name}
                                onChange={(e) => handlePlanUpdate(plan.id, 'group_name', e.target.value)}
                                placeholder="e.g., ITV1"
                                className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            ) : (
                              <p className="text-xs text-gray-900 bg-gray-50 px-2 py-1 rounded truncate">{plan.group_name}</p>
                            )}
                          </div>

                          {/* Buying Audience */}
                          <div className="flex-1 min-w-0">
                            <label className="block text-xs font-medium text-gray-700 mb-1">Audience</label>
                            {isEditing ? (
                              <select
                                value={plan.buying_audience || ''}
                                onChange={(e) => handlePlanUpdate(plan.id, 'buying_audience', e.target.value)}
                                className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                              >
                                <option value="">Select...</option>
                                <option value="All Adults">All Adults</option>
                                <option value="Adults 16-34">Adults 16-34</option>
                                <option value="Adults 25-54">Adults 25-54</option>
                                <option value="Adults 35-64">Adults 35-64</option>
                                <option value="Adults 55+">Adults 55+</option>
                                <option value="Housewives">Housewives</option>
                                <option value="Men">Men</option>
                                <option value="Women">Women</option>
                                <option value="Children 4-15">Children 4-15</option>
                              </select>
                            ) : (
                              <p className="text-xs text-gray-900 bg-gray-50 px-2 py-1 rounded truncate">{plan.buying_audience || 'N/A'}</p>
                            )}
                          </div>

                          {/* Budget */}
                          <div className="w-20 min-w-0">
                            <label className="block text-xs font-medium text-gray-700 mb-1">Budget</label>
                            {isEditing ? (
                              <input
                                type="number"
                                value={plan.budget || ''}
                                onChange={(e) => handlePlanUpdate(plan.id, 'budget', e.target.value)}
                                placeholder="0"
                                className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            ) : (
                              <p className="text-xs text-gray-900 bg-gray-50 px-2 py-1 rounded truncate">
                                {plan.budget ? `£${plan.budget.toLocaleString()}` : 'N/A'}
                              </p>
                            )}
                          </div>

                          {/* Plan TVR */}
                          <div className="w-16 min-w-0">
                            <label className="block text-xs font-medium text-gray-700 mb-1">Plan</label>
                            {isEditing ? (
                              <input
                                type="number"
                                step="0.1"
                                value={plan.plan_tvr || ''}
                                onChange={(e) => handlePlanUpdate(plan.id, 'plan_tvr', e.target.value)}
                                placeholder="0.0"
                                className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            ) : (
                              <p className="text-xs text-gray-900 bg-gray-50 px-2 py-1 rounded truncate">
                                {plan.plan_tvr?.toFixed(1) || 'N/A'}
                              </p>
                            )}
                          </div>

                          {/* Deal TVR */}
                          <div className="w-16 min-w-0">
                            <label className="block text-xs font-medium text-gray-700 mb-1">Deal</label>
                            {isEditing ? (
                              <input
                                type="number"
                                step="0.1"
                                value={plan.deal_tvr || ''}
                                onChange={(e) => handlePlanUpdate(plan.id, 'deal_tvr', e.target.value)}
                                placeholder="0.0"
                                className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            ) : (
                              <p className="text-xs text-gray-900 bg-gray-50 px-2 py-1 rounded truncate">
                                {plan.deal_tvr?.toFixed(1) || 'N/A'}
                              </p>
                            )}
                          </div>

                          {/* Delete Button */}
                          {isEditing && (
                            <div className="flex items-end">
                              <button
                                onClick={() => handleDeletePlan(plan.id)}
                                className="px-2 py-1 text-xs text-red-600 hover:text-red-800 hover:bg-red-50 rounded focus:outline-none focus:ring-1 focus:ring-red-500"
                                title="Delete plan"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}


            </div>
          </div>
        </div>
      )}

      {/* Audience Change Modal */}
      {showAudienceChangeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-base font-semibold text-gray-900">Change Audience</h3>
              <button
                onClick={() => setShowAudienceChangeModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4">
              <p className="text-sm text-gray-600 mb-4">
                Choose how you want to modify the audience:
              </p>

              <div className="grid grid-cols-2 gap-6 px-2">
                {/* Add New Row Option */}
                <button
                  onClick={() => {
                    setShowAudienceChangeModal(false);
                    // TODO: Implement add new row functionality
                    console.log('Add new row for new audience line');
                  }}
                  className="flex flex-col items-start p-4 border-2 border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 group aspect-square"
                >
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-3 group-hover:bg-blue-200 transition-colors">
                    <Plus className="w-5 h-5 text-blue-600" />
                  </div>
                  <h4 className="font-medium text-gray-900 text-sm text-left">Add New Row</h4>
                  <p className="text-xs text-gray-600 text-left mt-1">New audience line</p>
                </button>

                {/* Edit Plan Option */}
                <button
                  onClick={() => {
                    setShowAudienceChangeModal(false);
                    // TODO: Implement edit plan functionality
                    console.log('Edit plan to change audience');
                  }}
                  className="flex flex-col items-start p-4 border-2 border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 group aspect-square"
                >
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-3 group-hover:bg-blue-200 transition-colors">
                    <Edit3 className="w-5 h-5 text-blue-600" />
                  </div>
                  <h4 className="font-medium text-gray-900 text-sm text-left">Edit Plan</h4>
                  <p className="text-xs text-gray-600 text-left mt-1">Modify existing</p>
                </button>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 p-4 border-t border-gray-200">
              <button
                onClick={() => setShowAudienceChangeModal(false)}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlanReconciliation; 