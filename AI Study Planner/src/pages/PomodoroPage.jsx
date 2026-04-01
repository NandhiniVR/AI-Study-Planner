import { useState, useEffect, useRef } from 'react'
import ChatbotPage from './ChatbotPage'

const FOCUS_MINUTES = 25
const BREAK_MINUTES = 5

export default function PomodoroPage() {
  const [mode, setMode] = useState('focus') // 'focus' | 'break'
  const [secondsLeft, setSecondsLeft] = useState(FOCUS_MINUTES * 60)
  const [running, setRunning] = useState(false)
  const [sessions, setSessions] = useState(() => parseInt(localStorage.getItem('pomodoroSessions')) || 0)
  const [totalFocusMin, setTotalFocusMin] = useState(() => parseInt(localStorage.getItem('pomodoroTotalMin')) || 0)
  const [interruptedSessions, setInterruptedSessions] = useState(() => parseInt(localStorage.getItem('pomodoroInterrupted')) || 0)
  const [pomodoroStatus, setPomodoroStatus] = useState('Idle')
  const [showChatbot, setShowChatbot] = useState(false)
  const intervalRef = useRef(null)

  useEffect(() => {
    localStorage.setItem('pomodoroSessions', sessions)
  }, [sessions])

  useEffect(() => {
    localStorage.setItem('pomodoroTotalMin', totalFocusMin)
  }, [totalFocusMin])

  useEffect(() => {
    localStorage.setItem('pomodoroInterrupted', interruptedSessions)
  }, [interruptedSessions])

  useEffect(() => {
    if (running) {
       setPomodoroStatus(mode === 'focus' ? 'Focused' : 'Break')
    } else {
       setPomodoroStatus(pomodoroStatus === 'Distracted' ? 'Distracted' : 'Idle')
    }
  }, [running, mode])

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && running && mode === 'focus') {
        handleDistraction()
      }
    }
    const handleBlur = () => {
      if (running && mode === 'focus') {
        handleDistraction()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('blur', handleBlur)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('blur', handleBlur)
    }
  }, [running, mode])

  const handleDistraction = () => {
    setRunning(false)
    setInterruptedSessions(prev => prev + 1)
    setPomodoroStatus('Distracted')
    alert("Focus lost. Pomodoro session ended. Please stay on the page to maintain focus!")
    setMode('focus')
    setSecondsLeft(FOCUS_MINUTES * 60)
  }

  const totalSeconds = mode === 'focus' ? FOCUS_MINUTES * 60 : BREAK_MINUTES * 60
  const progress = ((totalSeconds - secondsLeft) / totalSeconds) * 100

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            clearInterval(intervalRef.current)
            setRunning(false)
            if (mode === 'focus') {
              setSessions((s) => s + 1)
              setTotalFocusMin((m) => m + FOCUS_MINUTES)
              setMode('break')
              return BREAK_MINUTES * 60
            } else {
              setMode('focus')
              return FOCUS_MINUTES * 60
            }
          }
          return prev - 1
        })
      }, 1000)
    } else {
      clearInterval(intervalRef.current)
    }
    return () => clearInterval(intervalRef.current)
  }, [running, mode])

  const mins = String(Math.floor(secondsLeft / 60)).padStart(2, '0')
  const secs = String(secondsLeft % 60).padStart(2, '0')

  const handleReset = () => {
    setRunning(false)
    setMode('focus')
    setSecondsLeft(FOCUS_MINUTES * 60)
  }

  const switchMode = (m) => {
    setRunning(false)
    setMode(m)
    setSecondsLeft(m === 'focus' ? FOCUS_MINUTES * 60 : BREAK_MINUTES * 60)
  }

  const handleFinishSession = () => {
    if (mode === 'focus') {
      setSessions((s) => s + 1)
      setTotalFocusMin((m) => m + FOCUS_MINUTES)
    }
    switchMode(mode === 'focus' ? 'break' : 'focus')
  }

  // SVG circle progress
  const radius = 110
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference - (progress / 100) * circumference

  return (
    <div className="animate-in">
      <div className="page-header">
        <h1>⏱ Pomodoro Timer</h1>
        <p>Stay focused with structured work and break intervals</p>
      </div>

      {/* Mode toggle */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '40px' }}>
        <button
          id="focus-mode-btn"
          className={`btn ${mode === 'focus' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => switchMode('focus')}
        >
          🎯 Focus (25 min)
        </button>
        <button
          id="break-mode-btn"
          className={`btn ${mode === 'break' ? 'btn-accent' : 'btn-secondary'}`}
          onClick={() => switchMode('break')}
        >
          ☕ Break (5 min)
        </button>
      </div>

      {/* Circle timer */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '36px' }}>
        <div style={{ position: 'relative', width: 280, height: 280 }}>
          <svg width="280" height="280" style={{ transform: 'rotate(-90deg)' }}>
            <circle
              cx="140" cy="140" r={radius}
              fill="none"
              stroke="var(--surface-hover)"
              strokeWidth="8"
            />
            <circle
              cx="140" cy="140" r={radius}
              fill="none"
              stroke={mode === 'focus' ? 'var(--primary)' : 'var(--accent)'}
              strokeWidth="8"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 0.5s ease' }}
            />
          </svg>
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              {mode === 'focus' ? '🎯 Focus' : '☕ Break'}
            </div>
            <div style={{ fontSize: '3.5rem', fontWeight: '700', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
              {mins}:{secs}
            </div>
            <div style={{ fontSize: '0.83rem', color: pomodoroStatus === 'Distracted' ? 'var(--danger)' : 'var(--text-muted)', marginTop: '6px' }}>
              {pomodoroStatus}
            </div>
          </div>
        </div>
      </div>

      {/* Embedded Chatbot Modal Toggle */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
        <button
          className="btn btn-secondary"
          onClick={() => setShowChatbot(!showChatbot)}
          style={{ background: showChatbot ? 'var(--primary-glow)' : 'var(--surface)' }}
        >
          {showChatbot ? 'Close AI Assistant ✕' : '💬 Ask AI Doubt (Without Leaving!)'}
        </button>
      </div>

      {showChatbot && (
        <div style={{
          position: 'fixed', inset: '10%', zIndex: 1000,
          background: 'var(--bg-primary)', border: '1px solid var(--border)',
          borderRadius: '16px', boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
          overflow: 'hidden', display: 'flex', flexDirection: 'column'
        }}>
          <div style={{ padding: '10px 20px', background: 'var(--surface)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)' }}>
            <h3 style={{ margin: 0 }}>Integrated Chatbot</h3>
            <button onClick={() => setShowChatbot(false)} className="btn btn-sm btn-secondary">Close ✕</button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <ChatbotPage />
          </div>
        </div>
      )}

      {/* Controls */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', marginBottom: '48px' }}>
        <button
          id="pomodoro-toggle-btn"
          className={`btn ${mode === 'focus' ? 'btn-primary' : 'btn-accent'}`}
          style={{ minWidth: '130px' }}
          onClick={() => setRunning(!running)}
        >
          {running ? '⏸ Pause' : '▶ Start'}
        </button>
        <button
          id="pomodoro-finish-btn"
          className="btn btn-secondary"
          onClick={handleFinishSession}
          title="Finish current session early"
        >
          ✅ Finish
        </button>
        <button
          id="pomodoro-reset-btn"
          className="btn btn-secondary"
          onClick={handleReset}
        >
          🔄 Reset
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '48px' }}>
        {[
          { label: 'Sessions Done', value: sessions, icon: '🍅' },
          { label: 'Focus Time', value: `${totalFocusMin}m`, icon: '🕐' },
          { label: 'Distracted Sessions', value: interruptedSessions, icon: '⚠️' }
        ].map((stat) => (
          <div key={stat.label} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '4px' }}>{stat.icon}</div>
            <div style={{ fontSize: '1.4rem', fontWeight: '700', color: 'var(--primary-light)' }}>{stat.value}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Tips */}
      <div style={{
        marginTop: '48px',
        background: 'var(--surface)',
        border: '1px solid var(--surface-border)',
        borderRadius: 'var(--radius)',
        padding: '20px 24px',
      }}>
        <h4 style={{ marginBottom: '10px', fontSize: '0.9rem', fontWeight: '600' }}>💡 Pomodoro Tips</h4>
        <ul style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {[
            'Work on a single task during each focus session',
            'Take a longer 15-min break after 4 sessions',
            'Avoid checking your phone during focus time',
          ].map((tip) => (
            <li key={tip} style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', paddingLeft: '16px', position: 'relative' }}>
              <span style={{ position: 'absolute', left: 0, color: 'var(--primary-light)' }}>›</span>
              {tip}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
