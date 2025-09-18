import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSetBanner } from '../components/layout/BannerContext';
import { BarChart3, TrendingUp, Calendar, Download, Filter, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';
import { magniteApiService, type MagniteAccount, type MagniteCampaign, type MagniteBill } from '../lib/magniteApiService';

const MagniteAPI: React.FC = () => {
  const navigate = useNavigate();
  
  useSetBanner({
    title: 'Magnite API',
    subtitle: 'Reporting & Analytics from Magnite ClearLine platform'
  });

  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentAccount, setCurrentAccount] = useState<MagniteAccount | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [campaigns, setCampaigns] = useState<MagniteCampaign[]>([]);
  const [campaignsLoading, setCampaignsLoading] = useState(false);
  const [campaignsError, setCampaignsError] = useState<string | null>(null);


  // Check authentication status on component mount
  useEffect(() => {
    const checkAuthStatus = () => {
      const isAuth = magniteApiService.isAuthenticated();
      setIsConnected(isAuth);
      if (isAuth) {
        const account = magniteApiService.getCurrentAccountInfo();
        setCurrentAccount(account);
      }
    };
    
    checkAuthStatus();
  }, []);

  const handleConnect = async () => {
    if (isConnected) {
      magniteApiService.disconnect();
      setIsConnected(false);
      setCurrentAccount(null);
      setCampaigns([]);
      setError(null);
    } else {
      setIsLoading(true);
      setError(null);
      
      try {
        const success = await magniteApiService.authenticate();
        if (success) {
          setIsConnected(true);
          // Skip account retrieval due to 500 error on /accounts/current
          setCurrentAccount(null);
          await loadCampaigns();
        } else {
          setError('Failed to authenticate with Magnite API. Please check your credentials.');
        }
      } catch (err) {
        setError('Authentication error: ' + (err as Error).message);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const loadCampaigns = async () => {
    if (!isConnected) return;
    
    console.log('Loading campaigns...');
    setCampaignsLoading(true);
    setCampaignsError(null);
    
    try {
      const data = await magniteApiService.getCampaigns(1, 1000); // Get all campaigns
      console.log('Campaigns loaded successfully:', data);
      setCampaigns(data.campaigns);
    } catch (err) {
      console.error('Error loading campaigns:', err);
      setCampaignsError('Failed to load campaigns: ' + (err as Error).message);
    } finally {
      setCampaignsLoading(false);
    }
  };

  const handleRefreshCampaigns = async () => {
    await loadCampaigns();
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-4">
      {/* Connection Status & Controls */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Magnite ClearLine API</h3>
              <p className="text-sm text-gray-600">
                {isConnected ? 'Connected to Magnite API - Ready to fetch data' : 'Not connected - API credentials required'}
              </p>
              {isConnected && (
                <p className="text-xs text-gray-500">Authentication successful - Account details unavailable due to API limitation</p>
              )}
            </div>
          </div>
          <button
            onClick={handleConnect}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Connecting...' : isConnected ? 'Disconnect' : 'Connect API'}
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <span className="text-sm text-red-700">{error}</span>
          </div>
        )}

        {/* Campaign Controls */}
        {isConnected && (
          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Demand Tags</h3>
              <p className="text-sm text-gray-600">
                {campaigns.length} demand tags found
              </p>
            </div>
            <div className="flex space-x-2">
              <button 
                onClick={handleRefreshCampaigns}
                disabled={campaignsLoading}
                className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${campaignsLoading ? 'animate-spin' : ''}`} />
                {campaignsLoading ? 'Loading...' : 'Refresh'}
              </button>
              <button className="flex items-center px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm">
                <Download className="w-4 h-4 mr-2" />
                Export
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Campaigns List */}
      {isConnected && (
        <div className="bg-white rounded-lg border border-gray-200">
          {campaignsError && (
            <div className="p-4 bg-red-50 border-b border-red-200 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <span className="text-sm text-red-700">{campaignsError}</span>
            </div>
          )}
          
          {campaignsLoading ? (
            <div className="p-8 text-center">
              <RefreshCw className="w-8 h-8 mx-auto mb-2 text-gray-400 animate-spin" />
              <p className="text-gray-500">Loading demand tags...</p>
            </div>
          ) : campaigns.length > 0 ? (
            <div className="divide-y divide-gray-200">
              {campaigns.map((campaign) => (
                <div key={campaign.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => navigate(`/demand-tag/${campaign.id}`)}
                          className="text-sm font-medium text-blue-600 hover:text-blue-800 truncate text-left transition-colors"
                        >
                          {campaign.name}
                        </button>
                        <div className={`px-2 py-1 rounded-full text-xs ${
                          campaign.active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {campaign.active ? 'Active' : (campaign.status || 'Inactive')}
                        </div>
                      </div>
                      <div className="mt-1 flex items-center space-x-4 text-xs text-gray-500">
                        <span>ID: {campaign.id}</span>
                        {campaign.rate && <span>Rate: ${campaign.rate}</span>}
                        {campaign.demand_partner_id && <span>Partner ID: {campaign.demand_partner_id}</span>}
                        {campaign.demand_class && <span>Class: {campaign.demand_class}</span>}
                        {campaign.type && <span>Type: {campaign.type}</span>}
                        {campaign.created_at && <span>Created: {new Date(campaign.created_at).toLocaleDateString()}</span>}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {campaign.updated_at && (
                        <span className="text-xs text-gray-500">
                          Updated: {new Date(campaign.updated_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center">
              <BarChart3 className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <p className="text-gray-500">No demand tags found</p>
            </div>
          )}
        </div>
      )}

    </div>
  );
};

export default MagniteAPI;
