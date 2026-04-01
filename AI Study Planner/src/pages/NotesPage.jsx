import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { db } from '../firebase'
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, orderBy, serverTimestamp } from 'firebase/firestore'

// Lightweight markdown renderer — no external library needed
function renderMarkdown(text) {
  if (!text) return null

  const lines = text.split('\n')
  const elements = []
  let i = 0

  const parseInline = (str) => {
    // Handle **bold**, *italic*, `code`
    const parts = []
    let remaining = str
    let key = 0

    while (remaining.length > 0) {
      const boldMatch = remaining.match(/\*\*(.+?)\*\*/)
      const italicMatch = remaining.match(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/)
      const codeMatch = remaining.match(/`(.+?)`/)

      const candidates = [
        boldMatch && { idx: boldMatch.index, type: 'bold', match: boldMatch },
        italicMatch && { idx: italicMatch.index, type: 'italic', match: italicMatch },
        codeMatch && { idx: codeMatch.index, type: 'code', match: codeMatch },
      ].filter(Boolean)

      if (candidates.length === 0) {
        parts.push(<span key={key++}>{remaining}</span>)
        break
      }

      candidates.sort((a, b) => a.idx - b.idx)
      const first = candidates[0]

      if (first.idx > 0) {
        parts.push(<span key={key++}>{remaining.slice(0, first.idx)}</span>)
      }

      if (first.type === 'bold') {
        parts.push(<strong key={key++} style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{first.match[1]}</strong>)
      } else if (first.type === 'italic') {
        parts.push(<em key={key++} style={{ fontStyle: 'italic' }}>{first.match[1]}</em>)
      } else if (first.type === 'code') {
        parts.push(
          <code key={key++} style={{
            background: 'rgba(99,102,241,0.15)',
            color: 'var(--primary)',
            borderRadius: '4px',
            padding: '1px 5px',
            fontSize: '0.82em',
            fontFamily: 'monospace'
          }}>{first.match[1]}</code>
        )
      }

      remaining = remaining.slice(first.idx + first.match[0].length)
    }
    return parts
  }

  while (i < lines.length) {
    const line = lines[i].trim()

    if (!line) {
      elements.push(<div key={i} style={{ height: '6px' }} />)
    } else if (line.startsWith('### ')) {
      elements.push(
        <p key={i} style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--primary)', margin: '10px 0 4px', letterSpacing: '0.01em' }}>
          {parseInline(line.slice(4))}
        </p>
      )
    } else if (line.startsWith('## ')) {
      elements.push(
        <p key={i} style={{ fontWeight: 700, fontSize: '0.96rem', color: 'var(--primary)', margin: '12px 0 4px', letterSpacing: '0.01em' }}>
          {parseInline(line.slice(3))}
        </p>
      )
    } else if (line.startsWith('# ')) {
      elements.push(
        <p key={i} style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--primary)', margin: '12px 0 6px', letterSpacing: '0.02em' }}>
          {parseInline(line.slice(2))}
        </p>
      )
    } else if (line.startsWith('- ') || line.startsWith('• ') || line.startsWith('* ')) {
      const bulletText = line.startsWith('• ') ? line.slice(2) : line.slice(2)
      elements.push(
        <div key={i} style={{ display: 'flex', gap: '8px', margin: '3px 0', alignItems: 'flex-start' }}>
          <span style={{ color: 'var(--primary)', fontWeight: 700, marginTop: '1px', flexShrink: 0 }}>•</span>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
            {parseInline(bulletText)}
          </span>
        </div>
      )
    } else if (/^\d+\.\s/.test(line)) {
      const match = line.match(/^(\d+)\.\s(.*)/)
      elements.push(
        <div key={i} style={{ display: 'flex', gap: '8px', margin: '3px 0', alignItems: 'flex-start' }}>
          <span style={{ color: 'var(--primary)', fontWeight: 700, marginTop: '1px', flexShrink: 0, minWidth: '18px' }}>{match[1]}.</span>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
            {parseInline(match[2])}
          </span>
        </div>
      )
    } else if (line.startsWith('---') || line.startsWith('===')) {
      elements.push(<hr key={i} style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '10px 0' }} />)
    } else {
      elements.push(
        <p key={i} style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.7', margin: '4px 0' }}>
          {parseInline(line)}
        </p>
      )
    }
    i++
  }

  return elements
}

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
                  maxHeight: '220px',
                  overflowY: 'auto',
                  paddingRight: '4px',
                }}
              >
                {renderMarkdown(note.content)}
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
