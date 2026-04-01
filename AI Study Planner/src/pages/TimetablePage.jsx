import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { db } from '../firebase'
import { collection, query, where, getDocs, doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore'

const SESSION_COLORS = {
  study:     { bg: 'rgba(108,92,231,0.12)', border: '#6C5CE7', text: '#a29bfe' },
  break:     { bg: 'rgba(0,184,148,0.08)',  border: '#00b894', text: '#55efc4' },
  revision:  { bg: 'rgba(253,203,110,0.12)', border: '#fdcb6e', text: '#ffeaa7' },
  mock_test: { bg: 'rgba(225,112,85,0.12)', border: '#e17055', text: '#fab1a0' },
}

// Removed SessionPill in favor of rendering table rows directly in DayCard

function DayCard({ day, index }) {
  const [open, setOpen] = useState(index < 3)
  const studySessions = day.sessions.filter(s => s.type === 'study' || s.type === 'revision' || s.type === 'mock_test')
  const hasRevision = day.sessions.some(s => s.type === 'revision')
  const hasMockTest = day.sessions.some(s => s.type === 'mock_test')

  return (
    <div style={{
      background: 'var(--surface)', borderRadius: '16px',
      border: `1px solid ${hasMockTest ? '#e1705544' : hasRevision ? '#fdcb6e44' : 'var(--border)'}`,
      overflow: 'hidden', transition: 'box-shadow 0.2s',
      boxShadow: open ? '0 4px 20px rgba(108,92,231,0.1)' : 'none'
    }}>
      <div
        onClick={() => setOpen(!open)}
        style={{
          padding: '16px 20px', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: open
            ? hasMockTest
              ? 'linear-gradient(135deg,rgba(225,112,85,0.1),rgba(108,92,231,0.05))'
              : hasRevision
                ? 'linear-gradient(135deg,rgba(253,203,110,0.09),rgba(108,92,231,0.03))'
                : 'linear-gradient(135deg,rgba(108,92,231,0.07),transparent)'
            : 'transparent'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '42px', height: '42px', borderRadius: '10px', flexShrink: 0,
            background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.85rem', fontWeight: '800', color: 'var(--primary-light)'
          }}>{day.day}</div>
          <div>
            <div style={{ fontWeight: '700', fontSize: '0.95rem' }}>{day.dayLabel || `Day ${day.day}`}</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              {day.date} · {studySessions.length} session{studySessions.length !== 1 ? 's' : ''}
              {hasRevision && ' · 📖 Revision'}
              {hasMockTest && ' · 🎯 Mock Test'}
            </div>
          </div>
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px'
        }}>
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {day.sessions.filter(s => s.type === 'study').slice(0, 4).map((s, i) => (
              <span key={i} style={{ fontSize: '1rem' }}>{s.icon}</span>
            ))}
          </div>
          <div style={{
            width: '28px', height: '28px', borderRadius: '50%', background: 'var(--bg-secondary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem',
            color: 'var(--text-muted)', transition: 'transform 0.2s',
            transform: open ? 'rotate(180deg)' : 'rotate(0)'
          }}>▼</div>
        </div>
      </div>

      {open && (
        <div style={{ padding: '0 16px 16px', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '400px', marginTop: '8px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--surface-border)', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                <th style={{ padding: '10px 12px', fontWeight: '600' }}>Time</th>
                <th style={{ padding: '10px 12px', fontWeight: '600' }}>Type</th>
                <th style={{ padding: '10px 12px', fontWeight: '600' }}>Activity</th>
              </tr>
            </thead>
            <tbody>
              {day.sessions.map((session, i) => {
                const c = SESSION_COLORS[session.type] || SESSION_COLORS.study;
                return (
                  <tr key={i} style={{ 
                    borderBottom: i !== day.sessions.length - 1 ? '1px solid var(--surface-border)' : 'none',
                    background: i % 2 === 0 ? 'transparent' : 'var(--bg-secondary)88' 
                  }}>
                    <td style={{ padding: '12px', fontSize: '0.85rem', whiteSpace: 'nowrap', color: 'var(--text-secondary)' }}>⏰ {session.time}</td>
                    <td style={{ padding: '12px' }}>
                      <span style={{ 
                        padding: '4px 10px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: '700',
                        background: `${c.border}22`, color: c.border, textTransform: 'uppercase', letterSpacing: '0.5px'
                      }}>
                        {session.type.replace('_', ' ')}
                      </span>
                    </td>
                    <td style={{ padding: '12px', fontSize: '0.9rem', color: c.text, fontWeight: '500' }}>
                      <span style={{ fontSize: '1.1rem', marginRight: '8px' }}>{session.icon}</span>
                      {session.activity}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default function TimetablePage() {
  const navigate = useNavigate()
  const { currentUser } = useAuth()

  // Form state
  const [subjects, setSubjects] = useState([])
  const [form, setForm] = useState({
    examDate: '',
    studyHoursPerDay: '4',
    preferredTime: 'Morning',
    breakDuration: '10-15 minutes',
    daysAvailable: 'Monday-Saturday',
    sessionLength: '1 hour'
  })

  // UI state
  const [pageState, setPageState] = useState('setup')   // 'setup' | 'loading' | 'result'
  const [timetableData, setTimetableData] = useState(null)
  const [error, setError] = useState('')
  const [savedToFirestore, setSavedToFirestore] = useState(false)
  const [activeTab, setActiveTab] = useState('all')

  // Load subjects only — never auto-show old timetable
  useEffect(() => {
    if (!currentUser) return
    async function loadData() {
      // Fetch subjects from saved study plans
      try {
        const q = query(collection(db, 'studyPlans'), where('userId', '==', currentUser.uid))
        const snap = await getDocs(q)
        const subs = []
        const seen = new Set()
        snap.docs.forEach(doc => {
          const d = doc.data()
          if (d.subject && !seen.has(d.subject)) {
            seen.add(d.subject)
            subs.push({ name: d.subject, targetMark: d.targetMark || 80, prevMark: d.prevMark || null })
          }
        })
        setSubjects(subs)
      } catch (e) {
        console.error('Error loading subjects:', e)
      }
    }
    loadData()
  }, [currentUser])

  const handleFormChange = e => setForm({ ...form, [e.target.name]: e.target.value })

  const handleGenerate = async () => {
    if (subjects.length < 1) {
      setError('No subjects found. Please set up your study plan first.')
      return
    }
    if (!form.examDate) {
      setError('Please enter your exam date.')
      return
    }

    setPageState('loading')
    setError('')

    try {
      const res = await fetch('http://localhost:5000/timetable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subjects, ...form })
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || 'Failed to generate timetable')
      }

      const data = await res.json()
      setTimetableData(data)
      setPageState('result')

      // Save to Firestore in background
      if (currentUser) {
        setDoc(doc(db, 'timetables', currentUser.uid), {
          userId: currentUser.uid,
          subjects: subjects.map(s => s.name),
          examDate: form.examDate,
          timetable: data.timetable,
          summary: data.summary,
          generatedAt: serverTimestamp()
        }).then(() => setSavedToFirestore(true))
          .catch(e => console.warn('Timetable save failed:', e))
      }
    } catch (err) {
      console.error(err)
      setError(err.message || 'Failed to generate timetable. Ensure the backend is running.')
      setPageState('setup')
    }
  }

  const printTimetable = () => window.print()

  // ── Loading State ──────────────────────────────────────────────────────────
  if (pageState === 'loading') {
    return (
      <div className="animate-in ai-loading-overlay">
        <div className="ai-loading-spinner" />
        <h2>📅 Building Your Timetable…</h2>
        <p style={{ marginTop: '12px', color: 'var(--text-muted)' }}>
          Analysing {subjects.length} subjects and {form.studyHoursPerDay} study hours/day…
        </p>
      </div>
    )
  }

  // ── Result State ───────────────────────────────────────────────────────────
  if (pageState === 'result' && timetableData) {
    const { summary, timetable } = timetableData

    const tabs = ['all', ...Array.from(new Set(
      timetable.flatMap(d => d.sessions.filter(s => s.type === 'study').map(s => s.activity))
    ))]

    const filteredTimetable = activeTab === 'all'
      ? timetable
      : timetable.filter(d => d.sessions.some(s => s.activity === activeTab))

    return (
      <div className="animate-in">
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: '800', marginBottom: '6px' }}>📅 Your Study Timetable</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              {summary?.totalDays} days · {subjects.length} subjects · Exam on {new Date(form.examDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {savedToFirestore && (
              <span style={{ padding: '8px 14px', borderRadius: '20px', background: 'rgba(0,184,148,0.1)', color: '#00b894', fontSize: '0.8rem', border: '1px solid #00b89433' }}>
                ✅ Saved
              </span>
            )}
            <button className="btn btn-secondary btn-sm" onClick={() => setPageState('setup')}>← Regenerate</button>
            <button className="btn btn-primary btn-sm" onClick={printTimetable}>🖨️ Print</button>
          </div>
        </div>

        {/* Strategy banner */}
        {summary?.strategy && (
          <div style={{
            padding: '14px 20px', borderRadius: '12px', marginBottom: '20px',
            background: 'linear-gradient(135deg, rgba(108,92,231,0.1), rgba(0,206,201,0.06))',
            border: '1px solid rgba(108,92,231,0.2)', display: 'flex', gap: '12px', alignItems: 'flex-start'
          }}>
            <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>🧠</span>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
              <strong>AI Strategy:</strong> {summary.strategy}
            </p>
          </div>
        )}

        {/* Subject coverage summary */}
        {summary?.subjectCoverage?.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px,1fr))', gap: '10px', marginBottom: '24px' }}>
            {summary.subjectCoverage.map((s, i) => (
              <div key={i} style={{
                background: 'var(--surface)', borderRadius: '12px', padding: '14px 16px',
                border: '1px solid var(--border)', textAlign: 'center'
              }}>
                <div style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--primary-light)' }}>{s.sessions}</div>
                <div style={{ fontSize: '0.78rem', fontWeight: '600', color: 'var(--text)', marginBottom: '2px' }}>{s.subject}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{s.totalHours}h total</div>
              </div>
            ))}
          </div>
        )}

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '18px' }}>
          {tabs.slice(0, 8).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '6px 14px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: '600',
                border: '1px solid var(--border)', cursor: 'pointer',
                background: activeTab === tab ? 'var(--primary)' : 'var(--surface)',
                color: activeTab === tab ? '#fff' : 'var(--text-secondary)',
                transition: 'all 0.2s'
              }}
            >
              {tab === 'all' ? '📋 All Days' : tab}
            </button>
          ))}
        </div>

        {/* Day cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredTimetable.map((day, i) => (
            <DayCard key={day.day} day={day} index={i} />
          ))}
        </div>
      </div>
    )
  }

  // ── Setup State ────────────────────────────────────────────────────────────
  return (
    <div className="animate-in">
      <div className="page-header" style={{ marginBottom: '24px' }}>
        <h1>📅 Study Timetable Generator</h1>
        <p>Generate a personalised, day-wise timetable based on your subjects and exam date.</p>
      </div>

      {/* Single subject warning */}
      {subjects.length === 1 && (
        <div style={{
          padding: '14px 20px', borderRadius: '12px', marginBottom: '20px',
          background: 'rgba(108,92,231,0.08)', border: '1px solid rgba(108,92,231,0.2)',
          display: 'flex', gap: '12px', alignItems: 'center'
        }}>
          <span style={{ fontSize: '1.2rem' }}>💡</span>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            You have <strong>1 subject</strong> set up. A single-subject timetable will be generated.{' '}
            <button
              onClick={() => navigate('/setup')}
              style={{ background: 'none', border: 'none', color: 'var(--primary-light)', cursor: 'pointer', textDecoration: 'underline', fontSize: 'inherit', padding: 0 }}
            >
              Add more subjects →
            </button>
          </p>
        </div>
      )}

      {subjects.length === 0 && (
        <div style={{
          padding: '40px', textAlign: 'center', background: 'var(--surface)',
          borderRadius: '16px', border: '1px solid var(--border)', marginBottom: '20px'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '12px' }}>📚</div>
          <h3 style={{ marginBottom: '8px' }}>No Subjects Found</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '20px' }}>
            Set up your study plan with multiple subjects first, then come back to generate your timetable.
          </p>
          <button className="btn btn-primary" onClick={() => navigate('/setup')}>
            + Set Up Study Plan
          </button>
        </div>
      )}

      {/* Subjects preview */}
      {subjects.length > 0 && (
        <div className="card" style={{ marginBottom: '20px' }}>
          <div className="card-header" style={{ marginBottom: '14px' }}>
            <h3>📚 Detected Subjects ({subjects.length})</h3>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => navigate('/setup')}
            >+ Add / Edit</button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            {subjects.map((s, i) => {
              const gap = s.prevMark !== null && s.prevMark !== undefined ? s.targetMark - s.prevMark : null
              const color = gap === null ? '#6C5CE7' : gap >= 30 ? '#e17055' : gap >= 15 ? '#fdcb6e' : '#00b894'
              return (
                <div key={i} style={{
                  padding: '8px 16px', borderRadius: '20px', fontSize: '0.85rem',
                  background: `${color}15`, border: `1px solid ${color}44`, color,
                  fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px'
                }}>
                  {s.name}
                  {gap !== null && (
                    <span style={{ fontSize: '0.72rem', opacity: 0.8 }}>
                      {gap >= 30 ? '🔴 Weak' : gap >= 15 ? '🟡 Mid' : '🟢 Strong'}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
          {subjects.length < 1 && (
            <p style={{ color: 'var(--danger)', fontSize: '0.82rem', marginTop: '10px', padding: '8px 12px', background: 'rgba(225,112,85,0.08)', borderRadius: '8px' }}>
              ⚠️ No subjects found. Please set up your study plan first.
            </p>
          )}
        </div>
      )}

      {/* Preferences form */}
      {subjects.length >= 1 && (
        <div className="card">
          <div className="card-header" style={{ marginBottom: '20px' }}>
            <h3>⚙️ Schedule Preferences</h3>
          </div>

          {error && (
            <div style={{ padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', background: 'rgba(225,112,85,0.1)', color: 'var(--danger)', border: '1px solid rgba(225,112,85,0.2)', fontSize: '0.88rem' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px,1fr))', gap: '16px', marginBottom: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: '600' }}>
                Exam Date <span style={{ color: 'var(--primary-light)' }}>*</span>
              </label>
              <input
                type="date"
                name="examDate"
                className="input-field"
                value={form.examDate}
                onChange={handleFormChange}
                style={{ colorScheme: 'dark' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: '600' }}>
                Study Hours Per Day
              </label>
              <select name="studyHoursPerDay" className="input-field" value={form.studyHoursPerDay} onChange={handleFormChange}>
                {[2, 3, 4, 5, 6, 7, 8].map(h => <option key={h} value={h}>{h} hours</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: '600' }}>
                Preferred Study Time
              </label>
              <select name="preferredTime" className="input-field" value={form.preferredTime} onChange={handleFormChange}>
                <option>Morning</option>
                <option>Afternoon</option>
                <option>Evening</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: '600' }}>
                Break Duration
              </label>
              <select name="breakDuration" className="input-field" value={form.breakDuration} onChange={handleFormChange}>
                <option>5-10 minutes</option>
                <option>10-15 minutes</option>
                <option>15-20 minutes</option>
                <option>30 minutes</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: '600' }}>
                Session Length
              </label>
              <select name="sessionLength" className="input-field" value={form.sessionLength} onChange={handleFormChange}>
                <option>45 minutes</option>
                <option>1 hour</option>
                <option>1.5 hours</option>
                <option>2 hours</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: '600' }}>
                Days Available
              </label>
              <select name="daysAvailable" className="input-field" value={form.daysAvailable} onChange={handleFormChange}>
                <option>Monday-Friday</option>
                <option>Monday-Saturday</option>
                <option>Monday-Sunday</option>
                <option>Weekends Only</option>
              </select>
            </div>
          </div>

          <div style={{ padding: '14px 16px', borderRadius: '10px', marginBottom: '20px', background: 'rgba(108,92,231,0.07)', border: '1px solid rgba(108,92,231,0.15)', fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            💡 Subjects with a large gap between previous and target marks will automatically receive more study sessions.
            Revision slots and a mock test session will be added automatically.
          </div>

          <button
            className="btn btn-primary btn-block"
            onClick={handleGenerate}
            disabled={!form.examDate || subjects.length < 1}
            style={{ padding: '16px', fontSize: '1rem', opacity: !form.examDate ? 0.6 : 1 }}
          >
            🚀 Generate Personalised Timetable
          </button>
        </div>
      )}
    </div>
  )
}
