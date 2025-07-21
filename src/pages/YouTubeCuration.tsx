import React, { useState, useEffect } from 'react';
import { Search, Plus, Download, Trash2, Eye, Package, Users, Calendar, Play, Filter, Loader2, CheckCircle } from 'lucide-react';
import { youtubeService, youtubeDB } from '../lib/youtube';
import type { YouTubeSearchResult, YouTubeChannel } from '../lib/youtube';
import { supabase } from '../lib/supabase';
import { useSetBanner } from '../components/layout/BannerContext';

interface Package {
  id: string;
  name: string;
  description: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

interface PackageChannel {
  id: string;
  package_id: string;
  channel_id: string;
  added_at: string;
  notes: string;
  youtube_channels: {
    channel_id: string;
    title: string;
    description: string;
    subscriber_count: number;
    video_count: number;
    view_count: number;
    thumbnails: any;
    country: string;
  };
}

const YouTubeCuration: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'search' | 'packages'>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<YouTubeSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [packages, setPackages] = useState<Package[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [packageChannels, setPackageChannels] = useState<PackageChannel[]>([]);
  const [showCreatePackage, setShowCreatePackage] = useState(false);
  const [newPackageName, setNewPackageName] = useState('');
  const [newPackageDescription, setNewPackageDescription] = useState('');
  const [newPackagePublic, setNewPackagePublic] = useState(false);
  const [minSubscribers, setMinSubscribers] = useState(1000); // 1K default
  const [showSubscriberFilter, setShowSubscriberFilter] = useState(false);
  const [selectedChannels, setSelectedChannels] = useState<Set<string>>(new Set());
  const [selectedPackageForBulkAdd, setSelectedPackageForBulkAdd] = useState<string | null>(null);
  const [addingChannels, setAddingChannels] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [packageChannelCounts, setPackageChannelCounts] = useState<Record<string, number>>({});
  const [packageSearchQuery, setPackageSearchQuery] = useState('');

  const setBanner = useSetBanner();

  // Load user packages on mount
  useEffect(() => {
    loadPackages();
  }, []);

  // Set banner content
  useEffect(() => {
    setBanner(
      <div className="w-full">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">YouTube Curation</h1>
            <p className="text-sm text-gray-600 mt-1">Search, curate, and export YouTube channels</p>
          </div>
        </div>
        <nav className="border-b border-gray-200">
          <div className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('search')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'search'
                  ? 'border-[#02b3e5] text-[#02b3e5]'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
              <Search className="w-4 h-4 inline mr-2" />
              Search Channels
          </button>
          <button
              onClick={() => setActiveTab('packages')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'packages'
                  ? 'border-[#02b3e5] text-[#02b3e5]'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
              <Package className="w-4 h-4 inline mr-2" />
              Curated Packages
          </button>
          </div>
        </nav>
      </div>
    );
    return () => setBanner(null);
  }, [setBanner, activeTab]);

  // Load package channel counts
  useEffect(() => {
    loadPackageChannelCounts();
  }, [packages]);

  // Close filter dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.subscriber-filter')) {
        setShowSubscriberFilter(false);
      }
    };

    if (showSubscriberFilter) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSubscriberFilter]);

  const loadPackages = async () => {
    try {
      const userPackages = await youtubeDB.getUserPackages();
      const publicPackages = await youtubeDB.getPublicPackages();
      setPackages([...userPackages, ...publicPackages]);
    } catch (error) {
      console.error('Error loading packages:', error);
    }
  };

  const loadPackageChannelCounts = async () => {
    const counts: Record<string, number> = {};
    for (const pkg of packages) {
      try {
        const channels = await youtubeDB.getChannelsByPackage(pkg.id);
        counts[pkg.id] = channels.length;
      } catch (error) {
        console.error('Error loading channel count for package:', pkg.id, error);
        counts[pkg.id] = 0;
      }
    }
    setPackageChannelCounts(counts);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    try {
      // Fetch more results initially to account for filtering
      const maxResults = minSubscribers > 1000000 ? 100 : 50; // Fetch more if high threshold
      const response = await youtubeService.searchChannels(searchQuery, maxResults);
      console.log('Search response:', response.items.length, 'channels found');
      
      // Save search history
      await youtubeDB.saveSearchHistory(searchQuery, response.items.length, 'channel');
      
      // Get detailed channel information for all channels
      const channelIds = response.items.map(item => item.id.channelId).filter((id): id is string => Boolean(id));
      console.log('Channel IDs to fetch details for:', channelIds.length);
      
      if (channelIds.length > 0) {
        const channelDetails = await youtubeService.getChannelDetails(channelIds);
        console.log('Channel details fetched:', channelDetails.items.length);
        
        // Save channels to database with better error handling
        const savePromises = channelDetails.items.map(async (channel) => {
          try {
            await youtubeDB.saveChannel(channel);
            return { success: true, channel };
          } catch (error) {
            console.error('Error saving channel:', channel.id, error);
            return { success: false, channel, error };
          }
        });
        
        const saveResults = await Promise.allSettled(savePromises);
        const successfulSaves = saveResults.filter(result => 
          result.status === 'fulfilled' && result.value.success
        ).length;
        console.log('Successfully saved', successfulSaves, 'out of', channelDetails.items.length, 'channels');
        
        // Update search results with detailed information and filter by subscribers
        const detailedResults = response.items.map(item => {
          const detailedChannel = channelDetails.items.find(ch => ch.id === item.id.channelId);
          return {
            ...item,
            statistics: detailedChannel?.statistics
          };
        }).filter(result => {
          if (!result.statistics?.subscriberCount) {
            console.log('No subscriber count for:', result.snippet.title);
            return false;
          }
          const subscribers = parseInt(result.statistics.subscriberCount);
          const meetsThreshold = subscribers >= minSubscribers;
          console.log(`${result.snippet.title}: ${subscribers} subscribers, meets threshold: ${meetsThreshold}`);
          return meetsThreshold;
        });
        
        console.log('Filtered results:', detailedResults.length, 'channels meet subscriber threshold');
        setSearchResults(detailedResults);
      }
    } catch (error) {
      console.error('Error searching channels:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToPackage = async (channelId: string, packageId: string) => {
    try {
      await youtubeDB.addChannelToPackage(packageId, channelId);
      if (selectedPackage?.id === packageId) {
        loadPackageChannels(packageId);
      }
    } catch (error) {
      console.error('Error adding channel to package:', error);
    }
  };

  const handleRemoveFromPackage = async (channelId: string, packageId: string) => {
    try {
      await youtubeDB.removeChannelFromPackage(packageId, channelId);
      loadPackageChannels(packageId);
      
      // Update channel count for this package
      setPackageChannelCounts(prev => ({
        ...prev,
        [packageId]: Math.max(0, (prev[packageId] || 0) - 1)
      }));
    } catch (error) {
      console.error('Error removing channel from package:', error);
    }
  };

  const loadPackageChannels = async (packageId: string) => {
    try {
      const channels = await youtubeDB.getChannelsByPackage(packageId);
      setPackageChannels(channels);
    } catch (error) {
      console.error('Error loading package channels:', error);
    }
  };

  const handleSelectPackage = (pkg: Package) => {
    setSelectedPackage(pkg);
    loadPackageChannels(pkg.id);
  };

  const handleCreatePackage = async () => {
    if (!newPackageName.trim()) return;

    try {
      const newPackage = await youtubeDB.createPackage(newPackageName, newPackageDescription, newPackagePublic);
      setNewPackageName('');
      setNewPackageDescription('');
      setNewPackagePublic(false);
      setShowCreatePackage(false);
      loadPackages();
      
      // Add new package to channel counts with 0 channels
      setPackageChannelCounts(prev => ({
        ...prev,
        [newPackage.id]: 0
      }));
    } catch (error) {
      console.error('Error creating package:', error);
    }
  };

  const handleDeletePackage = async (packageId: string) => {
    if (!confirm('Are you sure you want to delete this package?')) return;

    try {
      await youtubeDB.deletePackage(packageId);
      if (selectedPackage?.id === packageId) {
        setSelectedPackage(null);
        setPackageChannels([]);
      }
      loadPackages();
    } catch (error) {
      console.error('Error deleting package:', error);
    }
  };

  const handleExport = async (packageId: string, exportType: 'csv' | 'google_ads' | 'json') => {
    try {
      const exportData = await youtubeDB.exportPackageChannels(packageId, exportType);
      
      // Create and download file
      const blob = new Blob([exportData], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `youtube-channels-${exportType}-${Date.now()}.${exportType === 'json' ? 'json' : 'csv'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting package:', error);
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const formatSubscriberFilter = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M+`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}K+`;
    }
    return `${value}+`;
  };

  const handleChannelSelect = (channelId: string) => {
    setSelectedChannels(prev => {
      const newSet = new Set(prev);
      if (newSet.has(channelId)) {
        newSet.delete(channelId);
      } else {
        newSet.add(channelId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedChannels.size === searchResults.length) {
      setSelectedChannels(new Set());
    } else {
      setSelectedChannels(new Set(searchResults.map(result => result.id.channelId!)));
    }
  };

  const handleAddSelectedToPackage = async (packageId: string) => {
    setAddingChannels(true);
    const promises = Array.from(selectedChannels).map(channelId => 
      youtubeDB.addChannelToPackage(packageId, channelId)
    );
    
    try {
      await Promise.all(promises);
      const packageName = packages.find(p => p.id === packageId)?.name || 'package';
      setSuccessMessage(`${selectedChannels.size} channel${selectedChannels.size !== 1 ? 's' : ''} added to ${packageName}`);
      setShowSuccessPopup(true);
      setSelectedChannels(new Set());
      setSelectedPackageForBulkAdd(null);
      if (selectedPackage?.id === packageId) {
        loadPackageChannels(packageId);
      }
      
      // Update channel count for this package
      setPackageChannelCounts(prev => ({
        ...prev,
        [packageId]: (prev[packageId] || 0) + selectedChannels.size
      }));
      
      // Hide success popup after 3 seconds
      setTimeout(() => {
        setShowSuccessPopup(false);
      }, 3000);
    } catch (error) {
      console.error('Error adding channels to package:', error);
    } finally {
      setAddingChannels(false);
    }
  };

  const filteredPackages = packages.filter(pkg => 
    pkg.name.toLowerCase().includes(packageSearchQuery.toLowerCase()) ||
    pkg.description.toLowerCase().includes(packageSearchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Search Tab */}
      {activeTab === 'search' && (
        <div className="space-y-6">
          {/* Search Bar */}
          <div className="bg-white rounded-sm border border-gray-200 p-6">
            <div className="flex gap-4 items-center">
              <div className="flex-1">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search for YouTube channels..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#02b3e5] focus:border-[#02b3e5]"
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
              
              {/* Subscriber Filter */}
              <div className="relative subscriber-filter">
                <button
                  onClick={() => setShowSubscriberFilter(!showSubscriberFilter)}
                  className={`px-4 py-2 border rounded-md flex items-center gap-2 text-sm transition-colors ${
                    minSubscribers > 1000 
                      ? 'border-[#02b3e5] bg-[#02b3e5]/10 text-[#02b3e5]' 
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                <Filter className="w-4 h-4" />
                  {formatSubscriberFilter(minSubscribers)}
              </button>
                
                {/* Filter Dropdown */}
                {showSubscriberFilter && (
                  <div className="absolute top-full right-0 mt-2 bg-white border border-gray-200 rounded-md shadow-lg p-6 z-10 min-w-[500px]">
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        Minimum Subscribers: <span className="text-[#02b3e5] font-bold">{formatSubscriberFilter(minSubscribers)}</span>
                      </label>
                      <div className="relative">
                        <input
                          type="range"
                          min="1000"
                          max="5000000"
                          step="100000"
                          value={minSubscribers}
                          onChange={(e) => setMinSubscribers(parseInt(e.target.value))}
                          className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                        />
                        <div className="flex justify-between text-xs text-gray-500 mt-2">
                          <span>1K</span>
                          <span>500K</span>
                          <span>1M</span>
                          <span>2M</span>
                          <span>3M</span>
                          <span>4M</span>
                          <span>5M</span>
                        </div>
                      </div>
            </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          setShowSubscriberFilter(false);
                          handleSearch(); // Trigger search with new filter
                        }}
                        className="px-4 py-2 text-sm bg-[#02b3e5] text-white rounded hover:bg-[#02b3e5]/90 font-medium"
                      >
                        Apply Filter
                      </button>
                      <button
                        onClick={() => {
                          setMinSubscribers(1000);
                          setShowSubscriberFilter(false);
                        }}
                        className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
                      >
                        Reset to 1K
                      </button>
                      <button
                        onClick={() => setShowSubscriberFilter(false)}
                        className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
              
              <button
                onClick={handleSearch}
                disabled={loading}
                className="px-6 py-2 bg-[#02b3e5] text-white rounded-md hover:bg-[#02b3e5]/90 transition-colors disabled:opacity-50"
              >
                {loading ? 'Searching...' : 'Search'}
              </button>
            </div>
          </div>

          {/* Empty State */}
          {searchResults.length === 0 && !loading && (
            <div className="bg-white rounded-sm border border-gray-200 p-12 text-center">
              <Search className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Search for YouTube Channels</h3>
              <p className="text-sm text-gray-600 mb-6 max-w-md mx-auto">
                Find and curate YouTube channels for your campaigns. Search by channel name, topic, or keywords.
              </p>
              <div className="space-y-3 text-sm text-gray-500">
                <div className="flex items-center justify-center gap-2">
                  <div className="w-2 h-2 bg-[#02b3e5] rounded-full"></div>
                  <span>Enter a search term above (e.g., "gaming", "tech reviews", "cooking")</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <div className="w-2 h-2 bg-[#02b3e5] rounded-full"></div>
                  <span>Use the filter to set minimum subscriber count (currently {formatSubscriberFilter(minSubscribers)})</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <div className="w-2 h-2 bg-[#02b3e5] rounded-full"></div>
                  <span>Check the boxes to select channels, then add them to a package</span>
                </div>
                        </div>
                      </div>
          )}

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="bg-white rounded-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">
                  Search Results ({searchResults.length})
                </h3>
              </div>
              
              {/* Bulk Actions Row */}
              <div className="px-6 py-3 border-b border-gray-200 bg-blue-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {selectedChannels.size > 0 ? (
                      <>
                        <span className="text-sm font-medium text-gray-700">
                          {selectedChannels.size} channel{selectedChannels.size !== 1 ? 's' : ''} selected
                        </span>
                        <button
                          onClick={() => setSelectedChannels(new Set())}
                          className="text-xs text-gray-500 hover:text-gray-700"
                        >
                          Clear selection
                        </button>
                      </>
                    ) : (
                      <span className="text-sm text-gray-500">
                        Select channels to add to a package
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-600">Add to package:</span>
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          setSelectedPackageForBulkAdd(e.target.value);
                        }
                      }}
                      className="px-3 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#02b3e5] focus:border-[#02b3e5]"
                      defaultValue=""
                    >
                      <option value="" disabled>Choose package...</option>
                      {packages.map((pkg) => (
                        <option key={pkg.id} value={pkg.id}>
                          {pkg.name}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => {
                        if (selectedPackageForBulkAdd && selectedChannels.size > 0) {
                          handleAddSelectedToPackage(selectedPackageForBulkAdd);
                        }
                      }}
                      disabled={!selectedPackageForBulkAdd || selectedChannels.size === 0 || addingChannels}
                      className="px-4 py-1 bg-[#02b3e5] text-white rounded text-sm hover:bg-[#02b3e5]/90 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center gap-2"
                    >
                      {addingChannels ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Adding...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          Add
                        </>
                      )}
                        </button>
                  </div>
                </div>
              </div>
              
               {/* Table Header */}
               <div className="px-6 py-3 border-b border-gray-200 bg-gray-50">
                 <div className="grid grid-cols-12 gap-4 items-center text-sm font-medium text-gray-700">
                   <div className="col-span-1">
                     <input
                       type="checkbox"
                       checked={selectedChannels.size === searchResults.length && searchResults.length > 0}
                       onChange={handleSelectAll}
                       className="h-4 w-4 text-[#02b3e5] focus:ring-[#02b3e5] border-gray-300 rounded"
                     />
                   </div>
                   <div className="col-span-3">Channel</div>
                   <div className="col-span-2 text-center">Subscribers</div>
                   <div className="col-span-2 text-center">Videos</div>
                   <div className="col-span-2 text-center">Avg Views</div>
                   <div className="col-span-1 text-center">Created</div>
                   <div className="col-span-1 text-center"></div>
                 </div>
               </div>
              {/* Table Rows */}
              <div className="divide-y divide-gray-200">
                {searchResults.map((result) => (
                  <div key={result.id.channelId} className="px-6 py-4 hover:bg-gray-50">
                    <div className="grid grid-cols-12 gap-4 items-center">
                      {/* Channel Info */}
                      <div className="col-span-1">
                        <input
                          type="checkbox"
                          checked={selectedChannels.has(result.id.channelId!)}
                          onChange={() => handleChannelSelect(result.id.channelId!)}
                          className="h-4 w-4 text-[#02b3e5] focus:ring-[#02b3e5] border-gray-300 rounded"
                        />
                      </div>
                      <div className="col-span-3 flex items-center space-x-3">
                        <img
                          src={result.snippet.thumbnails?.default?.url || '/placeholder-channel.png'}
                          alt={result.snippet.title}
                          className="w-12 h-12 rounded object-cover flex-shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <h4 className="text-sm font-medium text-gray-900 truncate">
                            {result.snippet.title}
                          </h4>
                          <p className="text-xs text-gray-500 truncate">
                            {result.snippet.channelTitle}
                          </p>
                      </div>
                    </div>

                      {/* Subscribers */}
                      <div className="col-span-2 text-center">
                        {result.statistics ? (
                          <span className="text-sm font-medium text-gray-900">
                            {formatNumber(parseInt(result.statistics.subscriberCount || '0'))}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                          </div>
                      
                      {/* Videos */}
                      <div className="col-span-2 text-center">
                        {result.statistics ? (
                          <span className="text-sm font-medium text-gray-900">
                            {formatNumber(parseInt(result.statistics.videoCount || '0'))}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </div>
                      
                      {/* Avg Views */}
                      <div className="col-span-2 text-center">
                        {result.statistics?.viewCount && result.statistics?.videoCount ? (
                          <span className="text-sm font-medium text-gray-900">
                            {formatNumber(Math.round(parseInt(result.statistics.viewCount) / parseInt(result.statistics.videoCount || '1')))}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                    </div>

                      {/* Date Created */}
                      <div className="col-span-1 text-center">
                        <span className="text-xs text-gray-500">
                          {new Date(result.snippet.publishedAt).toLocaleDateString('en-US', { 
                            month: 'short', 
                            year: 'numeric' 
                          })}
                        </span>
                    </div>
                      
                      {/* Empty column for alignment */}
                      <div className="col-span-1"></div>
                </div>
              </div>
            ))}
          </div>

              {/* Create Package Button */}
              <div className="px-6 py-3 border-t border-gray-200 bg-gray-50">
                  <button
                  onClick={() => setShowCreatePackage(true)}
                  className="text-sm text-[#02b3e5] hover:text-[#02b3e5]/80 font-medium"
                >
                  + Create new package
                  </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Packages Tab */}
      {activeTab === 'packages' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-0">
          {/* Package List */}
          <div className="lg:col-span-1 min-h-[600px]">
            <div className="bg-white rounded-sm border border-gray-200 h-full">
              <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-base font-semibold text-gray-900">Packages</h3>
            <button
                  onClick={() => setShowCreatePackage(true)}
                  className="p-1.5 text-[#02b3e5] hover:bg-[#02b3e5]/10 rounded-md"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

              {/* Package Search */}
              <div className="px-4 py-3 border-b border-gray-200">
                <input
                  type="text"
                  value={packageSearchQuery}
                  onChange={(e) => setPackageSearchQuery(e.target.value)}
                  placeholder="Search packages..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#02b3e5] focus:border-[#02b3e5]"
                />
              </div>
              
              <div className="divide-y divide-gray-200 flex-1">
                {filteredPackages.map((pkg) => (
                  <div
                    key={pkg.id}
                    onClick={() => handleSelectPackage(pkg)}
                    className={`p-3 cursor-pointer hover:bg-gray-50 ${
                      selectedPackage?.id === pkg.id ? 'bg-[#02b3e5]/10 border-r-2 border-[#02b3e5]' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                    <div>
                        <h4 className="font-medium text-gray-900 text-sm">{pkg.name} ({packageChannelCounts[pkg.id] || 0})</h4>
                        <p className="text-xs text-gray-600 mt-0.5">{pkg.description}</p>
                        <div className="flex items-center space-x-2 mt-1 text-xs text-gray-500">
                          <Calendar className="w-3 h-3" />
                          <span>{new Date(pkg.created_at).toLocaleDateString()}</span>
                          {pkg.is_public && (
                            <>
                              <span>•</span>
                              <span className="text-green-600">Public</span>
                            </>
                          )}
                        </div>
                    </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeletePackage(pkg.id);
                        }}
                        className="p-1 text-gray-400 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
                {filteredPackages.length === 0 && (
                  <div className="p-4 text-center text-gray-500">
                    <p className="text-sm">No packages found</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Package Details */}
          <div className="lg:col-span-2 min-h-[600px]">
            {selectedPackage ? (
              <div className="bg-white rounded-sm border border-gray-200 h-full">
                <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">
                      {selectedPackage.name} <span className="text-gray-500 font-normal">({packageChannelCounts[selectedPackage.id] || 0} channels)</span>
                    </h3>
                    <p className="text-xs text-gray-600 mt-0.5">{selectedPackage.description}</p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleExport(selectedPackage.id, 'csv')}
                      className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 flex items-center"
                    >
                      <Download className="w-3 h-3 mr-1" />
                      CSV
                    </button>
                    <button
                      onClick={() => handleExport(selectedPackage.id, 'google_ads')}
                      className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 flex items-center"
                    >
                      <Download className="w-3 h-3 mr-1" />
                      Google Ads
                    </button>
                    <button
                      onClick={() => handleExport(selectedPackage.id, 'json')}
                      className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 flex items-center"
                    >
                      <Download className="w-3 h-3 mr-1" />
                      JSON
                    </button>
                  </div>
                </div>
                
                {/* Table Header */}
                <div className="px-4 py-2 border-b border-gray-200 bg-gray-50">
                  <div className="grid grid-cols-12 gap-3 items-center text-xs font-medium text-gray-700">
                    <div className="col-span-1"></div>
                    <div className="col-span-6">Channel</div>
                    <div className="col-span-3 text-center">Subscribers</div>
                    <div className="col-span-2 text-center">Actions</div>
                    </div>
                  </div>
                  
                <div className="divide-y divide-gray-200 flex-1">
                  {packageChannels.map((channel) => (
                    <div key={channel.id} className="px-4 py-3 hover:bg-gray-50">
                      <div className="grid grid-cols-12 gap-3 items-center">
                        <div className="col-span-1">
                          <img
                            src={channel.youtube_channels.thumbnails?.default?.url || '/placeholder-channel.png'}
                            alt={channel.youtube_channels.title}
                            className="w-8 h-8 rounded object-cover"
                          />
                        </div>
                        <div className="col-span-6">
                          <h4 className="text-sm font-medium text-gray-900 truncate">
                            {channel.youtube_channels.title}
                          </h4>
                          <p className="text-xs text-gray-500 truncate">
                            {channel.youtube_channels.description}
                          </p>
                        </div>
                        <div className="col-span-3 text-center">
                          <span className="text-sm font-medium text-gray-900">
                            {formatNumber(channel.youtube_channels.subscriber_count || 0)}
                          </span>
                        </div>
                        <div className="col-span-2 text-center">
                          <button
                            onClick={() => handleRemoveFromPackage(channel.channel_id, selectedPackage.id)}
                            className="p-1 text-gray-400 hover:text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        </div>
                      </div>
                    ))}
                  {packageChannels.length === 0 && (
                    <div className="p-8 text-center text-gray-500">
                      <Package className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                      <p className="text-sm">No channels in this package yet.</p>
                      <p className="text-xs text-gray-400 mt-1">Search for channels and add them to this package.</p>
                    </div>
                  )}
                </div>
                  </div>
            ) : (
              <div className="bg-white rounded-sm border border-gray-200 h-full flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <Package className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">Select a package to view its channels</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Package Modal */}
      {showCreatePackage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New Package</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
                  value={newPackageName}
                  onChange={(e) => setNewPackageName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#02b3e5] focus:border-[#02b3e5]"
                  placeholder="Enter package name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={newPackageDescription}
                  onChange={(e) => setNewPackageDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#02b3e5] focus:border-[#02b3e5]"
                  placeholder="Enter package description"
                />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="public-package"
                  checked={newPackagePublic}
                  onChange={(e) => setNewPackagePublic(e.target.checked)}
                  className="h-4 w-4 text-[#02b3e5] focus:ring-[#02b3e5] border-gray-300 rounded"
                />
                <label htmlFor="public-package" className="ml-2 text-sm text-gray-700">
                  Make this package public
                </label>
              </div>
            </div>
            <div className="flex space-x-3 mt-6">
              <button
                onClick={handleCreatePackage}
                className="flex-1 px-4 py-2 bg-[#02b3e5] text-white rounded-md hover:bg-[#02b3e5]/90"
              >
                Create Package
              </button>
              <button
                onClick={() => setShowCreatePackage(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Popup */}
      {showSuccessPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Success!</h3>
            <p className="text-sm text-gray-600 mb-4">{successMessage}</p>
            <button
              onClick={() => setShowSuccessPopup(false)}
              className="px-4 py-2 bg-[#02b3e5] text-white rounded hover:bg-[#02b3e5]/90 text-sm"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default YouTubeCuration; 