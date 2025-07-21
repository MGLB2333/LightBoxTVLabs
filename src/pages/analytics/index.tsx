import React, { useState, useRef, useEffect } from 'react';
import { useLocation, Outlet, Link } from 'react-router-dom';
import { useSetBanner } from '../../components/layout/BannerContext';
import { useAnalyticsFilters } from '../../components/layout/AnalyticsFilterContext';
import { ChevronDown, Search, Bot } from 'lucide-react';
import AIChatDrawer from '../../components/layout/AIChatDrawer';

const tabs = [
  { name: 'Overview', path: '/analytics-insights/overview' },
  { name: 'YouTube', path: '/analytics-insights/youtube' },
  { name: 'Audience', path: '/analytics-insights/audience' },
  { name: 'Content', path: '/analytics-insights/content' },
  { name: 'Inventory', path: '/analytics-insights/inventory' },
  { name: 'Supply Path', path: '/analytics-insights/supply-path' },
  { name: 'Reach', path: '/analytics-insights/reach' },
];

const dateRanges = [
  { id: '30d', name: 'Last 30 days' },
  { id: '7d', name: 'Last 7 days' },
  { id: 'all', name: 'All time' },
];

const AnalyticsLayout: React.FC = () => {
  const location = useLocation();
  const setBanner = useSetBanner();
  const { filters, setFilters, campaigns, advertisers, loading } = useAnalyticsFilters();
  const [campaignDropdownOpen, setCampaignDropdownOpen] = useState(false);
  const [advertiserDropdownOpen, setAdvertiserDropdownOpen] = useState(false);
  const [campaignSearch, setCampaignSearch] = useState('');
  const [advertiserSearch, setAdvertiserSearch] = useState('');
  const campaignDropdownRef = useRef<HTMLDivElement>(null);
  const advertiserDropdownRef = useRef<HTMLDivElement>(null);
  const [showAIChat, setShowAIChat] = useState(false);

  const filteredCampaigns = campaigns.filter(c => 
    c.name.toLowerCase().includes(campaignSearch.toLowerCase())
  );
  const filteredAdvertisers = advertisers.filter(a => 
    a.name.toLowerCase().includes(advertiserSearch.toLowerCase())
  );

  // Handle clicking outside dropdowns
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (campaignDropdownRef.current && !campaignDropdownRef.current.contains(event.target as Node)) {
        setCampaignDropdownOpen(false);
        setCampaignSearch('');
      }
      if (advertiserDropdownRef.current && !advertiserDropdownRef.current.contains(event.target as Node)) {
        setAdvertiserDropdownOpen(false);
        setAdvertiserSearch('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  React.useEffect(() => {
    setBanner(
      <div className="w-full">
        <div className="flex items-end justify-between mb-2">
          {/* Filters left */}
          <div className="flex gap-2">
            {/* Campaigns Filter */}
            <div className="relative" ref={campaignDropdownRef}>
              <div 
                className="w-88 px-3 py-2 pr-7 rounded-md border border-gray-300 bg-gray-50 shadow-sm cursor-pointer focus-within:ring-2 focus-within:ring-[#3bc8ea] focus-within:border-[#3bc8ea]" 
                tabIndex={0} 
                onClick={() => setCampaignDropdownOpen(!campaignDropdownOpen)}
              >
                <div className="flex flex-col w-full">
                  <span className="text-[11px] text-gray-500 font-medium leading-tight">Campaigns ({campaigns.length})</span>
                  <span className={`text-[13px] font-bold truncate mt-0.5 ${filters.selectedCampaign === 'all' ? 'text-gray-900' : 'text-gray-700'}`}>{
                    filters.selectedCampaign === 'all' ? 'Select a campaign' : (campaigns.find(c => c.id === filters.selectedCampaign)?.name || '')
                  }</span>
                </div>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
              </div>
              {campaignDropdownOpen && (
                <div className="absolute top-full left-0 mt-0 bg-white border border-gray-200 rounded-b-md shadow-2xl z-50 max-h-60 overflow-hidden" style={{ width: '352px' }}>
                  <div className="p-2 border-b border-gray-100">
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="text"
                        placeholder="Search campaigns..."
                        className="w-full pl-8 pr-2 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-[#3bc8ea]"
                        value={campaignSearch}
                        onChange={(e) => setCampaignSearch(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {filteredCampaigns.map(c => (
                      <button
                        key={c.id}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 hover:text-gray-900 ${
                          filters.selectedCampaign === c.id ? 'bg-[#3bc8ea] text-white' : 'text-gray-700'
                        }`}
                        onClick={() => {
                          setFilters(prev => ({ ...prev, selectedCampaign: c.id }));
                          setCampaignDropdownOpen(false);
                          setCampaignSearch('');
                        }}
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {/* Advertisers Filter */}
            <div className="relative" ref={advertiserDropdownRef}>
              <div 
                className="w-88 px-3 py-2 pr-7 rounded-md border border-gray-300 bg-gray-50 shadow-sm cursor-pointer focus-within:ring-2 focus-within:ring-[#3bc8ea] focus-within:border-[#3bc8ea]" 
                tabIndex={0} 
                onClick={() => setAdvertiserDropdownOpen(!advertiserDropdownOpen)}
              >
                <div className="flex flex-col w-full">
                  <span className="text-[11px] text-gray-500 font-medium leading-tight">Advertisers</span>
                  <span className={`text-[13px] font-bold truncate mt-0.5 ${filters.selectedAdvertiser === 'all' ? 'text-gray-900' : 'text-gray-700'}`}>{
                    filters.selectedAdvertiser === 'all' ? 'Select an advertiser' : (advertisers.find(a => a.id === filters.selectedAdvertiser)?.name || '')
                  }</span>
                </div>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
              </div>
              {advertiserDropdownOpen && (
                <div className="absolute top-full left-0 mt-0 bg-white border border-gray-200 rounded-b-md shadow-2xl z-50 max-h-60 overflow-hidden" style={{ width: '352px' }}>
                  <div className="p-2 border-b border-gray-100">
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="text"
                        placeholder="Search advertisers..."
                        className="w-full pl-8 pr-2 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-[#3bc8ea]"
                        value={advertiserSearch}
                        onChange={(e) => setAdvertiserSearch(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {filteredAdvertisers.map(a => (
                      <button
                        key={a.id}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 hover:text-gray-900 ${
                          filters.selectedAdvertiser === a.id ? 'bg-[#3bc8ea] text-white' : 'text-gray-700'
                        }`}
                        onClick={() => {
                          setFilters(prev => ({ ...prev, selectedAdvertiser: a.id }));
                          setAdvertiserDropdownOpen(false);
                          setAdvertiserSearch('');
                        }}
                      >
                        {a.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          {/* Controls right */}
          <div className="flex gap-2 items-end">
            {/* Date Filter */}
            <div className="flex flex-col">
              <span className="text-xs text-gray-500 mb-0.5">Date</span>
              <div className="relative">
                <select
                  className="appearance-none w-32 px-2 py-1 pr-7 rounded-md border border-gray-300 bg-white shadow-sm text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#3bc8ea] focus:border-[#3bc8ea]"
                  value={filters.selectedDate}
                  onChange={e => setFilters(prev => ({ ...prev, selectedDate: e.target.value }))}
                >
                  {dateRanges.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
              </div>
            </div>

            {/* AI Button */}
            <button className="ml-2 px-3 py-1.5 bg-pink-200 hover:bg-pink-300 text-pink-800 font-bold text-sm rounded shadow-sm transition-colors whitespace-nowrap flex items-center gap-1.5" onClick={() => setShowAIChat(true)}>
              <Bot className="w-4 h-4" />
              AI Analyst
            </button>
          </div>
        </div>
        <nav className="mt-4 border-b border-gray-200 flex space-x-8">
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
    );
    return () => setBanner(null);
  }, [setBanner, location.pathname, filters, campaignDropdownOpen, advertiserDropdownOpen, campaignSearch, advertiserSearch]);

  return (
    <>
      <Outlet />
      <AIChatDrawer isOpen={showAIChat} onClose={() => setShowAIChat(false)} />
    </>
  );
};

export default AnalyticsLayout; 