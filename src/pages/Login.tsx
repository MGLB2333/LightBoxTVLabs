import React, { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate, useLocation } from 'react-router-dom'

const Login: React.FC = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [inviteToken, setInviteToken] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()
  const location = useLocation()

  React.useEffect(() => {
    // Check if user is already logged in
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        navigate('/analytics')
      }
    }
    checkUser()

    // If invite token is in URL (?invite=xxx), prefill
    const params = new URLSearchParams(location.search)
    const token = params.get('invite')
    if (token) setInviteToken(token)
  }, [location.search, navigate])

  const handleAuth = async (type: 'signIn' | 'signUp') => {
    setLoading(true)
    setError(null)
    let result
    if (type === 'signIn') {
      result = await supabase.auth.signInWithPassword({ email, password })
    } else {
      result = await supabase.auth.signUp({ email, password })
    }
    if (result.error) {
      setError(result.error.message)
      setLoading(false)
      return
    }
    // If invite token, call join org function
    if (inviteToken) {
      await joinOrgWithToken(inviteToken)
    }
    setLoading(false)
    navigate('/analytics')
  }

  // Call a Supabase function to join org with token
  const joinOrgWithToken = async (token: string) => {
    await supabase.rpc('join_org_with_token', { invite_token: token })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <div className="bg-black rounded-t-lg h-14 flex items-center justify-center mb-6 -mt-8 -mx-8">
          <img src="/LightBox_Custom_WhiteBlue.png" alt="Logo" className="h-7 w-auto" />
          <span className="text-pink-400 text-xl font-normal tracking-tight pl-1">Labs</span>
        </div>
        <h1 className="text-gray-900 mb-2">Sign in</h1>
        <form
          onSubmit={e => {
            e.preventDefault()
            handleAuth('signIn')
          }}
          className="space-y-4"
        >
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
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        <div className="mt-4 text-center">
          <a href="/signup" className="text-blue-500 hover:underline text-sm">Don't have an account? Sign up</a>
        </div>
      </div>
    </div>
  )
}

export default Login 