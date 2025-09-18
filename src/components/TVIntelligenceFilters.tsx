import React, { useState, useRef, useEffect } from 'react';
import { Search, Filter } from 'lucide-react';

interface TVIntelligenceFiltersProps {
  selectedAdvertiser: string;
  selectedBrand: string;
  selectedAgency: string;
  selectedDate: string;
  selectedChannel: string;
  advertisers: string[];
  brands: string[];
  agencies: string[];
  channels: string[];
  onFilterChange: (filters: {
    advertiser: string;
    brand: string;
    agency: string;
    date: string;
    channel: string;
  }) => void;
}

const TVIntelligenceFilters: React.FC<TVIntelligenceFiltersProps> = ({
  selectedAdvertiser,
  selectedBrand,
  selectedAgency,
  selectedDate,
  selectedChannel,
  advertisers,
  brands,
  agencies,
  channels,
  onFilterChange
}) => {
  // Search states for filter dropdowns
  const [advertiserSearch, setAdvertiserSearch] = useState<string>('');
  const [brandSearch, setBrandSearch] = useState<string>('');
  const [agencySearch, setAgencySearch] = useState<string>('');
  const [channelSearch, setChannelSearch] = useState<string>('');
  
  // Dropdown visibility states
  const [showAdvertiserDropdown, setShowAdvertiserDropdown] = useState(false);
  const [showBrandDropdown, setShowBrandDropdown] = useState(false);
  const [showAgencyDropdown, setShowAgencyDropdown] = useState(false);
  const [showChannelDropdown, setShowChannelDropdown] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  
  // Refs for click outside detection
  const advertiserRef = useRef<HTMLDivElement>(null);
  const brandRef = useRef<HTMLDivElement>(null);
  const agencyRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<HTMLDivElement>(null);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (advertiserRef.current && !advertiserRef.current.contains(event.target as Node)) {
        setShowAdvertiserDropdown(false);
      }
      if (brandRef.current && !brandRef.current.contains(event.target as Node)) {
        setShowBrandDropdown(false);
      }
      if (agencyRef.current && !agencyRef.current.contains(event.target as Node)) {
        setShowAgencyDropdown(false);
      }
      if (channelRef.current && !channelRef.current.contains(event.target as Node)) {
        setShowChannelDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getYesterday = () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().split('T')[0];
  };

  const getFilteredAdvertisers = () => {
    return advertisers.filter(advertiser =>
      advertiser.toLowerCase().includes(advertiserSearch.toLowerCase())
    );
  };

  const getFilteredBrands = () => {
    return brands.filter(brand =>
      brand.toLowerCase().includes(brandSearch.toLowerCase())
    );
  };

  const getFilteredAgencies = () => {
    return agencies.filter(agency =>
      agency.toLowerCase().includes(agencySearch.toLowerCase())
    );
  };

  const getFilteredChannels = () => {
    return channels.filter(channel =>
      channel.toLowerCase().includes(channelSearch.toLowerCase())
    );
  };

  const addAdvertiserPill = (advertiser: string) => {
    onFilterChange({
      advertiser,
      brand: selectedBrand,
      agency: selectedAgency,
      date: selectedDate,
      channel: selectedChannel
    });
    setAdvertiserSearch('');
    setShowAdvertiserDropdown(false);
  };

  const addBrandPill = (brand: string) => {
    onFilterChange({
      advertiser: selectedAdvertiser,
      brand,
      agency: selectedAgency,
      date: selectedDate,
      channel: selectedChannel
    });
    setBrandSearch('');
    setShowBrandDropdown(false);
  };

  const addAgencyPill = (agency: string) => {
    onFilterChange({
      advertiser: selectedAdvertiser,
      brand: selectedBrand,
      agency,
      date: selectedDate,
      channel: selectedChannel
    });
    setAgencySearch('');
    setShowAgencyDropdown(false);
  };

  const addChannelPill = (channel: string) => {
    onFilterChange({
      advertiser: selectedAdvertiser,
      brand: selectedBrand,
      agency: selectedAgency,
      date: selectedDate,
      channel
    });
    setChannelSearch('');
    setShowChannelDropdown(false);
  };

  const removeAdvertiserPill = () => {
    onFilterChange({
      advertiser: '',
      brand: selectedBrand,
      agency: selectedAgency,
      date: selectedDate,
      channel: selectedChannel
    });
  };

  const removeBrandPill = () => {
    onFilterChange({
      advertiser: selectedAdvertiser,
      brand: '',
      agency: selectedAgency,
      date: selectedDate,
      channel: selectedChannel
    });
  };

  const removeAgencyPill = () => {
    onFilterChange({
      advertiser: selectedAdvertiser,
      brand: selectedBrand,
      agency: '',
      date: selectedDate,
      channel: selectedChannel
    });
  };

  const removeChannelPill = () => {
    onFilterChange({
      advertiser: selectedAdvertiser,
      brand: selectedBrand,
      agency: selectedAgency,
      date: selectedDate,
      channel: ''
    });
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-3 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900">Filters</h3>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-gray-700 bg-gray-50 border border-gray-300 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <Filter className="w-3 h-3" />
          {showFilters ? 'Hide' : 'Show'} Advanced Filters
        </button>
      </div>

      {/* Main Filters - Always Visible */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
        {/* Advertiser Filter */}
        <div className="relative" ref={advertiserRef}>
          <label className="block text-xs font-medium text-gray-700 mb-1">Advertiser</label>
          <div className="relative">
            <input
              type="text"
              placeholder="Search advertisers..."
              value={advertiserSearch}
              onChange={(e) => {
                setAdvertiserSearch(e.target.value);
                setShowAdvertiserDropdown(true);
              }}
              onFocus={() => setShowAdvertiserDropdown(true)}
              className="w-full px-2 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
          </div>
          
          {showAdvertiserDropdown && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
              {getFilteredAdvertisers().length > 0 ? (
                getFilteredAdvertisers().map((advertiser) => (
                  <button
                    key={advertiser}
                    onClick={() => addAdvertiserPill(advertiser)}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                  >
                    {advertiser}
                  </button>
                ))
              ) : (
                <div className="px-3 py-2 text-sm text-gray-500">No advertisers found</div>
              )}
            </div>
          )}
        </div>

        {/* Brand Filter */}
        <div className="relative" ref={brandRef}>
          <label className="block text-xs font-medium text-gray-700 mb-1">Brand</label>
          <div className="relative">
            <input
              type="text"
              placeholder="Search brands..."
              value={brandSearch}
              onChange={(e) => {
                setBrandSearch(e.target.value);
                setShowBrandDropdown(true);
              }}
              onFocus={() => setShowBrandDropdown(true)}
              className="w-full px-2 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
          </div>
          
          {showBrandDropdown && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
              {getFilteredBrands().length > 0 ? (
                getFilteredBrands().map((brand) => (
                  <button
                    key={brand}
                    onClick={() => addBrandPill(brand)}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                  >
                    {brand}
                  </button>
                ))
              ) : (
                <div className="px-3 py-2 text-sm text-gray-500">No brands found</div>
              )}
            </div>
          )}
        </div>

        {/* Agency Filter */}
        <div className="relative" ref={agencyRef}>
          <label className="block text-xs font-medium text-gray-700 mb-1">Agency</label>
          <div className="relative">
            <input
              type="text"
              placeholder="Search agencies..."
              value={agencySearch}
              onChange={(e) => {
                setAgencySearch(e.target.value);
                setShowAgencyDropdown(true);
              }}
              onFocus={() => setShowAgencyDropdown(true)}
              className="w-full px-2 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
          </div>
          
          {showAgencyDropdown && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
              {getFilteredAgencies().length > 0 ? (
                getFilteredAgencies().map((agency) => (
                  <button
                    key={agency}
                    onClick={() => addAgencyPill(agency)}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                  >
                    {agency}
                  </button>
                ))
              ) : (
                <div className="px-3 py-2 text-sm text-gray-500">No agencies found</div>
              )}
            </div>
          )}
        </div>

        {/* Date Filter */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Date</label>
          <select
            value={selectedDate}
            onChange={(e) => onFilterChange({
              advertiser: selectedAdvertiser,
              brand: selectedBrand,
              agency: selectedAgency,
              date: e.target.value,
              channel: selectedChannel
            })}
            className="w-full px-2 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
          >
            <option value="">All Time</option>
            <option value={getYesterday()}>Yesterday</option>
            <option value="last-week">Last Week</option>
            <option value="last-month">Last Month</option>
          </select>
        </div>
      </div>

      {/* Advanced Filters */}
      {showFilters && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          {/* Channel Filter */}
          <div className="relative" ref={channelRef}>
            <label className="block text-xs font-medium text-gray-700 mb-1">Channel</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search channels..."
                value={channelSearch}
                onChange={(e) => {
                  setChannelSearch(e.target.value);
                  setShowChannelDropdown(true);
                }}
                onFocus={() => setShowChannelDropdown(true)}
                className="w-full px-2 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
            </div>
            
            {showChannelDropdown && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                {getFilteredChannels().length > 0 ? (
                  getFilteredChannels().map((channel) => (
                    <button
                      key={channel}
                      onClick={() => addChannelPill(channel)}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                    >
                      {channel}
                    </button>
                  ))
                ) : (
                  <div className="px-3 py-2 text-sm text-gray-500">No channels found</div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Selected Filters Pills */}
      {(selectedAdvertiser || selectedBrand || selectedAgency || selectedChannel) && (
        <div className="flex flex-wrap gap-1.5">
          {selectedAdvertiser && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {selectedAdvertiser}
              <button
                onClick={removeAdvertiserPill}
                className="ml-1.5 text-blue-600 hover:text-blue-800"
              >
                ×
              </button>
            </span>
          )}
          {selectedBrand && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              {selectedBrand}
              <button
                onClick={removeBrandPill}
                className="ml-1.5 text-green-600 hover:text-green-800"
              >
                ×
              </button>
            </span>
          )}
          {selectedAgency && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
              {selectedAgency}
              <button
                onClick={removeAgencyPill}
                className="ml-1.5 text-purple-600 hover:text-purple-800"
              >
                ×
              </button>
            </span>
          )}
          {selectedChannel && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
              {selectedChannel}
              <button
                onClick={removeChannelPill}
                className="ml-1.5 text-orange-600 hover:text-orange-800"
              >
                ×
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default TVIntelligenceFilters; 