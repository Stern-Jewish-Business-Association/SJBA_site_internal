//App is the actual app page. Where it starts from? what it returns.

import './App.css'
import { LoginPage } from './pages/LoginPage'
import { HomePage } from './pages/HomePage'


function App() {
  const path = window.location.pathname
  const isLoginPage = path === '/login' || path === '/'

  return (
    <main className="app-shell">
      <header className="app-header">
        <h1 className="app-title">Admin Panel</h1>
        <nav className="app-nav">
          <a href="/">Login</a>
          <a href="/dashboard">Dashboard</a>
        </nav>
      </header>

      <div className="page-content">
        {isLoginPage ? <LoginPage /> : <HomePage />}
      </div>
    </main>
  )
}

export default App
