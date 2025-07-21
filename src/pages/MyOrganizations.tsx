import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Plus, UserPlus, Link as LinkIcon, X, Trash2, Search as SearchIcon } from 'lucide-react'

const MyOrganizations: React.FC = () => {
  const [orgs, setOrgs] = useState<any[]>([])
  const [currentOrg, setCurrentOrg] = useState<any>(null)
  const [members, setMembers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showJoinModal, setShowJoinModal] = useState(false)
  const [orgNameInput, setOrgNameInput] = useState('')
  const [joinTokenInput, setJoinTokenInput] = useState('')
  const [modalError, setModalError] = useState('')
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [showAdminModal, setShowAdminModal] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteToken, setInviteToken] = useState('')
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [memberToDelete, setMemberToDelete] = useState<any>(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    const fetchOrgs = async () => {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setOrgs([])
        setCurrentOrg(null)
        setIsSuperAdmin(false)
        setLoading(false)
        return
      }
      // Get super admin status
      const { data: userData } = await supabase.from('users').select('is_super_admin').eq('id', user.id).single()
      setIsSuperAdmin(!!userData?.is_super_admin)
      // Get orgs
      const { data, error } = await supabase
        .from('organization_members')
        .select('organization:organization_id(id, name), organization_id')
        .eq('user_id', user.id)
      if (error || !data || data.length === 0) {
        setOrgs([])
        setCurrentOrg(null)
        setLoading(false)
        return
      }
      const orgsList = data.map((row: any) => ({ id: row.organization_id, name: row.organization?.name || 'Unknown Org' }))
      setOrgs(orgsList)
      setCurrentOrg(orgsList[0])
      setLoading(false)
    }
    fetchOrgs()
  }, [])

  useEffect(() => {
    const fetchMembers = async () => {
      if (!currentOrg) return
      setLoading(true)
      const { data, error } = await supabase
        .from('organization_members')
        .select('user_id, role, users(email, created_at)')
        .eq('organization_id', currentOrg.id)
      setMembers(data || [])
      setLoading(false)
    }
    fetchMembers()
  }, [currentOrg])

  const submitCreateOrg = async () => {
    if (!orgNameInput.trim()) {
      setModalError('Organisation name required')
      return
    }
    // Temporarily disabled - RPC function doesn't exist
    setModalError('Organization creation is temporarily disabled. Please contact support.')
    setShowCreateModal(false)
    setOrgNameInput('')
  }
  
  const submitJoinOrg = async () => {
    if (!joinTokenInput.trim()) {
      setModalError('Invite token required')
      return
    }
    // Temporarily disabled - RPC function doesn't exist
    setModalError('Organization joining is temporarily disabled. Please contact support.')
    setShowJoinModal(false)
    setJoinTokenInput('')
  }

  const handleCreateOrgClick = () => {
    if (!isSuperAdmin) {
      setShowAdminModal(true)
      return
    }
    setShowCreateModal(true)
  }
  const handleInviteMembers = async () => {
    if (!currentOrg) return
    
    // Generate a simple invite token client-side
    const inviteToken = crypto.randomUUID()
    
    // Store the token in a temporary table or use it directly
    // For now, we'll just use it directly
    setInviteToken(inviteToken)
    setShowInviteModal(true)
  }

  const handleDeleteMember = (member: any) => {
    setMemberToDelete(member)
    setShowDeleteModal(true)
  }
  const confirmDeleteMember = async () => {
    if (!memberToDelete || !currentOrg) return
    await supabase
      .from('organization_members')
      .delete()
      .eq('organization_id', currentOrg.id)
      .eq('user_id', memberToDelete.user_id)
    setShowDeleteModal(false)
    setMemberToDelete(null)
    // Refresh members
    const { data } = await supabase
      .from('organization_members')
      .select('user_id, role, users(email, created_at)')
      .eq('organization_id', currentOrg.id)
    setMembers(data || [])
  }

  return (
    <div className="w-full max-w-6xl mx-auto px-6">
      <div className="flex items-center justify-between mb-8">
        <h1>My Organizations</h1>
        <div className="flex gap-2">
          <button className="btn flex items-center gap-1 border border-gray-300" onClick={() => setShowJoinModal(true)}>
            <UserPlus className="w-4 h-4" /> Join Organization
          </button>
          <button className="btn btn-primary flex items-center gap-1" onClick={handleCreateOrgClick}>
            <Plus className="w-4 h-4" /> Create Organization
          </button>
        </div>
      </div>
      <div className="flex gap-8">
        {/* Left: Org List */}
        <div className="w-64 flex-shrink-0">
          <div className="font-semibold text-gray-700 mb-4">Organizations</div>
          <ul className="space-y-1">
            {orgs.map(org => (
              <li key={org.id}>
                <button
                  className={`w-full text-left px-3 py-2 rounded-lg transition font-medium ${currentOrg?.id === org.id ? 'bg-blue-50 text-[#00B4E7] border border-blue-200' : 'hover:bg-gray-100 text-gray-900'}`}
                  onClick={() => setCurrentOrg(org)}
                >
                  {org.name}
                </button>
              </li>
            ))}
          </ul>
        </div>
        {/* Right: Members Table */}
        <div className="flex-1">
          <span className="font-semibold text-gray-700 text-lg mb-2 block">Members</span>
          <div className="bg-white rounded-xl border border-gray-100">
            {/* Members Table Header (attached) */}
            <div className="flex items-center justify-between px-4 pt-4 pb-2 border-b border-gray-100 rounded-t-xl">
              <div className="flex gap-2 items-center flex-1">
                <div className="relative w-full max-w-md">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <SearchIcon className="w-5 h-5" />
                  </span>
                  <input
                    type="text"
                    className="border border-gray-300 rounded-md pl-10 pr-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#00B4E7] w-full"
                    placeholder="Search members..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                </div>
              </div>
              <div>
                {currentOrg && (
                  <button className="btn flex items-center gap-1 border border-gray-300" onClick={handleInviteMembers}>
                    <LinkIcon className="w-4 h-4" /> Invite Members
                  </button>
                )}
              </div>
            </div>
            <table className="table">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left px-4 py-2 font-semibold text-gray-700">Email</th>
                  <th className="text-left px-4 py-2 font-semibold text-gray-700">Role</th>
                  <th className="text-left px-4 py-2 font-semibold text-gray-700">Created</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {members.filter(m => !search || (m.users?.email || '').toLowerCase().includes(search.toLowerCase())).map((m, i) => (
                  <tr key={m.user_id} className={i % 2 === 0 ? '' : 'bg-gray-50'}>
                    <td className="px-4 py-2">{m.users?.email || m.user_id}</td>
                    <td className="px-4 py-2 capitalize">{m.role}</td>
                    <td className="px-4 py-2">{m.users?.created_at ? new Date(m.users.created_at).toLocaleDateString() : '-'}</td>
                    <td className="px-4 py-2 text-right">
                      <button onClick={() => handleDeleteMember(m)} className="text-red-500 hover:text-red-700 p-1">
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
                {members.filter(m => !search || (m.users?.email || '').toLowerCase().includes(search.toLowerCase())).length === 0 && (
                  <tr><td colSpan={3} className="px-4 py-6 text-center text-gray-400">No members found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      {/* Create Org Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 relative">
            <button className="absolute top-3 right-3 text-gray-400 hover:text-gray-600" onClick={() => { setShowCreateModal(false); setOrgNameInput(''); setModalError('') }}><X className="w-5 h-5" /></button>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Create Organization</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Organization Name</label>
              <input
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#00B4E7]"
                value={orgNameInput}
                onChange={e => setOrgNameInput(e.target.value)}
                placeholder="Enter organization name"
              />
            </div>
            {modalError && <div className="text-red-500 text-sm mb-2">{modalError}</div>}
            <button className="btn btn-primary w-full" onClick={submitCreateOrg}>Create</button>
          </div>
        </div>
      )}
      {/* Join Org Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 relative">
            <button className="absolute top-3 right-3 text-gray-400 hover:text-gray-600" onClick={() => { setShowJoinModal(false); setJoinTokenInput(''); setModalError('') }}><X className="w-5 h-5" /></button>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Join Organization</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Invite Token</label>
              <input
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#00B4E7]"
                value={joinTokenInput}
                onChange={e => setJoinTokenInput(e.target.value)}
                placeholder="Paste invite token"
              />
            </div>
            {modalError && <div className="text-red-500 text-sm mb-2">{modalError}</div>}
            <button className="btn btn-primary w-full" onClick={submitJoinOrg}>Join</button>
          </div>
        </div>
      )}
      {/* Admin Only Modal */}
      {showAdminModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 relative">
            <button className="absolute top-3 right-3 text-gray-400 hover:text-gray-600" onClick={() => setShowAdminModal(false)}><X className="w-5 h-5" /></button>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Only Administrators can create organizations</h2>
            <div className="text-gray-600 mb-4">Speak to your LightboxTV account manager to create a new organization.</div>
            <button className="btn w-full border border-gray-300" onClick={() => setShowAdminModal(false)}>Close</button>
          </div>
        </div>
      )}
      {/* Invite Token Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 relative">
            <button className="absolute top-3 right-3 text-gray-400 hover:text-gray-600" onClick={() => { setShowInviteModal(false); setInviteToken(''); setModalError('') }}><X className="w-5 h-5" /></button>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Invite Members</h2>
            {inviteToken ? (
              <>
                <div className="mb-2 text-gray-700">Share this invite token with your team:</div>
                <div className="bg-gray-100 rounded px-3 py-2 font-mono text-sm text-gray-800 mb-4 break-all">{inviteToken}</div>
                <button className="btn btn-primary w-full" onClick={() => {navigator.clipboard.writeText(inviteToken)}}>Copy Token</button>
              </>
            ) : (
              <div className="text-red-500 text-sm mb-2">{modalError || 'No token generated.'}</div>
            )}
          </div>
        </div>
      )}
      {/* Delete Member Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 relative">
            <button className="absolute top-3 right-3 text-gray-400 hover:text-gray-600" onClick={() => setShowDeleteModal(false)}><X className="w-5 h-5" /></button>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Remove Member</h2>
            <div className="mb-4 text-gray-700">Are you sure you want to remove <span className="font-semibold">{memberToDelete?.users?.email || memberToDelete?.user_id}</span> from this organization?</div>
            <div className="flex gap-2">
              <button className="btn w-1/2 border border-gray-300" onClick={() => setShowDeleteModal(false)}>Cancel</button>
              <button className="btn btn-primary w-1/2" onClick={confirmDeleteMember}>Remove</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MyOrganizations 