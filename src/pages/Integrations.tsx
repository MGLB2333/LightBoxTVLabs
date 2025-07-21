import React, { useState, useEffect } from 'react'
import { Plus, Search, ExternalLink, Settings, Trash2, CheckCircle, AlertCircle, Youtube, MessageSquare, BarChart3, X, RefreshCw, Loader2 } from 'lucide-react'
import { useSetBanner } from '../components/layout/BannerContext'
import { integrationService, type IntegrationStatus } from '../lib/integrationService'
import { googleAdsService } from '../lib/googleAdsService'

// Integration definitions
const integrationDefinitions = [
  {
    id: 'google-ads',
    name: 'Google Ads',
    description: 'Connect your Google Ads account to import campaign data and performance metrics.',
    icon: <BarChart3 className="w-6 h-6 text-[#4285F4]" />,
    category: 'advertising',
    features: ['Campaign data import', 'Performance metrics', 'Real-time reporting', 'Audience insights']
  },
  {
    id: 'youtube',
    name: 'YouTube',
    description: 'Connected to analyze video performance and audience engagement data.',
    icon: <img src="https://www.youtube.com/favicon.ico" alt="YouTube" className="w-6 h-6 rounded" />,
    category: 'content',
    features: ['Video analytics', 'Audience insights', 'Content performance', 'Engagement metrics']
  },
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'Connected for AI-powered content analysis and audience insights.',
    icon: <img src="https://openai.com/favicon.ico" alt="OpenAI" className="w-6 h-6 rounded" />,
    category: 'ai',
    features: ['Content analysis', 'Audience insights', 'Predictive analytics', 'AI recommendations']
  }
]

const tabs = [
  { id: 'all', name: 'All integrations' },
  { id: 'connected', name: 'Connected' },
  { id: 'available', name: 'Available' },
]

const Integrations: React.FC = () => {
  const setBanner = useSetBanner();
  const [activeTab, setActiveTab] = useState('all')
  const [search, setSearch] = useState('')
  const [selectedIntegration, setSelectedIntegration] = useState<any>(null)
  const [showModal, setShowModal] = useState(false)
  const [integrationStatuses, setIntegrationStatuses] = useState<IntegrationStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [connectingGoogleAds, setConnectingGoogleAds] = useState(false)

  // Load integration statuses
  const loadIntegrationStatuses = async () => {
    try {
      setLoading(true)
      const statuses = await integrationService.getAllIntegrationStatuses()
      setIntegrationStatuses(statuses)
    } catch (error) {
      console.error('Error loading integration statuses:', error)
    } finally {
      setLoading(false)
    }
  }

  // Refresh integration statuses
  const refreshIntegrations = async () => {
    try {
      setRefreshing(true)
      await loadIntegrationStatuses()
    } finally {
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadIntegrationStatuses()
  }, [])

  // Merge integration definitions with statuses
  const integrations = integrationDefinitions.map(definition => {
    const status = integrationStatuses.find(s => s.id === definition.id)
    return {
      ...definition,
      status: status?.status || 'disconnected',
      accountDetails: status?.accountDetails,
      error: status?.error,
      lastChecked: status?.lastChecked
    }
  })

  let filtered = integrations
  if (activeTab !== 'all') {
    if (activeTab === 'connected') filtered = integrations.filter(i => i.status === 'connected')
    if (activeTab === 'available') filtered = integrations.filter(i => i.status === 'disconnected')
  }
  if (search) {
    filtered = filtered.filter(i => i.name.toLowerCase().includes(search.toLowerCase()) || i.description.toLowerCase().includes(search.toLowerCase()))
  }

  const handleConnect = (integrationId: string) => {
    console.log('Connecting to:', integrationId)
    // TODO: Implement connection logic
  }

  const handleDisconnect = (integrationId: string) => {
    console.log('Disconnecting from:', integrationId)
    // TODO: Implement disconnection logic
  }

  const handleAccountClick = (integration: any) => {
    setSelectedIntegration(integration)
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setSelectedIntegration(null)
  }

  // Set banner content
  useEffect(() => {
    setBanner(
      <div className="w-full">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Integrations</h1>
            <p className="text-gray-600 mt-1 text-sm">Connect your tools and platforms to enhance your TV intelligence dashboard.</p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={refreshIntegrations}
              disabled={refreshing}
              className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 flex items-center gap-2 text-sm disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button className="px-3 py-1.5 bg-[#02b3e5] text-white rounded-md hover:bg-[#3bc8ea] flex items-center gap-2 text-sm">
              <Plus className="w-3 h-3" />
              Add Integration
            </button>
          </div>
        </div>
        <nav className="mt-4 border-b border-gray-200 flex space-x-8">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-2 text-sm font-medium transition-colors border-b-2 ${
                activeTab === tab.id
                  ? 'border-[#02b3e5] text-[#02b3e5]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.name}
            </button>
          ))}
        </nav>
      </div>
    );
    return () => setBanner(null);
  }, [setBanner, activeTab, refreshing]);

  // Connect Google Ads account
  const connectGoogleAds = async () => {
    try {
      setConnectingGoogleAds(true)
      const authUrl = await googleAdsService.initiateOAuth()
      window.location.href = authUrl
    } catch (error) {
      console.error('Error initiating Google Ads OAuth:', error)
      setBanner(
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          Failed to connect Google Ads account
        </div>
      )
    } finally {
      setConnectingGoogleAds(false)
    }
  }

  // Disconnect Google Ads account
  const disconnectGoogleAds = async () => {
    try {
      await googleAdsService.disconnect()
      await refreshIntegrations()
      setBanner(
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
          Google Ads account disconnected successfully
        </div>
      )
    } catch (error) {
      console.error('Error disconnecting Google Ads:', error)
      setBanner(
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          Failed to disconnect Google Ads account
        </div>
      )
    }
  }

  return (
    <div className="p-6">
      {/* Search and Refresh */}
      <div className="flex justify-between items-center mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search integrations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <button
          onClick={refreshIntegrations}
          disabled={refreshing}
          className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Integration Cards */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(integration => (
            <div key={integration.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  {integration.icon}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">{integration.name}</h3>
                    <p className="text-sm text-gray-600">{integration.description}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {integration.status === 'connected' && (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  )}
                  {integration.status === 'error' && (
                    <AlertCircle className="w-5 h-5 text-red-500" />
                  )}
                  {integration.status === 'disconnected' && (
                    <div className="w-2 h-2 bg-gray-300 rounded-full" />
                  )}
                </div>
              </div>

              {integration.status === 'connected' && integration.accountDetails && (
                <div className="mb-4 p-3 bg-gray-50 rounded-md">
                  <div className="text-sm text-gray-600">
                    <div className="flex justify-between">
                      <span>Account:</span>
                      <span className="font-medium">{integration.accountDetails.email || integration.accountDetails.organization}</span>
                    </div>
                    <div className="flex justify-between mt-1">
                      <span>Last sync:</span>
                      <span className="font-medium">
                        {new Date(integration.accountDetails.lastSync || '').toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {integration.status === 'error' && integration.error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-600">{integration.error}</p>
                </div>
              )}

              <div className="flex space-x-2">
                {integration.id === 'google-ads' && integration.status === 'disconnected' && (
                  <button
                    onClick={connectGoogleAds}
                    disabled={connectingGoogleAds}
                    className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {connectingGoogleAds ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}
                    <span>{connectingGoogleAds ? 'Connecting...' : 'Connect'}</span>
                  </button>
                )}

                {integration.id === 'google-ads' && integration.status === 'connected' && (
                  <button
                    onClick={disconnectGoogleAds}
                    className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Disconnect</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    setSelectedIntegration(integration)
                    setShowModal(true)
                  }}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 text-sm font-medium rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <Settings className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && selectedIntegration && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">{selectedIntegration.name}</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <p className="text-gray-600">{selectedIntegration.description}</p>
              
              {selectedIntegration.status === 'connected' && selectedIntegration.accountDetails && (
                <div className="p-3 bg-gray-50 rounded-md">
                  <h4 className="font-medium text-gray-900 mb-2">Account Details</h4>
                  <div className="space-y-1 text-sm text-gray-600">
                    <div className="flex justify-between">
                      <span>Account:</span>
                      <span>{selectedIntegration.accountDetails.email || selectedIntegration.accountDetails.organization}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Connected:</span>
                      <span>{new Date(selectedIntegration.accountDetails.connectedDate || '').toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Last sync:</span>
                      <span>{new Date(selectedIntegration.accountDetails.lastSync || '').toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex space-x-2">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 text-gray-700 bg-white border border-gray-300 text-sm font-medium rounded-md hover:bg-gray-50"
                >
                  Close
                </button>
                {selectedIntegration.status === 'connected' && (
                  <button
                    onClick={() => {
                      // Handle sync action
                      setShowModal(false)
                    }}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
                  >
                    Sync Now
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Integrations 