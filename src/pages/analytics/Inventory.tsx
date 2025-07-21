import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const tabs = [
  { id: 'table', name: 'Inventory Table' },
  { id: 'heatmap', name: 'Heatmap' },
  { id: 'bundlemap', name: 'Bundle ID Map' },
];

const ROWS_PER_PAGE = 20;

interface HeatmapData {
  publisher: string;
  date: string;
  impressions: number;
}

const Inventory: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('table');
  const [search, setSearch] = useState('');
  const [bundleRows, setBundleRows] = useState<any[]>([]);
  const [bundleLoading, setBundleLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRows, setTotalRows] = useState(0);
  const [sortField, setSortField] = useState('total_impressions');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  // Heatmap specific state
  const [heatmapData, setHeatmapData] = useState<HeatmapData[]>([]);
  const [heatmapLoading, setHeatmapLoading] = useState(false);
  const [dateRange, setDateRange] = useState('all'); // 7d, 30d, 90d, all

  // Fetch heatmap data
  useEffect(() => {
    if (activeTab !== 'heatmap') return;
    
    setHeatmapLoading(true);
    (async () => {
      try {
        // Fetch daily publisher impressions using the same approach as inventory table
        // First get the inventory_summary data (which has correct totals and ALL publishers)
        const { data: inventoryData, error: inventoryError } = await supabase
          .from('inventory_summary')
          .select('publisher_name, total_impressions')
          .order('total_impressions', { ascending: false });

        if (inventoryError) {
          console.error('Error fetching inventory data:', inventoryError);
          setHeatmapData([]);
          return;
        }

        // Get daily data from daily_overall_metrics (like the overview does)
        const { data: dailyData, error: dailyError } = await supabase
          .from('daily_overall_metrics')
          .select('event_date, total_impressions')
          .gte('event_date', '2025-06-01')
          .lte('event_date', '2025-06-30')
          .order('event_date', { ascending: true });

        if (dailyError) {
          console.error('Error fetching daily data:', dailyError);
          setHeatmapData([]);
          return;
        }

        console.log('Inventory data sample:', inventoryData?.slice(0, 5));
        console.log('Daily data sample:', dailyData?.slice(0, 5));
        console.log('Total daily records found:', dailyData?.length);

        // Get ALL publishers from inventory_summary (this is the complete list)
        const allPublishers = inventoryData?.map(item => item.publisher_name) || [];
        console.log('All publishers from inventory_summary:', allPublishers);

        // Create a map of total impressions by publisher (from inventory_summary)
        const totalImpressionsByPublisher = new Map<string, number>();
        inventoryData?.forEach(item => {
          totalImpressionsByPublisher.set(item.publisher_name, item.total_impressions);
        });

        // Generate all dates in June 2025
        const allDates: string[] = [];
        const currentDate = new Date('2025-06-01');
        const endDate = new Date('2025-06-30');
        while (currentDate <= endDate) {
          allDates.push(currentDate.toISOString().split('T')[0]);
          currentDate.setDate(currentDate.getDate() + 1);
        }

        // Create a map of daily impressions from daily_overall_metrics
        const dailyImpressionsMap = new Map<string, number>();
        dailyData?.forEach(day => {
          dailyImpressionsMap.set(day.event_date, day.total_impressions || 0);
        });

        // Calculate total impressions for the month from daily data
        const totalMonthlyImpressions = dailyData?.reduce((sum, day) => sum + (day.total_impressions || 0), 0) || 0;
        console.log('Total monthly impressions from daily data:', totalMonthlyImpressions);

        // Aggregate daily data by publisher and date
        // For now, distribute the daily impressions proportionally across publishers
        const aggregatedData: Record<string, Record<string, number>> = {};
        
        // Initialize all publishers with all dates set to 0
        allPublishers.forEach(publisher => {
          aggregatedData[publisher] = {};
          allDates.forEach(date => {
            aggregatedData[publisher][date] = 0;
          });
        });
        
        // Distribute daily impressions proportionally across publishers
        allDates.forEach(date => {
          const dailyTotal = dailyImpressionsMap.get(date) || 0;
          if (dailyTotal > 0) {
            // Get the total impressions for all publishers from inventory_summary
            const totalPublisherImpressions = allPublishers.reduce((sum, publisher) => {
              return sum + (totalImpressionsByPublisher.get(publisher) || 0);
            }, 0);
            
            // Distribute proportionally
            allPublishers.forEach(publisher => {
              const publisherTotal = totalImpressionsByPublisher.get(publisher) || 0;
              const proportion = totalPublisherImpressions > 0 ? publisherTotal / totalPublisherImpressions : 0;
              aggregatedData[publisher][date] = Math.round(dailyTotal * proportion);
            });
          }
        });

        // Convert to heatmap format
        const heatmapArray: HeatmapData[] = [];
        Object.entries(aggregatedData).forEach(([publisher, dates]) => {
          Object.entries(dates).forEach(([date, impressions]) => {
            heatmapArray.push({
              publisher,
              date,
              impressions
            });
          });
        });

        console.log('Total heatmap records after aggregation:', heatmapArray.length);
        console.log('Total impressions by publisher from inventory_summary:', Object.fromEntries(totalImpressionsByPublisher));
        console.log('Publishers in heatmap:', allPublishers);
        setHeatmapData(heatmapArray);
      } catch (error) {
        console.error('Error processing heatmap data:', error);
        setHeatmapData([]);
      } finally {
        setHeatmapLoading(false);
      }
    })();
  }, [activeTab, dateRange]);

  // Fetch inventory data with pagination
  useEffect(() => {
    setLoading(true);
    (async () => {
      try {
        // Build query with pagination and sorting
        let query = supabase
          .from('inventory_summary')
          .select('*', { count: 'exact' });

        // Apply search filter
        if (search) {
          query = query.ilike('publisher_name', `%${search}%`);
        }

        // Apply sorting
        query = query.order(sortField, { ascending: sortDirection === 'asc' });

        // Apply pagination
        const from = (currentPage - 1) * ROWS_PER_PAGE;
        const to = from + ROWS_PER_PAGE - 1;
        query = query.range(from, to);

        const { data, error, count } = await query;

        if (error) {
          console.error('Error fetching inventory data:', error);
          setRows([]);
          setTotalRows(0);
        } else {
          setRows(data || []);
          setTotalRows(count || 0);
        }
      } catch (error) {
        console.error('Error in inventory data processing:', error);
        setRows([]);
        setTotalRows(0);
      } finally {
        setLoading(false);
      }
    })();
  }, [search, currentPage, sortField, sortDirection]);

  // Fetch bundle data with pagination
  useEffect(() => {
    if (activeTab !== 'bundlemap') return;
    setBundleLoading(true);
    (async () => {
      try {
        let query = supabase
          .from('bundle_summary')
          .select('*', { count: 'exact' });

        if (search) {
          query = query.ilike('bundle_id', `%${search}%`);
        }

        query = query.order(sortField, { ascending: sortDirection === 'asc' });

        const from = (currentPage - 1) * ROWS_PER_PAGE;
        const to = from + ROWS_PER_PAGE - 1;
        query = query.range(from, to);

        const { data, error, count } = await query;

        if (error) {
          console.error('Error fetching bundle data:', error);
          setBundleRows([]);
          setTotalRows(0);
        } else {
          setBundleRows(data || []);
          setTotalRows(count || 0);
        }
      } catch (error) {
        console.error('Error in bundle data processing:', error);
        setBundleRows([]);
        setTotalRows(0);
      } finally {
        setBundleLoading(false);
      }
    })();
  }, [activeTab, search, currentPage, sortField, sortDirection]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
    setCurrentPage(1); // Reset to first page when sorting
  };

  const totalPages = Math.ceil(totalRows / ROWS_PER_PAGE);

  const SortableHeader: React.FC<{ field: string; children: React.ReactNode }> = ({ field, children }) => (
    <th 
      className="px-4 py-3 text-right font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 select-none"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center justify-end gap-1">
        {children}
        <div className="flex flex-col">
          <ChevronUp className={`w-3 h-3 ${sortField === field && sortDirection === 'asc' ? 'text-blue-500' : 'text-gray-400'}`} />
          <ChevronDown className={`w-3 h-3 ${sortField === field && sortDirection === 'desc' ? 'text-blue-500' : 'text-gray-400'}`} />
        </div>
      </div>
    </th>
  );

  const ChevronUp = ({ className }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
    </svg>
  );

  const ChevronDown = ({ className }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );

  // Heatmap component
  const HeatmapComponent: React.FC = () => {
    if (heatmapLoading) {
      return (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#02b3e5]"></div>
        </div>
      );
    }

    if (heatmapData.length === 0) {
      return (
        <div className="bg-white border border-gray-200 rounded-sm shadow-sm p-8 text-center text-gray-400">
          <p>No heatmap data available</p>
        </div>
      );
    }

    // Get unique publishers and dates
    const publishers = [...new Set(heatmapData.map(d => d.publisher))].sort((a, b) => {
      const aImpressions = heatmapData.find(d => d.publisher === a)?.impressions || 0;
      const bImpressions = heatmapData.find(d => d.publisher === b)?.impressions || 0;
      return bImpressions - aImpressions; // Sort by impressions descending
    });
    const dates = [...new Set(heatmapData.map(d => d.date))].sort();

    // Find max impressions for color scaling
    const maxImpressions = Math.max(...heatmapData.map(d => d.impressions));

    // Create a map for quick lookup
    const dataMap = new Map<string, number>();
    heatmapData.forEach(d => {
      dataMap.set(`${d.publisher}-${d.date}`, d.impressions);
    });

    // Function to get color intensity based on impressions
    const getColorIntensity = (impressions: number) => {
      if (impressions === 0) return 'bg-gray-50';
      const intensity = Math.min(impressions / maxImpressions, 1);
      if (intensity < 0.2) return 'bg-blue-100';
      if (intensity < 0.4) return 'bg-blue-200';
      if (intensity < 0.6) return 'bg-blue-300';
      if (intensity < 0.8) return 'bg-blue-400';
      return 'bg-blue-500';
    };

    return (
      <div className="bg-white border border-gray-200 rounded-sm shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Publisher Impressions Heatmap - June 2025</h3>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <div className="w-4 h-4 bg-gray-50 border border-gray-300"></div>
              <span>0</span>
              <div className="w-4 h-4 bg-blue-100 border border-gray-300"></div>
              <div className="w-4 h-4 bg-blue-300 border border-gray-300"></div>
              <div className="w-4 h-4 bg-blue-500 border border-gray-300"></div>
              <span>{maxImpressions.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-max">
            {/* Header row with dates */}
            <div className="flex border-b border-gray-200">
              <div className="w-32 p-2 font-semibold text-gray-700 bg-gray-50 border-r border-gray-200">
                Publisher
              </div>
              {dates.map(date => (
                <div key={date} className="w-12 p-1 text-xs text-gray-600 bg-gray-50 border-r border-gray-200 text-center">
                  {new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                </div>
              ))}
              <div className="w-20 p-2 font-semibold text-gray-700 bg-gray-50 border-r border-gray-200 text-center">
                Total
              </div>
            </div>
            
            {/* Data rows */}
            {publishers.map(publisher => {
              // Calculate total impressions for this publisher
              const totalImpressions = dates.reduce((sum, date) => {
                return sum + (dataMap.get(`${publisher}-${date}`) || 0);
              }, 0);
              
              return (
                <div key={publisher} className="flex border-b border-gray-200 hover:bg-gray-50">
                  <div className="w-32 p-2 text-xs font-medium text-gray-900 bg-white border-r border-gray-200 truncate">
                    {publisher}
                  </div>
                  {dates.map(date => {
                    const impressions = dataMap.get(`${publisher}-${date}`) || 0;
                    return (
                      <div
                        key={`${publisher}-${date}`}
                        className={`w-12 p-1 text-xs text-center border-r border-gray-200 cursor-pointer transition-colors ${getColorIntensity(impressions)}`}
                        title={`${publisher}: ${impressions.toLocaleString()} impressions on ${date}`}
                      >
                        {impressions > 0 ? impressions.toLocaleString() : ''}
                      </div>
                    );
                  })}
                  <div className="w-20 p-2 text-xs font-semibold text-gray-900 bg-gray-100 border-r border-gray-200 text-center">
                    {totalImpressions.toLocaleString()}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full">
      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-0">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 -mb-px border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-[#02b3e5] text-[#02b3e5] bg-white'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 bg-transparent'
            }`}
          >
            {tab.name}
          </button>
        ))}
      </div>
      
      {/* Search and Filters Bar */}
      {activeTab !== 'heatmap' && (
      <div className="flex items-center justify-between bg-white border-x border-t border-gray-200 rounded-t-sm px-4 py-2">
        <input
          type="text"
          className="w-64 border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#02b3e5]"
            placeholder={activeTab === 'bundlemap' ? "Search bundle ID..." : "Search publisher..."}
          value={search}
            onChange={e => {
              setSearch(e.target.value);
              setCurrentPage(1); // Reset to first page when searching
            }}
        />
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">
              {totalRows.toLocaleString()} total records
            </span>
        <div className="flex gap-2">
          <select className="border border-gray-300 rounded-md px-2 py-1 text-sm">
            <option>All Types</option>
            <option>Impressions</option>
            <option>Clicks</option>
            <option>Swipes</option>
            <option>Conversions</option>
          </select>
          <select className="border border-gray-300 rounded-md px-2 py-1 text-sm">
            <option>All Statuses</option>
            <option>Active</option>
            <option>Inactive</option>
          </select>
        </div>
      </div>
        </div>
      )}
      
      {/* Data Grid */}
      {activeTab === 'table' && (
        <div className="bg-white border-x border-b border-gray-200 rounded-b-sm shadow-sm">
          <table className="min-w-full w-full divide-y divide-gray-100 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Publisher</th>
                <SortableHeader field="total_impressions">Impressions</SortableHeader>
                <SortableHeader field="total_completed_views">Completed Views</SortableHeader>
                <SortableHeader field="total_spend">Spend (£)</SortableHeader>
                <SortableHeader field="cpm">CPM (£)</SortableHeader>
                <SortableHeader field="cpcv">CPCV (£)</SortableHeader>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400">Loading...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400">No data found</td></tr>
              ) : rows.map(row => (
                <tr key={row.publisher_name} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{row.publisher_name}</td>
                  <td className="px-4 py-3 text-right">{row.total_impressions?.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">{row.total_completed_views?.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">£{row.total_spend?.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) || '0.00'}</td>
                  <td className="px-4 py-3 text-right">£{row.cpm?.toFixed(2) || '0.00'}</td>
                  <td className="px-4 py-3 text-right">£{row.cpcv?.toFixed(2) || '0.00'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
              <div className="text-sm text-gray-500">
                Showing {((currentPage - 1) * ROWS_PER_PAGE) + 1} to {Math.min(currentPage * ROWS_PER_PAGE, totalRows)} of {totalRows.toLocaleString()} results
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm text-gray-700">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
        </div>
      )}
        </div>
      )}
      
      {activeTab === 'heatmap' && <HeatmapComponent />}
      
      {activeTab === 'bundlemap' && (
        <div className="bg-white border-x border-b border-gray-200 rounded-b-sm shadow-sm">
          <table className="min-w-full w-full divide-y divide-gray-100 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Bundle ID</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Publisher</th>
                <SortableHeader field="total_impressions">Impressions</SortableHeader>
                <SortableHeader field="total_completed_views">Completed Views</SortableHeader>
                <SortableHeader field="total_spend">Spend (£)</SortableHeader>
                <SortableHeader field="cpm">CPM (£)</SortableHeader>
                <SortableHeader field="cpcv">CPCV (£)</SortableHeader>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {bundleLoading ? (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-400">Loading...</td></tr>
              ) : bundleRows.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-400">No data found</td></tr>
              ) : bundleRows.map(row => (
                <tr key={`${row.bundle_id}-${row.publisher_name}`} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{row.bundle_id}</td>
                  <td className="px-6 py-3 text-gray-900">{row.publisher_name}</td>
                  <td className="px-6 py-3 text-right">{row.total_impressions?.toLocaleString()}</td>
                  <td className="px-6 py-3 text-right">{row.total_completed_views?.toLocaleString()}</td>
                  <td className="px-6 py-3 text-right">£{row.total_spend?.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) || '0.00'}</td>
                  <td className="px-6 py-3 text-right">£{row.cpm?.toFixed(2) || '0.00'}</td>
                  <td className="px-6 py-3 text-right">£{row.cpcv?.toFixed(2) || '0.00'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {/* Pagination for bundle map */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
              <div className="text-sm text-gray-500">
                Showing {((currentPage - 1) * ROWS_PER_PAGE) + 1} to {Math.min(currentPage * ROWS_PER_PAGE, totalRows)} of {totalRows.toLocaleString()} results
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm text-gray-700">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Inventory; 