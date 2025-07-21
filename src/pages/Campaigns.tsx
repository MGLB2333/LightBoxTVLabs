import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useSetBanner } from '../components/layout/BannerContext';
import { Plus, MoreVertical, Edit, Trash2, Copy, Eye } from 'lucide-react';

const statusColors: Record<string, string> = {
  planning: 'bg-yellow-100 text-yellow-800',
  active: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
};

const statusOptions = [
  { value: 'planning', label: 'Planning' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'paused', label: 'Paused' },
  { value: 'cancelled', label: 'Cancelled' },
];

// Mock campaign data for development
const mockCampaigns: Campaign[] = [
  {
    id: '1',
    name: 'Summer Launch 2025',
    status: 'planning',
    start_date: '2025-08-01',
    end_date: '2025-08-31',
    advertiser: 'Summer Brands Inc',
    advertiser_url: 'https://summerbrands.com',
    advertiser_id: 'summer_001',
    old_objectid: 'mock_001',
    uuid_id: 'uuid_001',
    budget: 40000,
    cpm: 24.50,
  },
  {
    id: '2',
    name: 'Black Friday Blitz',
    status: 'active',
    start_date: '2024-11-15',
    end_date: '2024-11-30',
    advertiser: 'Retail Giant',
    advertiser_url: 'https://retailgiant.com',
    advertiser_id: 'retail_001',
    old_objectid: 'mock_002',
    uuid_id: 'uuid_002',
    budget: 120000,
    cpm: 28.75,
  },
  {
    id: '3',
    name: 'Spring Refresh',
    status: 'completed',
    start_date: '2024-03-01',
    end_date: '2024-03-31',
    advertiser: 'Spring Collection',
    advertiser_url: 'https://springcollection.com',
    advertiser_id: 'spring_001',
    old_objectid: 'mock_003',
    uuid_id: 'uuid_003',
    budget: 25000,
    cpm: 22.00,
  },
];

const EllipsisIcon = () => (
  <MoreVertical className="w-4 h-4 text-gray-600" />
);

interface Campaign {
  id: string;
  name: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
  advertiser: string | null;
  advertiser_url: string | null;
  advertiser_id: string | null;
  old_objectid: string | null;
  uuid_id: string | null;
  budget?: number;
  cpm?: number;
  planned_budget?: number;
  planned_impressions?: number;
  planned_cpm?: number;
  created_at?: string;
  updated_at?: string;
}

const Campaigns: React.FC = () => {
  const setBanner = useSetBanner();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [editForm, setEditForm] = useState<Partial<Campaign>>({});
  const [saving, setSaving] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchCampaigns = async () => {
      setLoading(true);
      const { data, error } = await supabase.from('campaigns').select('*').order('created_at', { ascending: false });
      if (!error && data && data.length > 0) setCampaigns(data);
      else setCampaigns(mockCampaigns);
      setLoading(false);
    };
    fetchCampaigns();
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenu(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Set banner content
  useEffect(() => {
    setBanner(
      <div className="w-full">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Campaigns</h1>
            <p className="text-gray-600 mt-1 text-sm">View, plan, and analyze all your campaigns in one place.</p>
          </div>
          <div className="flex gap-2">
            <button className="px-3 py-1.5 bg-[#02b3e5] text-white rounded-md hover:bg-[#3bc8ea] flex items-center gap-2 text-sm">
              <Plus className="w-3 h-3" />
              New Campaign
            </button>
          </div>
        </div>
      </div>
    );
    return () => setBanner(null);
  }, [setBanner]);

  const handleEdit = (campaign: Campaign) => {
    setEditingCampaign(campaign);
    setEditForm({
      name: campaign.name,
      status: campaign.status,
      start_date: campaign.start_date,
      end_date: campaign.end_date,
      advertiser: campaign.advertiser,
      advertiser_url: campaign.advertiser_url,
      advertiser_id: campaign.advertiser_id,
      budget: campaign.budget,
      cpm: campaign.cpm,
      planned_budget: campaign.planned_budget,
      planned_impressions: campaign.planned_impressions,
      planned_cpm: campaign.planned_cpm,
    });
    setOpenMenu(null);
  };

  const positionDropdown = (buttonElement: HTMLElement, dropdownElement: HTMLElement) => {
    if (!buttonElement || !dropdownElement) return;
    
    const rect = buttonElement.getBoundingClientRect();
    
    // Position dropdown below the button
    dropdownElement.style.position = 'fixed';
    dropdownElement.style.left = `${rect.left}px`;
    dropdownElement.style.top = `${rect.bottom + 8}px`;
    dropdownElement.style.zIndex = '9999';
    
    console.log('Button at:', rect.left, rect.top);
    console.log('Dropdown positioned at:', rect.left, rect.bottom + 8);
  };

  const handleSave = async () => {
    if (!editingCampaign) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('campaigns')
        .update(editForm)
        .eq('id', editingCampaign.id);
      
      if (error) {
        console.error('Error updating campaign:', error);
        alert('Failed to update campaign');
      } else {
        // Update local state
        setCampaigns(prev => prev.map(c => 
          c.id === editingCampaign.id ? { ...c, ...editForm } : c
        ));
        setEditingCampaign(null);
        setEditForm({});
      }
    } catch (error) {
      console.error('Error saving campaign:', error);
      alert('Failed to save campaign');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditingCampaign(null);
    setEditForm({});
  };

  const filteredCampaigns = search
    ? campaigns.filter(c => c.name?.toLowerCase().includes(search.toLowerCase()))
    : campaigns;

  return (
    <div className="w-full space-y-6">
      {/* Search Bar and Campaigns Table */}
      <div className="bg-white border border-gray-200 overflow-hidden">
        {/* Search Bar */}
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <input
              type="text"
              className="w-full pl-3 pr-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#02b3e5]"
              placeholder="Search campaigns..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Campaigns Table */}
        <div className="overflow-visible">
          <table className="min-w-full w-full divide-y divide-gray-100 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dates</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Advertiser</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Budget</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">CPM</th>
                <th className="px-6 py-3 relative">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-400">Loading...</td></tr>
              ) : filteredCampaigns.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-400">No campaigns found.</td></tr>
              ) : filteredCampaigns.map(c => (
                <tr key={c.id} className="hover:bg-gray-50 group">
                  <td className="px-6 py-4 font-medium text-gray-900">{c.name}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${statusColors[c.status] || 'bg-gray-100 text-gray-600'}`}>
                      {c.status?.charAt(0).toUpperCase() + c.status?.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-700">
                    {c.start_date && c.end_date ? `${c.start_date} - ${c.end_date}` : '-'}
                  </td>
                  <td className="px-6 py-4 text-gray-700">{c.advertiser || '-'}</td>
                  <td className="px-6 py-4 text-gray-700">{c.budget ? `$${c.budget.toLocaleString()}` : '-'}</td>
                  <td className="px-6 py-4 text-gray-700">{c.cpm ? `$${c.cpm.toFixed(2)}` : '-'}</td>
                  <td className="px-6 py-4 text-right relative overflow-visible">
                    <button
                      className="p-1 rounded hover:bg-gray-100 transition-opacity text-gray-900"
                      onClick={(e) => {
                        const newState = openMenu === c.id ? null : c.id;
                        setOpenMenu(newState);
                        if (newState) {
                          // Position dropdown after it renders
                          setTimeout(() => {
                            const button = e.currentTarget;
                            const dropdown = menuRef.current;
                            if (button && dropdown) {
                              positionDropdown(button, dropdown);
                            }
                          }, 10);
                        }
                      }}
                      aria-label="Actions"
                    >
                      <EllipsisIcon />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dropdown Menu - Rendered outside table */}
      {openMenu && (
        <div ref={menuRef} className="w-48 bg-white border border-gray-200 rounded-md shadow-lg py-1">
          <button 
            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            onClick={() => {
              const campaign = campaigns.find(c => c.id === openMenu);
              if (campaign) handleEdit(campaign);
            }}
          >
            <Edit className="w-4 h-4 mr-2" />
            Edit Campaign
          </button>
          <button className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
            <Eye className="w-4 h-4 mr-2" />
            View Details
          </button>
          <button className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
            <Copy className="w-4 h-4 mr-2" />
            Duplicate
          </button>
          <hr className="my-1" />
          <button className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50">
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </button>
        </div>
      )}

      {/* Edit Campaign Modal */}
      {editingCampaign && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Edit Campaign</h3>
                <button 
                  onClick={handleCancel}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-4">
                {/* Basic Information */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Campaign Name</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#02b3e5]"
                      value={editForm.name || ''}
                      onChange={e => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#02b3e5]"
                      value={editForm.status || ''}
                      onChange={e => setEditForm(prev => ({ ...prev, status: e.target.value }))}
                    >
                      {statusOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                    <input
                      type="date"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#02b3e5]"
                      value={editForm.start_date || ''}
                      onChange={e => setEditForm(prev => ({ ...prev, start_date: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                    <input
                      type="date"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#02b3e5]"
                      value={editForm.end_date || ''}
                      onChange={e => setEditForm(prev => ({ ...prev, end_date: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Advertiser Information */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Advertiser</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#02b3e5]"
                      value={editForm.advertiser || ''}
                      onChange={e => setEditForm(prev => ({ ...prev, advertiser: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Advertiser URL</label>
                    <input
                      type="url"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#02b3e5]"
                      value={editForm.advertiser_url || ''}
                      onChange={e => setEditForm(prev => ({ ...prev, advertiser_url: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Financial Information */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Budget ($)</label>
                    <input
                      type="number"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#02b3e5]"
                      value={editForm.budget || ''}
                      onChange={e => setEditForm(prev => ({ ...prev, budget: parseFloat(e.target.value) || undefined }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">CPM ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#02b3e5]"
                      value={editForm.cpm || ''}
                      onChange={e => setEditForm(prev => ({ ...prev, cpm: parseFloat(e.target.value) || undefined }))}
                    />
                  </div>
                </div>

                {/* Planned Information */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Planned Budget ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#02b3e5]"
                      value={editForm.planned_budget || ''}
                      onChange={e => setEditForm(prev => ({ ...prev, planned_budget: parseFloat(e.target.value) || undefined }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Planned Impressions</label>
                    <input
                      type="number"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#02b3e5]"
                      value={editForm.planned_impressions || ''}
                      onChange={e => setEditForm(prev => ({ ...prev, planned_impressions: parseInt(e.target.value) || undefined }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Planned CPM ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#02b3e5]"
                      value={editForm.planned_cpm || ''}
                      onChange={e => setEditForm(prev => ({ ...prev, planned_cpm: parseFloat(e.target.value) || undefined }))}
                    />
                  </div>
                </div>

                {/* Additional Fields */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Advertiser ID</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#02b3e5]"
                      value={editForm.advertiser_id || ''}
                      onChange={e => setEditForm(prev => ({ ...prev, advertiser_id: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">UUID ID</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#02b3e5]"
                      value={editForm.uuid_id || ''}
                      onChange={e => setEditForm(prev => ({ ...prev, uuid_id: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Read-only Fields */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Old Object ID</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
                      value={editingCampaign.old_objectid || ''}
                      readOnly
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Campaign ID</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
                      value={editingCampaign.id}
                      readOnly
                    />
                  </div>
                </div>
              </div>
              
              <div className="mt-6 flex justify-end space-x-3">
                <button 
                  onClick={handleCancel}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 bg-[#02b3e5] text-white rounded-md hover:bg-[#3bc8ea] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Campaigns; 