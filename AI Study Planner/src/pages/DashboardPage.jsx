import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { studyPlan } from '../services/dummyData'
import { useAuth } from '../contexts/AuthContext'
import { db } from '../firebase'
import { collection, query, where, getDocs } from 'firebase/firestore'



export default function DashboardPage() {
  const navigate = useNavigate()
  const { currentUser } = useAuth()
  const [userSubjects, setUserSubjects] = useState([])
  const [timetableMsg, setTimetableMsg] = useState('')

  const handleTimetableClick = () => {
    // Unique subjects logic just as to be safe
    const uniqueSubjects = new Set(userSubjects.map(s => s.subject)).size;
    if (uniqueSubjects > 1) {
      navigate('/timetable')
    } else {
      setTimetableMsg('Timetable available only for multiple subjects')
      setTimeout(() => setTimetableMsg(''), 4000)
    }
  }

  useEffect(() => {
    async function loadSubjects() {
      if (!currentUser) return
      try {
        const q = query(collection(db, 'studyPlans'), where('userId', '==', currentUser.uid))
        const snap = await getDocs(q)
        const subjectsData = snap.docs.map(doc => {
          const data = doc.data()
          return { subject: data.subject, val: data.prevMark || data.targetMark || 60, id: doc.id }
        })
        setUserSubjects(subjectsData)

        // If they have no subjects... skip tasks generation for now.
      } catch(e) {
        console.error(e)
      }
    }
    loadSubjects()
  }, [currentUser])

  const greeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    return 'Good evening'
  }

  return (
    <div className="animate-in">
      {timetableMsg && (
        <div style={{ position: 'fixed', top: '20px', right: '20px', background: 'var(--warning)', color: '#000', padding: '12px 24px', borderRadius: '8px', zIndex: 1000, fontWeight: '600', boxShadow: '0 4px 12px rgba(0,0,0,0.3)', animation: 'slideInLeft 0.3s ease-out' }}>
          ⚠️ {timetableMsg}
        </div>
      )}

      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1>{greeting()}, {currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Student'} 👋</h1>
          <p>Here's your study overview for today</p>
        </div>
        
        {/* Dedicated Timetable Icon Button */}
        <button 
          onClick={handleTimetableClick}
          className="btn btn-primary"
          title="Generate / View Timetable"
          style={{ 
            borderRadius: '50px', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '8px',
            background: 'linear-gradient(135deg, var(--primary), var(--accent))', border: 'none',
            fontSize: '1.05rem', boxShadow: '0 4px 15px rgba(108, 92, 231, 0.4)'
          }}
        >
          <span style={{ fontSize: '1.3rem' }}>📅</span> Generate Timetable
        </button>
      </div>

      {/* Removed stats row per user request */}

      <div className="dashboard-grid">
        {/* Progress Overview */}
        <div className="card">
          <div className="card-header">
            <h3>📈 Progress Overview</h3>
          </div>

          {/* Subject progress mini */}
          {userSubjects.length > 0 ? userSubjects.map((item) => (
            <div key={item.subject} style={{ marginBottom: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '5px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>{item.subject}</span>
                <span style={{ color: 'var(--text-muted)' }}>{item.val}%</span>
              </div>
              <div className="progress-bar-bg" style={{ height: '6px' }}>
                <div
                  className="progress-bar-fill"
                  style={{ width: `${item.val}%`, height: '6px' }}
                />
              </div>
            </div>
          )) : (
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No subjects yet. Generate a plan!</div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="card">
          <div className="card-header">
            <h3>⚡ Quick Actions</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button
              id="quick-pomodoro-btn"
              className="btn btn-primary btn-block"
              onClick={() => navigate('/pomodoro')}
            >
              ⏱ Start Pomodoro
            </button>
            <button
              id="quick-plan-btn"
              className="btn btn-secondary btn-block"
              onClick={() => navigate('/timetable')}
            >
              📅 View Full Plan
            </button>
            <button
              id="quick-notes-btn"
              className="btn btn-secondary btn-block"
              onClick={() => navigate('/smart-learning')}
            >
              📝 Generate Notes
            </button>
            <button
              id="quick-analytics-btn"
              className="btn btn-secondary btn-block"
              onClick={() => navigate('/analytics')}
            >
              📊 View Analytics
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
