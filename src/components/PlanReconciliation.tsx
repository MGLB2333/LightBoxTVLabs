import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, ChevronRight, Plus, RefreshCw, BarChart3, CheckCircle, FileText, Filter } from 'lucide-react';
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

const PlanReconciliation: React.FC<PlanReconciliationProps> = ({
  selectedCampaign,
  selectedCampaignDetails,
  expandedSuppliers,
  onCampaignSelect,
  onCampaignClear,
  onSupplierToggle
}) => {
  const [activeTab, setActiveTab] = useState<'plan-vs-actual' | 'quality' | 'spots' | 'spot-analysis'>('plan-vs-actual');
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
    } else {
      setCampaignPlans([]);
      setCampaignSpots([]);
      setBarbSyncRun(false);
    }
  }, [selectedCampaign]);

  const loadCampaigns = async () => {
    try {
      setIsLoading(true);
      const campaignsData = await TVCampaignService.getCampaigns();
      setCampaigns(campaignsData);
    } catch (error) {
      console.error('Error loading campaigns:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadCampaignPlans = async (campaignId: string) => {
    try {
      setIsLoading(true);
      // Use getCampaignPlansWithActuals for initial load (no BARB sync)
      const plansData = await TVCampaignService.getCampaignPlansWithActuals(campaignId);
      setCampaignPlans(plansData);
    } catch (error) {
      console.error('Error loading campaign plans:', error);
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
        if (['budget', 'plan_tvr', 'deal_tvr', 'plan_value', 'cpt', 'sec'].includes(field)) {
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
      sec: undefined,
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
            cpt: plan.cpt,
            sec: plan.sec
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
  }, [filteredSpots, selectedAudience]);

  // Analyze raw spots by position in break
  const positionAnalysis = useMemo(() => {
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
  }, [filteredSpots, selectedAudience]);



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
              {selectedCampaignDetails?.name || 'Selected Campaign'}
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
              <option value="">Select a campaign...</option>
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

              </div>
              
              <div className="flex flex-col items-end gap-1">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-gray-400" />
                  <button
                    onClick={() => {/* TODO: Implement audience change functionality */}}
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
            <div className="w-full overflow-hidden">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 max-w-xs pl-4">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Audience</label>
                  <select
                    value={selectedSpotsAudience}
                    onChange={(e) => setSelectedSpotsAudience(e.target.value)}
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="All Audiences">All Audiences</option>
                    {uniqueSpotsAudiences.map((audience) => (
                      <option key={audience} value={audience}>
                        {audience}
                      </option>
                    ))}
                  </select>
                </div>
                {selectedSpotsAudience && selectedSpotsAudience !== 'All Audiences' && (
                  <button
                    onClick={() => setSelectedSpotsAudience('All Audiences')}
                    className="px-2 py-1 text-xs font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded focus:outline-none focus:ring-1 focus:ring-gray-500"
                  >
                    Clear
                  </button>
                )}
              </div>
              <div className="overflow-x-auto" style={{ maxWidth: 'calc(100vw - 20rem)', width: 'calc(100vw - 20rem)' }}>
                <table className="w-full" style={{ minWidth: '1600px' }}>
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Station</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Audience</th>
                      <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Spots</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Spot Type</th>
                      <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Preceding Programme</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Succeeding Programme</th>
                      <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Position</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Buyer Code</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Buyer Name</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Advertiser Code</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Advertiser Name</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sales House</th>
                      <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Size</th>
                      <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Target Size</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {spotsWithCounts.length > 0 ? (
                      spotsWithCounts.map((spot, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-3 py-2 text-xs text-gray-900 whitespace-nowrap">{spot.station_name}</td>
                          <td className="px-3 py-2 text-xs text-gray-900 whitespace-nowrap">{spot.audience_name}</td>
                          <td className="px-3 py-2 text-xs text-center text-gray-900 whitespace-nowrap font-medium">{spot.audienceSpotCount}</td>
                          <td className="px-3 py-2 text-xs text-gray-900 whitespace-nowrap">{spot.spot_type}</td>
                          <td className="px-3 py-2 text-xs text-center text-gray-900 whitespace-nowrap">{spot.spot_duration}s</td>
                          <td className="px-3 py-2 text-xs text-gray-900 whitespace-nowrap">{spot.preceding_programme_name}</td>
                          <td className="px-3 py-2 text-xs text-gray-900 whitespace-nowrap">{spot.succeeding_programme_name}</td>
                          <td className="px-3 py-2 text-xs text-center text-gray-900 whitespace-nowrap">{spot.position_in_break}</td>
                          <td className="px-3 py-2 text-xs text-gray-900 whitespace-nowrap">{spot.clearcast_buyer_code}</td>
                          <td className="px-3 py-2 text-xs text-gray-900 whitespace-nowrap">{spot.clearcast_buyer_name}</td>
                          <td className="px-3 py-2 text-xs text-gray-900 whitespace-nowrap">{spot.clearcast_advertiser_code}</td>
                          <td className="px-3 py-2 text-xs text-gray-900 whitespace-nowrap">{spot.clearcast_advertiser_name}</td>
                          <td className="px-3 py-2 text-xs text-gray-900 whitespace-nowrap">{spot.sales_house_name}</td>
                          <td className="px-3 py-2 text-xs text-center text-gray-900 whitespace-nowrap">{spot.audience_size_hundreds?.toLocaleString() || '0'}</td>
                          <td className="px-3 py-2 text-xs text-center text-gray-900 whitespace-nowrap">{spot.audience_target_size_hundreds?.toLocaleString() || '0'}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={15} className="px-3 py-4 text-center text-sm text-gray-500">
                          {isLoading ? 'Loading spots...' : 
                           selectedSpotsAudience ? `No spots found for audience: ${selectedSpotsAudience}` : 
                           'No spots found for this campaign. Try syncing BARB data.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {filteredSpotsForTable.length > 0 && (
                <div className="px-4 py-2 bg-gray-50 border-t border-gray-200">
                  <p className="text-xs text-gray-500">
                    Showing {filteredSpotsForTable.length} of {campaignSpots.length} spots from BARB API (A A AUTOMOBILE ASS / THE7STARS UK LIMITED, Aug 2025)
                    {selectedSpotsAudience && ` • Filtered by audience: ${selectedSpotsAudience}`}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Spot Analysis Tab Content */}
          {activeTab === 'spot-analysis' && (
            <div className="w-full overflow-hidden">
              <div className="overflow-x-auto" style={{ maxWidth: 'calc(100vw - 20rem)', width: 'calc(100vw - 20rem)' }}>
                <table className="w-full border-collapse" style={{ minWidth: '1200px' }}>
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10 border-r border-gray-200">
                        Station
                      </th>
                      {spotAnalysisMatrix.audiences.map((audience) => (
                        <th key={audience} className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
                          {audience}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {spotAnalysisMatrix.stations.map((station) => (
                      <tr key={station} className="hover:bg-gray-50">
                        <td className="px-3 py-2 text-xs text-gray-900 whitespace-nowrap sticky left-0 bg-white z-10 border-r border-gray-200 font-medium">
                          {station}
                        </td>
                        {spotAnalysisMatrix.audiences.map((audience) => {
                          const value = spotAnalysisMatrix.matrix[station]?.[audience] || 0;
                          const heatmapColor = getHeatmapColor(value, spotAnalysisMatrix.maxValue);
                          return (
                            <td 
                              key={`${station}-${audience}`} 
                              className={`px-3 py-2 text-xs text-center whitespace-nowrap border-r border-gray-200 ${heatmapColor} ${value > spotAnalysisMatrix.maxValue * 0.6 ? 'text-white font-medium' : 'text-gray-900'}`}
                            >
                              {value.toLocaleString()}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {spotAnalysisMatrix.stations.length > 0 && (
                <div className="px-4 py-2 bg-gray-50 border-t border-gray-200">
                  <p className="text-xs text-gray-500">
                    Spot Analysis Matrix: {spotAnalysisMatrix.stations.length} stations × {spotAnalysisMatrix.audiences.length} audiences
                  </p>
                </div>
              )}
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
    </div>
  );
};

export default PlanReconciliation; 