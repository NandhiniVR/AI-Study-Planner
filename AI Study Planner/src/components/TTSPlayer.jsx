import React, { useState, useEffect, useRef } from 'react';

export default function TTSPlayer({ textToRead }) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  
  const [speed, setSpeed] = useState(1);
  const [pitch, setPitch] = useState(1);
  const [voices, setVoices] = useState([]);
  const [selectedVoiceIdx, setSelectedVoiceIdx] = useState(0);
  
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const scrollRef = useRef(null);

  // Load voices
  useEffect(() => {
    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      setVoices(availableVoices);
      const enVoiceIdx = availableVoices.findIndex(v => v.lang.startsWith('en'));
      if (enVoiceIdx !== -1) setSelectedVoiceIdx(enVoiceIdx);
    };
    
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }, []);

  // Handle Tab Switch Pause
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
        window.speechSynthesis.pause();
        setIsPaused(true);
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
    }
  }, []);

  const handlePlay = () => {
    if (!textToRead) return;
    
    window.speechSynthesis.cancel(); // Stop current playing
    
    // Strip markdown chars from text
    const cleanText = textToRead.replace(/[#*`~_>-]/g, '').trim();
    if (!cleanText) return;

    // chunking by sentence or newline for better bounding and length limits
    const chunks = cleanText.match(/[^.!?]+[.!?]+|\s*[^.!?]+\s*/g) || [cleanText];
    
    setIsSpeaking(true);
    setIsPaused(false);
    setHighlightIndex(-1);

    let currentIndex = 0;

    const speakChunk = (idx) => {
      if (idx >= chunks.length) {
        setIsSpeaking(false);
        setHighlightIndex(-1);
        return;
      }
      
      const utterance = new SpeechSynthesisUtterance(chunks[idx].trim());
      if (voices[selectedVoiceIdx]) {
        utterance.voice = voices[selectedVoiceIdx];
      }
      utterance.rate = speed;
      utterance.pitch = pitch;

      utterance.onstart = () => {
        setHighlightIndex(idx);
        // Auto scroll
        if (scrollRef.current) {
           scrollRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      };

      utterance.onend = () => {
        speakChunk(idx + 1);
      };

      utterance.onerror = (e) => {
        console.error('Speech synthesis error', e);
        setIsSpeaking(false);
      };

      window.speechSynthesis.speak(utterance);
    };

    speakChunk(0);
  };

  const handlePause = () => {
    if (window.speechSynthesis.speaking && !isPaused) {
      window.speechSynthesis.pause();
      setIsPaused(true);
    }
  };

  const handleResume = () => {
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
    }
  };

  const handleStop = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setIsPaused(false);
    setHighlightIndex(-1);
  };

  // Pre-process text to arrays roughly matching the chunk splitting for highlighting
  const chunksForDisplay = textToRead.replace(/[#*`~_>-]/g, '').match(/[^.!?]+[.!?]+|\s*[^.!?]+\s*/g) || [textToRead];

  return (
    <div className="card" style={{ marginBottom: '20px', padding: '20px', background: 'var(--surface-elevated)' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {!isSpeaking || isPaused ? (
            <button className="btn btn-primary btn-sm" onClick={isPaused ? handleResume : handlePlay} disabled={!textToRead}>
              {isPaused ? '🔁 Resume' : '▶️ Listen to Notes'}
            </button>
          ) : (
            <button className="btn btn-secondary btn-sm" onClick={handlePause}>
              ⏸️ Pause
            </button>
          )}
          {(isSpeaking || isPaused) && (
            <button className="btn btn-secondary btn-sm" onClick={handleStop} style={{ color: 'var(--danger)' }}>
              ⏹️ Stop
            </button>
          )}
          {isSpeaking && <span style={{ fontSize: '0.85rem', color: 'var(--primary-light)' }}>{isPaused ? 'Paused' : 'Reading...'}</span>}
        </div>
        
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Speed ({speed}x)</label>
            <input type="range" min="0.5" max="2" step="0.1" value={speed} onChange={e => setSpeed(parseFloat(e.target.value))} />
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Pitch ({pitch})</label>
            <input type="range" min="0" max="2" step="0.1" value={pitch} onChange={e => setPitch(parseFloat(e.target.value))} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Voice</label>
            <select className="input-field" style={{ padding: '4px 8px', width: '150px', fontSize: '0.8rem' }} value={selectedVoiceIdx} onChange={e => setSelectedVoiceIdx(Number(e.target.value))}>
              {voices.map((v, i) => (
                <option key={i} value={i}>{v.name} ({v.lang})</option>
              ))}
            </select>
          </div>
        </div>
      </div>
      
      {/* Highlighting active chunk */}
      {isSpeaking && highlightIndex >= 0 && (
        <div ref={scrollRef} style={{ marginTop: '16px', padding: '16px', borderRadius: '8px', background: 'var(--bg)', borderLeft: '4px solid var(--accent)', fontSize: '0.95rem', fontStyle: 'italic', maxHeight: '100px', overflowY: 'auto' }}>
           <span style={{ color: 'var(--text-secondary)' }}>Currently reading: </span>
           <span style={{ color: 'var(--text-primary)', fontWeight: 500, background: 'rgba(6, 182, 212, 0.2)' }}>
             {chunksForDisplay[highlightIndex]}
           </span>
        </div>
      )}
    </div>
  );
}
