import { useEffect, useState, useCallback } from 'react'
import { db } from '../firebase'
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore'
import { useAuth } from '../contexts/AuthContext'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
  Title,
} from 'chart.js'
import { Bar, Doughnut, Line } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, LineElement, PointElement, Tooltip, Legend, Title)

const COLORS = ['#6C5CE7', '#00cec9', '#fdcb6e', '#00b894', '#e17055', '#a29bfe', '#fd79a8', '#74b9ff']

const chartBase = {
  plugins: {
    legend: { labels: { color: '#a0a0b8', font: { family: 'Inter' } } },
    tooltip: {
      backgroundColor: '#1e1e32',
      titleColor: '#f0f0f5',
      bodyColor: '#a0a0b8',
      borderColor: 'rgba(255,255,255,0.06)',
      borderWidth: 1,
    },
  },
  scales: {
    x: { ticks: { color: '#6c6c80', font: { family: 'Inter', size: 12 } }, grid: { color: 'rgba(255,255,255,0.04)' } },
    y: { ticks: { color: '#6c6c80', font: { family: 'Inter', size: 12 } }, grid: { color: 'rgba(255,255,255,0.04)' } },
  },
}

function ScoreBadge({ pct }) {
  const color = pct >= 80 ? '#00b894' : pct >= 60 ? '#fdcb6e' : '#e17055'
  const label = pct >= 80 ? 'Excellent' : pct >= 60 ? 'Good' : 'Needs Work'
  return (
    <span style={{
      padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '700',
      background: `${color}22`, color, border: `1px solid ${color}44`
    }}>{label} — {pct}%</span>
  )
}

function TestReportCard({ result, index }) {
  const [open, setOpen] = useState(index === 0)

  const pct = result.maxPossibleScore
    ? Math.round((result.totalScore / result.maxPossibleScore) * 100)
    : 0

  const dateStr = result.timestamp
    ? new Date(result.timestamp.toDate()).toLocaleString()
    : 'Recent'

  // Per-question breakdown stats
  const evals = result.evaluations || []
  const perfect = evals.filter(e => e.awardedMarks >= e.maxMarks).length
  const partial = evals.filter(e => e.awardedMarks > 0 && e.awardedMarks < e.maxMarks).length
  const missed  = evals.filter(e => e.awardedMarks === 0).length

  // Generate AI insight based on data (client-side, instant)
  const insights = []
  if (pct >= 80) insights.push('🏆 Outstanding performance! You have a strong grasp of this topic.')
  else if (pct >= 60) insights.push('👍 Good effort! Focus on the partially-answered questions to push your score higher.')
  else insights.push('📚 This topic needs more revision. Review the model answers for each missed question.')

  if (missed > 0) insights.push(`⚠️ You left ${missed} question(s) unanswered or scored 0 — prioritise these in your next study session.`)
  if (partial > 0) insights.push(`💡 ${partial} question(s) were partially correct — you have the right idea but need more depth in your answers.`)
  if (perfect === evals.length && evals.length > 0) insights.push('✨ Perfect score on all questions — consider increasing difficulty next time!')

  const icon = pct >= 80 ? '🏆' : pct >= 60 ? '👍' : '📚'

  return (
    <div style={{
      background: 'var(--surface)', borderRadius: '16px',
      border: '1px solid var(--border)',
      boxShadow: open ? '0 8px 30px rgba(108,92,231,0.12)' : 'none',
      overflow: 'hidden', transition: 'box-shadow 0.3s ease'
    }}>
      {/* Header — always visible */}
      <div
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px', cursor: 'pointer',
          background: open ? 'linear-gradient(135deg, rgba(108,92,231,0.08), rgba(0,206,201,0.04))' : 'transparent'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '52px', height: '52px', borderRadius: '12px', fontSize: '1.5rem',
            background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0
          }}>{icon}</div>
          <div>
            <div style={{ fontWeight: '700', fontSize: '1rem', marginBottom: '4px' }}>
              {result.subject || 'Mock Test'}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{dateStr}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '1.6rem', fontWeight: '800', color: COLORS[index % COLORS.length] }}>
              {result.totalScore}<span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: '400' }}>/{result.maxPossibleScore}</span>
            </div>
            <ScoreBadge pct={pct} />
          </div>
          <div style={{
            width: '32px', height: '32px', borderRadius: '50%',
            background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            color: 'var(--text-muted)', fontSize: '0.85rem', flexShrink: 0
          }}>▼</div>
        </div>
      </div>

      {/* Expanded Report */}
      {open && (
        <div style={{ borderTop: '1px solid var(--border)', padding: '24px' }}>
          {/* Score summary mini-stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}>
            {[
              { label: '✅ Full Credit', value: perfect, color: '#00b894' },
              { label: '🔶 Partial', value: partial, color: '#fdcb6e' },
              { label: '❌ Missed', value: missed, color: '#e17055' },
            ].map((s, i) => (
              <div key={i} style={{
                background: 'var(--bg-secondary)', padding: '14px', borderRadius: '10px',
                textAlign: 'center', border: `1px solid ${s.color}33`
              }}>
                <div style={{ fontSize: '1.6rem', fontWeight: '800', color: s.color }}>{s.value}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Circular progress indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginBottom: '24px', flexWrap: 'wrap' }}>
            <div style={{ width: '120px', height: '120px', flexShrink: 0 }}>
              <svg viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%' }}>
                <circle cx="18" cy="18" r="16" fill="none" stroke="var(--bg-secondary)" strokeWidth="3" />
                <circle
                  cx="18" cy="18" r="16" fill="none"
                  stroke={pct >= 80 ? '#00b894' : pct >= 60 ? '#fdcb6e' : '#e17055'}
                  strokeWidth="3"
                  strokeDasharray={`${pct} ${100 - pct}`}
                  strokeLinecap="round"
                  style={{ transition: 'stroke-dasharray 1s ease' }}
                />
                <text x="18" y="20" textAnchor="middle" fill="var(--text)"
                  fontSize="7" fontWeight="bold" style={{ transform: 'rotate(90deg) translate(0,-36px)' }}>
                </text>
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--primary-light)', marginBottom: '4px' }}>
                {pct}%
                <span style={{ fontSize: '0.9rem', fontWeight: '400', color: 'var(--text-muted)', marginLeft: '8px' }}>Score</span>
              </div>
              {/* AI Insights */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {insights.map((ins, i) => (
                  <div key={i} style={{
                    padding: '8px 14px', borderRadius: '8px',
                    background: 'linear-gradient(135deg, rgba(108,92,231,0.1), rgba(0,206,201,0.06))',
                    fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5
                  }}>{ins}</div>
                ))}
              </div>
            </div>
          </div>

          {/* Per-question breakdown */}
          {evals.length > 0 && (
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Question Breakdown
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {evals.map((ev, i) => {
                  const qPct = ev.maxMarks ? Math.round((ev.awardedMarks / ev.maxMarks) * 100) : 0
                  const barColor = qPct === 100 ? '#00b894' : qPct > 0 ? '#fdcb6e' : '#e17055'
                  return (
                    <div key={i} style={{ background: 'var(--bg-secondary)', padding: '14px 16px', borderRadius: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontSize: '0.88rem', fontWeight: '600' }}>Q{i + 1}</span>
                        <span style={{ fontSize: '0.85rem', color: barColor, fontWeight: '700' }}>
                          {ev.awardedMarks} / {ev.maxMarks} marks
                        </span>
                      </div>
                      <div style={{ height: '5px', background: 'var(--border)', borderRadius: '3px', marginBottom: '10px' }}>
                        <div style={{ height: '100%', width: `${qPct}%`, background: barColor, borderRadius: '3px', transition: 'width 0.8s ease' }} />
                      </div>
                      {ev.feedback && (
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                          🤖 {ev.feedback}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function AnalyticsPage() {
  const { currentUser } = useAuth()
  const [testResults, setTestResults] = useState([])
  const [loading, setLoading] = useState(true)
  const [liveIndicator, setLiveIndicator] = useState(false)
  
  // Pomodoro Local Stats
  const [pomoStats, setPomoStats] = useState({
    sessions: 0,
    totalFocusMin: 0,
    interruptedSessions: 0
  })

  // Load Pomodoro data
  useEffect(() => {
    const s = parseInt(localStorage.getItem('pomodoroSessions')) || 0;
    const t = parseInt(localStorage.getItem('pomodoroTotalMin')) || 0;
    const i = parseInt(localStorage.getItem('pomodoroInterrupted')) || 0;
    setPomoStats({ sessions: s, totalFocusMin: t, interruptedSessions: i });
  }, [])

  // ── Live Firestore listener ────────────────────────────────────────────────
  useEffect(() => {
    if (!currentUser) { setLoading(false); return }

    const q = query(
      collection(db, 'mockTestResults'),
      where('userId', '==', currentUser.uid)
    )

    const unsub = onSnapshot(q, (snap) => {
      const results = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      results.sort((a, b) => (a.timestamp?.toMillis?.() || 0) - (b.timestamp?.toMillis?.() || 0))
      setTestResults(results)
      setLoading(false)

      // Flash the live indicator
      setLiveIndicator(true)
      setTimeout(() => setLiveIndicator(false), 1500)
    }, (err) => {
      console.error('Firestore listener error:', err)
      setLoading(false)
    })

    return () => unsub()
  }, [currentUser])

  // ── Derived stats ──────────────────────────────────────────────────────────
  const totalTests = testResults.length
  const avgScore = totalTests > 0
    ? Math.round(testResults.reduce((acc, r) => acc + Math.round((r.totalScore / r.maxPossibleScore) * 100), 0) / totalTests)
    : 0
  const bestScore = totalTests > 0
    ? Math.max(...testResults.map(r => Math.round((r.totalScore / r.maxPossibleScore) * 100)))
    : 0
  const latestScore = totalTests > 0
    ? Math.round((testResults[totalTests - 1].totalScore / testResults[totalTests - 1].maxPossibleScore) * 100)
    : 0
  const trend = totalTests >= 2
    ? latestScore - Math.round((testResults[totalTests - 2].totalScore / testResults[totalTests - 2].maxPossibleScore) * 100)
    : 0

  // Overall Global Insights across Tests + Pomodoro
  const globalInsights = []
  if (pomoStats.interruptedSessions > 0) {
    globalInsights.push(`⚠️ You lost focus or exited the site during ${pomoStats.interruptedSessions} of your Pomodoro sessions. Try muting notifications to maintain strict focus!`);
  } else if (pomoStats.sessions > 0) {
    globalInsights.push(`🎯 Flawless focus! You successfully completed ${pomoStats.sessions} Pomodoro sessions without exiting the site. Keep it up!`);
  }
  
  if (totalTests > 0) {
    if (avgScore >= 80) globalInsights.push('🏆 Your average test score is outstanding. You are well prepared.');
    else if (avgScore >= 60) globalInsights.push('👍 Your average score is decent. Identify weak areas to improve.');
    else globalInsights.push('📚 Consider revisiting core concepts, as your average score is below standard.');
    if (trend > 0) globalInsights.push('📈 Great momentum! Your recent test score is improving.');
  } else {
    globalInsights.push('Welcome! Take a mock test or start a Pomodoro session to receive AI insights automatically.');
  }

  // Unique subjects breakdown
  const subjectMap = {}
  testResults.forEach(r => {
    const sub = r.subject || 'Unknown'
    if (!subjectMap[sub]) subjectMap[sub] = { total: 0, count: 0 }
    subjectMap[sub].total += Math.round((r.totalScore / r.maxPossibleScore) * 100)
    subjectMap[sub].count++
  })
  const subjects = Object.entries(subjectMap).map(([name, d], i) => ({
    name, avg: Math.round(d.total / d.count), color: COLORS[i % COLORS.length], count: d.count
  }))

  // ── Chart data ─────────────────────────────────────────────────────────────
  const lineData = {
    labels: testResults.map((r, i) => {
      const d = r.timestamp ? new Date(r.timestamp.toDate()) : null
      return d ? `${d.getDate()}/${d.getMonth() + 1}` : `Test ${i + 1}`
    }),
    datasets: [{
      label: 'Score %',
      data: testResults.map(r => Math.round((r.totalScore / r.maxPossibleScore) * 100)),
      borderColor: '#6C5CE7',
      backgroundColor: 'rgba(108,92,231,0.15)',
      fill: true,
      borderWidth: 3,
      pointBackgroundColor: '#fff',
      pointBorderColor: '#6C5CE7',
      pointBorderWidth: 2,
      pointRadius: 5,
      tension: 0.35
    }]
  }

  const barData = {
    labels: subjects.map(s => s.name),
    datasets: [{
      label: 'Avg Score %',
      data: subjects.map(s => s.avg),
      backgroundColor: subjects.map(s => `${s.color}cc`),
      borderRadius: 8,
      borderSkipped: false,
    }]
  }

  const doughnutData = {
    labels: ['Full Credit', 'Partial', 'Missed'],
    datasets: [{
      data: (() => {
        let full = 0, part = 0, miss = 0
        testResults.forEach(r => {
          (r.evaluations || []).forEach(e => {
            if (e.awardedMarks >= e.maxMarks) full++
            else if (e.awardedMarks > 0) part++
            else miss++
          })
        })
        return [full, part, miss]
      })(),
      backgroundColor: ['#00b894cc', '#fdcb6ecc', '#e17055cc'],
      borderColor: '#1a1a2e',
      borderWidth: 3,
      hoverOffset: 8,
    }]
  }

  const statCards = [
    { label: 'Tests Taken', value: totalTests, icon: '📝', color: '#6C5CE7' },
    { label: 'Average Score', value: `${avgScore}%`, icon: '📊', color: '#00cec9' },
    { label: 'Best Score', value: `${bestScore}%`, icon: '🏆', color: '#fdcb6e' },
    {
      label: 'Score Trend',
      value: totalTests < 2 ? '—' : `${trend >= 0 ? '+' : ''}${trend}%`,
      icon: trend >= 0 ? '📈' : '📉',
      color: trend >= 0 ? '#00b894' : '#e17055'
    },
  ]

  return (
    <div className="animate-in">
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>📊 Analytics</h1>
          <p>Live performance report based on your mock tests</p>
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          padding: '8px 16px', background: 'var(--surface)', borderRadius: '20px',
          border: '1px solid var(--border)', fontSize: '0.8rem', color: 'var(--text-muted)'
        }}>
          <div style={{
            width: '8px', height: '8px', borderRadius: '50%',
            background: liveIndicator ? '#00b894' : 'var(--text-muted)',
            boxShadow: liveIndicator ? '0 0 8px #00b894' : 'none',
            transition: 'all 0.3s ease'
          }} />
          Live
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '80px' }}>
          <div className="loading-spinner" />
        </div>
      ) : testResults.length === 0 ? (
        /* ── Empty state ── */
        <div style={{
          textAlign: 'center', padding: '80px 20px',
          background: 'var(--surface)', borderRadius: '20px',
          border: '1px solid var(--border)'
        }}>
          <div style={{ fontSize: '4rem', marginBottom: '16px' }}>📋</div>
          <h2 style={{ marginBottom: '12px' }}>No Test Results Yet</h2>
          <p style={{ color: 'var(--text-muted)', maxWidth: '400px', margin: '0 auto' }}>
            Complete a mock test from the Smart Learning Generator to see your performance analytics here — live and in real time.
          </p>
        </div>
      ) : (
        <>
          {/* ── Stat Cards ── */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
            gap: '16px', marginBottom: '28px'
          }}>
            {statCards.map((s, i) => (
              <div key={i} style={{
                background: 'var(--surface)', borderRadius: '14px', padding: '20px',
                border: `1px solid ${s.color}33`,
                boxShadow: `0 4px 20px ${s.color}11`
              }}>
                <div style={{ fontSize: '1.6rem', marginBottom: '8px' }}>{s.icon}</div>
                <div style={{ fontSize: '1.8rem', fontWeight: '800', color: s.color, marginBottom: '4px' }}>{s.value}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* ── Global AI Insights ── */}
          <div className="card" style={{ marginBottom: '24px', border: '1px solid var(--primary-light)', background: 'linear-gradient(135deg, rgba(108, 92, 231, 0.05), rgba(108, 92, 231, 0.02))' }}>
            <div className="card-header">
              <h3>🤖 Global Study Insights</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {globalInsights.map((ins, i) => (
                <div key={i} style={{ 
                  padding: '12px 16px', background: 'var(--bg-primary)', borderRadius: '10px', 
                  fontSize: '0.95rem', borderLeft: '4px solid var(--primary)', color: 'var(--text)' 
                }}>
                  {ins}
                </div>
              ))}
            </div>
          </div>

          {/* ── Charts Row ── */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: subjects.length > 0 ? '1fr 1fr' : '1fr',
            gap: '20px', marginBottom: '24px'
          }}>

            {/* Score trajectory */}
            <div className="card" style={{ gridColumn: subjects.length === 0 ? '1 / -1' : undefined }}>
              <div className="card-header">
                <h3>📈 Score Trajectory</h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>All Tests</span>
              </div>
              <div style={{ height: '220px' }}>
                <Line
                  data={lineData}
                  options={{
                    ...chartBase, responsive: true, maintainAspectRatio: false,
                    plugins: { ...chartBase.plugins, legend: { display: false } },
                    scales: { ...chartBase.scales, y: { ...chartBase.scales.y, min: 0, max: 100 } }
                  }}
                />
              </div>
            </div>

            {/* Answer quality doughnut */}
            {doughnutData.datasets[0].data.some(v => v > 0) && (
              <div className="card">
                <div className="card-header">
                  <h3>🎯 Answer Quality</h3>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>All Questions</span>
                </div>
                <div style={{ maxWidth: '260px', margin: '0 auto', height: '220px', display: 'flex', alignItems: 'center' }}>
                  <Doughnut
                    data={doughnutData}
                    options={{
                      responsive: true, maintainAspectRatio: false,
                      plugins: {
                        ...chartBase.plugins,
                        legend: {
                          position: 'bottom',
                          labels: { color: '#a0a0b8', font: { family: 'Inter', size: 11 }, padding: 12 }
                        }
                      },
                      cutout: '65%'
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Subject avg bar */}
          {subjects.length > 1 && (
            <div className="card" style={{ marginBottom: '24px' }}>
              <div className="card-header">
                <h3>📚 Average Score by Subject</h3>
              </div>
              <div style={{ height: '180px' }}>
                <Bar
                  data={barData}
                  options={{
                    ...chartBase, responsive: true, maintainAspectRatio: false,
                    plugins: { ...chartBase.plugins, legend: { display: false } },
                    scales: { ...chartBase.scales, y: { ...chartBase.scales.y, min: 0, max: 100 } }
                  }}
                />
              </div>
            </div>
          )}

          {/* ── Per-Test Reports ── */}
          <div style={{ marginBottom: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: '700', margin: 0 }}>📋 Test Reports &amp; Insights</h2>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{totalTests} test{totalTests !== 1 ? 's' : ''} — latest first</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[...testResults].reverse().map((result, i) => (
                <TestReportCard key={result.id} result={result} index={i} />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
