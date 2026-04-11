import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, Eye, EyeOff, ArrowRight, UserPlus, LogIn, AlertCircle } from 'lucide-react';

const GOOGLE_CLIENT_ID = '832218498414-your-client-id.apps.googleusercontent.com';

export default function LoginScreen({ onLogin, onGoogleLogin }) {
  const [mode, setMode] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const googleBtnRef = useRef(null);
  const gsiInitialized = useRef(false);

  const handleGoogleResponse = useCallback((response) => {
    if (response?.credential) {
      (async () => {
        setGoogleLoading(true); setError('');
        try { const r = await onGoogleLogin(response.credential); if (!r?.success) setError(r?.error || 'Google sign-in failed'); }
        finally { setGoogleLoading(false); }
      })();
    }
  }, [onGoogleLogin]);

  useEffect(() => {
    try { localStorage.removeItem('assistrio-session-v2'); } catch(e) {}
  }, []);

  useEffect(() => {
    if (gsiInitialized.current) return;
    const init = () => {
      if (!window.google?.accounts?.id) return;
      gsiInitialized.current = true;
      window.google.accounts.id.initialize({ client_id: GOOGLE_CLIENT_ID, callback: handleGoogleResponse, auto_select: false, cancel_on_tap_outside: true });
      if (googleBtnRef.current) window.google.accounts.id.renderButton(googleBtnRef.current, { type: 'standard', theme: 'outline', size: 'large', text: 'signin_with', shape: 'rectangular', width: 320 });
    };
    if (window.google?.accounts?.id) init();
    else { const iv = setInterval(() => { if (window.google?.accounts?.id) { init(); clearInterval(iv); } }, 200); setTimeout(() => clearInterval(iv), 10000); }
  }, [handleGoogleResponse]);

  const handleSubmit = async (e) => {
    e.preventDefault(); setError('');
    if (!username.trim() || !password.trim()) { setError('Please fill in all fields'); return; }
    setIsLoading(true);
    await new Promise(r => setTimeout(r, 600));
    const result = await onLogin(mode, username.trim().toLowerCase(), password, displayName.trim());
    if (!result.success) setError(result.error);
    setIsLoading(false);
  };

  const switchMode = () => { setMode(m => m === 'login' ? 'signup' : 'login'); setError(''); setUsername(''); setPassword(''); setDisplayName(''); };

  const handleGoogleClick = () => {
    if (googleBtnRef.current) { const b = googleBtnRef.current.querySelector('[role="button"]') || googleBtnRef.current.querySelector('iframe'); if (b) { b.click(); return; } }
    window.google?.accounts?.id?.prompt();
  };

  const inputStyle = {
    width: '100%', height: 46, backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a',
    borderRadius: 12, padding: '0 14px', fontSize: 14, color: '#f3f4f6',
    fontWeight: 500, outline: 'none', boxSizing: 'border-box',
  };

  const labelStyle = { fontSize: 11, fontWeight: 700, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: 8 };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', backgroundColor: '#0a0a0a', minHeight: '100vh', width: '100%', fontFamily: 'system-ui,-apple-system,sans-serif' }}>
      <div style={{ width: '100%', maxWidth: 440, position: 'relative', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Gradient background */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(160deg, #0d0d1a 0%, #111111 50%, #0a0a0a 100%)' }} />

        {/* Glow */}
        <div style={{ position: 'absolute', top: 80, right: -80, width: 300, height: 300, background: 'rgba(109,91,250,0.06)', borderRadius: '50%', filter: 'blur(60px)' }} />
        <div style={{ position: 'absolute', bottom: 200, left: -60, width: 240, height: 240, background: 'rgba(155,93,229,0.05)', borderRadius: '50%', filter: 'blur(60px)' }} />

        <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', minHeight: '100vh', padding: '60px 28px 32px' }}>

          {/* Logo */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 36 }}>
            <div style={{ width: 76, height: 76, background: 'rgba(109,91,250,0.15)', border: '1px solid rgba(109,91,250,0.25)', borderRadius: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20, boxShadow: '0 8px 32px rgba(109,91,250,0.2)' }}>
              <Mic size={34} style={{ color: '#a78bfa' }} />
            </div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: '#f9fafb', letterSpacing: '-0.3px', margin: '0 0 8px' }}>Assistrio</h1>
            <p style={{ fontSize: 13, color: '#4b5563', fontWeight: 500, margin: 0, textAlign: 'center' }}>AI Memory for Real-World Conversations</p>
          </div>

          {/* Card */}
          <div style={{ backgroundColor: '#161616', borderRadius: 24, border: '1px solid #1f1f1f', padding: '28px 24px', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#f9fafb', margin: '0 0 6px' }}>{mode === 'login' ? 'Welcome back' : 'Create account'}</h2>
            <p style={{ fontSize: 13, color: '#4b5563', margin: '0 0 24px' }}>{mode === 'login' ? 'Sign in to access your memories' : 'Get started with Assistrio'}</p>

            {/* Google button */}
            <button type="button" onClick={handleGoogleClick} disabled={googleLoading} style={{ width: '100%', height: 46, borderRadius: 12, fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 20, backgroundColor: '#1e1e1e', border: '1px solid #2a2a2a', color: '#d1d5db', cursor: 'pointer' }}>
              {googleLoading ? <div style={{ width: 20, height: 20, border: '2px solid #2a2a2a', borderTopColor: '#8b5cf6', borderRadius: '50%' }} /> : (
                <>
                  <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" /><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" /><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" /><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" /></svg>
                  Continue with Google
                </>
              )}
            </button>
            <div ref={googleBtnRef} style={{ display: 'none' }} />

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <div style={{ flex: 1, height: 1, backgroundColor: '#222' }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.1em' }}>or</span>
              <div style={{ flex: 1, height: 1, backgroundColor: '#222' }} />
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
              {mode === 'signup' && (
                <div style={{ marginBottom: 16 }}>
                  <label style={labelStyle}>Display Name</label>
                  <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your name" style={inputStyle} />
                </div>
              )}

              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Username</label>
                <input type="text" value={username} onChange={(e) => { setUsername(e.target.value); setError(''); }} placeholder="Enter username" autoComplete="username" style={inputStyle} />
              </div>

              <div style={{ marginBottom: error ? 0 : 20 }}>
                <label style={labelStyle}>Password</label>
                <div style={{ position: 'relative' }}>
                  <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => { setPassword(e.target.value); setError(''); }} placeholder="Enter password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} style={{ ...inputStyle, paddingRight: 44 }} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#4b5563' }}>
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>

              {error && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 600, color: '#f87171', backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '10px 12px', margin: '12px 0' }}>
                  <AlertCircle size={14} style={{ flexShrink: 0 }} />{error}
                </div>
              )}

              <button type="submit" disabled={isLoading} style={{ width: '100%', height: 48, borderRadius: 14, border: 'none', cursor: isLoading ? 'not-allowed' : 'pointer', background: isLoading ? '#1e1e1e' : 'linear-gradient(135deg, #6d5bfa 0%, #9b5de5 100%)', color: isLoading ? '#4b5563' : '#fff', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: isLoading ? 'none' : '0 6px 20px rgba(109,91,250,0.35)', marginTop: 'auto', letterSpacing: '0.02em' }}>
                {isLoading ? <div style={{ width: 20, height: 20, border: '2px solid #2a2a2a', borderTopColor: '#8b5cf6', borderRadius: '50%' }} /> : <>{mode === 'login' ? <LogIn size={17} /> : <UserPlus size={17} />}{mode === 'login' ? 'Sign In' : 'Create Account'}<ArrowRight size={15} /></>}
              </button>
            </form>
          </div>

          {/* Toggle */}
          <div style={{ textAlign: 'center', marginTop: 24 }}>
            <p style={{ color: '#374151', fontSize: 13, margin: 0 }}>
              {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}
              <button onClick={switchMode} style={{ color: '#a78bfa', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', marginLeft: 6, fontSize: 13 }}>
                {mode === 'login' ? 'Sign Up' : 'Sign In'}
              </button>
            </p>
          </div>

          <p style={{ textAlign: 'center', color: '#1f1f1f', fontSize: 10, marginTop: 16 }}>Assistrio v1.0.0 • Privacy-First • Built for India</p>
        </div>
      </div>
    </div>
  );
}