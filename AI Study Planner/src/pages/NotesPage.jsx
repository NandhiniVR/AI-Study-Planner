import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { db } from '../firebase'
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, orderBy, serverTimestamp } from 'firebase/firestore'

export default function NotesPage() {
  const [notes, setNotes] = useState([])
  const [topic, setTopic] = useState('')
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [error, setError] = useState('')
  const { currentUser } = useAuth()

  useEffect(() => {
    async function fetchNotes() {
      if (!currentUser) return
      
      // Safety timeout just in case Firestore websockets are blocked by school/work firewall
      const timeoutId = setTimeout(() => {
        if (fetching) {
          console.warn('Firebase load timed out – skipping index block')
          setFetching(false)
        }
      }, 5000)

      try {
        const q = query(
          collection(db, 'userNotes'), 
          where('userId', '==', currentUser.uid),
          orderBy('timestamp', 'desc')
        )
        const querySnapshot = await getDocs(q)
        const fetchedNotes = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        setNotes(fetchedNotes)
      } catch (err) {
        console.error('Failure fetching notes:', err)
      } finally {
        clearTimeout(timeoutId)
        setFetching(false)
      }
    }
    fetchNotes()
  }, [currentUser])

  const handleGenerate = async () => {
    if (!topic.trim()) return
    setLoading(true)
    setError('')
    
    try {
      console.log('Sending request to Gemini backend...')
      const response = await fetch('http://localhost:5000/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topic.trim() })
      })
      console.log('Backend response status:', response.status)

      if (!response.ok) throw new Error('Generation failed')
      const result = await response.json()
      console.log('Received Note:', result)

      const newNote = {
        userId: currentUser.uid,
        topic: topic.trim(),
        content: result.content,
        displayDate: new Date().toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
        timestamp: serverTimestamp()
      }

      // 1. Update UI FIRST (Optimistic update so user is not stuck waiting on Firebase network)
      const optimisticNote = { id: Date.now().toString(), ...newNote }
      setNotes([optimisticNote, ...notes])
      setTopic('')
      setLoading(false)

      // 2. Save to Firebase lazily in the background
      console.log('Syncing note to Firebase in background...')
      try {
        await addDoc(collection(db, 'userNotes'), newNote)
        console.log('Firebase sync complete.')
      } catch (fbErr) {
        console.warn('Firebase background sync issue:', fbErr)
      }
    } catch (err) {
      console.error(err)
      setError('Failed to generate note. Make sure backend is running and Gemini API key is valid.')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    try {
      await deleteDoc(doc(db, 'userNotes', id))
      setNotes(notes.filter((n) => n.id !== id))
    } catch (err) {
      console.error('Failed to delete note', err)
    }
  }

  return (
    <div className="animate-in">
      <div className="page-header">
        <h1>📝 AI Notes</h1>
        <p>Enter any topic to instantly generate structured study notes</p>
      </div>

      {/* Input */}
      <div className="card notes-input-section">
        <h3 style={{ marginBottom: '16px', fontSize: '1rem', fontWeight: '600' }}>🤖 Generate Notes</h3>
        <div className="notes-input-row">
          <input
            id="notes-topic-input"
            type="text"
            className="input-field"
            placeholder="Enter a topic e.g. Newton's Laws, Photosynthesis, Quadratic Formula…"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
          />
          <button
            id="generate-notes-btn"
            className="btn btn-primary"
            onClick={handleGenerate}
            disabled={!topic.trim() || loading}
            style={{ whiteSpace: 'nowrap' }}
          >
            {loading ? (
              <span className="loading-dots"><span /><span /><span /></span>
            ) : (
              '✨ Generate'
            )}
          </button>
        </div>
        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '8px' }}>
          Try: "Photosynthesis", "Quadratic Formula", "Newton's Laws of Motion"
        </p>
        {error && <div style={{ marginTop: '12px', color: 'var(--danger)', fontSize: '0.85rem' }}>{error}</div>}
      </div>

      {/* Notes grid */}
      {fetching ? (
        <div className="ai-loading-overlay"><div className="loading-spinner" /></div>
      ) : notes.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '3rem', marginBottom: '12px' }}>📭</div>
          <p>No notes yet. Generate your first one above!</p>
        </div>
      ) : (
        <div className="notes-grid">
          {notes.map((note) => (
            <div key={note.id} className="note-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <h4>{note.topic}</h4>
                <button
                  title="Delete note"
                  onClick={() => handleDelete(note.id)}
                  style={{
                    background: 'none',
                    color: 'var(--text-muted)',
                    fontSize: '1.1rem',
                    cursor: 'pointer',
                    padding: '0 4px',
                    transition: 'var(--transition)',
                  }}
                  onMouseEnter={(e) => (e.target.style.color = 'var(--danger)')}
                  onMouseLeave={(e) => (e.target.style.color = 'var(--text-muted)')}
                >
                  ×
                </button>
              </div>
              <div
                style={{
                  fontSize: '0.86rem',
                  color: 'var(--text-secondary)',
                  lineHeight: '1.7',
                  whiteSpace: 'pre-line',
                  maxHeight: '200px',
                  overflowY: 'auto',
                }}
              >
                {note.content}
              </div>
              <div className="note-meta">
                <span>✨ Gemini AI</span>
                <span>{note.displayDate}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
