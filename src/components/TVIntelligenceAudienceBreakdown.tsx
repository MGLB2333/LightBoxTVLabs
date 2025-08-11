import React from 'react';

interface TVIntelligenceAudienceBreakdownProps {
  audienceBreakdown: any[];
}

const TVIntelligenceAudienceBreakdown: React.FC<TVIntelligenceAudienceBreakdownProps> = ({ audienceBreakdown }) => {
  const formatNumber = (num: number) => {
    return num.toLocaleString();
  };

  const formatCurrency = (num: number) => {
    return `£${num.toFixed(2)}`;
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="p-3 border-b border-gray-200">
        <h3 className="text-base font-semibold text-gray-900">Audience Performance</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Audience Segment</th>
              <th className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Spots</th>
              <th className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Impacts</th>
              <th className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
              <th className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Avg CPT</th>
              <th className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Channels</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {audienceBreakdown.map((audience, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="px-2 py-1.5 text-xs font-medium text-gray-900">{audience.audience_segment}</td>
                <td className="px-2 py-1.5 text-xs text-right text-gray-900">{audience.spots}</td>
                <td className="px-2 py-1.5 text-xs text-right text-gray-900">{formatNumber(audience.impacts)}</td>
                <td className="px-2 py-1.5 text-xs text-right text-gray-900">{Math.round(audience.duration / 60)}m</td>
                <td className="px-2 py-1.5 text-xs text-right text-gray-900">{formatCurrency(audience.avg_cpt)}</td>
                <td className="px-2 py-1.5 text-xs text-right text-gray-900">{audience.channels}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TVIntelligenceAudienceBreakdown; 