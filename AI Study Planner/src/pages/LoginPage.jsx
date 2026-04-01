import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function LoginPage() {
  const navigate = useNavigate()
  const { login, signup, loginWithGoogle, currentUser } = useAuth()
  
  useEffect(() => {
    if (currentUser) {
      navigate('/dashboard', { replace: true })
    }
  }, [currentUser, navigate])
  
  const [isLoginMode, setIsLoginMode] = useState(true)
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.email || !form.password) {
      setError('Please fill in all fields.')
      return
    }
    
    try {
      setError('')
      setLoading(true)
      if (isLoginMode) {
        await login(form.email, form.password)
      } else {
        await signup(form.email, form.password)
      }
      navigate('/dashboard')
    } catch (err) {
      setError(err.message || 'Failed to authenticate')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    try {
      setError('')
      setLoading(true)
      await loginWithGoogle()
      navigate('/dashboard')
    } catch (err) {
      setError(err.message || 'Failed to authenticate with Google')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="logo">
          <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>✦</div>
          <h1>StudyAI</h1>
          <p>Your intelligent study companion</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              name="email"
              type="email"
              className="input-field"
              placeholder="you@example.com"
              value={form.email}
              onChange={handleChange}
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              className="input-field"
              placeholder="••••••••"
              value={form.password}
              onChange={handleChange}
              autoComplete="current-password"
            />
          </div>

          {error && (
            <p style={{ color: 'var(--danger)', fontSize: '0.85rem', marginBottom: '12px' }}>
              {error}
            </p>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '24px' }}>
            <a href="#" style={{ color: 'var(--primary-light)', fontSize: '0.85rem' }}>
              Forgot password?
            </a>
          </div>

          <button
            id="login-btn"
            type="submit"
            className="btn btn-primary btn-block"
            disabled={loading}
          >
            {loading ? (
              <span className="loading-dots">
                <span /><span /><span />
              </span>
            ) : (
              isLoginMode ? 'Sign In →' : 'Sign Up →'
            )}
          </button>
        </form>

        <div style={{ textAlign: 'center', margin: '20px 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          — OR —
        </div>

        <button 
          className="btn btn-secondary btn-block"
          onClick={handleGoogleSignIn}
          disabled={loading}
          style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" style={{ width: '18px' }} />
          Continue with Google
        </button>

        <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          {isLoginMode ? "New here? " : "Already have an account? "}
          <a
            href="#"
            style={{ color: 'var(--primary-light)' }}
            onClick={(e) => { e.preventDefault(); setIsLoginMode(!isLoginMode) }}
          >
            {isLoginMode ? "Create your study plan" : "Sign in instead"}
          </a>
        </p>
      </div>
    </div>
  )
}
