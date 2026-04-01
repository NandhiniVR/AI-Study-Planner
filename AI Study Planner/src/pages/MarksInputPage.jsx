import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { subjects as defaultSubjects } from '../services/dummyData'

export default function MarksInputPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const subjects = location.state?.subjects || defaultSubjects

  const [marks, setMarks] = useState(
    subjects.reduce((acc, s) => ({ ...acc, [s]: '' }), {})
  )
  const [loading, setLoading] = useState(false)

  const handleChange = (subject, value) => {
    const num = Math.min(100, Math.max(0, Number(value)))
    setMarks({ ...marks, [subject]: value === '' ? '' : num })
  }

  const allFilled = subjects.every((s) => marks[s] !== '')

  const getPerformanceLabel = (mark) => {
    if (mark === '') return null
    if (mark >= 80) return { label: 'Strong', color: 'var(--success)' }
    if (mark >= 60) return { label: 'Average', color: 'var(--warning)' }
    return { label: 'Needs Focus', color: 'var(--danger)' }
  }

  const handleGenerate = () => {
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      navigate('/dashboard')
    }, 1800)
  }

  return (
    <div className="onboarding-page">
      <div className="onboarding-card" style={{ maxWidth: '600px' }}>
        {/* Step indicator */}
        <div className="step-indicator">
          <div className="step-dot" />
          <div className="step-line" />
          <div className="step-dot active" />
        </div>

        <div style={{ marginBottom: '8px', fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Step 2 of 2
        </div>
        <h2>Enter Your Current Marks</h2>
        <p className="subtitle">
          Enter your latest test scores (0–100) for each subject. Our AI will prioritize weaker areas.
        </p>

        <div className="marks-list">
          {subjects.map((subject) => {
            const perf = getPerformanceLabel(marks[subject])
            return (
              <div key={subject} className="marks-item">
                <div style={{ flex: 1 }}>
                  <div className="subject-name">{subject}</div>
                  {perf && (
                    <div style={{ fontSize: '0.75rem', color: perf.color, marginTop: '2px' }}>
                      ● {perf.label}
                    </div>
                  )}
                </div>
                <input
                  id={`marks-${subject.toLowerCase().replace(/\s+/g, '-')}`}
                  type="number"
                  min="0"
                  max="100"
                  className="input-field"
                  placeholder="%"
                  value={marks[subject]}
                  onChange={(e) => handleChange(subject, e.target.value)}
                  style={{ width: '100px', textAlign: 'center' }}
                />
              </div>
            )
          })}
        </div>

        {/* AI hint */}
        <div style={{
          background: 'var(--primary-glow)',
          border: '1px solid rgba(108,92,231,0.2)',
          borderRadius: 'var(--radius-sm)',
          padding: '14px 18px',
          marginBottom: '28px',
          display: 'flex',
          gap: '10px',
          alignItems: 'flex-start',
        }}>
          <span style={{ fontSize: '1.1rem' }}>🤖</span>
          <p style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
            Our AI will allocate more study time to subjects with lower scores, helping you balance your performance across all areas.
          </p>
        </div>

        <button
          id="generate-plan-btn"
          className="btn btn-primary btn-block"
          onClick={handleGenerate}
          disabled={!allFilled || loading}
          style={{ opacity: allFilled ? 1 : 0.5 }}
        >
          {loading ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span className="loading-dots"><span /><span /><span /></span>
              Generating Plan…
            </span>
          ) : (
            '🚀 Generate My Study Plan'
          )}
        </button>
      </div>
    </div>
  )
}
