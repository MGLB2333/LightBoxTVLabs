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
      <div className="bg-white rounded-b shadow border border-gray-100 p-6 overflow-hidden">
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
                  {/* Demographics - Individual Boxes */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    {/* Age Range */}
                    <div className="bg-white border border-gray-200 rounded-sm shadow-sm p-4">
                      <h5 className="text-md font-medium text-gray-700 mb-3">Age Range</h5>
                      {demographicInsights?.demographicBreakdown?.ageGroups?.length > 0 ? (
                        <div className="space-y-2">
                          {demographicInsights.demographicBreakdown.ageGroups.slice(0, 4).map((age: any, index: number) => (
                            <div key={index} className="flex items-center justify-between">
                              <span className="text-sm text-gray-600">{age.segmentName}</span>
                              <div className="flex items-center space-x-2">
                                <div className="w-16 bg-gray-200 rounded-full h-2">
                                  <div
                                    className="bg-[#02b3e5] h-2 rounded-full"
                                    style={{ width: `${Math.min(age.averageValue, 100)}%` }}
                                  ></div>
                                </div>
                                <span className="text-sm font-medium text-gray-900 w-8">{age.averageValue}%</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-4">
                          <p className="text-gray-500 text-sm">No age data available</p>
                        </div>
                      )}
                    </div>

                    {/* Gender */}
                    <div className="bg-white border border-gray-200 rounded-sm shadow-sm p-4">
                      <h5 className="text-md font-medium text-gray-700 mb-3">Gender</h5>
                      {demographicInsights?.demographicBreakdown?.genderSegments?.length > 0 ? (
                        <div className="flex items-center justify-center">
                          <div className="relative w-24 h-24">
                            {/* Donut Chart */}
                            <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 36 36">
                              {/* Background circle */}
                              <circle
                                cx="18"
                                cy="18"
                                r="16"
                                fill="none"
                                className="text-gray-200"
                                strokeWidth="3"
                                stroke="currentColor"
                              />
                              
                              {/* Gender segments */}
                              {(() => {
                                const genderData = demographicInsights.demographicBreakdown.genderSegments;
                                const total = genderData.reduce((sum: number, item: any) => sum + item.averageValue, 0);
                                let currentAngle = 0;
                                
                                return genderData.map((gender: any, index: number) => {
                                  const percentage = total > 0 ? (gender.averageValue / total) * 100 : 0;
                                  const circumference = 2 * Math.PI * 16;
                                  const strokeDasharray = (percentage / 100) * circumference;
                                  const strokeDashoffset = circumference - strokeDasharray;
                                  
                                  const colors = ['#02b3e5', '#ff6b6b'];
                                  
                                  // Update currentAngle for next segment
                                  const segmentAngle = (percentage / 100) * 360;
                                  currentAngle += segmentAngle;
                                  
                                  return (
                                    <circle
                                      key={index}
                                      cx="18"
                                      cy="18"
                                      r="16"
                                      fill="none"
                                      className="text-gray-200"
                                      stroke={colors[index % colors.length]}
                                      strokeWidth="3"
                                      strokeDasharray={circumference}
                                      strokeDashoffset={strokeDashoffset}
                                      strokeLinecap="round"
                                      style={{
                                        transformOrigin: '50% 50%',
                                        transform: `rotate(${currentAngle - segmentAngle}deg)`
                                      }}
                                    />
                                  );
                                });
                              })()}
                            </svg>
                            
                            {/* Center text */}
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="text-center">
                                <div className="text-lg font-bold text-gray-900">100%</div>
                                <div className="text-xs text-gray-500">Gender</div>
                              </div>
                            </div>
                          </div>
                          
                          {/* Legend */}
                          <div className="ml-4 space-y-2">
                            {demographicInsights.demographicBreakdown.genderSegments.map((gender: any, index: number) => {
                              const colors = ['#02b3e5', '#ff6b6b'];
                              const total = demographicInsights.demographicBreakdown.genderSegments.reduce((sum: number, item: any) => sum + item.averageValue, 0);
                              const percentage = total > 0 ? (gender.averageValue / total) * 100 : 0;
                              
                              return (
                                <div key={index} className="flex items-center space-x-2">
                                  <div 
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: colors[index % colors.length] }}
                                  ></div>
                                  <span className="text-sm text-gray-600">{gender.segmentName}</span>
                                  <span className="text-sm font-medium text-gray-900">{percentage.toFixed(0)}%</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-4">
                          <p className="text-gray-500 text-sm">No gender data available</p>
                        </div>
                      )}
                    </div>

                    {/* Social Grade */}
                    <div className="bg-white border border-gray-200 rounded-sm shadow-sm p-4">
                      <h5 className="text-md font-medium text-gray-700 mb-3">Social Grade</h5>
                      {demographicInsights?.demographicBreakdown?.socialGradeSegments?.length > 0 ? (
                        <div className="space-y-2">
                          {demographicInsights.demographicBreakdown.socialGradeSegments.map((grade: any, index: number) => (
                            <div key={index} className="flex items-center justify-between">
                              <span className="text-sm text-gray-600">{grade.segmentName}</span>
                              <div className="flex items-center space-x-2">
                                <div className="w-16 bg-gray-200 rounded-full h-2">
                                  <div
                                    className="bg-[#02b3e5] h-2 rounded-full"
                                    style={{ width: `${Math.min(grade.averageValue, 100)}%` }}
                                  ></div>
                                </div>
                                <span className="text-sm font-medium text-gray-900 w-8">{grade.averageValue}%</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-4">
                          <p className="text-gray-500 text-sm">No social grade data available</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Income & Lifestyle Insights */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    {/* Income Bands */}
                    <div className="bg-white border border-gray-200 rounded-sm shadow-sm p-4">
                      <h4 className="text-md font-semibold text-gray-900 mb-4">Income Bands</h4>
                      {demographicInsights?.demographicBreakdown?.incomeBands?.length > 0 ? (
                        <div className="space-y-3">
                          {demographicInsights.demographicBreakdown.incomeBands.map((income: any, index: number) => (
                            <div key={index} className="flex items-center justify-between">
                              <span className="text-sm text-gray-600 truncate">{income.segmentName}</span>
                              <div className="flex items-center space-x-2">
                                <div className="w-20 bg-gray-200 rounded-full h-2">
                                  <div
                                    className="bg-[#02b3e5] h-2 rounded-full"
                                    style={{ width: `${income.averageValue}%` }}
                                  ></div>
                                </div>
                                <span className="text-sm font-medium text-gray-900 w-12">{income.averageValue}%</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-6">
                          <p className="text-gray-500 text-sm">No income data available</p>
                        </div>
                      )}
                    </div>

                    {/* Retail Brands */}
                    <div className="bg-white border border-gray-200 rounded-sm shadow-sm p-4">
                      <h4 className="text-md font-semibold text-gray-900 mb-4">Retail Brands</h4>
                      {demographicInsights?.demographicBreakdown?.retailBrands?.length > 0 ? (
                        <div className="space-y-3">
                          {demographicInsights.demographicBreakdown.retailBrands.map((brand: any, index: number) => (
                            <div key={index} className="flex items-center justify-between">
                              <span className="text-sm text-gray-600 truncate">{brand.segmentName}</span>
                              <div className="flex items-center space-x-2">
                                <div className="w-20 bg-gray-200 rounded-full h-2">
                                  <div
                                    className="bg-[#02b3e5] h-2 rounded-full"
                                    style={{ width: `${brand.averageValue}%` }}
                                  ></div>
                                </div>
                                <span className="text-sm font-medium text-gray-900 w-12">{brand.averageValue}%</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-6">
                          <p className="text-gray-500 text-sm">No retail data available</p>
                        </div>
                      )}
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