import React, { useState } from 'react';
import { Mic, Lock, ArrowRight, CheckCircle2 } from 'lucide-react';
import { noteService } from '../services/apiService';
import NoteDetail from './overlays/NoteDetail';

export default function SharedRecordingAuth({ shareId }) {
  const [code, setCode] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [revealedNote, setRevealedNote] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (code.length !== 6) {
      setError('Please enter a valid 6-digit access code.');
      return;
    }

    setIsAuthenticating(true);
    try {
      const matchedNote = await noteService.getShared(shareId, code);
      setRevealedNote(matchedNote);
      setIsAuthenticating(false);
      setIsSuccess(true);
    } catch (err) {
      const msg = err.response?.data?.error || 'Invalid Access Code or Recording Expired.';
      setError(msg);
      setIsAuthenticating(false);
    }
  };

  if (isSuccess && revealedNote) {
    return <NoteDetail 
              note={revealedNote} 
              onClose={() => { window.location.href = '/'; }} 
              toggleTask={() => {}} 
              updateNote={() => {}} 
              updateTask={() => {}} 
              deleteTask={() => {}} 
              addTask={() => {}} 
           />;
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', backgroundColor: '#0a0a0a', minHeight: '100vh', width: '100%', fontFamily: 'system-ui,-apple-system,sans-serif' }}>
      <div style={{ width: '100%', maxWidth: 440, position: 'relative', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(160deg, #0d0d1a 0%, #111111 50%, #0a0a0a 100%)' }} />
        <div style={{ position: 'absolute', top: 80, right: -80, width: 300, height: 300, background: 'rgba(109,91,250,0.06)', borderRadius: '50%', filter: 'blur(60px)' }} />

        <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', minHeight: '100vh', padding: '60px 28px 32px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 36 }}>
            <div style={{ width: 64, height: 64, background: 'rgba(109,91,250,0.15)', border: '1px solid rgba(109,91,250,0.25)', borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <Lock size={26} style={{ color: '#a78bfa' }} />
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#f9fafb', margin: '0 0 8px', textAlign: 'center' }}>Secure Recording</h1>
            <p style={{ fontSize: 13, color: '#4b5563', textAlign: 'center' }}>Enter the 6-digit access code attached to the shared link.</p>
          </div>

          <form onSubmit={handleSubmit} style={{ backgroundColor: '#161616', borderRadius: 24, border: '1px solid #1f1f1f', padding: '28px 24px', flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: 8 }}>Access Code</label>
              <input 
                type="text" 
                value={code} 
                onChange={e => setCode(e.target.value.replace(/\\D/g, '').slice(0, 6))}
                placeholder="000000" 
                style={{ width: '100%', height: 50, backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 12, padding: '0 16px', fontSize: 18, letterSpacing: '4px', textAlign: 'center', color: '#f3f4f6', fontWeight: 800, outline: 'none', boxSizing: 'border-box' }} 
              />
            </div>

            {error && <p style={{ fontSize: 12, color: '#f87171', marginBottom: 16, textAlign: 'center' }}>{error}</p>}

            <button type="submit" disabled={code.length < 6 || isAuthenticating} style={{ width: '100%', height: 48, borderRadius: 14, border: 'none', cursor: (code.length < 6 || isAuthenticating) ? 'not-allowed' : 'pointer', background: (code.length < 6 || isAuthenticating) ? '#222' : 'linear-gradient(135deg, #6d5bfa 0%, #9b5de5 100%)', color: (code.length < 6 || isAuthenticating) ? '#6b7280' : '#fff', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 'auto' }}>
              {isAuthenticating ? 'Decrypting...' : 'View Recording'}
            </button>
          </form>
          <div style={{ marginTop: 24, textAlign: 'center' }}>
            <p style={{ fontSize: 11, color: '#4b5563', fontWeight: 600 }}>Secured by Assistrio</p>
          </div>
        </div>
      </div>
    </div>
  );
}
