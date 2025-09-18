import React from 'react';
import { Brain, BarChart3, Target, TrendingUp } from 'lucide-react';

interface TVIntelligenceSpotsTableProps {
  spots: any[];
  loading: boolean;
}

const TVIntelligenceSpotsTable: React.FC<TVIntelligenceSpotsTableProps> = ({ spots, loading }) => {
  return (
    <div className="flex items-center justify-center min-h-[400px] bg-white">
      <div className="text-center max-w-xl mx-auto px-6">
        {/* Icon */}
        <div className="mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-[#02b3e5] to-[#0288d1] rounded-full shadow-md">
            <Brain className="w-8 h-8 text-white" />
          </div>
        </div>

        {/* Main Heading */}
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          TV Intelligence
        </h2>
        
        {/* Subheading */}
        <p className="text-lg text-gray-600 mb-6">
          Coming Soon
        </p>

        {/* Description */}
        <div className="bg-gray-50 rounded-lg border border-gray-200 p-6 mb-6">
          <p className="text-gray-700 mb-4">
            We're building powerful TV intelligence tools to give you deep insights into your advertising performance and competitive landscape.
          </p>
          
          {/* Features List */}
          <div className="space-y-3 text-left">
            <div className="flex items-center">
              <BarChart3 className="w-4 h-4 text-[#02b3e5] mr-3 flex-shrink-0" />
              <span className="text-sm text-gray-600">Detailed spot analysis and performance metrics</span>
            </div>
            <div className="flex items-center">
              <Target className="w-4 h-4 text-[#02b3e5] mr-3 flex-shrink-0" />
              <span className="text-sm text-gray-600">Competitor analysis and market insights</span>
            </div>
            <div className="flex items-center">
              <TrendingUp className="w-4 h-4 text-[#02b3e5] mr-3 flex-shrink-0" />
              <span className="text-sm text-gray-600">Creative effectiveness and optimization</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default TVIntelligenceSpotsTable; 