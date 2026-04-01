import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { db } from '../firebase'
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore'

export default function StudyPlanPage() {
  const location = useLocation()
  const { currentUser } = useAuth()

  // Subjects passed directly from SetupPage after fresh generation
  const freshSubjects = location.state?.generatedSubjects || null

  const [plans, setPlans] = useState([]) // list of { subject, studyNotes, keywords, questions, … }
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [activeTab, setActiveTab] = useState('notes')
  const [fetching, setFetching] = useState(!freshSubjects)

  // Load from Firestore only if we don't have fresh data
  useEffect(() => {
    if (freshSubjects) {
      // Map fresh generation data to the same shape as Firestore docs
      const mapped = freshSubjects.map(s => ({
        subject: s.name,
        targetMark: s.targetMark,
        prevMark: s.prevMark,
        syllabus: s.syllabus,
        studyNotes: s.notes?.studyNotes || '',
        keywords: s.notes?.keywords || [],
        questions: s.notes?.questions || {},
        diagram: s.notes?.diagram || '',
        mindmap: s.notes?.mindmap || [],
        displayDate: new Date().toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
      }))
      setPlans(mapped)
      setFetching(false)
      return
    }

    async function fetchPlans() {
      if (!currentUser) return
      try {
        const q = query(
          collection(db, 'studyPlans'),
          where('userId', '==', currentUser.uid),
          orderBy('timestamp', 'desc')
        )
        const snap = await getDocs(q)
        const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        setPlans(docs)
      } catch (err) {
        console.error('Error fetching study plans:', err)
      } finally {
        setFetching(false)
      }
    }
    fetchPlans()
  }, [currentUser, freshSubjects])

  if (fetching) {
    return (
      <div className="animate-in" style={{ display: 'flex', justifyContent: 'center', paddingTop: '80px' }}>
        <div className="loading-spinner" />
      </div>
    )
  }

  if (plans.length === 0) {
    return (
      <div className="animate-in" style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--text-muted)' }}>
        <div style={{ fontSize: '3.5rem', marginBottom: '16px' }}>📭</div>
        <h2 style={{ marginBottom: '8px' }}>No Study Plans Yet</h2>
        <p>Go to <strong>Setup</strong> to create your first AI-generated study plan.</p>
      </div>
    )
  }

  const current = plans[selectedIdx] || plans[0]

  const getGap = () => {
    if (current.prevMark == null) return null
    const gap = current.targetMark - current.prevMark
    return gap
  }
  const gap = getGap()

  return (
    <div className="animate-in">
      <div className="page-header">
        <h1>📚 My Study Plans</h1>
        <p>AI-generated notes and questions saved for each subject</p>
      </div>

      {/* Subject tabs */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '24px' }}>
        {plans.map((p, i) => (
          <button
            key={i}
            onClick={() => { setSelectedIdx(i); setActiveTab('notes') }}
            style={{
              padding: '8px 18px',
              borderRadius: '999px',
              border: selectedIdx === i ? '2px solid var(--primary)' : '1px solid var(--border)',
              background: selectedIdx === i ? 'var(--primary-glow)' : 'var(--surface-elevated)',
              color: selectedIdx === i ? 'var(--primary-light)' : 'var(--text-secondary)',
              fontWeight: selectedIdx === i ? '700' : '400',
              cursor: 'pointer',
              fontSize: '0.88rem',
              transition: 'var(--transition)'
            }}
          >
            {p.subject}
          </button>
        ))}
      </div>

      {/* Subject header card */}
      <div className="card" style={{ marginBottom: '20px', background: 'linear-gradient(135deg, rgba(108,92,231,0.15), rgba(162,155,254,0.08))' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ fontSize: '1.3rem', marginBottom: '4px' }}>{current.subject}</h2>
            <p style={{ fontSize: '0.83rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
              📋 {current.syllabus}
            </p>
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.83rem' }}>
                🎯 Target: <strong style={{ color: 'var(--primary-light)' }}>{current.targetMark}%</strong>
              </span>
              {current.prevMark != null && (
                <span style={{ fontSize: '0.83rem' }}>
                  📊 Previous: <strong style={{ color: 'var(--text-secondary)' }}>{current.prevMark}%</strong>
                </span>
              )}
              {gap !== null && (
                <span style={{ fontSize: '0.83rem' }}>
                  📈 Need to improve:{' '}
                  <strong style={{ color: gap > 0 ? 'var(--warning)' : 'var(--success)' }}>
                    {gap > 0 ? `+${gap}%` : `Already at target!`}
                  </strong>
                </span>
              )}
            </div>
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>📅 {current.displayDate}</div>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', background: 'var(--surface-elevated)', borderRadius: 'var(--radius)', padding: '4px', width: 'fit-content' }}>
        {[
          { id: 'notes', label: '📝 Notes' },
          { id: 'keywords', label: '🔑 Keywords' },
          { id: 'questions', label: '❓ Questions' },
          { id: 'diagram', label: '🗺️ Diagram' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '7px 16px',
              borderRadius: 'calc(var(--radius) - 2px)',
              background: activeTab === tab.id ? 'var(--primary)' : 'transparent',
              color: activeTab === tab.id ? '#fff' : 'var(--text-muted)',
              fontWeight: activeTab === tab.id ? '600' : '400',
              fontSize: '0.84rem',
              border: 'none',
              cursor: 'pointer',
              transition: 'var(--transition)',
              whiteSpace: 'nowrap'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="card">

        {/* NOTES TAB */}
        {activeTab === 'notes' && (
          <div>
            <h3 style={{ marginBottom: '16px', fontSize: '1rem' }}>📝 Study Notes</h3>
            {current.studyNotes
              ? <div style={{ fontSize: '0.9rem', lineHeight: '1.9', color: 'var(--text-secondary)', whiteSpace: 'pre-line' }}>{current.studyNotes}</div>
              : <p style={{ color: 'var(--text-muted)' }}>No notes generated.</p>}
          </div>
        )}

        {/* KEYWORDS TAB */}
        {activeTab === 'keywords' && (
          <div>
            <h3 style={{ marginBottom: '16px', fontSize: '1rem' }}>🔑 Key Terms & Definitions</h3>
            {current.keywords?.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {current.keywords.map((kw, i) => (
                  <div key={i} style={{
                    background: 'var(--surface)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '12px 16px',
                    borderLeft: '3px solid var(--primary)'
                  }}>
                    <div style={{ fontWeight: '700', color: 'var(--primary-light)', marginBottom: '4px' }}>{kw.term}</div>
                    <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>{kw.definition}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: 'var(--text-muted)' }}>No keywords available.</p>
            )}
          </div>
        )}

        {/* QUESTIONS TAB */}
        {activeTab === 'questions' && (
          <div>
            <h3 style={{ marginBottom: '16px', fontSize: '1rem' }}>❓ Practice Questions</h3>
            {current.questions && Object.keys(current.questions).length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {current.questions.marks2?.length > 0 && (
                  <div>
                    <div style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--primary-light)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '10px' }}>
                      ✏️ 2-Mark Questions
                    </div>
                    <ol style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {current.questions.marks2.map((q, i) => (
                        <li key={i} style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>{q}</li>
                      ))}
                    </ol>
                  </div>
                )}
                {current.questions.marks5?.length > 0 && (
                  <div>
                    <div style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--warning)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '10px' }}>
                      📖 5-Mark Questions
                    </div>
                    <ol style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {current.questions.marks5.map((q, i) => (
                        <li key={i} style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>{q}</li>
                      ))}
                    </ol>
                  </div>
                )}
                {current.questions.marks10?.length > 0 && (
                  <div>
                    <div style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--danger)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '10px' }}>
                      🏆 10-Mark Questions
                    </div>
                    <ol style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {current.questions.marks10.map((q, i) => (
                        <li key={i} style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>{q}</li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
            ) : (
              <p style={{ color: 'var(--text-muted)' }}>No questions generated.</p>
            )}
          </div>
        )}

        {/* DIAGRAM TAB */}
        {activeTab === 'diagram' && (
          <div>
            <h3 style={{ marginBottom: '16px', fontSize: '1rem' }}>🗺️ ASCII Concept Diagram</h3>
            {current.diagram
              ? (
                <pre style={{
                  fontFamily: 'monospace',
                  fontSize: '0.82rem',
                  color: 'var(--text-secondary)',
                  background: 'var(--surface)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '20px',
                  overflowX: 'auto',
                  lineHeight: '1.7',
                  whiteSpace: 'pre-wrap'
                }}>
                  {current.diagram}
                </pre>
              )
              : <p style={{ color: 'var(--text-muted)' }}>No diagram generated.</p>}
          </div>
        )}
      </div>
    </div>
  )
}
