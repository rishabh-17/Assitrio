import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, Eye, EyeOff, ArrowRight, UserPlus, LogIn, AlertCircle } from 'lucide-react';

// Google OAuth Client ID — Replace with your real one for production
const GOOGLE_CLIENT_ID = '832218498414-your-client-id.apps.googleusercontent.com';

export default function LoginScreen({ onLogin, onGoogleLogin }) {
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const googleBtnRef = useRef(null);
  const gsiInitialized = useRef(false);

  // ── Google Sign-In callback ──
  const handleGoogleResponse = useCallback((response) => {
    if (response?.credential) {
      (async () => {
        setGoogleLoading(true);
        setError('');
        try {
          const result = await onGoogleLogin(response.credential);
          if (!result?.success) {
            setError(result?.error || 'Google sign-in failed');
          }
        } finally {
          setGoogleLoading(false);
        }
      })();
    }
  }, [onGoogleLogin]);

  // ── Initialize Google Identity Services ──
  useEffect(() => {
    if (gsiInitialized.current) return;

    const initGoogle = () => {
      if (!window.google?.accounts?.id) return;
      gsiInitialized.current = true;

      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleResponse,
        auto_select: false,
        cancel_on_tap_outside: true,
      });

      // Render the Google button in our hidden container
      if (googleBtnRef.current) {
        window.google.accounts.id.renderButton(googleBtnRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'signin_with',
          shape: 'rectangular',
          width: 320,
        });
      }
    };

    // Google's GSI script may still be loading
    if (window.google?.accounts?.id) {
      initGoogle();
    } else {
      const interval = setInterval(() => {
        if (window.google?.accounts?.id) {
          initGoogle();
          clearInterval(interval);
        }
      }, 200);
      // Clean up after 10 seconds
      setTimeout(() => clearInterval(interval), 10000);
    }
  }, [handleGoogleResponse]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password.trim()) {
      setError('Please fill in all fields');
      return;
    }

    try {
      console.log('ASSISTRIO_LOGIN_UI', 'submit', { mode, username: username.trim(), hasDisplayName: !!displayName.trim() });
    } catch (e) {
    }

    setIsLoading(true);

    // Simulate brief loading for UX feel
    await new Promise(r => setTimeout(r, 600));

    const result = await onLogin(mode, username.trim(), password, displayName.trim());

    if (!result.success) {
      setError(result.error);
    }

    setIsLoading(false);
  };

  const switchMode = () => {
    setMode(mode === 'login' ? 'signup' : 'login');
    setError('');
    setUsername('');
    setPassword('');
    setDisplayName('');
  };

  // Trigger the hidden Google button click programmatically
  const handleGoogleClick = () => {
    if (googleBtnRef.current) {
      const btn = googleBtnRef.current.querySelector('[role="button"]') ||
        googleBtnRef.current.querySelector('div[aria-labelledby]') ||
        googleBtnRef.current.querySelector('iframe');
      if (btn) {
        btn.click();
        return;
      }
    }
    // Fallback: prompt One Tap
    if (window.google?.accounts?.id) {
      window.google.accounts.id.prompt();
    }
  };

  return (
    <div className="flex justify-center bg-zinc-900 h-screen w-full font-sans">
      <div className="w-full max-w-md bg-slate-50 h-full relative flex flex-col overflow-hidden sm:border-x sm:border-slate-800 shadow-2xl">

        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-brand-600 via-brand-700 to-slate-900 opacity-95" />

        {/* Decorative circles */}
        <div className="absolute top-[-80px] right-[-60px] w-64 h-64 bg-white/5 rounded-full" />
        <div className="absolute bottom-[200px] left-[-40px] w-48 h-48 bg-white/5 rounded-full" />
        <div className="absolute top-[40%] right-[-20px] w-32 h-32 bg-white/5 rounded-full" />

        {/* Content */}
        <div className="relative z-10 flex flex-col h-full px-7 pt-16 pb-8">

          {/* Logo & Branding */}
          <div className="flex flex-col items-center mb-10">
            <div className="w-20 h-20 bg-white/15 backdrop-blur-md rounded-3xl flex items-center justify-center mb-5 shadow-xl border border-white/10">
              <Mic size={36} className="text-white" />
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">Assistrio</h1>
            <p className="text-brand-200 text-sm font-medium mt-2 text-center">
              AI Memory for Real-World Conversations
            </p>
          </div>

          {/* Form Card */}
          <div className="bg-white rounded-3xl p-6 shadow-2xl flex-1 flex flex-col overflow-y-auto scrollbar-hide">
            <h2 className="text-xl font-extrabold text-slate-900 mb-1">
              {mode === 'login' ? 'Welcome back' : 'Create account'}
            </h2>
            <p className="text-sm text-slate-400 mb-5">
              {mode === 'login' ? 'Sign in to access your memories' : 'Get started with Assistrio'}
            </p>

            {/* Google Sign In Button */}
            <button
              type="button"
              onClick={handleGoogleClick}
              disabled={googleLoading}
              className="w-full h-12 rounded-xl font-bold text-[14px] flex items-center justify-center gap-3 transition-all mb-4 bg-white border-2 border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50 active:scale-[0.97] shadow-sm hover:shadow-md"
              id="google-signin-button"
            >
              {googleLoading ? (
                <div className="w-5 h-5 border-2 border-slate-300 border-t-brand-500 rounded-full animate-spin" />
              ) : (
                <>
                  {/* Google "G" logo SVG */}
                  <svg width="20" height="20" viewBox="0 0 48 48">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                  </svg>
                  <span>Continue with Google</span>
                </>
              )}
            </button>

            {/* Hidden Google rendered button (needed for GSI to work) */}
            <div ref={googleBtnRef} className="hidden" />

            {/* Divider */}
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 h-px bg-slate-200" />
              <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">or</span>
              <div className="flex-1 h-px bg-slate-200" />
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col flex-1">
              {/* Display Name (signup only) */}
              {mode === 'signup' && (
                <div className="mb-3">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Display Name</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Your name"
                    className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 text-[14px] text-slate-800 font-medium outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-all placeholder-slate-300"
                  />
                </div>
              )}

              {/* Username */}
              <div className="mb-3">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => { setUsername(e.target.value); setError(''); }}
                  placeholder="Enter username"
                  autoComplete="username"
                  className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 text-[14px] text-slate-800 font-medium outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-all placeholder-slate-300"
                />
              </div>

              {/* Password */}
              <div className="mb-4">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(''); }}
                    placeholder="Enter password"
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 pr-12 text-[14px] text-slate-800 font-medium outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-all placeholder-slate-300"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 text-red-500 text-[12px] font-semibold mb-3 bg-red-50 px-3 py-2.5 rounded-xl border border-red-200 animate-slide-up">
                  <AlertCircle size={14} className="shrink-0" />
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoading}
                className={`w-full h-11 rounded-xl font-bold text-[14px] flex items-center justify-center gap-2 transition-all mt-auto ${isLoading
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-brand-600 text-white hover:bg-brand-700 active:scale-[0.97] shadow-lg shadow-brand-200'
                  }`}
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin-slow" />
                ) : (
                  <>
                    {mode === 'login' ? <LogIn size={18} /> : <UserPlus size={18} />}
                    {mode === 'login' ? 'Sign In' : 'Create Account'}
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Toggle login/signup */}
          <div className="text-center mt-6">
            <p className="text-white/60 text-[13px]">
              {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}
              <button
                onClick={switchMode}
                className="text-white font-bold ml-1.5 hover:text-brand-200 transition-colors"
              >
                {mode === 'login' ? 'Sign Up' : 'Sign In'}
              </button>
            </p>
          </div>

          {/* Footer */}
          <p className="text-center text-white/20 text-[10px] mt-4">
            Assistrio v1.0.0 • Privacy-First • Built for India
          </p>
        </div>
      </div>
    </div>
  );
}
