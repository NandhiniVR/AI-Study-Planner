import { useState, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const navItems = [
  { to: '/dashboard', icon: '🏠', label: 'Dashboard' },
  { to: '/timetable', icon: '📅', label: 'Timetable', highlight: true },
  { to: '/analytics', icon: '📊', label: 'Analytics' },
  { to: '/pomodoro', icon: '⏱️', label: 'Pomodoro' },
  { to: '/smart-learning', icon: '🧠', label: 'Smart Learning' },
  { to: '/assistant', icon: '🤖', label: 'AI Assistant' },
]

export default function Sidebar({ isOpen, onClose }) {
  const navigate = useNavigate()
  const { currentUser, logout } = useAuth()

  const handleLogout = async () => {
    try {
      await logout()
      navigate('/login')
    } catch (err) {
      console.error(err)
    }
  }

  const [isLightMode, setIsLightMode] = useState(() => {
    return localStorage.getItem('theme') === 'light'
  })

  // Apply theme to HTML tag whenever it changes
  useEffect(() => {
    if (isLightMode) {
      document.documentElement.classList.add('light-mode')
      localStorage.setItem('theme', 'light')
    } else {
      document.documentElement.classList.remove('light-mode')
      localStorage.setItem('theme', 'dark')
    }
  }, [isLightMode])

  const toggleTheme = () => setIsLightMode(!isLightMode)

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-logo">
        <h2>✦ StudyAI</h2>
        <span>Smart Study Planner</span>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''} ${item.highlight ? 'nav-link-highlight' : ''}`}
            onClick={onClose}
            title={item.to === '/timetable' ? 'Generate / View Timetable' : undefined}
          >
            <span className="nav-icon">{item.icon}</span>
            {item.label}
            {item.highlight && (
              <span style={{
                marginLeft: 'auto', fontSize: '0.62rem', fontWeight: '700',
                background: 'rgba(108,92,231,0.3)', color: 'var(--primary-light)',
                padding: '2px 8px', borderRadius: '10px', textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>New</span>
            )}
          </NavLink>
        ))}
      </nav>

      <div style={{ padding: '0 24px', marginBottom: '16px' }}>
        <button
          onClick={toggleTheme}
          className="btn btn-secondary btn-block"
          style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            padding: '10px 16px',
            fontSize: '0.9rem'
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isLightMode ? '☀️' : '🌙'} {isLightMode ? 'Light Mode' : 'Dark Mode'}
          </span>
          <div style={{
            width: '36px', height: '20px', 
            background: isLightMode ? 'var(--primary-glow)' : 'rgba(255,255,255,0.1)',
            borderRadius: '20px',
            position: 'relative',
            transition: '0.3s'
          }}>
            <div style={{
              position: 'absolute',
              top: '2px',
              left: isLightMode ? '18px' : '2px',
              width: '16px', height: '16px',
              background: isLightMode ? 'var(--primary)' : '#fff',
              borderRadius: '50%',
              transition: '0.3s'
            }} />
          </div>
        </button>
      </div>

      <div className="sidebar-footer">
        <div className="user-info">
          <div className="user-avatar">{currentUser?.email?.charAt(0).toUpperCase() || 'A'}</div>
          <div className="user-details">
            <div className="name">{currentUser?.displayName || 'Student'}</div>
            <div className="email">{currentUser?.email || 'alex@email.com'}</div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="btn btn-secondary btn-sm btn-block"
          style={{ marginTop: '16px', fontSize: '0.8rem' }}
        >
          🚪 Logout
        </button>
      </div>
    </aside>
  )
}
