import React, { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, Download } from 'lucide-react';
import { BARBSpot } from '../lib/barbService';

interface TVIntelligenceSpotsTableProps {
  spots: BARBSpot[];
  loading: boolean;
}

const TVIntelligenceSpotsTable: React.FC<TVIntelligenceSpotsTableProps> = ({ spots, loading }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage] = useState(50);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<keyof BARBSpot>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const formatNumber = (num: number) => {
    return num.toLocaleString();
  };

  const formatCurrency = (num: number) => {
    return `£${num.toFixed(2)}`;
  };

  const handleSort = (field: keyof BARBSpot) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getCurrentData = useMemo(() => {
    let filteredData = spots.filter(spot =>
      Object.values(spot).some(value =>
        value?.toString().toLowerCase().includes(searchTerm.toLowerCase())
      )
    );

    // Sort data
    filteredData.sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];
      
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    // Paginate
    const startIndex = (currentPage - 1) * rowsPerPage;
    return filteredData.slice(startIndex, startIndex + rowsPerPage);
  }, [spots, searchTerm, sortField, sortDirection, currentPage, rowsPerPage]);

  const totalPages = Math.ceil(spots.length / rowsPerPage);

  const handleExportData = () => {
    const headers = [
      'Date', 'Time', 'Channel', 'Programme', 'Ad Name', 'Position in Break', 'Break Title',
      'Advertiser', 'Brand', 'Agency', 'Duration', 'Impacts', 'CPT', 'Region',
      'Audience Segment', 'Spot Type'
    ];

    const csvContent = [
      headers.join(','),
      ...getCurrentData.map(spot => [
        spot.date,
        spot.time,
        spot.channel,
        spot.programme,
        spot.commercial_title || 'N/A',
        spot.position_in_break || 'N/A',
        spot.break_title || 'N/A',
        spot.advertiser,
        spot.brand,
        spot.agency,
        spot.duration,
        spot.impacts,
        spot.cpt,
        spot.region,
        spot.audience_segment,
        spot.spot_type
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `barb-spots-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
        <div className="p-4">
          <div className="animate-pulse space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-4 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Spot Details</h3>
            <p className="text-xs text-gray-500 mt-1">Individual TV spots with programme, ad name, position in break, and audience data from BARB API</p>
          </div>
          <button
            onClick={handleExportData}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-50 border border-gray-300 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Search and Pagination Controls */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <input
              type="text"
              placeholder="Search spots..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <span className="text-sm text-gray-600">
              Showing {getCurrentData.length} of {spots.length} spots
            </span>
          </div>
          
          {/* Pagination */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Previous
            </button>
            <span className="text-sm text-gray-600">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              {[
                { key: 'date', label: 'Date' },
                { key: 'time', label: 'Time' },
                { key: 'channel', label: 'Channel' },
                { key: 'programme', label: 'Programme' },
                { key: 'commercial_title', label: 'Ad Name' },
                { key: 'position_in_break', label: 'Position' },
                { key: 'break_title', label: 'Break' },
                { key: 'advertiser', label: 'Advertiser' },
                { key: 'brand', label: 'Brand' },
                { key: 'agency', label: 'Agency' },
                { key: 'duration', label: 'Duration' },
                { key: 'impacts', label: 'Impacts' },
                { key: 'cpt', label: 'CPT' },
                { key: 'region', label: 'Region' },
                { key: 'audience_segment', label: 'Audience Segment' },
                { key: 'spot_type', label: 'Spot Type' }
              ].map(column => (
                <th
                  key={column.key}
                  onClick={() => handleSort(column.key as keyof BARBSpot)}
                  className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                >
                  <div className="flex items-center gap-1">
                    {column.label}
                    {sortField === column.key && (
                      sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {getCurrentData.map((spot, index) => (
              <tr key={spot.id} className="hover:bg-gray-50">
                <td className="px-2 py-1.5 text-xs text-gray-900">{spot.date}</td>
                <td className="px-2 py-1.5 text-xs text-gray-900">{spot.time}</td>
                <td className="px-2 py-1.5 text-xs text-gray-900">{spot.channel}</td>
                <td className="px-2 py-1.5 text-xs text-gray-900">{spot.programme}</td>
                <td className="px-2 py-1.5 text-xs text-gray-900 font-medium">{spot.commercial_title || 'N/A'}</td>
                <td className="px-2 py-1.5 text-xs text-gray-900 text-center">{spot.position_in_break || 'N/A'}</td>
                <td className="px-2 py-1.5 text-xs text-gray-900">{spot.break_title || 'N/A'}</td>
                <td className="px-2 py-1.5 text-xs text-gray-900">{spot.advertiser}</td>
                <td className="px-2 py-1.5 text-xs text-gray-900">{spot.brand}</td>
                <td className="px-2 py-1.5 text-xs text-gray-900">{spot.agency}</td>
                <td className="px-2 py-1.5 text-xs text-gray-900">{spot.duration}s</td>
                <td className="px-2 py-1.5 text-xs text-gray-900">
                  {formatNumber(spot.impacts)}
                  {spot.audience_breakdown && spot.audience_breakdown.length > 1 && (
                    <span className="ml-1 text-xs text-gray-500" title={`Aggregated across ${spot.audience_breakdown.length} audience segments`}>
                      ({spot.audience_breakdown.length})
                    </span>
                  )}
                </td>
                <td className="px-2 py-1.5 text-xs text-gray-900">{formatCurrency(spot.cpt)}</td>
                <td className="px-2 py-1.5 text-xs text-gray-900">{spot.region}</td>
                <td className="px-2 py-1.5 text-xs text-gray-900">{spot.audience_segment}</td>
                <td className="px-2 py-1.5 text-xs text-gray-900">{spot.spot_type}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TVIntelligenceSpotsTable; 