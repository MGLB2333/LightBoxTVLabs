import React from 'react';
import { BarChart3, Eye, Clock, TrendingUp } from 'lucide-react';
import { BARBStats } from '../lib/barbService';

interface TVIntelligenceSummaryProps {
  stats: BARBStats | null;
}

const TVIntelligenceSummary: React.FC<TVIntelligenceSummaryProps> = ({ stats }) => {
  const formatNumber = (num: number | undefined) => {
    if (num === undefined || num === null) return '0';
    return num.toLocaleString();
  };

  const formatCurrency = (num: number | undefined) => {
    if (num === undefined || num === null) return '£0.00';
    return `£${num.toFixed(2)}`;
  };

  if (!stats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
            <div className="h-6 bg-gray-200 rounded w-3/4"></div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
            <div className="h-6 bg-gray-200 rounded w-3/4"></div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
            <div className="h-6 bg-gray-200 rounded w-3/4"></div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
            <div className="h-6 bg-gray-200 rounded w-3/4"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
      {/* Total Spots */}
      <div className="bg-white rounded-lg border border-gray-200 p-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Total Spots</p>
            <p className="text-2xl font-bold text-gray-900">{formatNumber(stats.total_spots)}</p>
          </div>
          <div className="p-2 bg-[#02b3e5]/10 rounded-lg">
            <BarChart3 className="w-6 h-6 text-[#02b3e5]" />
          </div>
        </div>
      </div>

      {/* Total Impacts */}
      <div className="bg-white rounded-lg border border-gray-200 p-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Total Impacts</p>
            <p className="text-2xl font-bold text-gray-900">{formatNumber(stats.total_impacts)}</p>
          </div>
          <div className="p-2 bg-[#02b3e5]/10 rounded-lg">
            <Eye className="w-6 h-6 text-[#02b3e5]" />
          </div>
        </div>
      </div>

      {/* Total Duration */}
      <div className="bg-white rounded-lg border border-gray-200 p-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Total Duration</p>
            <p className="text-2xl font-bold text-gray-900">{Math.round((stats.total_duration || 0) / 60)}m</p>
          </div>
          <div className="p-2 bg-[#02b3e5]/10 rounded-lg">
            <Clock className="w-6 h-6 text-[#02b3e5]" />
          </div>
        </div>
      </div>

      {/* Average CPT */}
      <div className="bg-white rounded-lg border border-gray-200 p-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Average CPT</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.avg_cpt)}</p>
          </div>
          <div className="p-2 bg-[#02b3e5]/10 rounded-lg">
            <TrendingUp className="w-6 h-6 text-[#02b3e5]" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TVIntelligenceSummary; 