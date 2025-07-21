import React, { useState, useRef, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { ChevronDown, Plus, UserPlus, X, LogOut, Search, Bot } from 'lucide-react'
import { Link } from 'react-router-dom'
import AIChatDrawer from './AIChatDrawer'

const Header: React.FC = () => {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [orgs, setOrgs] = useState<any[]>([])
  const [currentOrg, setCurrentOrg] = useState<any>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showJoinModal, setShowJoinModal] = useState(false)
  const [orgNameInput, setOrgNameInput] = useState('')
  const [joinTokenInput, setJoinTokenInput] = useState('')
  const [modalError, setModalError] = useState('')
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false)
  const profileDropdownRef = useRef<HTMLDivElement>(null)
  const [user, setUser] = useState<any>(null)
  const [aiSearchQuery, setAiSearchQuery] = useState('')
  const [showAIChat, setShowAIChat] = useState(false)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false)
      }
    }
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    } else {
      document.removeEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [dropdownOpen])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
        setProfileDropdownOpen(false)
      }
    }
    if (profileDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    } else {
      document.removeEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [profileDropdownOpen])

  useEffect(() => {
    const fetchUserAndOrgs = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      console.log('User data:', user)
      setUser(user)
      if (!user) {
        setOrgs([])
        setCurrentOrg(null)
        return
      }
      const { data, error } = await supabase
        .from('organization_members')
        .select('organization:organization_id(id, name), organization_id')
        .eq('user_id', user.id)
      if (error || !data || data.length === 0) {
        setOrgs([])
        setCurrentOrg(null)
        return
      }
      const orgsList = data.map((row: any) => ({ id: row.organization_id, name: row.organization?.name || 'Unknown Org' }))
      setOrgs(orgsList)
      const storedOrgId = localStorage.getItem('currentOrgId')
      const found = orgsList.find(o => o.id === storedOrgId)
      setCurrentOrg(found || orgsList[0])
    }
    fetchUserAndOrgs()

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('Auth state changed:', session?.user)
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleSwitchOrg = (org: any) => {
    setCurrentOrg(org)
    localStorage.setItem('currentOrgId', org.id)
    setDropdownOpen(false)
  }

  const handleCreateOrg = async () => {
    setShowCreateModal(true)
  }

  const handleJoinOrg = async () => {
    setShowJoinModal(true)
  }

  const submitCreateOrg = async () => {
    if (!orgNameInput.trim()) {
      setModalError('Organisation name required')
      return
    }
    const { error } = await supabase.rpc('create_organisation', { org_name: orgNameInput.trim() })
    if (error) {
      setModalError(error.message)
      return
    }
    setShowCreateModal(false)
    setOrgNameInput('')
    setModalError('')
    window.location.reload()
  }

  const submitJoinOrg = async () => {
    if (!joinTokenInput.trim()) {
      setModalError('Invite token required')
      return
    }
    const { error } = await supabase.rpc('join_org_with_token', { invite_token: joinTokenInput.trim() })
    if (error) {
      setModalError(error.message)
      return
    }
    setShowJoinModal(false)
    setJoinTokenInput('')
    setModalError('')
    window.location.reload()
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const handleAISearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (aiSearchQuery.trim()) {
      setShowAIChat(true)
      // The query will be passed to the drawer via props
    }
  }

  return (
    <>
      <header className="bg-black h-14 flex items-center px-6 justify-between shadow-sm fixed top-0 left-0 right-0 z-[9999]">
        <div className="flex items-center">
          <Link to="/analytics" className="flex items-center cursor-pointer">
            <img src="/LightBox_Custom_WhiteBlue.png" alt="Logo" className="h-7 w-auto" />
            <span className="text-pink-400 text-xl font-normal tracking-tight pl-1">Labs</span>
          </Link>
        </div>
        
        {/* AI Search Bar */}
        <div className="flex-1 max-w-md mx-8">
          <form onSubmit={handleAISearch} className="relative">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={aiSearchQuery}
                onChange={(e) => setAiSearchQuery(e.target.value)}
                placeholder="Ask LightBoxTV AI anything..."
                className="w-full pl-10 pr-12 py-2 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 bg-pink-500 text-white rounded hover:bg-pink-600 transition-colors"
                disabled={!aiSearchQuery.trim()}
              >
                <Bot className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>

        <div className="flex items-center space-x-4">
          {/* User email */}
          <div className="text-white text-sm font-medium">
            {user?.email}
          </div>
          {/* Profile dropdown with org switcher inside */}
          <div className="relative" ref={profileDropdownRef}>
            <button
              className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-gray-700 font-bold text-lg focus:outline-none"
              onClick={() => setProfileDropdownOpen(v => !v)}
            >
              {user?.email ? user.email.charAt(0).toUpperCase() : 'U'}
            </button>
            {profileDropdownOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-xl shadow-lg z-[9999]">
                {/* User profile section */}
                <div className="px-6 pt-4 pb-3 flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-gray-700 font-bold text-xl mb-2">
                    {user?.email ? user.email.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div className="text-sm font-medium text-gray-900 text-center">
                    {user?.email}
                  </div>
                </div>
                <div className="border-t border-gray-200" />
                {/* Organization section */}
                <div className="px-6 pt-3 pb-2">
                  <div className="text-xs font-semibold text-gray-500 tracking-wide mb-1">Current Organization</div>
                  <div className="font-semibold text-[#00B4E7] text-base mb-2">{currentOrg ? currentOrg.name : 'No Org'}</div>
                </div>
                <div className="border-t border-gray-200 my-2" />
                <a href="#" className="block px-6 py-2 text-sm text-gray-700 hover:bg-gray-100 font-medium rounded transition">My Account</a>
                <Link
                  to="/my-organizations"
                  className="block px-6 py-2 text-sm text-gray-700 hover:bg-gray-100 font-medium rounded transition"
                  onClick={() => setProfileDropdownOpen(false)}
                >
                  My Organizations
                </Link>
                <div className="border-t border-gray-200 my-2" />
                <button
                  className="btn w-11/12 mx-auto block mt-5 mb-3 border border-[#00B4E7] text-[#00B4E7] hover:bg-blue-50 hover:border-blue-400 flex items-center justify-center gap-2"
                  onClick={handleSignOut}
                >
                  <LogOut className="w-4 h-4 mr-1" />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
      
      {/* AI Chat Drawer */}
      <AIChatDrawer 
        isOpen={showAIChat} 
        onClose={() => {
          setShowAIChat(false)
          setAiSearchQuery('') // Clear the search query when drawer closes
        }}
        initialQuery={aiSearchQuery}
      />
    </>
  )
}

// Simple Modal component
const Modal = ({ open, onClose, title, children }: any) => {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 relative">
        <button className="absolute top-3 right-3 text-gray-400 hover:text-gray-600" onClick={onClose}><X className="w-5 h-5" /></button>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">{title}</h2>
        {children}
      </div>
    </div>
  )
}

export default Header 