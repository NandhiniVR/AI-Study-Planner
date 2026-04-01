import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { db } from '../firebase'
import { collection, query, where, getDocs } from 'firebase/firestore'
import mermaid from 'mermaid'
import { ReactFlow, Controls, Background, MarkerType } from '@xyflow/react'
import '@xyflow/react/dist/style.css'

const Flashcard = ({ front, back }) => {
  const [flipped, setFlipped] = useState(false)
  
  const handleTTS = (e, text) => {
    e.stopPropagation();
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(utterance);
  }

  return (
    <div 
      className="flashcard-container"
      style={{ perspective: '1000px', cursor: 'pointer', height: '220px' }}
      onClick={() => setFlipped(!flipped)}
    >
      <div style={{
         position: 'relative', width: '100%', height: '100%', 
         transition: 'transform 0.8s cubic-bezier(0.4, 0.0, 0.2, 1)',
         transformStyle: 'preserve-3d',
         WebkitTransformStyle: 'preserve-3d',
         transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
      }}>
         {/* Front */}
         <div style={{ 
            position: 'absolute', width: '100%', height: '100%', 
            backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden',
            background: 'var(--surface)', padding: '24px', borderRadius: '16px', border: '1px solid var(--border)', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', fontWeight: 'bold',
            boxShadow: '0 8px 16px rgba(0,0,0,0.1)', cursor: 'pointer',
            fontSize: '1.05rem', lineHeight: '1.5'
         }}>
           <div style={{ position: 'absolute', top: '15px', left: '20px', fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Question</div>
           <button onClick={(e) => handleTTS(e, front)} style={{ position: 'absolute', top: '15px', right: '20px', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.1rem' }} title="Listen">🔊</button>
           {front}
           <div style={{ position: 'absolute', bottom: '15px', right: '20px', fontSize: '1.2rem', opacity: 0.5 }}>↺</div>
         </div>
         {/* Back */}
         <div style={{ 
            position: 'absolute', width: '100%', height: '100%', 
            backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden',
            background: 'var(--primary)', color: '#fff', padding: '24px', borderRadius: '16px', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', 
            transform: 'rotateY(180deg)', boxShadow: '0 8px 16px rgba(108, 92, 231, 0.4)',
            fontSize: '1.05rem', lineHeight: '1.5'
         }}>
           <div style={{ position: 'absolute', top: '15px', left: '20px', fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '1px' }}>Answer</div>
           <button onClick={(e) => handleTTS(e, back)} style={{ position: 'absolute', top: '15px', right: '20px', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.1rem' }} title="Listen">🔊</button>
           {back}
           <div style={{ position: 'absolute', bottom: '15px', left: '20px', fontSize: '1.2rem', opacity: 0.5 }}>↺</div>
         </div>
      </div>
    </div>
  )
}

export default function ChatbotPage() {
  const { currentUser } = useAuth()
  const [studyContexts, setStudyContexts] = useState([])
  const [selectedContext, setSelectedContext] = useState('')
  const [selectedNotes, setSelectedNotes] = useState('')
  
  const [messages, setMessages] = useState([
    { role: 'assistant', text: 'Hi! I am your AI Study Assistant. Pick a subject context above and ask me to explain a concept, make flashcards, or generate a mind map/flowchart!', type: 'default' }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const chatEndRef = useRef(null)

  // Initialize mermaid
  useEffect(() => {
    mermaid.initialize({ startOnLoad: false, theme: 'dark' })
  }, [])

  // Auto scroll
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    if (messages.length > 0) {
      try {
        mermaid.run({ querySelector: '.mermaid' })
      } catch (e) {
        console.error('Mermaid rendering error:', e)
      }
    }
  }, [messages])

  // Load Contexts
  useEffect(() => {
    async function fetchContexts() {
      if (!currentUser) return
      try {
        const q = query(collection(db, 'smartLearningPlans'), where('userId', '==', currentUser.uid))
        const snap = await getDocs(q)
        const opts = snap.docs.map(doc => {
          const d = doc.data()
          return { id: doc.id, subject: d.subject, notes: d.generatedContent?.studyNotes || d.topics }
        })
        setStudyContexts(opts)
        if (opts.length > 0) {
          setSelectedContext(opts[0].id)
          setSelectedNotes(opts[0].notes)
        }
      } catch (err) {
        console.error(err)
      }
    }
    fetchContexts()
  }, [currentUser])

  const handleContextChange = (e) => {
    const cid = e.target.value
    setSelectedContext(cid)
    const found = studyContexts.find(s => s.id === cid)
    if (found) setSelectedNotes(found.notes)
  }

  const handleSend = async () => {
    if (!input.trim()) return

    const userMsg = input
    setInput('')
    setMessages(prev => [...prev, { role: 'user', text: userMsg, type: 'default' }])
    setIsLoading(true)

    try {
      const response = await fetch('http://localhost:5000/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: userMsg,
          customContext: selectedNotes
        })
      })

      if (!response.ok) throw new Error('API Error')
      
      const data = await response.json()
      
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        text: data.text, 
        type: data.modeType // 'default', 'mindmap', 'flowchart', 'flashcard'
      }])
    } catch (error) {
      console.error(error)
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        text: 'Sorry, I encountered an error connecting to the AI. Please ensure the backend is running.', 
        type: 'default' 
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const parseMindMap = (jsonString) => {
    try {
      const data = JSON.parse(jsonString)
      let nodes = []
      let edges = []
      
      const traverse = (node, parentId = null, depth = 0, yPos = 0) => {
        const id = `node-${Math.random().toString(36).substr(2, 9)}`
        nodes.push({
          id,
          position: { x: depth * 220, y: yPos },
          data: { label: node.title },
          style: { 
            background: depth === 0 ? 'var(--primary)' : 'var(--bg-secondary)', 
            color: 'var(--text-primary)', 
            border: '1px solid var(--border)', 
            borderRadius: '8px', 
            padding: '12px',
            width: 180,
            fontSize: '0.9rem',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
          }
        })
        
        if (parentId) {
          edges.push({ 
            id: `e-${parentId}-${id}`, 
            source: parentId, 
            target: id, 
            type: 'smoothstep', 
            animated: true, 
            style: { stroke: 'var(--primary-light)', strokeWidth: 2, transition: 'all 0.5s ease-in-out' },
            markerEnd: { type: MarkerType.ArrowClosed, color: 'var(--primary-light)' }
          })
        }
        
        let currentY = yPos
        if (node.children && node.children.length > 0) {
          node.children.forEach((child, idx) => {
            currentY = traverse(child, id, depth + 1, currentY + (idx * 80))
          })
        }
        return Math.max(yPos, currentY)
      }
      
      traverse(data, null, 0, 0)
      return { nodes, edges }
    } catch (e) {
      console.error("Invalid mindmap JSON", e)
      return null
    }
  }

  // Pre-process markdown text for default chats
  const renderText = (text) => {
    return text.split('\n').map((line, idx) => {
      let content = line;
      let style = { marginBottom: '8px' };
      
      if (content.startsWith('### ')) {
        return <h3 key={idx} style={{ color: 'var(--primary-light)', marginTop: '16px', marginBottom: '8px' }}>{renderInline(content.replace('###', '').trim())}</h3>
      }
      if (content.startsWith('## ')) {
        return <h2 key={idx} style={{ color: 'var(--primary)', marginTop: '20px', marginBottom: '12px' }}>{renderInline(content.replace('##', '').trim())}</h2>
      }
      if (content.startsWith('# ')) {
        return <h1 key={idx} style={{ color: 'var(--primary-light)', marginTop: '24px', marginBottom: '16px' }}>{renderInline(content.replace('#', '').trim())}</h1>
      }
      if (content.trim().startsWith('- ') || content.trim().startsWith('* ')) {
        return <li key={idx} style={{ marginLeft: '20px', marginBottom: '4px' }}>{renderInline(content.replace(/^[-*]\s/, '').trim())}</li>
      }
      if (content.match(/^\d+\.\s/)) {
        return <li key={idx} style={{ marginLeft: '20px', marginBottom: '4px', listStyleType: 'decimal' }}>{renderInline(content.replace(/^\d+\.\s/, '').trim())}</li>
      }
      if (!content.trim()) return <br key={idx} />
      
      return <p key={idx} style={style}>{renderInline(content)}</p>
    });
  }

  const renderInline = (str) => {
    const parts = str.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} style={{ color: 'var(--primary-light)' }}>{part.slice(2, -2)}</strong>;
      }
      return <span key={i}>{part}</span>;
    });
  }

  const handleTTS = (text) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text.replace(/[#*`~_>-]/g, '').trim());
    window.speechSynthesis.speak(utterance);
  }

  return (
    <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 40px)', padding: '20px', boxSizing: 'border-box' }}>
      <div className="page-header" style={{ marginBottom: '16px', flex: '0 0 auto' }}>
        <h1>🧠 AI Study Assistant</h1>
        <p>Ask doubts, generate flashcards, mind maps, or flowcharts based on your study materials!</p>
      </div>

      <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--surface)', padding: '16px', borderRadius: 'var(--radius)', border: '1px solid var(--surface-border)' }}>
        <span style={{ fontSize: '0.9rem', fontWeight: '500', color: 'var(--text-secondary)' }}>Current Context:</span>
        <select 
          className="input-field" 
          style={{ width: '250px', padding: '8px 12px' }} 
          value={selectedContext} 
          onChange={handleContextChange}
          disabled={studyContexts.length === 0}
        >
          {studyContexts.length === 0 && <option value="">No study plans found</option>}
          {studyContexts.map(s => <option key={s.id} value={s.id}>{s.subject}</option>)}
        </select>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>The AI will read this subject's notes to answer your specific questions accurately.</span>
      </div>

      <div className="card" style={{ flex: '1 1 auto', display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 0 }}>
        {/* Chat window */}
        <div style={{ flex: '1 1 auto', overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {messages.map((msg, idx) => (
            <div key={idx} style={{
              alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: msg.type === 'mindmap' || msg.type === 'flowchart' ? '100%' : '80%'
            }}>
              <div style={{
                background: msg.role === 'user' ? 'var(--primary)' : 'var(--surface-elevated)',
                color: msg.role === 'user' ? '#fff' : 'var(--text)',
                padding: '16px',
                borderRadius: '12px',
                borderBottomRightRadius: msg.role === 'user' ? '4px' : '12px',
                borderBottomLeftRadius: msg.role === 'user' ? '12px' : '4px',
                border: msg.role === 'assistant' ? '1px solid var(--border)' : 'none',
                lineHeight: 1.5,
                boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
              }}>
                {msg.type === 'flowchart' ? (
                  <div style={{ background: 'var(--bg-primary)', padding: '20px', borderRadius: '8px', overflowX: 'auto' }}>
                    <div className="mermaid">{msg.text}</div>
                  </div>
                ) : msg.type === 'mindmap' ? (
                  <div style={{ width: '100%', height: '400px', background: 'var(--bg-primary)', borderRadius: '8px', border: '1px solid var(--border)', overflow: 'hidden' }}>
                    {(() => {
                      const graph = parseMindMap(msg.text)
                      if (!graph) return <div style={{ padding: '20px', color: 'var(--danger)' }}>Error rendering mindmap JSON</div>
                      return (
                        <ReactFlow nodes={graph.nodes} edges={graph.edges} fitView>
                          <Background color="#ccc" gap={16} />
                          <Controls />
                        </ReactFlow>
                      )
                    })()}
                  </div>
                ) : msg.type === 'flashcard' ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                    <div style={{ gridColumn: '1 / -1', fontWeight: '600', marginBottom: '8px', color: 'var(--primary-light)' }}>📚 Study Flashcards:</div>
                    {msg.text.split('\n\n').filter(t => t.trim()).map((card, cidx) => {
                      const [q, ...a] = card.split('\n')
                      const frontText = q.replace(/^(?:Q\d*:|\*\*Q\d*:\*\*|\*\*Question:?\*\*|Question:?)\s*/i, '').replace(/\*\*/g, '')
                      const backText = a.join('\n').replace(/^(?:A\d*:|\*\*A\d*:\*\*|\*\*Answer:?\*\*|Answer:?)\s*/i, '').replace(/\*\*/g, '')
                      return <Flashcard key={cidx} front={frontText} back={backText} />
                    })}
                  </div>
                ) : (
                  <div style={{ whiteSpace: 'pre-wrap', position: 'relative' }}>
                    {msg.role === 'assistant' && (
                      <button onClick={() => handleTTS(msg.text)} style={{ position: 'absolute', top: '-10px', right: '-10px', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }} title="Listen to Response">🔊</button>
                    )}
                    {renderText(msg.text)}
                  </div>
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div style={{ alignSelf: 'flex-start', background: 'var(--surface-elevated)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)' }}>
              <span className="loading-dots"><span /><span /><span /></span> AI is thinking...
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Chat input */}
        <div style={{ padding: '16px 24px', background: 'var(--surface)', borderTop: '1px solid var(--border)', display: 'flex', gap: '12px' }}>
          <input 
            type="text" 
            className="input-field" 
            style={{ flex: 1 }}
            placeholder="E.g., Generate a flowchart for process scheduling..." 
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            disabled={isLoading}
          />
          <button className="btn btn-primary" onClick={handleSend} disabled={isLoading || !input.trim()}>
            Send Message
          </button>
        </div>
      </div>
    </div>
  )
}
