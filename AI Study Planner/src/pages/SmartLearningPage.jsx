import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import mermaid from 'mermaid'
import * as pdfjsLib from 'pdfjs-dist';
import Tesseract from 'tesseract.js';
import { ReactFlow, Controls, Background, MarkerType } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import TTSPlayer from '../components/TTSPlayer';

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '4.0.379'}/pdf.worker.min.js`;

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

export default function SmartLearningPage() {
  const navigate = useNavigate()
  
  // App states: 'input' | 'loading' | 'result'
  const [appState, setAppState] = useState('input')
  const [generatedData, setGeneratedData] = useState(null)
  const [error, setError] = useState('')
  const { currentUser } = useAuth()
  
  // Tab Input State
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('slp_activeTab') || 'text')
  const [youtubeUrl, setYoutubeUrl] = useState(() => localStorage.getItem('slp_youtubeUrl') || '')
  const [uploadedFiles, setUploadedFiles] = useState([])
  const [isExtracting, setIsExtracting] = useState(false)
  const [extractionMsg, setExtractionMsg] = useState('')

  // Form State
  const [form, setForm] = useState(() => {
    const saved = localStorage.getItem('slp_form')
    return saved ? JSON.parse(saved) : {
      subject: '',
      topics: '',
      targetMarks: '',
      examDate: '',
      prevMarks: '',
      studyHoursPerDay: '',
      preferredStudyTime: '',
      breakDuration: ''
    }
  })
  
  // Mock Test Config State
  const [testConfig, setTestConfig] = useState({
    mcq: 5,
    short: 3,
    long: 2
  })
  const [testDifficulty, setTestDifficulty] = useState('medium')

  const handleInputChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleConfigChange = (e) => {
    setTestConfig({ ...testConfig, [e.target.name]: Number(e.target.value) })
  }

  useEffect(() => {
    localStorage.setItem('slp_activeTab', activeTab)
  }, [activeTab])

  useEffect(() => {
    localStorage.setItem('slp_youtubeUrl', youtubeUrl)
  }, [youtubeUrl])

  useEffect(() => {
    localStorage.setItem('slp_form', JSON.stringify(form))
  }, [form])

  const downloadPDF = async () => {
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      
      const container = document.createElement('div');
      container.style.padding = '40px';
      container.style.fontFamily = "'Inter', 'Segoe UI', Arial, sans-serif";
      container.style.color = '#111827';
      container.style.lineHeight = '1.6';

      let html = `
        <h1 style="text-align: center; color: #6d28d9; margin-bottom: 10px; font-size: 36px; padding-bottom: 10px;">
          Generated Study Notes
        </h1>
        <p style="text-align: center; font-size: 18px; color: #4b5563; margin-top: 0; margin-bottom: 40px; border-bottom: 2px solid #e5e7eb; padding-bottom: 20px;">
          Subject: <strong>${form.subject}</strong> | Target: ${form.targetMarks}% | Date: ${new Date().toLocaleDateString()}
        </p>
      `;

      // Section 1: Notes
      if (generatedData?.studyNotes) {
        let parsedNotes = generatedData.studyNotes.split('\n').map(line => {
          if (line.startsWith('## ')) return `<h3 style="color: #4c1d95; margin-top: 24px; margin-bottom: 12px; font-size: 20px;">${line.replace('##', '').trim()}</h3>`;
          if (line.startsWith('# ')) return `<h2 style="color: #6d28d9; margin-top: 30px; margin-bottom: 16px; font-size: 24px;">${line.replace('#', '').trim()}</h2>`;
          if (line.trim().startsWith('- ')) return `<li style="margin-left: 20px; margin-bottom: 8px;">${line.replace('- ', '').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</li>`;
          if (!line.trim()) return '<br>';
          return `<p style="margin-bottom: 12px;">${line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</p>`;
        }).join('');

        html += `
          <div style="margin-bottom: 50px;">
            <h2 style="background-color: #f3e8ff; color: #4c1d95; padding: 12px 16px; border-radius: 8px; font-size: 22px; margin-bottom: 20px;">📘 Section 1: Notes</h2>
            <div style="font-size: 15px;">${parsedNotes}</div>
          </div>
        `;
      }

      // Section 2: Keywords
      if (generatedData?.keywords?.length > 0) {
        let kwHtml = generatedData.keywords.map(kw => `
          <li style="margin-bottom: 12px; background: #f9fafb; padding: 10px; border-radius: 6px; border-left: 4px solid #8b5cf6;">
            <strong style="color: #6d28d9; font-size: 16px;">${kw.term}:</strong> 
            <span style="color: #374151; display: block; margin-top: 4px;">${kw.definition}</span>
          </li>
        `).join('');

        html += `
          <div style="margin-bottom: 50px; page-break-inside: avoid;">
            <h2 style="background-color: #f3e8ff; color: #4c1d95; padding: 12px 16px; border-radius: 8px; font-size: 22px; margin-bottom: 20px;">🔑 Section 2: Keywords</h2>
            <ul style="font-size: 15px; padding-left: 0; list-style: none;">${kwHtml}</ul>
          </div>
        `;
      }

      // Section 3: Flashcards
      if (generatedData?.flashcards?.length > 0) {
        let fcHtml = generatedData.flashcards.map((fc, i) => `
          <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 16px; background-color: #ffffff; box-shadow: 0 2px 4px rgba(0,0,0,0.05); page-break-inside: avoid;">
            <p style="margin: 0 0 12px 0; color: #6d28d9; font-weight: bold; font-size: 16px;">Q${i+1}: ${fc.front}</p>
            <p style="margin: 0; font-size: 15px; color: #1f2937; border-top: 1px dashed #e5e7eb; padding-top: 12px;"><strong>A:</strong> ${fc.back}</p>
          </div>
        `).join('');

        html += `
          <div style="margin-bottom: 50px;">
            <h2 style="background-color: #f3e8ff; color: #4c1d95; padding: 12px 16px; border-radius: 8px; font-size: 22px; margin-bottom: 20px;">📇 Section 3: Flashcards</h2>
            <div>${fcHtml}</div>
          </div>
        `;
      }

      // Section 4: Summary / Questions
      if (generatedData?.questions?.marks2?.length > 0 || generatedData?.questions?.marks5?.length > 0 || generatedData?.questions?.marks10?.length > 0) {
        const getQuestions = (arr) => arr ? arr.map(q => `<li>${q}</li>`).join('') : '';
        html += `
          <div style="margin-bottom: 50px; page-break-inside: avoid;">
            <h2 style="background-color: #f3e8ff; color: #4c1d95; padding: 12px 16px; border-radius: 8px; font-size: 22px; margin-bottom: 20px;">📝 Section 4: Practice Questions</h2>
            ${generatedData?.questions?.marks2?.length > 0 ? `<div style="margin-bottom:15px"><h4 style="color: #4c1d95; margin-bottom: 8px;">Short Questions (2 Marks)</h4><ul style="padding-left:20px;">${getQuestions(generatedData.questions.marks2)}</ul></div>` : ''}
            ${generatedData?.questions?.marks5?.length > 0 ? `<div style="margin-bottom:15px"><h4 style="color: #4c1d95; margin-bottom: 8px;">Medium Questions (5 Marks)</h4><ul style="padding-left:20px;">${getQuestions(generatedData.questions.marks5)}</ul></div>` : ''}
            ${generatedData?.questions?.marks10?.length > 0 ? `<div style="margin-bottom:15px"><h4 style="color: #4c1d95; margin-bottom: 8px;">Long Questions (10 Marks)</h4><ul style="padding-left:20px;">${getQuestions(generatedData.questions.marks10)}</ul></div>` : ''}
          </div>
        `;
      }

      container.innerHTML = html;

      const opt = {
        margin: [15, 15, 15, 15],
        filename: `${form.subject.replace(/[^a-z0-9]/gi, '_')}_study_notes.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };
      
      html2pdf().from(container).set(opt).save();
    } catch (err) {
      console.error('Download failed', err);
    }
  }

  const handleGenerateAI = async (e) => {
    e.preventDefault()
    if (!form.subject || !form.targetMarks || !form.examDate) {
      setError('Please fill in missing fields (Subject, Marks, Date)')
      return
    }

    setIsExtracting(true)
    setError('')
    
    try {
      let combinedContent = ''
      if (form.topics.trim()) {
        combinedContent += `\n[MANUAL TEXT INPUT]\n${form.topics}\n`
      }
      
      if (!combinedContent.trim() && !youtubeUrl.trim() && uploadedFiles.length === 0) {
        throw new Error('No input provided. Please enter text, a youtube link, or upload files.')
      }

      setAppState('loading')
      setIsExtracting(false)

      const formData = new FormData()
      formData.append('subject', form.subject)
      formData.append('topics', combinedContent)
      formData.append('targetMarks', form.targetMarks)
      if (youtubeUrl.trim()) formData.append('youtubeUrl', youtubeUrl.trim())
      if (form.studyHoursPerDay) formData.append('studyHoursPerDay', form.studyHoursPerDay)
      if (form.preferredStudyTime) formData.append('preferredStudyTime', form.preferredStudyTime)
      if (form.breakDuration) formData.append('breakDuration', form.breakDuration)

      uploadedFiles.forEach(file => {
        formData.append('files', file)
      })

      const response = await fetch('http://localhost:5000/generate', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error('Failed to generate from server')
      }

      const data = await response.json()
      setGeneratedData(data)

      // Save to Firestore (in background, do not await to prevent UI blocking)
      if (currentUser) {
        try {
          addDoc(collection(db, 'smartLearningPlans'), {
            userId: currentUser.uid,
            subject: form.subject,
            topics: form.topics,
            targetMarks: form.targetMarks,
            examDate: form.examDate,
            generatedContent: data,
            createdAt: serverTimestamp()
          }).catch(fbErr => {
            console.warn('Firebase background sync issue:', fbErr)
          })
        } catch (syncErr) {
          console.warn('Could not initiate Firebase sync:', syncErr)
        }
      }

      setAppState('result')
    } catch (err) {
      console.error(err)
      setError('An error occurred during AI generation. Ensure the backend is running and valid.')
      setAppState('input')
    }
  }

  const handleGenerateTest = () => {
    navigate('/smart-learning/mock-test', {
      state: {
        config: testConfig,
        subject: form.subject,
        notes: generatedData?.studyNotes || form.topics,
        difficulty: testDifficulty
      }
    })
  }

  // Helper to parse mindmap arrays into ReactFlow nodes/edges
  const parseMindMapFromObject = (data) => {
    try {
      if (!data) return null;
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
      
      let nextY = 0;
      if (Array.isArray(data)) {
         data.forEach((rootNode) => {
            nextY = traverse(rootNode, null, 0, nextY) + 80;
         });
      } else {
         traverse(data, null, 0, 0);
      }
      return { nodes, edges }
    } catch (e) {
      console.error("Invalid mindmap JSON", e)
      return null
    }
  }

  // Effect to render mermaid
  useEffect(() => {
    mermaid.initialize({ startOnLoad: false, theme: 'dark' })
    if (appState === 'result' && generatedData?.flowchart) {
      setTimeout(() => {
        try {
          mermaid.run({ querySelector: '.mermaid' })
        } catch (e) {
          console.error('Mermaid render error', e)
        }
      }, 100) // allow dom to mount
    }
  }, [appState, generatedData])

  if (appState === 'loading') {
    return (
      <div className="animate-in ai-loading-overlay">
        <div className="ai-loading-spinner" />
        <h2>Processing your content...</h2>
      </div>
    )
  }

  if (appState === 'result') {
    return (
      <div className="animate-in smart-learning-container">
        <div className="page-header" style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1>✨ Your Smart Learning Package</h1>
            <p>Generated for <strong>{form.subject}</strong> — Targeting {form.targetMarks} Marks for Exam on {new Date(form.examDate).toLocaleDateString()}</p>
            <button 
              className="btn btn-secondary btn-sm" 
              style={{ marginTop: '16px', marginRight: '10px' }}
              onClick={() => setAppState('input')}
            >
              ← Modify Input
            </button>
            <button 
              className="btn btn-primary btn-sm"
              style={{ marginTop: '16px' }}
              onClick={downloadPDF}
            >
              📄 Download Notes as PDF
            </button>
          </div>
        </div>

        <div id="notes-content-area">
          <TTSPlayer textToRead={generatedData?.studyNotes || ''} />
          
          <div className="learning-card">
            <div className="learning-card-header">
              <span className="icon">📘</span>
              <h3>Comprehensive Study Notes</h3>
            </div>
            <div className="study-notes-content" style={{ lineHeight: '1.8', fontSize: '1.05rem', whiteSpace: 'pre-wrap' }}>
              {generatedData?.studyNotes?.split('\n').map((line, i) => {
                if (line.startsWith('## ')) return <h2 key={i} style={{ marginTop: '24px', marginBottom: '12px', color: 'var(--text-primary)' }}>{line.replace('##', '').trim()}</h2>
                if (line.startsWith('# ')) return <h1 key={i} style={{ marginTop: '24px', marginBottom: '12px', color: 'var(--primary-light)' }}>{line.replace('#', '').trim()}</h1>
                if (line.trim().startsWith('- ')) return <li key={i} style={{ marginLeft: '20px', marginBottom: '8px' }} dangerouslySetInnerHTML={{ __html: line.replace('- ', '').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                if (!line.trim()) return <br key={i} />
                return <p key={i} style={{ marginBottom: '12px' }} dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
              })}
            </div>
          </div>
          
          {generatedData?.timeTable && generatedData.timeTable.length > 0 && (
            <div className="learning-card" style={{ marginTop: '20px' }}>
              <div className="learning-card-header">
                <span className="icon">📅</span>
                <h3>Custom Smart Timetable</h3>
              </div>
              <div className="timetable-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
                {generatedData.timeTable.map((slot, i) => (
                  <div key={i} style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                    <h4 style={{ color: 'var(--primary-light)', marginBottom: '8px' }}>{slot.day || `Day ${i+1}`}</h4>
                    <p style={{ fontWeight: 600 }}>{slot.task}</p>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>⏳ {slot.hours} hours</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="learning-card">
          <div className="learning-card-header">
            <span className="icon">🧠</span>
            <h3>Important Keywords & Definitions</h3>
          </div>
          <div className="keywords-grid">
            {generatedData?.keywords?.map((kw, i) => (
              <div key={i} className="keyword-item animate-in" style={{ animationDelay: `${i * 0.1}s` }}>
                <div className="term">{kw.term}</div>
                <div className="definition">{kw.definition}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="learning-card">
          <div className="learning-card-header">
            <span className="icon">📊</span>
            <h3>Conceptual Flow Diagram</h3>
          </div>
          <div className="diagram-container" style={{ background: 'var(--bg-primary)', padding: '24px', borderRadius: '8px', overflowX: 'auto', textAlign: 'center' }}>
            {generatedData?.flowchart ? (
              <div className="mermaid">
                {generatedData.flowchart.replace(/^```mermaid\s*/i, '').replace(/```\s*$/i, '')}
              </div>
            ) : (
              <div style={{ color: 'var(--text-muted)' }}>No flowchart generated.</div>
            )}
          </div>
        </div>

        {generatedData?.flashcards && generatedData.flashcards.length > 0 && (
          <div className="learning-card">
            <div className="learning-card-header">
              <span className="icon">📇</span>
              <h3>Interactive Flashcards (Click to Flip)</h3>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
              {generatedData.flashcards.map((card, idx) => (
                <Flashcard key={idx} front={card.front} back={card.back} />
              ))}
            </div>
          </div>
        )}

        <div className="learning-card">
          <div className="learning-card-header">
            <span className="icon">🌳</span>
            <h3>Topic Mindmap</h3>
          </div>
          <div style={{ width: '100%', height: '500px', background: 'var(--bg-primary)', borderRadius: '8px', border: '1px solid var(--border)', overflow: 'hidden' }}>
            {(() => {
              const graph = parseMindMapFromObject(generatedData?.mindmap)
              if (!graph || graph.nodes.length === 0) return <div style={{ padding: '20px', color: 'var(--text-muted)', textAlign: 'center' }}>No mindmap available or invalid format.</div>
              return (
                <ReactFlow nodes={graph.nodes} edges={graph.edges} fitView>
                  <Background color="#ccc" gap={16} />
                  <Controls />
                </ReactFlow>
              )
            })()}
          </div>
        </div>

        <div className="learning-card">
          <div className="learning-card-header">
            <span className="icon">🧪</span>
            <h3>Expected Questions by Weightage</h3>
          </div>
          
          <div className="questions-section">
            <h4><span className="badge">2 Marks</span> Short Answer Questions</h4>
            <div className="questions-list">
              {generatedData?.questions?.marks2?.map((q, i) => <div key={i} className="question-item">{q}</div>)}
            </div>
          </div>

          <div className="questions-section">
            <h4><span className="badge">5 Marks</span> Medium Form Questions</h4>
            <div className="questions-list">
              {generatedData?.questions?.marks5?.map((q, i) => <div key={i} className="question-item">{q}</div>)}
            </div>
          </div>

          <div className="questions-section" style={{ marginBottom: 0 }}>
            <h4><span className="badge">10 Marks</span> Long Form / Essay Based</h4>
            <div className="questions-list">
              {generatedData?.questions?.marks10?.map((q, i) => <div key={i} className="question-item">{q}</div>)}
            </div>
          </div>
        </div>

        {/* Mock Test Config */}
        <div className="learning-card" style={{ borderColor: 'var(--primary)', boxShadow: '0 0 20px rgba(108, 92, 231, 0.1)' }}>
          <div className="learning-card-header">
            <span className="icon">🎯</span>
            <h3>Ready to test your knowledge?</h3>
          </div>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '0.95rem' }}>
            Configure a custom mock test generated instantly from this learning package.
          </p>
          
          <div className="config-grid" style={{ marginBottom: '16px' }}>
            <div className="config-item">
              <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Difficulty Level</label>
              <select className="input-field" value={testDifficulty} onChange={e => setTestDifficulty(e.target.value)} style={{ padding: '10px' }}>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
            <div className="config-item">
              <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>MCQs (1 Mark)</label>
              <input type="number" min="0" max="20" name="mcq" value={testConfig.mcq} onChange={handleConfigChange} className="input-field" />
            </div>
            <div className="config-item">
              <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Short Answer (3 Marks)</label>
              <input type="number" min="0" max="10" name="short" value={testConfig.short} onChange={handleConfigChange} className="input-field" />
            </div>
            <div className="config-item">
              <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Long Answer (10 Marks)</label>
              <input type="number" min="0" max="5" name="long" value={testConfig.long} onChange={handleConfigChange} className="input-field" />
            </div>
          </div>

          <button 
            className="btn btn-primary btn-block" 
            onClick={handleGenerateTest}
            disabled={testConfig.mcq === 0 && testConfig.short === 0 && testConfig.long === 0}
          >
            Generate Custom Mock Test 🚀
          </button>
        </div>
      </div>
    )
  }

  // Input State
  // Valid if subject + marks + date filled AND at least one content source provided
  const hasContent = form.topics.trim() || youtubeUrl.trim() || uploadedFiles.length > 0
  const isFormValid = form.subject && form.targetMarks && form.examDate && hasContent

  return (
    <div className="animate-in smart-learning-container">
      <div className="page-header" style={{ marginBottom: '20px' }}>
        <h1>🧠 Smart Learning Generator</h1>
        <p>Give us the syllabus, and our AI will build a personalized, exam-focused learning path.</p>
      </div>

      <div className="card" style={{ maxWidth: '800px' }}>
        {error && <div style={{ background: 'rgba(255, 118, 117, 0.1)', color: 'var(--danger)', padding: '16px', borderRadius: '8px', marginBottom: '20px', border: '1px solid var(--danger)' }}>{error}</div>}
        <form onSubmit={handleGenerateAI}>
          <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', flexWrap: 'wrap' }}>
            <div className="form-group" style={{ flex: 1, minWidth: '200px' }}>
              <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '8px', color: 'var(--text-secondary)' }}>
                Subject Name(s) <span style={{ color: 'var(--primary-light)' }}>*</span>
              </label>
              <input 
                name="subject"
                type="text" 
                className="input-field" 
                placeholder="e.g. History, Math (comma split)"
                value={form.subject}
                onChange={handleInputChange}
              />
            </div>

            <div className="form-group" style={{ flex: 1, minWidth: '150px' }}>
              <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '8px', color: 'var(--text-secondary)' }}>
                Study Hours Per Day
              </label>
              <input 
                name="studyHoursPerDay"
                type="number" 
                min="1" max="24"
                className="input-field" 
                placeholder="e.g. 4"
                value={form.studyHoursPerDay}
                onChange={handleInputChange}
              />
            </div>
            
            <div className="form-group" style={{ flex: 1, minWidth: '150px' }}>
              <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '8px', color: 'var(--text-secondary)' }}>
                Preferred Study Time
              </label>
              <input 
                name="preferredStudyTime"
                type="text" 
                className="input-field" 
                placeholder="e.g. Morning, Evening"
                value={form.preferredStudyTime}
                onChange={handleInputChange}
              />
            </div>
            
            <div className="form-group" style={{ flex: 1, minWidth: '150px' }}>
              <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '8px', color: 'var(--text-secondary)' }}>
                Break Duration
              </label>
              <input 
                name="breakDuration"
                type="text" 
                className="input-field" 
                placeholder="e.g. 15 mins"
                value={form.breakDuration}
                onChange={handleInputChange}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '1rem', marginBottom: '12px', color: 'var(--text)', fontWeight: 600 }}>
              Enter Your Syllabus / Study Material <span style={{ color: 'var(--primary-light)' }}>*</span>
            </label>
            
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
              <button type="button" onClick={() => setActiveTab('text')} className={`btn ${activeTab === 'text' ? 'btn-primary' : 'btn-secondary'} btn-sm`}>📝 Text</button>
              <button type="button" onClick={() => setActiveTab('youtube')} className={`btn ${activeTab === 'youtube' ? 'btn-primary' : 'btn-secondary'} btn-sm`}>📺 YouTube</button>
              <button type="button" onClick={() => setActiveTab('pdf')} className={`btn ${activeTab === 'pdf' ? 'btn-primary' : 'btn-secondary'} btn-sm`}>📄 PDF</button>
              <button type="button" onClick={() => setActiveTab('ppt')} className={`btn ${activeTab === 'ppt' ? 'btn-primary' : 'btn-secondary'} btn-sm`}>📊 PPT</button>
              <button type="button" onClick={() => setActiveTab('image')} className={`btn ${activeTab === 'image' ? 'btn-primary' : 'btn-secondary'} btn-sm`}>🖼️ Image</button>
            </div>

            <div style={{ background: 'var(--surface)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border)' }}>
              {activeTab === 'text' && (
                <textarea 
                  name="topics"
                  className="input-field" 
                  placeholder="Enter chapters/topics (e.g., Chapter 1: Deadlocks, Scheduling)..."
                  rows="4"
                  style={{ resize: 'vertical' }}
                  value={form.topics}
                  onChange={handleInputChange}
                />
              )}
              {activeTab === 'youtube' && (
                <input 
                  type="url"
                  className="input-field" 
                  placeholder="Paste YouTube video link..."
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                />
              )}
              {['pdf', 'ppt', 'image'].includes(activeTab) && (
                <div style={{ textAlign: 'center', padding: '20px', border: '2px dashed var(--border)', borderRadius: '8px' }}>
                  <input 
                    type="file" 
                    id="file-upload" 
                    accept={activeTab === 'pdf' ? '.pdf' : activeTab === 'ppt' ? '.ppt,.pptx' : 'image/*'}
                    style={{ display: 'none' }}
                    multiple
                    onChange={(e) => {
                      if (e.target.files.length > 0) {
                        setUploadedFiles(prev => [...prev, ...Array.from(e.target.files)])
                      }
                    }}
                  />
                  <label htmlFor="file-upload" className="btn btn-secondary" style={{ cursor: 'pointer' }}>
                    Upload {activeTab.toUpperCase()} File(s)
                  </label>
                  <div style={{ marginTop: '8px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    Supported: {activeTab === 'pdf' ? '.pdf' : activeTab === 'ppt' ? '.ppt, .pptx' : '.jpg, .png'}
                  </div>
                </div>
              )}
            </div>

            {uploadedFiles.length > 0 && (
              <div style={{ marginTop: '16px', padding: '12px', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
                <h4 style={{ fontSize: '0.85rem', marginBottom: '8px' }}>Attached Files</h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {uploadedFiles.map((file, i) => (
                    <div key={i} style={{ padding: '4px 12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {file.name}
                      <button type="button" style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer' }} onClick={() => setUploadedFiles(prev => prev.filter((_, idx) => idx !== i))}>✕</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '20px', marginBottom: '32px', flexWrap: 'wrap' }}>
            <div className="form-group" style={{ flex: 1, minWidth: '150px' }}>
              <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '8px', color: 'var(--text-secondary)' }}>
                Target Marks (%) <span style={{ color: 'var(--primary-light)' }}>*</span>
              </label>
              <input 
                name="targetMarks"
                type="number" 
                min="0" max="100"
                className="input-field" 
                placeholder="e.g. 90"
                value={form.targetMarks}
                onChange={handleInputChange}
              />
            </div>
            
            <div className="form-group" style={{ flex: 1, minWidth: '150px' }}>
              <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '8px', color: 'var(--text-secondary)' }}>
                Exam Date <span style={{ color: 'var(--primary-light)' }}>*</span>
              </label>
              <input 
                name="examDate"
                type="date" 
                className="input-field" 
                style={{ colorScheme: 'dark' }}
                value={form.examDate}
                onChange={handleInputChange}
              />
            </div>

            <div className="form-group" style={{ flex: 1, minWidth: '150px' }}>
              <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '8px', color: 'var(--text-secondary)' }}>
                Previous Marks (Optional)
              </label>
              <input 
                name="prevMarks"
                type="number" 
                min="0" max="100"
                className="input-field" 
                placeholder="e.g. 65"
                value={form.prevMarks}
                onChange={handleInputChange}
              />
            </div>
          </div>

          <div style={{ background: 'var(--primary-glow)', padding: '16px', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(108, 92, 231, 0.2)', marginBottom: '24px', display: 'flex', gap: '12px' }}>
            <span>💡</span>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              The AI will analyze the topics against your target marks to determine exactly what depth of knowledge you need, generating notes, mindmaps, and questions tailored to score high.
            </p>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%', position: 'relative' }}
            disabled={!isFormValid || isExtracting}
          >
            {isExtracting ? (
              <span className="loading-dots">Extraction: {extractionMsg} <span /><span /><span /></span>
            ) : "Generate Smart Learning Package"}
          </button>
        </form>
      </div>
    </div>
  )
}
