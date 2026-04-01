import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { db } from '../firebase'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'

export default function MockTestPage() {
  const location = useLocation()
  const navigate = useNavigate()
  
  const config = location.state?.config || { mcq: 5, short: 3, long: 2 }
  const subject = location.state?.subject || 'Mock Test'
  const notes = location.state?.notes || ''
  const difficulty = location.state?.difficulty || 'medium'
  
  const [testData, setTestData] = useState(null)
  const [questions, setQuestions] = useState([])
  const [totalMarks, setTotalMarks] = useState(0)
  
  const [loading, setLoading] = useState(true)
  const [generationError, setGenerationError] = useState('')

  useEffect(() => {
    async function fetchTest() {
      try {
        const structure = {}
        if (config.mcq > 0) structure['MCQ'] = { count: config.mcq, marks_each: 1 }
        if (config.short > 0) structure['Short Answer'] = { count: config.short, marks_each: 3 }
        if (config.long > 0) structure['Long Answer'] = { count: config.long, marks_each: 10 }

        let tMarks = 0
        if (config.mcq > 0) tMarks += config.mcq * 1
        if (config.short > 0) tMarks += config.short * 3
        if (config.long > 0) tMarks += config.long * 10
        setTotalMarks(tMarks)

        const res = await fetch('http://localhost:5000/generate-test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            topic: subject,
            notes,
            difficulty,
            structure,
            totalMarks: tMarks
          })
        })
        
        if (!res.ok) throw new Error('Failed to generate test')
        const data = await res.json()
        
        setTestData(data.test)
        
        // Flatten the sections into an array of questions for UI
        const flatQuestions = []
        let qIndex = 0
        data.test.sections.forEach(sec => {
          sec.questions.forEach(q => {
            flatQuestions.push({
              id: `q_${qIndex++}`,
              text: q.question,
              marks: sec.marks_each,
              type: sec.type,
              options: q.options || null,
              modelAnswer: q.answer || '',
              keyPoints: q.key_points || []
            })
          })
        })
        setQuestions(flatQuestions)
      } catch (err) {
        console.error(err)
        setGenerationError('Failed to generate the mock test from the AI. Please try again.')
      } finally {
        setLoading(false)
      }
    }
    fetchTest()
  }, [config, subject, notes, difficulty])
  

  
  const [answers, setAnswers] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [gradedResult, setGradedResult] = useState(null)
  const [error, setError] = useState('')
  const { currentUser } = useAuth()

  const handleAnswerChange = (questionId, value) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }))
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    setError('')
    
    // Construct test payload
    const testData = questions.map(q => ({
      id: q.id,
      question: q.text,
      answer: answers[q.id] || '',
      maxMarks: q.marks
    }))

    try {
      const response = await fetch('http://localhost:5000/grade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: location.state?.subject || 'Mock Test',
          testData
        })
      })

      if (!response.ok) throw new Error('Grading failed')
      
      const result = await response.json()
      setGradedResult(result)

      // Save to Firebase (in background, do not await)
      if (currentUser) {
        // Build per-question evaluations enriched with maxMarks for analytics
        const enrichedEvals = (result.evaluations || []).map(ev => {
          const matchQ = questions.find(q => q.id === ev.id)
          return {
            ...ev,
            maxMarks: ev.maxMarks || matchQ?.marks || 0,
            questionType: matchQ?.type || 'Unknown'
          }
        })
        try {
          addDoc(collection(db, 'mockTestResults'), {
            userId: currentUser.uid,
            subject: location.state?.subject || 'Mock Test',
            difficulty: difficulty,
            questionConfig: config,
            totalScore: result.totalScore,
            maxPossibleScore: result.maxPossibleScore,
            evaluations: enrichedEvals,
            timestamp: serverTimestamp()
          }).catch(fbErr => {
            console.warn('Firebase background sync issue:', fbErr)
          })
        } catch (syncErr) {
          console.warn('Could not initiate Firebase sync:', syncErr)
        }
      }

      setSubmitted(true)
    } catch (err) {
      console.error(err)
      setError('Failed to grade test. Ensure the backend is running and API key is set.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="animate-in ai-loading-overlay">
        <div className="ai-loading-spinner" />
        <h2>🤖 Generating Strict Mock Test...</h2>
        <p style={{ marginTop: '12px' }}>Crafting questions based on {subject} ({difficulty} difficulty).</p>
      </div>
    )
  }

  if (generationError) {
    return (
      <div className="animate-in smart-learning-container" style={{ textAlign: 'center', marginTop: '40px' }}>
        <h2 style={{ color: 'var(--danger)' }}>Error</h2>
        <p>{generationError}</p>
        <button className="btn btn-secondary" style={{ marginTop: '20px' }} onClick={() => navigate(-1)}>Go Back</button>
      </div>
    )
  }

  if (submitted && gradedResult) {
    const scorePercentage = Math.round((gradedResult.totalScore / gradedResult.maxPossibleScore) * 100)
    
    return (
      <div className="animate-in smart-learning-container" style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div className="page-header" style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ fontSize: '4rem', marginBottom: '16px' }}>{scorePercentage >= 80 ? '🏆' : scorePercentage >= 60 ? '👍' : '📚'}</div>
          <h1>Test Graded!</h1>
          <div style={{ fontSize: '3rem', fontWeight: '800', color: 'var(--primary-light)', margin: '12px 0' }}>
            {gradedResult.totalScore} <span style={{ fontSize: '1.5rem', color: 'var(--text-muted)' }}>/ {gradedResult.maxPossibleScore}</span>
          </div>
          <p style={{ color: 'var(--text-secondary)' }}>You scored {scorePercentage}% on this mock test.</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {questions.map((q, i) => {
            const evalData = gradedResult.evaluations.find(e => e.id === q.id)
            if (!evalData) return null
            
            return (
              <div key={q.id} className="card" style={{ padding: '24px', animationDelay: `${i * 0.1}s` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span style={{ fontWeight: '600', color: 'var(--text-secondary)' }}>Question {i + 1} ({q.type})</span>
                  <span className="badge" style={{ backgroundColor: evalData.awardedMarks === q.marks ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)', color: evalData.awardedMarks === q.marks ? 'var(--success)' : 'var(--danger)' }}>
                    {evalData.awardedMarks} / {q.marks} Marks
                  </span>
                </div>
                <p style={{ fontSize: '1rem', marginBottom: '16px' }}>{q.text}</p>
                {q.options && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                    {q.options.map((opt, idx) => (
                      <div key={idx} style={{ 
                        padding: '10px 14px', 
                        background: opt === q.modelAnswer ? 'rgba(16, 185, 129, 0.15)' : answers[q.id] === opt && opt !== q.modelAnswer ? 'rgba(239, 68, 68, 0.15)' : 'var(--bg-secondary)', 
                        border: `1px solid ${opt === q.modelAnswer ? 'var(--success)' : answers[q.id] === opt && opt !== q.modelAnswer ? 'var(--danger)' : 'var(--surface-border)'}`,
                        borderRadius: 'var(--radius-sm)'
                      }}>
                        {opt} {opt === q.modelAnswer && ' (Correct Answer)'} {answers[q.id] === opt && opt !== q.modelAnswer && ' (Your Answer)'}
                      </div>
                    ))}
                  </div>
                )}
                {!q.options && (
                  <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid var(--primary)', marginBottom: '16px' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px' }}>Your Answer:</div>
                    <div style={{ color: 'var(--text)', whiteSpace: 'pre-wrap' }}>{answers[q.id] || '(No answer provided)'}</div>
                  </div>
                )}
                <div style={{ background: 'rgba(139, 92, 246, 0.1)', padding: '16px', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--primary-light)', marginBottom: '4px', fontWeight: '600' }}>🤖 AI Feedback:</div>
                  <div style={{ color: 'var(--text)', marginBottom: '8px' }}>{evalData.feedback}</div>
                  {!q.options && (
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      <strong>Model Answer:</strong> {q.modelAnswer}
                      {q.keyPoints?.length > 0 && <div><strong>Key Points expected:</strong> {q.keyPoints.join(', ')}</div>}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <div style={{ marginTop: '40px', textAlign: 'center' }}>
          <button className="btn btn-primary" onClick={() => navigate('/dashboard')}>
            Return to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="animate-in smart-learning-container" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div className="page-header" style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <button 
            className="btn btn-secondary btn-sm" 
            style={{ marginBottom: '16px' }}
            onClick={() => navigate(-1)}
          >
            ← Back to Learning Package
          </button>
          <h1>📝 Custom Mock Test ({difficulty})</h1>
          <p>Read the questions carefully and do your best.</p>
        </div>
        
        <div style={{ background: 'var(--surface)', padding: '16px 24px', borderRadius: 'var(--radius)', border: '1px solid var(--surface-border)', textAlign: 'center' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Total Marks</div>
          <div style={{ fontSize: '1.8rem', fontWeight: '700', color: 'var(--primary-light)' }}>{totalMarks}</div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {questions.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
            No questions generated based on the configuration.
          </div>
        ) : (
          questions.map((q, index) => (
            <div key={q.id} className="quiz-question animate-in" style={{ animationDelay: `${index * 0.1}s` }}>
              <div className="quiz-question-header">
                <span className="quiz-question-number">Question {index + 1}</span>
                <span className="quiz-question-marks">{q.marks} Marks</span>
              </div>
              <p style={{ fontSize: '1.05rem', color: 'var(--text)', marginBottom: '20px', lineHeight: 1.6 }}>
                {q.text}
              </p>
              
              {q.options ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {q.options.map((opt, oIdx) => (
                    <label key={oIdx} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--bg-secondary)', padding: '12px 16px', borderRadius: 'var(--radius-sm)', cursor: 'pointer', border: answers[q.id] === opt ? '1px solid var(--primary)' : '1px solid var(--surface-border)' }}>
                      <input 
                        type="radio" 
                        name={q.id}
                        value={opt}
                        checked={answers[q.id] === opt}
                        onChange={() => handleAnswerChange(q.id, opt)}
                        style={{ cursor: 'pointer' }}
                      />
                      <span>{opt}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <textarea 
                  className="quiz-textarea"
                  placeholder="Type your detailed answer here..."
                  value={answers[q.id] || ''}
                  onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                />
              )}
            </div>
          ))
        )}
      </div>

      {questions.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', marginTop: '16px', marginBottom: '40px' }}>
          {error && <div style={{ color: 'var(--danger)', marginBottom: '16px', padding: '12px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px', width: '100%' }}>{error}</div>}
          <button 
            className="btn btn-primary"
            style={{ padding: '16px 48px', fontSize: '1.05rem' }}
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <span className="loading-dots"><span /><span /><span /></span>
            ) : (
              'Submit Mock Test'
            )}
          </button>
        </div>
      )}
    </div>
  )
}
