import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { db } from '../firebase'
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore'
import { useEffect } from 'react'

const STEPS = ['Subjects & Marks', 'Syllabus / Topics', 'Generating Plan']

export default function SetupPage() {
  const navigate = useNavigate()
  const { currentUser } = useAuth()

  // Step 1 state
  const [subjects, setSubjects] = useState([])
  const [subjectInput, setSubjectInput] = useState('')
  const [targetMark, setTargetMark] = useState('')
  const [prevMark, setPrevMark] = useState('')

  // Step 2 state
  const [selectedSubject, setSelectedSubject] = useState(null)
  const [syllabusInput, setSyllabusInput] = useState('')
  const [syllabusMap, setSyllabusMap] = useState({}) // { subjectName: syllabus }

  // Step 3 state
  const [step, setStep] = useState(-1) // Start at -1 to check for existing plans
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0, name: '' })
  const [error, setError] = useState('')
  const [hasExistingPlans, setHasExistingPlans] = useState(false)

  // ── On Mount: Check for existing plans ───────────────────────────
  useEffect(() => {
    async function checkPlans() {
      if (!currentUser) return
      try {
        const q = query(collection(db, 'studyPlans'), where('userId', '==', currentUser.uid))
        const docs = await getDocs(q)
        if (!docs.empty) {
          setHasExistingPlans(true)
          setStep(-1) // Stay on greeting step
        } else {
          setStep(0) // Go straight to subject input
        }
      } catch (err) {
        console.error(err)
        setStep(0)
      }
    }
    checkPlans()
  }, [currentUser])

  // ── Step 1: Add subject ──────────────────────────────────────────
  const addSubject = () => {
    const name = subjectInput.trim()
    if (!name || !targetMark) return
    if (subjects.find(s => s.name === name)) return
    setSubjects([...subjects, {
      name,
      targetMark: Number(targetMark),
      prevMark: prevMark !== '' ? Number(prevMark) : null
    }])
    setSubjectInput('')
    setTargetMark('')
    setPrevMark('')
  }

  const removeSubject = (name) => setSubjects(subjects.filter(s => s.name !== name))

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); addSubject() }
  }

  // ── Step 2: Syllabus per subject ─────────────────────────────────
  const saveSyllabus = () => {
    if (!selectedSubject || !syllabusInput.trim()) return
    setSyllabusMap({ ...syllabusMap, [selectedSubject]: syllabusInput.trim() })
    setSyllabusInput('')
    setSelectedSubject(null)
  }

  const allSyllabusEntered = subjects.length > 0 &&
    subjects.every(s => syllabusMap[s.name])

  // ── Step 3: Generate & Save ──────────────────────────────────────
  const handleGenerate = async () => {
    setStep(2)
    setLoading(true)
    setError('')
    setProgress({ current: 0, total: subjects.length, name: '' })

    const studyPlanId = `plan_${currentUser.uid}_${Date.now()}`
    const generatedSubjects = []

    for (let i = 0; i < subjects.length; i++) {
      const subj = subjects[i]
      const syllabus = syllabusMap[subj.name] || subj.name
      setProgress({ current: i + 1, total: subjects.length, name: subj.name })

      try {
        const res = await fetch('http://localhost:5000/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subject: subj.name,
            topics: syllabus,
            targetMarks: subj.targetMark
          })
        })

        if (!res.ok) throw new Error(`Failed for ${subj.name}`)
        const data = await res.json()

        generatedSubjects.push({
          name: subj.name,
          targetMark: subj.targetMark,
          prevMark: subj.prevMark,
          syllabus,
          notes: data
        })

        // Save each subject's note to Firestore (in background, do not await so it doesn't hang UI)
        try {
          addDoc(collection(db, 'studyPlans'), {
            userId: currentUser.uid,
            studyPlanId,
            subject: subj.name,
            targetMark: subj.targetMark,
            prevMark: subj.prevMark ?? null,
            syllabus,
            studyNotes: data.studyNotes || '',
            keywords: data.keywords || [],
            questions: data.questions || {},
            diagram: data.diagram || '',
            mindmap: data.mindmap || [],
            timestamp: serverTimestamp(),
            displayDate: new Date().toLocaleString('en-IN', {
              day: '2-digit', month: 'short', year: 'numeric'
            })
          }).catch(fbErr => {
            console.warn('Firebase background sync issue:', fbErr)
          })
        } catch (syncErr) {
          console.warn('Could not initiate Firebase sync:', syncErr)
        }
      } catch (err) {
        console.error(err)
        setError(`Error generating plan for "${subj.name}". Check backend/API key.`)
        setLoading(false)
        return
      }
    }

    setLoading(false)
    // Navigate to study plan with generated data
    navigate('/study-plan', { state: { generatedSubjects, studyPlanId } })
  }

  // ── Render ───────────────────────────────────────────────────────
  return (
    <div className="onboarding-page">
      <div className="onboarding-card" style={{ maxWidth: '640px' }}>

        {/* Step indicator */}
        {step >= 0 && (
          <div className="step-indicator" style={{ marginBottom: '8px' }}>
            {STEPS.map((s, i) => (
              <span key={s} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className={`step-dot ${step === i ? 'active' : step > i ? 'done' : ''}`} />
                {i < STEPS.length - 1 && <span className="step-line" />}
              </span>
            ))}
          </div>
        )}
        {step >= 0 && (
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Step {step + 1} of {STEPS.length} — {STEPS[step]}
          </div>
        )}

        {/* ── STEP -1: Welcome Back (Existing User) ── */}
        {step === -1 && hasExistingPlans && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>👋</div>
            <h2 style={{ marginBottom: '12px' }}>Welcome Back!</h2>
            <p className="subtitle" style={{ marginBottom: '32px' }}>
              We found your existing study plans and notes.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '300px', margin: '0 auto' }}>
              <button
                className="btn btn-primary btn-block"
                onClick={() => navigate('/study-plan')}
                style={{ padding: '16px' }}
              >
                📅 Refer to Previous Notes
              </button>
              <button
                className="btn btn-secondary btn-block"
                onClick={() => setStep(0)}
                style={{ padding: '16px' }}
              >
                ✨ Generate New Notes
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 0: Subjects & Marks ── */}
        {step === 0 && (
          <>
            <h2>📚 Set Up Your Study Plan</h2>
            <p className="subtitle">Add each subject you want to study. Set your target mark and optionally your previous score.</p>

            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                Subject Name <span style={{ color: 'var(--primary-light)' }}>*</span>
              </label>
              <input
                id="subject-input"
                type="text"
                className="input-field"
                placeholder="e.g. Mathematics, Physics, History…"
                value={subjectInput}
                onChange={e => setSubjectInput(e.target.value)}
                onKeyDown={handleKeyDown}
                style={{ marginBottom: '10px' }}
              />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '5px' }}>
                    Target Marks (%) <span style={{ color: 'var(--primary-light)' }}>*</span>
                  </label>
                  <input
                    id="target-mark-input"
                    type="number"
                    min="1" max="100"
                    className="input-field"
                    placeholder="e.g. 85"
                    value={targetMark}
                    onChange={e => setTargetMark(e.target.value)}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '5px' }}>
                    Previous Marks (%) <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>(optional)</span>
                  </label>
                  <input
                    id="prev-mark-input"
                    type="number"
                    min="0" max="100"
                    className="input-field"
                    placeholder="e.g. 62"
                    value={prevMark}
                    onChange={e => setPrevMark(e.target.value)}
                  />
                </div>
              </div>

              <button
                id="add-subject-btn"
                type="button"
                className="btn btn-primary"
                onClick={addSubject}
                disabled={!subjectInput.trim() || !targetMark}
                style={{ opacity: subjectInput.trim() && targetMark ? 1 : 0.5 }}
              >
                + Add Subject
              </button>
            </div>

            {/* Subject tags */}
            {subjects.length > 0 && (
              <div style={{ marginBottom: '28px' }}>
                <div style={{ fontSize: '0.83rem', color: 'var(--text-muted)', marginBottom: '10px' }}>
                  Added subjects ({subjects.length}):
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {subjects.map(s => (
                    <div key={s.name} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      background: 'var(--surface-elevated)', borderRadius: 'var(--radius-sm)',
                      padding: '10px 14px', border: '1px solid var(--border)'
                    }}>
                      <div>
                        <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{s.name}</span>
                        <span style={{ marginLeft: '12px', fontSize: '0.8rem', color: 'var(--primary-light)' }}>
                          Target: {s.targetMark}%
                        </span>
                        {s.prevMark !== null && (
                          <span style={{ marginLeft: '8px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            Prev: {s.prevMark}%
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => removeSubject(s.name)}
                        style={{ background: 'none', color: 'var(--danger)', fontWeight: '700', cursor: 'pointer', fontSize: '1.1rem', padding: '0 4px' }}
                        title="Remove"
                      >×</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              id="continue-to-syllabus-btn"
              className="btn btn-primary btn-block"
              onClick={() => setStep(1)}
              disabled={subjects.length === 0}
              style={{ opacity: subjects.length > 0 ? 1 : 0.5 }}
            >
              Continue →
            </button>
          </>
        )}

        {/* ── STEP 1: Syllabus / Topics per subject ── */}
        {step === 1 && (
          <>
            <h2>📋 Enter Syllabus / Topics</h2>
            <p className="subtitle">
              For each subject, enter the chapters or topics you need to study. The AI will generate notes based on this.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '28px' }}>
              {subjects.map(s => (
                <div key={s.name} style={{
                  background: 'var(--surface-elevated)', borderRadius: 'var(--radius)',
                  border: `1px solid ${syllabusMap[s.name] ? 'var(--success)' : selectedSubject === s.name ? 'var(--primary)' : 'var(--border)'}`,
                  padding: '14px 16px', transition: 'var(--transition)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: selectedSubject === s.name ? '10px' : '0' }}>
                    <div>
                      <span style={{ fontWeight: '600' }}>{s.name}</span>
                      <span style={{ marginLeft: '10px', fontSize: '0.78rem', color: 'var(--primary-light)' }}>Target: {s.targetMark}%</span>
                    </div>
                    {syllabusMap[s.name] ? (
                      <span style={{ fontSize: '0.78rem', color: 'var(--success)', fontWeight: '600' }}>✓ Done</span>
                    ) : (
                      <button
                        className="btn btn-primary"
                        style={{ padding: '5px 14px', fontSize: '0.8rem' }}
                        onClick={() => {
                          setSelectedSubject(s.name)
                          setSyllabusInput(syllabusMap[s.name] || '')
                        }}
                      >
                        + Add Topics
                      </button>
                    )}
                  </div>

                  {syllabusMap[s.name] && selectedSubject !== s.name && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '6px', cursor: 'pointer' }}
                      onClick={() => { setSelectedSubject(s.name); setSyllabusInput(syllabusMap[s.name]) }}>
                      📝 {syllabusMap[s.name].slice(0, 80)}{syllabusMap[s.name].length > 80 ? '…' : ''} <span style={{ color: 'var(--primary-light)' }}>(edit)</span>
                    </div>
                  )}

                  {selectedSubject === s.name && (
                    <div>
                      <textarea
                        id={`syllabus-${s.name}`}
                        className="input-field"
                        placeholder={`e.g. Chapter 1: Algebra, Chapter 2: Trigonometry, Quadratic equations, Linear equations…`}
                        value={syllabusInput}
                        onChange={e => setSyllabusInput(e.target.value)}
                        rows={4}
                        style={{ width: '100%', resize: 'vertical', fontFamily: 'inherit', marginBottom: '8px' }}
                      />
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="btn btn-primary" onClick={saveSyllabus} disabled={!syllabusInput.trim()}>
                          Save Topics
                        </button>
                        <button className="btn" onClick={() => setSelectedSubject(null)}
                          style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {error && <div style={{ color: 'var(--danger)', fontSize: '0.85rem', marginBottom: '16px' }}>{error}</div>}

            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="btn" onClick={() => setStep(0)}
                style={{ flex: '0 0 auto', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                ← Back
              </button>
              <button
                id="generate-plan-btn"
                className="btn btn-primary btn-block"
                onClick={handleGenerate}
                disabled={!allSyllabusEntered}
                style={{ opacity: allSyllabusEntered ? 1 : 0.5 }}
              >
                🚀 Generate My Study Plan
              </button>
            </div>
          </>
        )}

        {/* ── STEP 2: Generating (loading) ── */}
        {step === 2 && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{ fontSize: '3rem', marginBottom: '20px' }}>🤖</div>
            <h2 style={{ marginBottom: '8px' }}>Generating Your Study Plan…</h2>
            <p className="subtitle" style={{ marginBottom: '28px' }}>
              {loading
                ? `Processing subject ${progress.current} of ${progress.total}: ${progress.name}`
                : error ? 'Something went wrong.' : 'Almost done!'}
            </p>

            {!error && (
              <div style={{ background: 'var(--surface-elevated)', borderRadius: 'var(--radius)', height: '8px', overflow: 'hidden', marginBottom: '16px' }}>
                <div style={{
                  height: '100%',
                  borderRadius: 'var(--radius)',
                  background: 'var(--gradient)',
                  width: progress.total > 0 ? `${(progress.current / progress.total) * 100}%` : '0%',
                  transition: 'width 0.5s ease'
                }} />
              </div>
            )}

            {error && (
              <>
                <div style={{ color: 'var(--danger)', fontSize: '0.88rem', marginBottom: '20px' }}>{error}</div>
                <button className="btn btn-primary" onClick={() => { setStep(1); setError('') }}>← Back & Retry</button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
