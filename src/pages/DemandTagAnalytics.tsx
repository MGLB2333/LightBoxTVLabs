import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, BarChart3, TrendingUp, Eye, MousePointer, Calendar, RefreshCw } from 'lucide-react';
import { magniteApiService } from '../lib/magniteApiService';

interface DemandTagAnalytics {
  id: number;
  name: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
  demand_partner_id?: number;
  rate?: number;
  demand_class?: string;
  type?: string;
  description?: string;
  // Additional fields that might be available from the API
  active?: boolean;
  impressions?: number;
  clicks?: number;
  revenue?: number;
}

const DemandTagAnalytics: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState<DemandTagAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (id) {
      loadAnalytics();
    }
  }, [id]);

  const loadAnalytics = async () => {
    if (!id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Fetch the specific demand tag details from the API
      const demandTags = await magniteApiService.getCampaigns(1, 1000);
      const demandTag = demandTags.campaigns.find(tag => tag.id === parseInt(id));
      
      if (!demandTag) {
        setError('Demand tag not found');
        return;
      }
      
      // Use the real data from the API response
      const analyticsData: DemandTagAnalytics = {
        id: demandTag.id,
        name: demandTag.name,
        status: demandTag.status,
        created_at: demandTag.created_at,
        updated_at: demandTag.updated_at,
        demand_partner_id: demandTag.demand_partner_id,
        rate: demandTag.rate,
        demand_class: demandTag.demand_class,
        type: demandTag.type,
        description: demandTag.description,
        active: demandTag.active
      };
      
      setAnalytics(analyticsData);
    } catch (err) {
      console.error('Error loading analytics:', err);
      setError('Failed to load demand tag data');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAnalytics();
    setRefreshing(false);
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 text-gray-400 animate-spin" />
          <span className="ml-2 text-gray-500">Loading analytics...</span>
        </div>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="text-red-600 mr-2">⚠️</div>
            <div>
              <h3 className="text-sm font-medium text-red-800">Error Loading Analytics</h3>
              <p className="text-sm text-red-700">{error || 'Analytics data not found'}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/magnite-api')}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Demand Tags</span>
          </button>
          <div className="h-6 w-px bg-gray-300"></div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{analytics.name}</h1>
            <p className="text-sm text-gray-500">Analytics Dashboard</p>
          </div>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Demand Tag Details */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Demand Tag Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div>
            <p className="text-sm font-medium text-gray-600">Status</p>
            <div className="flex items-center space-x-2 mt-1">
              <div className={`w-2 h-2 rounded-full ${
                analytics.active ? 'bg-green-500' : 'bg-gray-400'
              }`}></div>
              <span className="text-sm font-medium text-gray-900">
                {analytics.status || (analytics.active ? 'Active' : 'Inactive')}
              </span>
            </div>
          </div>
          
          {analytics.demand_partner_id && (
            <div>
              <p className="text-sm font-medium text-gray-600">Partner ID</p>
              <p className="text-sm text-gray-900 mt-1">{analytics.demand_partner_id}</p>
            </div>
          )}
          
          {analytics.rate && (
            <div>
              <p className="text-sm font-medium text-gray-600">Rate</p>
              <p className="text-sm text-gray-900 mt-1">{formatCurrency(analytics.rate)}</p>
            </div>
          )}
          
          {analytics.demand_class && (
            <div>
              <p className="text-sm font-medium text-gray-600">Demand Class</p>
              <p className="text-sm text-gray-900 mt-1">{analytics.demand_class}</p>
            </div>
          )}
          
          {analytics.type && (
            <div>
              <p className="text-sm font-medium text-gray-600">Type</p>
              <p className="text-sm text-gray-900 mt-1">{analytics.type}</p>
            </div>
          )}
          
          <div>
            <p className="text-sm font-medium text-gray-600">Demand Tag ID</p>
            <p className="text-sm text-gray-900 mt-1">{analytics.id}</p>
          </div>
        </div>
      </div>

      {/* Timeline Information */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {analytics.created_at && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Created</h3>
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-900">
                {new Date(analytics.created_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>
          </div>
        )}
        
        {analytics.updated_at && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Last Updated</h3>
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-900">
                {new Date(analytics.updated_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Description */}
      {analytics.description && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Description</h3>
          <p className="text-sm text-gray-700">{analytics.description}</p>
        </div>
      )}

      {/* API Information */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <BarChart3 className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-blue-800">Real-Time Data</h3>
            <p className="text-sm text-blue-700 mt-1">
              This data is fetched directly from the Magnite ClearLine API. 
              {analytics.impressions || analytics.clicks || analytics.revenue 
                ? ' Additional performance metrics may be available through reporting endpoints.' 
                : ' Performance metrics are not available for this demand tag.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DemandTagAnalytics;
