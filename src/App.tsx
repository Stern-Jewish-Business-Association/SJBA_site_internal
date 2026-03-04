import './App.css'
import { LoginPage } from './pages/LoginPage'
import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import { fetchAdminRoute } from './lib/api'
import { LoggedInPage } from './pages/LoggedInPage'

const LOGIN_PATH = '/'
const DASHBOARD_PATH = '/dashboard'

function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [isCheckingSession, setIsCheckingSession] = useState(true)
  const [apiResponse, setApiResponse] = useState<string>('')
  const [apiError, setApiError] = useState('')
  const [isTestingBackend, setIsTestingBackend] = useState(false)
  const [pathname, setPathname] = useState(window.location.pathname)

  const navigateTo = (path: string, replace = false) => {
    if (window.location.pathname === path) {
      setPathname(path)
      return
    }

    const method = replace ? 'replaceState' : 'pushState'
    window.history[method](null, '', path)
    setPathname(path)
  }

  useEffect(() => {
    const loadSession = async () => {
      const {
        data: { session: activeSession },
      } = await supabase.auth.getSession()

      setSession(activeSession)
      setIsCheckingSession(false)

      if (activeSession) {
        navigateTo(DASHBOARD_PATH, true)
      } else {
        navigateTo(LOGIN_PATH, true)
      }
    }

    void loadSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, activeSession) => {
      setSession(activeSession)
      setApiError('')
      setApiResponse('')
      setIsCheckingSession(false)

      if (activeSession) {
        navigateTo(DASHBOARD_PATH, true)
      } else {
        navigateTo(LOGIN_PATH, true)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    const handlePopState = () => {
      setPathname(window.location.pathname)
    }

    window.addEventListener('popstate', handlePopState)

    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const handleSignOut = async () => {
    setApiError('')
    setApiResponse('')
    await supabase.auth.signOut()
  }

  const handleTestBackend = async () => {
    if (!session?.access_token) {
      setApiError('No active access token found. Sign in again.')
      return
    }

    setIsTestingBackend(true)
    setApiError('')
    
    // Clear previous response before making new request
    try {
      const data = await fetchAdminRoute(session.access_token)
      setApiResponse(JSON.stringify(data, null, 2))
    } catch (error) {
      setApiResponse('')
      setApiError(error instanceof Error ? error.message : 'Unknown backend error')
    } finally {
      setIsTestingBackend(false)
    }
  }

  const isLoginRoute = pathname === LOGIN_PATH
  const isDashboardRoute = pathname === DASHBOARD_PATH

  return (
    <main className="app-shell">
      <header className="app-header">
        <h1 className="app-title">Admin Panel</h1>
        <nav className="app-nav">
          <a href={session ? DASHBOARD_PATH : LOGIN_PATH}>{session ? 'Dashboard' : 'Login'}</a>
        </nav>
      </header>

      <div className="page-content">
        {isCheckingSession ? (
          <section className="login-section" aria-label="Checking session">
            <h2 className="login-title">Checking session</h2>
            <p className="login-subtitle">Looking for an active Supabase admin session.</p>
          </section>
        ) : !session && isDashboardRoute ? (
          <LoginPage />
        ) : session && isLoginRoute ? (
          <LoggedInPage
            email={session.user.email ?? 'unknown user'}
            apiError={apiError}
            apiResponse={apiResponse}
            isTestingBackend={isTestingBackend}
            onSignOut={handleSignOut}
            onTestBackend={handleTestBackend}
          />
        ) : session ? (
          <LoggedInPage
            email={session.user.email ?? 'unknown user'}
            apiError={apiError}
            apiResponse={apiResponse}
            isTestingBackend={isTestingBackend}
            onSignOut={handleSignOut}
            onTestBackend={handleTestBackend}
          />
        ) : (
          <LoginPage />
        )}
      </div>
    </main>
  )
}

export default App
