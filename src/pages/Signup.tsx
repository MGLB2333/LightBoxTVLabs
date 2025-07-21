import React, { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'

const Signup: React.FC = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [inviteToken, setInviteToken] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)
  const [showOrgOptions, setShowOrgOptions] = useState(false)
  const [orgName, setOrgName] = useState('')
  const navigate = useNavigate()

  React.useEffect(() => {
    // Check if user is already logged in
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        navigate('/analytics')
      }
    }
    checkUser()
  }, [navigate])

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }
    setUser(data.user)
    setShowOrgOptions(true)
    setLoading(false)
  }

  const handleJoinOrg = async () => {
    if (!inviteToken) {
      setError('Invite token required to join an organisation')
      return
    }
    setLoading(true)
    setError(null)
    const { error } = await supabase.rpc('join_org_with_token', { invite_token: inviteToken })
    if (error) setError(error.message)
    else navigate('/analytics')
    setLoading(false)
  }

  const handleCreateOrg = async () => {
    if (!orgName) {
      setError('Organisation name required')
      return
    }
    setLoading(true)
    setError(null)
    const { data, error } = await supabase.rpc('create_organisation', { org_name: orgName })
    if (error) setError(error.message)
    else navigate('/analytics')
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <div className="bg-black rounded-t-lg h-14 flex items-center justify-center mb-6 -mt-8 -mx-8">
          <img src="/LightBox_Custom_WhiteBlue.png" alt="Logo" className="h-7 w-auto" />
          <span className="text-pink-400 text-xl font-normal tracking-tight pl-1">Labs</span>
        </div>
        <h1 className="text-gray-900 mb-2">Sign up</h1>
        {!showOrgOptions ? (
          <form onSubmit={handleSignUp} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Password</label>
              <input
                type="password"
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>
            {error && <div className="text-red-500 text-sm">{error}</div>}
            <button type="submit" className="btn btn-primary w-full" disabled={loading}>
              {loading ? 'Signing up...' : 'Sign Up'}
            </button>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="flex space-x-2">
              <button className="btn btn-primary flex-1" onClick={handleJoinOrg} disabled={loading}>
                Join Organisation
              </button>
              {user?.is_super_admin && (
                <button className="btn flex-1 border border-gray-300" onClick={handleCreateOrg} disabled={loading}>
                  Create Organisation
                </button>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Invite Token</label>
              <input
                type="text"
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={inviteToken}
                onChange={e => setInviteToken(e.target.value)}
                placeholder="Paste invite token to join"
              />
            </div>
            {user?.is_super_admin && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Organisation Name</label>
                <input
                  type="text"
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  value={orgName}
                  onChange={e => setOrgName(e.target.value)}
                  placeholder="Enter new organisation name"
                />
              </div>
            )}
            {error && <div className="text-red-500 text-sm">{error}</div>}
          </div>
        )}
        <div className="mt-4 text-center">
          <a href="/login" className="text-blue-500 hover:underline text-sm">Already have an account? Sign in</a>
        </div>
      </div>
    </div>
  )
}

export default Signup 