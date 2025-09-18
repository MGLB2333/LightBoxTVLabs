import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const contentFields = [
  { id: 'channel_name', label: 'Channel Name', table: 'content_channel_summary', field: 'channel_name' },
  { id: 'content_genre', label: 'Genre', table: 'content_genre_summary', field: 'content_genre' },
  { id: 'content_title', label: 'Title', table: 'content_title_summary', field: 'content_title' },
  { id: 'content_series', label: 'Series', table: 'content_series_summary', field: 'content_series' },
];

const ROWS_PER_PAGE = 20;

// Aggregate content data from campaign_events table
const aggregateContentData = (data: any[], fieldType: string) => {
  const aggregation: Record<string, any> = {};
  
  data.forEach(row => {
    const fieldValue = row[fieldType] || 'Unknown';
    const eventType = row.event_type;
    
    if (!aggregation[fieldValue]) {
      aggregation[fieldValue] = {
        [fieldType]: fieldValue,
        total_impressions: 0,
        total_completed_views: 0,
        total_spend: 0,
        cpm: 24.00, // Fixed CPM for now
        cpcv: 0
      };
    }
    
    // Count impressions and completed views
    if (eventType === 'impression') {
      aggregation[fieldValue].total_impressions += 1;
    } else if (eventType === 'videocomplete') {
      aggregation[fieldValue].total_completed_views += 1;
    }
  });
  
  // Calculate spend and CPCV for each aggregated item
  Object.values(aggregation).forEach((item: any) => {
    // Calculate spend based on impressions and CPM (£24)
    item.total_spend = (item.total_impressions * 24.00) / 1000;
    
    // Calculate CPCV: spend / completed views
    item.cpcv = item.total_completed_views > 0 ? item.total_spend / item.total_completed_views : 0;
  });
  
  return Object.values(aggregation);
};

// Mock data for content analysis when tables don't exist
const getMockContentData = (fieldType: string) => {
  switch (fieldType) {
    case 'channel_name':
      return [
        { channel_name: 'BBC One', total_impressions: 1250000, total_completed_views: 89000, total_spend: 30000.00, cpm: 24.00, cpcv: 0.34 },
        { channel_name: 'ITV1', total_impressions: 980000, total_completed_views: 72000, total_spend: 23520.00, cpm: 24.00, cpcv: 0.33 },
        { channel_name: 'Channel 4', total_impressions: 750000, total_completed_views: 54000, total_spend: 18000.00, cpm: 24.00, cpcv: 0.33 },
        { channel_name: 'Sky Sports', total_impressions: 620000, total_completed_views: 48000, total_spend: 14880.00, cpm: 24.00, cpcv: 0.31 },
        { channel_name: 'Discovery', total_impressions: 450000, total_completed_views: 32000, total_spend: 10800.00, cpm: 24.00, cpcv: 0.34 }
      ];
    case 'content_genre':
      return [
        { content_genre: 'News', total_impressions: 890000, total_completed_views: 65000, total_spend: 21360.00, cpm: 24.00, cpcv: 0.33 },
        { content_genre: 'Entertainment', total_impressions: 720000, total_completed_views: 52000, total_spend: 17280.00, cpm: 24.00, cpcv: 0.33 },
        { content_genre: 'Sports', total_impressions: 680000, total_completed_views: 48000, total_spend: 16320.00, cpm: 24.00, cpcv: 0.34 },
        { content_genre: 'Documentary', total_impressions: 450000, total_completed_views: 32000, total_spend: 10800.00, cpm: 24.00, cpcv: 0.34 },
        { content_genre: 'Children', total_impressions: 320000, total_completed_views: 22000, total_spend: 7680.00, cpm: 24.00, cpcv: 0.35 }
      ];
    case 'content_title':
      return [
        { content_title: 'BBC News at Six', total_impressions: 450000, total_completed_views: 32000, total_spend: 10800.00, cpm: 24.00, cpcv: 0.34 },
        { content_title: 'Coronation Street', total_impressions: 380000, total_completed_views: 28000, total_spend: 9120.00, cpm: 24.00, cpcv: 0.34 },
        { content_title: 'Match of the Day', total_impressions: 320000, total_completed_views: 24000, total_spend: 7680.00, cpm: 24.00, cpcv: 0.34 },
        { content_title: 'The Great British Bake Off', total_impressions: 280000, total_completed_views: 20000, total_spend: 6720.00, cpm: 24.00, cpcv: 0.34 },
        { content_title: 'Blue Planet II', total_impressions: 220000, total_completed_views: 16000, total_spend: 5280.00, cpm: 24.00, cpcv: 0.34 }
      ];
    case 'content_series':
      return [
        { content_series: 'BBC News', total_impressions: 890000, total_completed_views: 65000, total_spend: 21360.00, cpm: 24.00, cpcv: 0.33 },
        { content_series: 'Coronation Street', total_impressions: 380000, total_completed_views: 28000, total_spend: 9120.00, cpm: 24.00, cpcv: 0.34 },
        { content_series: 'Match of the Day', total_impressions: 320000, total_completed_views: 24000, total_spend: 7680.00, cpm: 24.00, cpcv: 0.34 },
        { content_series: 'The Great British Bake Off', total_impressions: 280000, total_completed_views: 20000, total_spend: 6720.00, cpm: 24.00, cpcv: 0.34 },
        { content_series: 'Blue Planet', total_impressions: 220000, total_completed_views: 16000, total_spend: 5280.00, cpm: 24.00, cpcv: 0.34 }
      ];
    default:
      return [];
  }
};

const Content: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('channel_name');
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRows, setTotalRows] = useState(0);
  const [sortField, setSortField] = useState('total_impressions');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [view, setView] = useState<'breakdown' | 'coverage'>('breakdown');
  const [coverageData, setCoverageData] = useState<any[]>([]);
  const [coverageLoading, setCoverageLoading] = useState(false);
  const [fieldCoverage, setFieldCoverage] = useState<Record<string, number>>({});

  // Fetch content data with pagination
  useEffect(() => {
    if (view === 'breakdown') {
      setLoading(true);
      (async () => {
        try {
          const currentField = contentFields.find(f => f.id === activeTab);
          if (!currentField) return;

          // Build query with pagination and sorting
          // Query campaign_events directly instead of materialized views
          let query = supabase
            .from('campaign_events')
            .select('*', { count: 'exact' });

          // Apply search filter
          if (search) {
            query = query.ilike(currentField.field, `%${search}%`);
          }

          // Get all data first for aggregation
          const { data: allData, error, count } = await query;

          if (error) {
            console.error('Error fetching content data:', error);
            console.log('Table being queried: campaign_events');
            console.log('Field being queried:', currentField.field);
            setRows([]);
            setTotalRows(0);
          } else {
            console.log('Successfully fetched data:', allData?.length || 0, 'rows from campaign_events');
            
            // Aggregate the data by the selected field
            const aggregatedData = aggregateContentData(allData, currentField.id);
            
            // Apply sorting
            const sortedData = aggregatedData.sort((a: any, b: any) => {
              const aValue = a[sortField] || 0;
              const bValue = b[sortField] || 0;
              return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
            });
            
            // Apply pagination
            const from = (currentPage - 1) * ROWS_PER_PAGE;
            const to = from + ROWS_PER_PAGE;
            const paginatedData = sortedData.slice(from, to);
            
            setRows(paginatedData);
            setTotalRows(aggregatedData.length);
          }
        } catch (error) {
          console.error('Error in content data processing:', error);
          setRows([]);
          setTotalRows(0);
        } finally {
          setLoading(false);
        }
      })();
    }
  }, [activeTab, search, currentPage, sortField, sortDirection, view]);

  // Fetch field coverage data for breakdown view
  useEffect(() => {
    if (view === 'breakdown') {
      (async () => {
        try {
          // Get total campaign count
          const { count: totalCampaigns } = await supabase
            .from('campaign_events')
            .select('campaign_id', { count: 'exact', head: true });

          // Get coverage data for each field
          const coveragePromises = contentFields.map(async (field) => {
            const { count: filledCount } = await supabase
              .from('campaign_events')
              .select('campaign_id', { count: 'exact', head: true })
              .not(field.id, 'is', null)
              .neq(field.id, '')
              .neq(field.id, 'Unknown');

            return {
              field: field.id,
              percentage: totalCampaigns ? Math.round(((filledCount || 0) / totalCampaigns) * 100) : 0
            };
          });

          const coverageResults = await Promise.all(coveragePromises);
          const coverageMap: Record<string, number> = {};
          coverageResults.forEach(result => {
            coverageMap[result.field] = result.percentage;
          });
          setFieldCoverage(coverageMap);
        } catch (error) {
          console.error('Error fetching field coverage data:', error);
          setFieldCoverage({});
        }
      })();
    }
  }, [view]);

  // Fetch coverage data by publisher
  useEffect(() => {
    if (view === 'coverage') {
      setCoverageLoading(true);
      (async () => {
        try {
          // Get all unique publishers first
          const { data: allPublishers, error: pubError } = await supabase
            .from('campaign_events')
            .select('pub_name')
            .not('pub_name', 'is', null)
            .neq('pub_name', '');

          if (pubError) throw pubError;

          // Get unique publisher names
          const uniquePublishers = [...new Set(allPublishers?.map(e => e.pub_name) || [])];
          console.log('Unique publishers found:', uniquePublishers);

          // Calculate coverage for each publisher
          const coveragePromises = uniquePublishers.map(async (pubName) => {
            // Get total events for this publisher
            const { count: totalEvents } = await supabase
              .from('campaign_events')
              .select('campaign_id', { count: 'exact', head: true })
              .eq('pub_name', pubName);

            const coveragePromises = contentFields.map(async (field) => {
              const { count: filledCount } = await supabase
                .from('campaign_events')
                .select('campaign_id', { count: 'exact', head: true })
                .eq('pub_name', pubName)
                .not(field.id, 'is', null)
                .neq(field.id, '')
                .neq(field.id, 'Unknown');

              return {
                field: field.id,
                label: field.label,
                filled: filledCount || 0,
                total: totalEvents || 0,
                percentage: totalEvents ? Math.round(((filledCount || 0) / totalEvents) * 100) : 0
              };
            });

            const fieldCoverage = await Promise.all(coveragePromises);
            
            return {
              pub_name: pubName,
              total_events: totalEvents || 0,
              fields: fieldCoverage
            };
          });

          const coverageResults = await Promise.all(coveragePromises);
          console.log('Coverage results:', coverageResults);
          setCoverageData(coverageResults);
        } catch (error) {
          console.error('Error fetching coverage data:', error);
          setCoverageData([]);
        } finally {
          setCoverageLoading(false);
        }
      })();
    }
  }, [view]);

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

  const currentField = contentFields.find(f => f.id === activeTab);

  // Subtabs bar
  const SubTabs = (
    <div className="flex border-b border-gray-200 w-full bg-transparent">
      {[
        { id: 'breakdown', label: 'Content Breakdown' },
        { id: 'coverage', label: 'Metadata Coverage' },
      ].map(tab => (
        <button
          key={tab.id}
          onClick={() => {
            setView(tab.id as 'breakdown' | 'coverage');
            setCurrentPage(1);
            setSearch('');
          }}
          className={`px-4 py-2 -mb-px border-b-2 font-medium text-sm transition-colors whitespace-nowrap focus:outline-none bg-transparent ${
            view === tab.id
              ? 'border-[#02b3e5] text-[#02b3e5]'
              : 'border-transparent text-gray-500 hover:text-[#02b3e5] bg-transparent'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );

  return (
    <div className="w-full">
      {SubTabs}
      <div className="mb-4" />
      
      {/* Category tabs only in breakdown view */}
      {view === 'breakdown' && (
        <div className="flex w-full bg-white border-x border-t border-gray-200 rounded-t-sm">
          {contentFields.map((f, i) => (
            <button
              key={f.id}
              onClick={() => {
                setActiveTab(f.id);
                setCurrentPage(1);
                setSearch('');
              }}
              className={`flex-1 flex flex-col items-center px-0 py-2 border-b-2 font-medium text-sm transition-colors whitespace-nowrap focus:outline-none ${
                activeTab === f.id
                  ? 'border-[#02b3e5] text-[#02b3e5] bg-white z-10 font-semibold'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 bg-gray-50'
              }`}
              style={{ borderTopLeftRadius: i === 0 ? '0.375rem' : 0, borderTopRightRadius: i === contentFields.length-1 ? '0.375rem' : 0 }}
            >
              <span>{f.label}</span>
              <span className="text-xs text-gray-400 mt-1">
                {fieldCoverage[f.id] || 0}% filled
              </span>
            </button>
          ))}
        </div>
      )}

      {view === 'breakdown' ? (
        <>
          {/* Search and Filters Bar */}
          <div className="flex items-center justify-between bg-white border-x border-t border-gray-200 px-4 py-2">
            <div className="flex items-center gap-2">
              <input
                type="text"
                className="w-64 border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#02b3e5]"
                placeholder={`Search ${currentField?.label?.toLowerCase()}...`}
                value={search}
                onChange={e => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-500">
                {totalRows.toLocaleString()} total records
              </span>
            </div>
          </div>

          {/* Data Grid */}
          <div className="bg-white border-x border-b border-gray-200 rounded-b-sm shadow-sm">
            <table className="min-w-full w-full divide-y divide-gray-100 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">{currentField?.label}</th>
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
                  <tr key={row[currentField?.field || 'id']} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{row[currentField?.field || 'id']}</td>
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
        </>
      ) : (
        <MetadataCoverageTable data={coverageData} loading={coverageLoading} />
      )}
    </div>
  );
};

// MetadataCoverageTable component
const MetadataCoverageTable: React.FC<{ data: any[]; loading: boolean }> = ({ data, loading }) => {
  // Always show all publishers, even if all fields are 0%
  // Sort by publisher name for consistency
  const allPublishers = data.sort((a, b) => a.pub_name.localeCompare(b.pub_name));
  // Debug: log the first publisher's fields
  if (allPublishers.length > 0 && allPublishers[0].fields && allPublishers[0].fields.length > 0) {
    // eslint-disable-next-line no-console
    console.log('DEBUG: first publisher fields', allPublishers[0].fields);
  }
  return (
    <div className="bg-white border-x border-b border-gray-200 rounded-b-sm shadow-sm">
      <table className="min-w-full w-full divide-y divide-gray-100 text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left font-semibold text-gray-700">Publisher</th>
            <th className="px-4 py-3 text-center font-semibold text-gray-700">Channel Name</th>
            <th className="px-4 py-3 text-center font-semibold text-gray-700">Genre</th>
            <th className="px-4 py-3 text-center font-semibold text-gray-700">Title</th>
            <th className="px-4 py-3 text-center font-semibold text-gray-700">Series</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-100">
          {loading ? (
            <tr><td colSpan={5} className="px-4 py-10 text-center text-gray-400">Loading...</td></tr>
          ) : allPublishers.length === 0 ? (
            <tr><td colSpan={5} className="px-4 py-10 text-center text-gray-400">No data found</td></tr>
          ) : allPublishers.map((publisher) => (
            <tr key={publisher.pub_name} className="hover:bg-gray-50">
              <td className="px-4 py-3 font-medium text-gray-900">{publisher.pub_name}</td>
              {publisher.fields.map((field: any) => {
                // Force number conversion for filled and total
                const filled = Number(field.filled);
                const total = Number(field.total);
                const pct = total > 0 ? Math.round((filled / total) * 100) : 0;
                return (
                  <td key={field.field} className="px-4 py-3 text-center">
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-2 bg-gray-200 overflow-hidden mb-1" style={{ borderRadius: 0 }}>
                        <div
                          className="h-2 bg-[#02b3e5]"
                          style={{ width: `${pct}%`, transition: 'width 0.3s', borderRadius: 0 }}
                        />
                      </div>
                      <span className="text-xs text-gray-700 font-semibold">{pct}%</span>
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Content; 