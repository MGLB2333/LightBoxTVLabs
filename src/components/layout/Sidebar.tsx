import React, { useEffect, useState, useRef } from 'react'
import { Link, useLocation, NavLink } from 'react-router-dom'
import { BarChart3, Users, Settings, ChevronDown, Youtube, Tv, Bot, Book, Target, TrendingUp } from 'lucide-react'
import { supabase } from '../../lib/supabase'

const navItems = [
  { name: 'Campaigns', icon: BarChart3, href: '/analytics' },
  { name: 'Analytics', icon: BarChart3, href: '/analytics-insights' },
  { name: 'Audience Builder', icon: Target, href: '/audience-builder' },
  { name: 'YouTube Curation', icon: Youtube, href: '/youtube-curation' },
  { name: 'TV Intelligence', icon: Tv, href: '/tv-intelligence' },
  { name: 'Incremental Reach', icon: TrendingUp, href: '/incremental-reach' },
]

const Sidebar: React.FC = () => {
  const location = useLocation()
  const [orgs, setOrgs] = useState<any[]>([])
  const [currentOrg, setCurrentOrg] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

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
    const fetchOrgs = async () => {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setOrgs([])
        setCurrentOrg(null)
        setLoading(false)
        return
      }
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
      // Get member counts for each org
      const orgsWithCounts = await Promise.all(data.map(async (row: any) => {
        const orgId = row.organization_id
        const orgName = row.organization?.name || 'Unknown Org'
        const { count } = await supabase
          .from('organization_members')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', orgId)
        return { id: orgId, name: orgName, members: count || 1 }
      }))
      setOrgs(orgsWithCounts)
      // Try to restore selected org from localStorage
      const storedOrgId = localStorage.getItem('currentOrgId')
      const found = orgsWithCounts.find(o => o.id === storedOrgId)
      setCurrentOrg(found || orgsWithCounts[0])
      setLoading(false)
    }
    fetchOrgs()
  }, [])

  const handleSwitchOrg = (org: any) => {
    setCurrentOrg(org)
    localStorage.setItem('currentOrgId', org.id)
    setDropdownOpen(false)
  }

  const handleCreateOrg = async () => {
    const orgName = prompt('Enter new organisation name:')
    if (!orgName) return
    setLoading(true)
    const { data, error } = await supabase.rpc('create_organisation', { org_name: orgName })
    if (error) {
      alert(error.message)
      setLoading(false)
      return
    }
    // Refetch orgs
    window.location.reload()
  }

  const handleJoinOrg = async () => {
    const token = prompt('Enter invite token:')
    if (!token) return
    setLoading(true)
    const { error } = await supabase.rpc('join_org_with_token', { invite_token: token })
    if (error) {
      alert(error.message)
      setLoading(false)
      return
    }
    // Refetch orgs
    window.location.reload()
  }

  return (
    <aside className="w-64 bg-white border-r border-gray-200 h-screen flex flex-col sticky top-14">
      <nav className="flex-1 px-4 py-6 overflow-y-auto">
        <ul className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <li key={item.name}>
                <NavLink
                  to={item.href}
                  className={({ isActive }) =>
                    `flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors duration-150 ${
                      isActive ? 'bg-[#02b3e5]/10 text-[#02b3e5] font-semibold' : 'text-gray-700 hover:bg-gray-100'
                    }`
                  }
                >
                  <Icon className={`w-5 h-5 mr-3 ${location.pathname === item.href ? 'text-[#02b3e5]' : 'text-gray-400'}`} />
                  {item.name}
                </NavLink>
              </li>
            )
          })}
        </ul>
        <div className="mt-auto">
          <hr className="my-4 border-gray-200" />
          <NavLink
            to="/integrations"
            className={({ isActive }) =>
              `flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors duration-150 ${
                isActive ? 'bg-[#02b3e5]/10 text-[#02b3e5] font-semibold' : 'text-gray-700 hover:bg-gray-100'
              }`
            }
          >
            <Settings className="w-5 h-5 mr-3 text-[#02b3e5]" />
            Integrations
          </NavLink>
          <hr className="my-4 border-gray-200" />
          <NavLink
            to="/documentation/getting-started"
            className={({ isActive }) =>
              `flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors duration-150 ${
                isActive ? 'bg-[#02b3e5]/10 text-[#02b3e5] font-semibold' : 'text-gray-700 hover:bg-gray-100'
              }`
            }
          >
            <Book className="w-5 h-5 mr-3 text-[#02b3e5]" />
            Documentation
          </NavLink>
        </div>
      </nav>
    </aside>
  )
}

export default Sidebar 