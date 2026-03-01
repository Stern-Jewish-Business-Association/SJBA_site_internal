//App is the actual app page. Where it starts from? what it returns.

import './App.css'
import { LoginPage } from './pages/LoginPage'

function App() {
  return (
    <main className="app-shell">
      <header className="app-header">
        <h1 className="app-title">Admin Panel</h1>
        <nav className="app-nav">
          <a href="/">Login</a>
        </nav>
      </header>

      <div className="page-content">
        <LoginPage />
      </div>
    </main>
  )
}

export default App
