import React, { useState, useEffect } from 'react';
import { RealExperianService } from '../../lib/realExperianService';
import type { GeographicAudienceData, PostcodePerformance } from '../../lib/realExperianService';
import AudienceMap from '../../components/AudienceMap';
import LoadingSpinner from '../../components/LoadingSpinner';

const blue = '#02b3e5';

const Audience: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'geo' | 'demographic'>('geo');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [audienceData, setAudienceData] = useState<GeographicAudienceData | null>(null);
  const [hasExperianData, setHasExperianData] = useState(false);
  const [demographicInsights, setDemographicInsights] = useState<any>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Hex Zoom Filter State
  const [h3Resolution, setH3Resolution] = useState(5);

  useEffect(() => {
    const fetchAudienceData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        console.log('🔍 Fetching audience data from RealExperianService...');
        const data = await RealExperianService.getGeographicAudienceData();
        console.log('✅ Audience data received:', {
          totalImpressions: data.totalImpressions,
          totalCompletions: data.totalCompletions,
          totalSpend: data.totalSpend,
          postcodeCount: data.postcodePerformance.length,
          topSegmentsCount: data.topSegments.length
        });
        setAudienceData(data);
        setHasExperianData(data.topSegments.length > 0);
        
        // Fetch demographic insights
        console.log('🔍 Fetching demographic insights...');
        try {
          const insights = await RealExperianService.getDemographicInsights();
          console.log('✅ Demographic insights received');
          setDemographicInsights(insights);
        } catch (insightsError: any) {
          console.error('Error fetching demographic insights:', insightsError);
          // Don't fail the entire component if demographic insights fail
          setDemographicInsights(null);
        }
      } catch (err: any) {
        console.error('Error fetching audience data:', err);
        setError(err.message || 'Failed to fetch audience data');
      } finally {
        setLoading(false);
      }
    };

    fetchAudienceData();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <LoadingSpinner text="Loading audience data..." size="lg" />
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
          <h2 className="text-xl font-semibold text-red-800 mb-2">Analysis Error</h2>
          <p className="text-red-700 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!audienceData) {
    return (
      <div className="bg-white border border-gray-200 rounded-sm shadow-sm p-8 text-center text-gray-400">
        <p>No audience data available</p>
      </div>
    );
  }

  const { postcodePerformance, topSegments, totalImpressions, totalCompletions, totalSpend } = audienceData;

  // Pagination calculations
  const totalPages = Math.ceil(postcodePerformance.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentPostcodes = postcodePerformance.slice(startIndex, endIndex);

  return (
    <div className="w-full space-y-0">
      {/* Experian Data Notice */}
      {!hasExperianData && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <div className="text-yellow-600 mr-3">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-medium text-yellow-800">Experian Data Not Available</h3>
              <p className="text-sm text-yellow-700 mt-1">
                The Experian demographic data tables are currently empty. Geographic distribution data is still available from campaign delivery data.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b-0 border-gray-200">
        <button
          onClick={() => setActiveTab('geo')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'geo'
              ? 'border-[#02b3e5] text-[#02b3e5] bg-white border-t border-l border-r border-gray-200'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Geographic Distribution
        </button>
        <button
          onClick={() => setActiveTab('demographic')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'demographic'
              ? 'border-[#02b3e5] text-[#02b3e5] bg-white border-t border-l border-r border-gray-200'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
          disabled={!hasExperianData}
        >
          Demographics {!hasExperianData && '(No Data)'}
        </button>
      </div>

      {/* Audience Analytics - Tabbed Layout */}
      <div className="bg-white rounded-b shadow border border-gray-100 p-4 overflow-hidden">
        {activeTab === 'geo' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Map Column */}
            <div className="h-[580px] overflow-hidden">
              <AudienceMap h3Resolution={h3Resolution} setH3Resolution={setH3Resolution} />
            </div>
            
            {/* Data Grid Column */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-md font-semibold">Postcode Performance</h4>
                <span className="text-sm text-gray-500">
                  Showing {startIndex + 1}-{Math.min(endIndex, postcodePerformance.length)} of {postcodePerformance.length.toLocaleString()} postcodes
                </span>
              </div>
              
              {/* Data Grid */}
              <div className="bg-white border border-gray-200 rounded-sm shadow-sm">
                <table className="min-w-full w-full divide-y divide-gray-100 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Postcode</th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-700">Impressions</th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-700">Completions</th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-700">Spend (£)</th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-700">CPM</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {currentPostcodes.map((area, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">{area.postcodeDistrict}</td>
                        <td className="px-4 py-3 text-right">{area.impressions.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right">{area.completions.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right">£{area.spend.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                        <td className="px-4 py-3 text-right">£{area.cpm.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                      className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      First
                    </button>
                    <button
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      Previous
                    </button>
                  </div>
                  
                  <div className="flex items-center space-x-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`px-3 py-1 text-sm border rounded ${
                            currentPage === pageNum
                              ? 'bg-[#02b3e5] text-white border-[#02b3e5]'
                              : 'border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      Next
                    </button>
                    <button
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      Last
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'demographic' && (
          <div className="space-y-6">
            {/* Demographic Insights */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Campaign Audience Insights</h3>
              
              {!demographicInsights ? (
                <div className="bg-white border border-gray-200 rounded-sm shadow-sm p-8 text-center">
                  <LoadingSpinner text="Loading audience insights..." size="md" />
                </div>
              ) : (
                <>


                  {/* Enhanced Demographics Charts */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                    {/* Age Distribution - Bar Chart */}
                    <div className="bg-white border border-gray-200 rounded-lg p-3">
                      <h4 className="text-base font-semibold text-gray-900 mb-3">Age Distribution</h4>
                      <div className="space-y-2">
                        {[
                          { age: '18-24', percentage: 12, color: 'bg-blue-500' },
                          { age: '25-34', percentage: 28, color: 'bg-blue-600' },
                          { age: '35-44', percentage: 32, color: 'bg-blue-700' },
                          { age: '45-54', percentage: 18, color: 'bg-blue-800' },
                          { age: '55+', percentage: 10, color: 'bg-blue-900' }
                        ].map((item, index) => (
                          <div key={index} className="flex items-center space-x-3">
                            <span className="text-sm font-medium text-gray-700 w-12">{item.age}</span>
                            <div className="flex-1 bg-gray-200 rounded-full h-3">
                              <div
                                className={`${item.color} h-3 rounded-full transition-all duration-300`}
                                style={{ width: `${item.percentage}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-medium text-gray-900 w-12 text-right">{item.percentage}%</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Gender Distribution - Pie Chart */}
                    <div className="bg-white border border-gray-200 rounded-lg p-3">
                      <h4 className="text-base font-semibold text-gray-900 mb-3">Gender Distribution</h4>
                      <div className="flex items-center justify-center">
                        <div className="relative w-28 h-28">
                          <svg className="w-28 h-28 transform -rotate-90" viewBox="0 0 36 36">
                            <circle cx="18" cy="18" r="16" fill="none" className="text-gray-200" strokeWidth="3" stroke="currentColor" />
                            <circle cx="18" cy="18" r="16" fill="none" className="text-blue-500" strokeWidth="3" stroke="currentColor" strokeDasharray="75.4 75.4" strokeDashoffset="0" />
                            <circle cx="18" cy="18" r="16" fill="none" className="text-pink-500" strokeWidth="3" stroke="currentColor" strokeDasharray="50.3 100.5" strokeDashoffset="-75.4" />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-center">
                              <div className="text-lg font-bold text-gray-900">100%</div>
                              <div className="text-xs text-gray-500">Total</div>
                            </div>
                          </div>
                        </div>
                        <div className="ml-6 space-y-2">
                          <div className="flex items-center space-x-2">
                            <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
                            <span className="text-sm text-gray-600">Male</span>
                            <span className="text-sm font-medium text-gray-900">67%</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="w-4 h-4 bg-pink-500 rounded-full"></div>
                            <span className="text-sm text-gray-600">Female</span>
                            <span className="text-sm font-medium text-gray-900">33%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Social Grade & Income Distribution */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                    {/* Social Grade */}
                    <div className="bg-white border border-gray-200 rounded-lg p-3">
                      <h4 className="text-base font-semibold text-gray-900 mb-3">Social Grade Distribution</h4>
                      <div className="space-y-2">
                        {[
                          { grade: 'AB', percentage: 35, description: 'Upper Middle Class' },
                          { grade: 'C1', percentage: 42, description: 'Lower Middle Class' },
                          { grade: 'C2', percentage: 18, description: 'Skilled Working Class' },
                          { grade: 'DE', percentage: 5, description: 'Working Class' }
                        ].map((item, index) => (
                          <div key={index} className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2">
                                <span className="text-sm font-bold text-gray-900">{item.grade}</span>
                                <span className="text-xs text-gray-500">({item.description})</span>
                              </div>
                            </div>
                            <div className="flex items-center space-x-3">
                              <div className="w-24 bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-300"
                                  style={{ width: `${item.percentage}%` }}
                                ></div>
                              </div>
                              <span className="text-sm font-medium text-gray-900 w-12 text-right">{item.percentage}%</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Income Distribution */}
                    <div className="bg-white border border-gray-200 rounded-lg p-3">
                      <h4 className="text-base font-semibold text-gray-900 mb-3">Household Income</h4>
                      <div className="space-y-2">
                        {[
                          { range: '£75k+', percentage: 28, color: 'bg-green-500' },
                          { range: '£50k-£75k', percentage: 35, color: 'bg-blue-500' },
                          { range: '£30k-£50k', percentage: 25, color: 'bg-yellow-500' },
                          { range: '£15k-£30k', percentage: 10, color: 'bg-orange-500' },
                          { range: '<£15k', percentage: 2, color: 'bg-red-500' }
                        ].map((item, index) => (
                          <div key={index} className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-700 w-20">{item.range}</span>
                            <div className="flex items-center space-x-3">
                              <div className="w-24 bg-gray-200 rounded-full h-2">
                                <div
                                  className={`${item.color} h-2 rounded-full transition-all duration-300`}
                                  style={{ width: `${item.percentage}%` }}
                                ></div>
                              </div>
                              <span className="text-sm font-medium text-gray-900 w-12 text-right">{item.percentage}%</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Retail Brands Affinity Table */}
                  <div className="bg-white border border-gray-200 rounded-lg p-3 mb-4">
                    <h4 className="text-base font-semibold text-gray-900 mb-3">Retail Brands Affinity</h4>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Brand Category</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Top Brands</th>
                            <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Affinity Index</th>
                            <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Audience %</th>
                            <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Trend</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {[
                            { category: 'Supermarkets', brands: 'Tesco, Waitrose, M&S Food', affinity: 156, audience: 78, trend: '↗️ +12%' },
                            { category: 'Fashion', brands: 'Next, H&M, Zara', affinity: 142, audience: 65, trend: '↗️ +8%' },
                            { category: 'Electronics', brands: 'Apple, Samsung, Currys', affinity: 189, audience: 82, trend: '↗️ +15%' },
                            { category: 'Home & Garden', brands: 'IKEA, B&Q, Dunelm', affinity: 134, audience: 58, trend: '↘️ -3%' },
                            { category: 'Travel', brands: 'TUI, EasyJet, Booking.com', affinity: 167, audience: 71, trend: '↗️ +22%' },
                            { category: 'Finance', brands: 'Barclays, HSBC, Monzo', affinity: 123, audience: 45, trend: '↗️ +5%' }
                          ].map((item, index) => (
                            <tr key={index} className="hover:bg-gray-50">
                              <td className="px-3 py-2 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">{item.category}</div>
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap">
                                <div className="text-sm text-gray-600">{item.brands}</div>
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-center">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  item.affinity >= 150 ? 'bg-green-100 text-green-800' :
                                  item.affinity >= 120 ? 'bg-blue-100 text-blue-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {item.affinity}
                                </span>
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-center">
                                <div className="text-sm font-medium text-gray-900">{item.audience}%</div>
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-center">
                                <span className={`text-sm font-medium ${
                                  item.trend.includes('↗️') ? 'text-green-600' : 'text-red-600'
                                }`}>
                                  {item.trend}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Lifestyle & Interests */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                    {/* Lifestyle Segments */}
                    <div className="bg-white border border-gray-200 rounded-lg p-3">
                      <h4 className="text-base font-semibold text-gray-900 mb-3">Lifestyle Segments</h4>
                      <div className="space-y-2">
                        {[
                          { segment: 'Tech Enthusiasts', percentage: 68, description: 'Early adopters, digital natives' },
                          { segment: 'Health Conscious', percentage: 52, description: 'Fitness, wellness, organic' },
                          { segment: 'Travel Lovers', percentage: 45, description: 'Frequent travelers, adventure seekers' },
                          { segment: 'Home Improvers', percentage: 38, description: 'DIY, renovation, gardening' },
                          { segment: 'Foodies', percentage: 73, description: 'Cooking, dining out, food delivery' }
                        ].map((item, index) => (
                          <div key={index} className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2">
                                <span className="text-sm font-medium text-gray-900">{item.segment}</span>
                                <span className="text-xs text-gray-500">({item.description})</span>
                              </div>
                            </div>
                            <div className="flex items-center space-x-3">
                              <div className="w-20 bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-gradient-to-r from-purple-500 to-purple-600 h-2 rounded-full transition-all duration-300"
                                  style={{ width: `${item.percentage}%` }}
                                ></div>
                              </div>
                              <span className="text-sm font-medium text-gray-900 w-12 text-right">{item.percentage}%</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Geographic Demographics */}
                    <div className="bg-white border border-gray-200 rounded-lg p-3">
                      <h4 className="text-base font-semibold text-gray-900 mb-3">Geographic Demographics</h4>
                      <div className="space-y-2">
                        {[
                          { region: 'London & South East', percentage: 42, density: 'High' },
                          { region: 'North West', percentage: 18, density: 'Medium' },
                          { region: 'West Midlands', percentage: 12, density: 'Medium' },
                          { region: 'Yorkshire', percentage: 10, density: 'Medium' },
                          { region: 'Scotland', percentage: 8, density: 'Low' },
                          { region: 'Other Regions', percentage: 10, density: 'Low' }
                        ].map((item, index) => (
                          <div key={index} className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2">
                                <span className="text-sm font-medium text-gray-900">{item.region}</span>
                                <span className={`text-xs px-2 py-1 rounded-full ${
                                  item.density === 'High' ? 'bg-green-100 text-green-800' :
                                  item.density === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {item.density}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center space-x-3">
                              <div className="w-20 bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full transition-all duration-300"
                                  style={{ width: `${item.percentage}%` }}
                                ></div>
                              </div>
                              <span className="text-sm font-medium text-gray-900 w-12 text-right">{item.percentage}%</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Audience; 