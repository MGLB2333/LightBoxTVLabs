import React, { useState, useEffect } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Polygon, Popup } from 'react-leaflet';
import { cellToBoundary, latLngToCell } from 'h3-js';
import { supabase } from '../lib/supabase';
import { useBanner, useSetBanner } from '../components/layout/BannerContext';
import PageBanner from '../components/layout/PageBanner';
import { AudienceAgent } from '../lib/agents/AudienceAgent';

interface AudienceRecommendation {
  segmentId: string;
  segmentName: string;
  taxonomyPath: string;
  description: string;
  confidence: number;
  reasoning: string;
  matchScore: number;
}

const AudienceBuilder: React.FC = () => {
  const location = useLocation();
  const setBanner = useSetBanner();
  const navigate = useNavigate();
  
  // State for segments and hierarchy
  const [segments, setSegments] = useState<any[]>([]);
  const [segmentLoading, setSegmentLoading] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [selectedSegments, setSelectedSegments] = useState<Set<string>>(new Set());
  
  // State for postcode data and hexagons
  const [postcodeData, setPostcodeData] = useState<any[]>([]);
  const [hexagons, setHexagons] = useState<any[]>([]);
  const [hexResolution, setHexResolution] = useState(6);
  const [loading, setLoading] = useState(false);
  
  // State for AI Audience
  const [audienceDescription, setAudienceDescription] = useState('');
  const [recommendations, setRecommendations] = useState<AudienceRecommendation[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedRecommendations, setSelectedRecommendations] = useState<Set<string>>(new Set());
  const [hoverTooltip, setHoverTooltip] = useState<{ show: boolean; reasoning: string; segmentName: string; x: number; y: number }>({
    show: false,
    reasoning: '',
    segmentName: '',
    x: 0,
    y: 0
  });

  // Route detection
  const isUberSegment = location.pathname === '/audience-builder/uber';
  const isAIAudience = location.pathname === '/audience-builder/ai';

  const tabs = [
    { name: 'Audience Builder', path: '/audience-builder' },
    { name: 'AI Audience', path: '/audience-builder/ai' },
    { name: 'Uber Segment', path: '/audience-builder/uber' }
  ];

  // Fetch Experian segments from taxonomy
  useEffect(() => {
    const fetchSegments = async () => {
      setSegmentLoading(true);
      console.log('🔍 Fetching Experian segments...');
      
      try {
        // First check if we can access the table at all
        const { data: testData, error: testError } = await supabase
          .from('experian_taxonomy')
          .select('*')
          .limit(1);
        
        console.log('🔍 Test query result:', { testData, testError });
        
        const { data, error } = await supabase
          .from('experian_taxonomy')
          .select('"Segment ID", "Segment Name", "Taxonomy > Parent Path"')
          .not('"Segment ID"', 'is', null)
          .order('"Segment Name"');
        
        console.log('🔍 Main query result:', { data, error });
        
        if (error) {
          console.error('Error fetching segments:', error);
          return;
        }
        
        console.log('🔍 Segments loaded:', data?.length || 0);
        setSegments(data || []);
      } catch (error) {
        console.error('Error fetching segments:', error);
      } finally {
        setSegmentLoading(false);
      }
    };

    fetchSegments();
  }, []);

  // Fetch postcode data when segments are selected
  useEffect(() => {
    if (selectedSegments.size === 0) {
      setPostcodeData([]);
      return;
    }

    const fetchPostcodeData = async () => {
      setLoading(true);
      try {
        // Build the query for multiple segments
        const segmentIds = Array.from(selectedSegments);
        const selectFields = ['"Postcode sector"', ...segmentIds.map(id => `"${id}"`)];
        
        console.log('🔍 DEBUG: Fetching with segments:', segmentIds);
        console.log('🔍 DEBUG: Select fields:', selectFields);
        
        // Use pagination to fetch all data
        const allData: any[] = [];
        const pageSize = 1000;
        let from = 0;
        let hasMore = true;
        let totalFetched = 0;
        
        while (hasMore && totalFetched < 100000) { // Safety limit
          console.log(`🔍 DEBUG: Fetching page ${Math.floor(from / pageSize) + 1}...`);
          
          const { data, error } = await supabase
            .from('experian_data')
            .select(selectFields.join(', '))
            .or(segmentIds.map(id => `"${id}".gt.0`).join(','))
            .order('"Postcode sector"')
            .range(from, from + pageSize - 1);
          
          if (error) {
            console.error('Error fetching postcode data:', error);
            break;
          }
          
          if (data && data.length > 0) {
            allData.push(...data);
            from += pageSize;
            totalFetched += data.length;
            console.log(`🔍 DEBUG: Fetched ${data.length} records, total: ${allData.length}`);
          } else {
            hasMore = false;
          }
          
          // If we got less than pageSize, we've reached the end
          if (data && data.length < pageSize) {
            hasMore = false;
          }
        }
        
        console.log('🔍 DEBUG: Final postcode data fetched:', allData.length, 'records');
        console.log('🔍 DEBUG: First few records:', allData.slice(0, 3));
        
        setPostcodeData(allData);
      } catch (error) {
        console.error('Error fetching postcode data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPostcodeData();
  }, [selectedSegments]);

  // Generate hexagons when postcode data changes
  useEffect(() => {
    const generateHexagons = async () => {
      console.log('🔍 generateHexagons called with:', {
        postcodeDataLength: postcodeData.length,
        selectedSegments: Array.from(selectedSegments),
        segmentsLength: segments.length
      });
      
      if (!postcodeData.length) {
        console.log('🔍 No postcode data, clearing hexagons');
        setHexagons([]);
        return;
      }
      
      if (selectedSegments.size === 0) {
        console.log('🔍 No selected segments, clearing hexagons');
        setHexagons([]);
        return;
      }
      
      try {
        // Get postcodes from the data
        const postcodes = postcodeData.map(item => item['Postcode sector']).filter(Boolean);
        console.log('🔍 Found postcodes:', postcodes.length);
        
        // Extract districts for the query
        const districts = postcodes.map(p => p.split(' ')[0]);
        
        // Fetch coordinates for these postcodes
        const { data: geoData, error } = await supabase
          .from('Geo_lookup')
          .select('"Postcode District", "Latitude", "Longitude"')
          .in('"Postcode District"', districts);
        
        if (error) {
          console.error('Error fetching geo data:', error);
          setHexagons([]);
          return;
        }
        
        console.log('🔍 Found geo data for districts:', geoData?.length || 0);
        
        // Create a map of postcode to coordinates
        const postcodeToCoords = new Map();
        geoData?.forEach(item => {
          postcodeToCoords.set(item["Postcode District"], [item["Latitude"], item["Longitude"]]);
        });
        
        // Generate hexagons for postcodes with coordinates
        const newHexagons = [];
        
        // Aggregate postcodes by H3 hexagon
        const h3Aggregated: Record<string, { count: number; postcodes: string[] }> = {};
        
        for (const item of postcodeData) {
          const postcode = item['Postcode sector'];
          const district = postcode.split(' ')[0]; // <-- extract district
          const coords = postcodeToCoords.get(district); // <-- use district for lookup
          
          if (coords && coords[0] && coords[1]) {
            try {
              // Convert to H3 hexagon
              const h3Index = latLngToCell(coords[0], coords[1], hexResolution);
              
              if (!h3Aggregated[h3Index]) {
                h3Aggregated[h3Index] = { count: 0, postcodes: [] };
              }
              
              // Add the audience count for all selected segments
              let totalValue = 0;
              for (const segmentId of selectedSegments) {
                totalValue += item[segmentId] || 0;
              }
              
              h3Aggregated[h3Index].count += totalValue;
              h3Aggregated[h3Index].postcodes.push(postcode);
            } catch (error) {
              console.error('Error converting to H3:', error);
            }
          }
        }
        
        console.log('🔍 Aggregated hexagons:', Object.keys(h3Aggregated).length);
        
        // Convert aggregated data to hexagon polygons
        for (const [h3Index, data] of Object.entries(h3Aggregated)) {
          try {
            const boundary = cellToBoundary(h3Index);
            
            const coordinates = boundary; // No swap needed - cellToBoundary returns [lat, lng] format
            
            newHexagons.push({
              id: h3Index,
              coordinates,
              value: data.count,
              postcodes: data.postcodes
            });
          } catch (error) {
            console.error('Error creating hexagon boundary:', error);
          }
        }
        
        console.log('🔍 Final hexagons created:', newHexagons.length);
        setHexagons(newHexagons);
      } catch (error) {
        console.error('Error generating hexagons:', error);
        setHexagons([]);
      }
    };

    generateHexagons();
  }, [postcodeData, hexResolution, selectedSegments]);

  // Create hierarchy from segments
  const createHierarchy = (segments: any[]) => {
    const hierarchy: Record<string, any> = {};
    
    segments.forEach(segment => {
      const path = segment['Taxonomy > Parent Path'] || 'Other';
      const pathParts = path.split(' > ');
      
      let currentLevel = hierarchy;
      let fullPath = '';
      
      pathParts.forEach((part: string, index: number) => {
        const isLast = index === pathParts.length - 1;
        fullPath = fullPath ? `${fullPath} > ${part}` : part;
        
        if (!currentLevel[part]) {
          currentLevel[part] = {
            name: part,
            fullPath: fullPath,
            segments: [],
            children: {}
          };
        }
        
        if (isLast) {
          // This is a leaf node - add the segment
          currentLevel[part].segments.push(segment);
        } else {
          // This is a branch node - move to next level
          currentLevel = currentLevel[part].children;
        }
      });
    });
    
    return hierarchy;
  };

  const segmentHierarchy = createHierarchy(segments);

  // Color function for hexagons
  const getHexColor = (value: number) => {
    const maxValue = Math.max(...hexagons.map(h => h.value), 1);
    const normalizedValue = value / maxValue;
    
    // Use a blue color scale
    const intensity = Math.floor(normalizedValue * 255);
    return `rgb(2, 179, 229, ${0.3 + normalizedValue * 0.7})`;
  };

  // Recursive component to render hierarchy
  const renderHierarchyLevel = (level: any, levelKey: string, depth: number = 0) => {
    const hasChildren = Object.keys(level.children).length > 0;
    const hasSegments = level.segments.length > 0;
    const isExpanded = expandedCategories.has(levelKey);
    
    return (
      <div key={levelKey} className={depth > 0 ? "pl-4 border-l border-gray-200" : ""}>
        {/* Level Header */}
        {(hasChildren || hasSegments) && (
          <button
            onClick={() => toggleCategory(levelKey)}
            className={`w-full px-6 py-3 text-left text-sm font-medium flex items-center justify-between transition-colors ${
              isExpanded 
                ? 'bg-[#02b3e5]/10 text-[#02b3e5] border-[#02b3e5]/20' 
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <span>{level.name}</span>
            {(hasChildren || hasSegments) && (
              <svg
                className={`w-4 h-4 transition-transform ${
                  isExpanded ? 'rotate-90' : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            )}
          </button>
        )}
        
        {/* Expanded Content */}
        {isExpanded && (
          <div className="border-t border-gray-200">
            {/* Child Levels */}
            {Object.entries(level.children).map(([childKey, childLevel]: [string, any]) => 
              renderHierarchyLevel(childLevel, childKey, depth + 1)
            )}
            
            {/* Segments at this level */}
            {level.segments.map((segment: any) => {
              const isSelected = selectedSegments.has(segment['Segment ID']);
              return (
                <div
                  key={segment['Segment ID']}
                  className={`px-6 py-3 cursor-pointer flex items-center justify-between ${
                    isSelected 
                      ? 'bg-[#02b3e5]/10 text-[#02b3e5]' 
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={() => toggleSegment(segment['Segment ID'])}
                >
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSegment(segment['Segment ID'])}
                      className="h-4 w-4 text-[#02b3e5] border-gray-300 rounded focus:ring-[#02b3e5]"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <span className={`ml-2 text-sm ${
                      isSelected ? 'text-[#02b3e5]' : 'text-gray-700'
                    }`}>
                      {segment['Segment Name']}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">
                    ({segment['Segment ID']})
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // Helper functions for AI Audience
  const handleGenerateRecommendations = async () => {
    if (!audienceDescription.trim()) return;
    
    setIsGenerating(true);
    try {
      const audienceAgent = AudienceAgent.getInstance();
      const recs = await audienceAgent.recommendAudiences(audienceDescription);
      setRecommendations(recs);
      setSelectedRecommendations(new Set()); // Reset selections
    } catch (error) {
      console.error('Error generating recommendations:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleRecommendation = (segmentId: string) => {
    const newSelected = new Set(selectedRecommendations);
    if (newSelected.has(segmentId)) {
      newSelected.delete(segmentId);
    } else {
      newSelected.add(segmentId);
    }
    setSelectedRecommendations(newSelected);
  };

  const handleApplySelected = () => {
    setSelectedSegments(prev => {
      const newSet = new Set(prev);
      selectedRecommendations.forEach(segmentId => newSet.add(segmentId));
      return newSet;
    });
    setSelectedRecommendations(new Set());
    navigate('/audience-builder');
  };

  const showReasoningPopup = (reasoning: string, segmentName: string, event: React.MouseEvent) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setHoverTooltip({ 
      show: true, 
      reasoning, 
      segmentName, 
      x: rect.left + rect.width / 2, 
      y: rect.top - 10 
    });
  };

  const hideReasoningPopup = () => {
    setHoverTooltip({ show: false, reasoning: '', segmentName: '', x: 0, y: 0 });
  };

  // Helper functions for the new interface
  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const toggleSegment = (segmentId: string) => {
    const newSelected = new Set(selectedSegments);
    if (newSelected.has(segmentId)) {
      newSelected.delete(segmentId);
    } else {
      newSelected.add(segmentId);
    }
    setSelectedSegments(newSelected);
  };

  // Update postcode data when selected segments change
  useEffect(() => {
    if (selectedSegments.size === 0) {
      setPostcodeData([]);
      return;
    }

    const fetchPostcodeData = async () => {
      setLoading(true);
      try {
        // Build the query for multiple segments
        const segmentIds = Array.from(selectedSegments);
        const selectFields = ['"Postcode sector"', ...segmentIds.map(id => `"${id}"`)];
        
        console.log('🔍 DEBUG: Fetching with segments:', segmentIds);
        console.log('🔍 DEBUG: Select fields:', selectFields);
        
        // Use pagination to fetch all data
        const allData: any[] = [];
        const pageSize = 1000;
        let from = 0;
        let hasMore = true;
        let totalFetched = 0;
        
        while (hasMore && totalFetched < 100000) { // Safety limit
          console.log(`🔍 DEBUG: Fetching page ${Math.floor(from / pageSize) + 1}...`);
          
          const { data, error } = await supabase
            .from('experian_data')
            .select(selectFields.join(', '))
            .or(segmentIds.map(id => `"${id}".gt.0`).join(','))
            .order('"Postcode sector"')
            .range(from, from + pageSize - 1);
          
          if (error) {
            console.error('Error fetching postcode data:', error);
            break;
          }
          
          if (data && data.length > 0) {
            allData.push(...data);
            from += pageSize;
            totalFetched += data.length;
            console.log(`🔍 DEBUG: Fetched ${data.length} records, total: ${allData.length}`);
          } else {
            hasMore = false;
          }
          
          // If we got less than pageSize, we've reached the end
          if (data && data.length < pageSize) {
            hasMore = false;
          }
        }
        
        console.log('🔍 DEBUG: Final postcode data fetched:', allData.length, 'records');
        console.log('🔍 DEBUG: First few records:', allData.slice(0, 3));
        
        setPostcodeData(allData);
      } catch (error) {
        console.error('Error fetching postcode data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPostcodeData();
  }, [selectedSegments]);

  // Set banner
  useEffect(() => {
    setBanner(
      <PageBanner>
        <div className="w-full">
          <div className="flex items-end justify-between mb-2">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Audience Builder</h1>
              <p className="text-sm text-gray-500 mt-1">Build and analyze custom audience segments</p>
            </div>
          </div>
          <nav className="mt-4 flex space-x-8">
            {tabs.map(tab => {
              const active = location.pathname === tab.path;
              return (
                <Link
                  key={tab.path}
                  to={tab.path}
                  className={`pb-2 text-sm font-medium transition-colors border-b-2 ${active ? 'border-[#3bc8ea] text-[#3bc8ea]' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                >
                  {tab.name}
                </Link>
              );
            })}
          </nav>
        </div>
      </PageBanner>
    );
    return () => setBanner(null);
  }, [setBanner, location.pathname]);

  // Render content based on current route
  const renderContent = () => {
    if (isUberSegment) {
      return (
        <div className="bg-white rounded-sm border border-gray-200 p-12">
          <div className="text-center">
            <svg className="mx-auto h-16 w-16 text-gray-400 mb-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Uber Segment Builder</h2>
            <p className="text-lg text-gray-600 mb-6">
              This feature will be available in the platform soon.
            </p>
            <p className="text-gray-500 mb-8">
              For the meantime, you can access the Uber Segment Builder at:
            </p>
            <a
              href="https://lightboxlabs-da.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-6 py-3 bg-[#02b3e5] text-white font-medium rounded-md hover:bg-[#02b3e5]/90 transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Open Uber Segment Builder
            </a>
          </div>
        </div>
      );
    }

    if (isAIAudience) {
      return (
        <div className="bg-white rounded-sm border border-gray-200 p-12">
          <div className="max-w-4xl mx-auto">
            {/* Input Section */}
            <div className="mb-8">
              <label htmlFor="audience-description" className="block text-sm font-medium text-gray-700 mb-2">
                Describe your target audience
              </label>
              <div className="bg-pink-50 rounded-lg p-4">
                <textarea
                  id="audience-description"
                  value={audienceDescription}
                  onChange={(e) => setAudienceDescription(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 resize-none bg-white mb-4"
                  placeholder="e.g., Young professionals aged 25-35 who are interested in fitness and technology, living in urban areas with disposable income..."
                />
                <div className="flex justify-center">
                  <button 
                    onClick={handleGenerateRecommendations}
                    disabled={!audienceDescription.trim() || isGenerating}
                    className="inline-flex items-center px-6 py-3 bg-pink-500 text-white font-medium rounded-md hover:bg-pink-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isGenerating ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                        Generate Recommendations
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Recommendations Section */}
            {recommendations.length === 0 && !isGenerating && (
              <div className="mb-8">
                <div className="bg-gray-50 rounded-lg p-8 text-center">
                  <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Ready to find your audience?</h3>
                  <p className="text-gray-600">
                    Describe your target audience above and click "Generate Recommendations" to get started.
                  </p>
                </div>
              </div>
            )}

            {recommendations.length > 0 && (
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Recommended Segments ({recommendations.length})
                  </h3>
                  {selectedRecommendations.size > 0 && (
                    <button
                      onClick={handleApplySelected}
                      className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 transition-colors"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Apply Selected ({selectedRecommendations.size})
                    </button>
                  )}
                </div>
                
                <div className="space-y-4">
                  {recommendations.map((rec, index) => (
                    <div
                      key={rec.segmentId}
                      className={`border rounded-lg p-6 cursor-pointer transition-all ${
                        selectedRecommendations.has(rec.segmentId)
                          ? 'border-[#02b3e5] bg-[#02b3e5]/5'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={(e) => {
                        // Only toggle selection if not clicking on the percentage button
                        if (!(e.target as HTMLElement).closest('button')) {
                          toggleRecommendation(rec.segmentId);
                        }
                      }}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            checked={selectedRecommendations.has(rec.segmentId)}
                            onChange={() => toggleRecommendation(rec.segmentId)}
                            className="h-4 w-4 text-[#02b3e5] border-gray-300 rounded focus:ring-[#02b3e5]"
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div className="ml-3 flex items-center">
                            <img 
                              src="https://www.experian.com/favicon.ico" 
                              alt="Experian" 
                              className="w-4 h-4 mr-2"
                              onError={(e) => {
                                // Fallback to a default icon if favicon fails to load
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                            <span className="text-base font-medium text-gray-900">
                              {rec.segmentName}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <span className="text-sm text-gray-500">#{index + 1}</span>
                          <button
                            onMouseEnter={(e) => showReasoningPopup(rec.reasoning, rec.segmentName, e)}
                            onMouseLeave={hideReasoningPopup}
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 hover:bg-blue-200 transition-colors cursor-pointer"
                          >
                            {Math.round(rec.confidence * 100)}% match
                          </button>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="text-gray-600 text-sm">{rec.taxonomyPath}</div>
                        
                        {rec.description && (
                          <div>
                            <div className="font-medium text-gray-700 mb-1">Description</div>
                            <div className="text-gray-600 text-sm">{rec.description}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Selected Segments Summary */}
            {selectedRecommendations.size > 0 && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900 mb-2">
                  Selected Segments ({selectedRecommendations.size})
                </h4>
                <div className="flex flex-wrap gap-2">
                  {recommendations
                    .filter(rec => selectedRecommendations.has(rec.segmentId))
                    .map(rec => (
                      <span
                        key={rec.segmentId}
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-[#02b3e5] text-white"
                      >
                        {rec.segmentName}
                        <button
                          onClick={() => toggleRecommendation(rec.segmentId)}
                          className="ml-1 hover:bg-[#02b3e5]/80 rounded-full p-0.5"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </span>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }

    // Hover Tooltip
    if (hoverTooltip.show) {
      return (
        <div className="fixed inset-0 z-50 pointer-events-none">
          <div 
            className="absolute bg-gray-900 text-white text-sm rounded-lg p-3 max-w-xs shadow-lg pointer-events-auto"
            style={{
              left: `${hoverTooltip.x}px`,
              top: `${hoverTooltip.y}px`,
              transform: 'translateX(-50%) translateY(-100%)'
            }}
          >
            <div className="font-medium mb-1">{hoverTooltip.segmentName}</div>
            <div className="text-gray-300 text-xs leading-relaxed">{hoverTooltip.reasoning}</div>
            {/* Arrow pointing down */}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
          </div>
        </div>
      );
    }

    // Default Audience Builder content
    return (
      <div className="bg-white rounded-sm border border-gray-200 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 w-full h-full">
          {/* Left Column - Data Partner & Segments */}
          <div className="lg:col-span-4 border-r border-gray-200">
            {/* Column Header */}
            <div className="px-6 py-3 bg-white border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900">Data Partners</h3>
            </div>
            
            {/* Search Bar */}
            <div className="px-6 py-1 border-b border-gray-200">
              <div className="flex">
                <div className="relative flex-1">
                  <svg
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search segments..."
                    className="w-full pl-10 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#02b3e5] focus:border-[#02b3e5]"
                  />
                </div>
                <button className="ml-2 px-3 py-2 bg-[#02b3e5] text-white text-sm font-medium rounded-md hover:bg-[#02b3e5]/90 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
              </div>
            </div>
            
            {/* Segments Section */}
            <div className="w-full">
              <div className="w-full">
                {/* Segments Tree */}
                <div className="w-full">
                  {segmentLoading ? (
                    <div className="px-6 py-4 text-sm text-gray-500">Loading segments...</div>
                  ) : (
                    <div className="space-y-1 max-h-96 overflow-y-auto w-full">
                      {/* Data Partner Level */}
                      <div className="border border-gray-200 w-full">
                        <button
                          onClick={() => toggleCategory('experian')}
                          className={`w-full px-6 py-3 text-left text-sm font-medium flex items-center justify-between transition-colors ${
                            expandedCategories.has('experian') 
                              ? 'bg-[#02b3e5]/10 text-[#02b3e5] border-[#02b3e5]/20' 
                              : 'bg-white text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center">
                            <img 
                              src="https://www.experian.com/favicon.ico" 
                              alt="Experian" 
                              className="w-4 h-4 mr-2"
                              onError={(e) => {
                                // Fallback to a default icon if favicon fails to load
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                            <span>Experian</span>
                          </div>
                          <svg
                            className={`w-4 h-4 transition-transform ${
                              expandedCategories.has('experian') ? 'rotate-90' : ''
                            }`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                        
                        {expandedCategories.has('experian') && (
                          <div className="border-t border-gray-200 w-full">
                            {Object.entries(segmentHierarchy).map(([category, categoryNode]) => (
                              renderHierarchyLevel(categoryNode, category)
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Map */}
          <div className="lg:col-span-8 w-full">
            {/* Column Header */}
            <div className="px-6 py-3 bg-white border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900">Geographic Distribution</h3>
            </div>
            
            <div className="p-6 w-full">
              {/* Hex Resolution Toggle */}
              <div className="mb-4 flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">Hex Resolution</label>
                <div className="flex space-x-1">
                  {[3, 4, 5, 6, 7, 8].map((res) => (
                    <button
                      key={res}
                      onClick={() => setHexResolution(res)}
                      className={`px-3 py-1 text-sm font-medium rounded-sm transition-colors ${
                        hexResolution === res
                          ? 'bg-[#02b3e5] text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {res}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="h-96 rounded-md overflow-hidden w-full">
                {loading ? (
                  <div className="flex items-center justify-center h-full text-gray-400">
                    Loading geographic data...
                  </div>
                ) : (
                  <MapContainer
                    center={[51.505, -0.09]}
                    zoom={6}
                    style={{ height: '100%', width: '100%', minWidth: '100%' }}
                    className="w-full h-full"
                  >
                    <TileLayer
                      url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                    />
                    {hexagons.map((hex: any) => (
                      <Polygon
                        key={hex.id}
                        positions={hex.coordinates}
                        pathOptions={{
                          fillColor: getHexColor(hex.value),
                          color: '#02b3e5',
                          weight: 1,
                          opacity: 0.8,
                          fillOpacity: 0.6,
                        }}
                      >
                        <Popup>
                          <div className="text-sm">
                            <p><strong>Postcode:</strong> {hex.postcodes.join(', ')}</p>
                            <p><strong>Audience Count:</strong> {hex.value.toLocaleString()}</p>
                          </div>
                        </Popup>
                      </Polygon>
                    ))}
                  </MapContainer>
                )}
              </div>
              
              {/* Data Count Display */}
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between text-sm text-gray-600 bg-gray-50 px-4 py-2 rounded-md">
                  <div className="flex items-center space-x-6">
                    <div className="flex items-center space-x-2">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span><strong>{postcodeData.length.toLocaleString()}</strong> postcode sectors</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                      </svg>
                      <span><strong>{hexagons.length.toLocaleString()}</strong> hexagons</span>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    {selectedSegments.size > 0 ? `${selectedSegments.size} segment${selectedSegments.size !== 1 ? 's' : ''} selected` : 'No segments selected'}
                  </div>
                </div>
                
                {/* Selected Segment Names */}
                {selectedSegments.size > 0 && (
                  <div className="bg-blue-50 px-4 py-3 rounded-md">
                    <div className="text-sm font-medium text-gray-700 mb-2">Selected Segments:</div>
                    <div className="flex flex-wrap gap-2">
                      {segments
                        .filter(segment => selectedSegments.has(segment['Segment ID']))
                        .map(segment => (
                          <span
                            key={segment['Segment ID']}
                            className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-[#02b3e5] text-white"
                          >
                            {segment['Segment Name']}
                            <button
                              onClick={() => toggleSegment(segment['Segment ID'])}
                              className="ml-1 hover:bg-[#02b3e5]/80 rounded-full p-0.5"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </span>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {renderContent()}
    </div>
  );
};

export default AudienceBuilder; 
                            <button
                              onClick={() => toggleSegment(segment['Segment ID'])}
                              className="ml-1 hover:bg-[#02b3e5]/80 rounded-full p-0.5"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </span>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {renderContent()}
    </div>
  );
};

export default AudienceBuilder; 