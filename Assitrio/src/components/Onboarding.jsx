import React, { useState } from 'react';
import { Mic, Zap, Target, ChevronRight } from 'lucide-react';

export default function Onboarding({ onComplete }) {
  const [step, setStep] = useState(0);

  const slides = [
    {
      icon: <Target size={44} style={{ color: '#a78bfa' }} />,
      title: 'Welcome to Assistrio',
      desc: "Your calm, AI-powered memory and task assistant. We remember the details so you don't have to.",
      accent: 'rgba(109,91,250,0.15)',
      glow: 'rgba(109,91,250,0.08)',
    },
    {
      icon: <Mic size={44} style={{ color: '#34d399' }} />,
      title: 'Just Speak',
      desc: 'Tap "Give Command" to log a quick thought, or "Talk to AI" to have a conversation. We extract tasks automatically.',
      accent: 'rgba(52,211,153,0.15)',
      glow: 'rgba(52,211,153,0.08)',
    },
    {
      icon: <Zap size={44} style={{ color: '#fbbf24' }} />,
      title: 'Smart Locker',
      desc: 'Everything is securely stored, summarized, and organized in your Locker. Fully searchable and accessible.',
      accent: 'rgba(251,191,36,0.15)',
      glow: 'rgba(251,191,36,0.08)',
    },
  ];

  const s = slides[step];

  return (
    <div style={{
      position: 'fixed', inset: 0,
      backgroundColor: '#111111',
      zIndex: 200,
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      overflow: 'hidden',
    }}>
      {/* Glow blobs */}
      <div style={{
        position: 'absolute', top: '20%', right: -80,
        width: 280, height: 280, borderRadius: '50%',
        backgroundColor: s.glow, filter: 'blur(60px)',
        transition: 'background-color 0.6s',
      }} />
      <div style={{
        position: 'absolute', bottom: '25%', left: -80,
        width: 280, height: 280, borderRadius: '50%',
        backgroundColor: s.glow, filter: 'blur(60px)',
        transition: 'background-color 0.6s',
      }} />

      {/* Content */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '32px 28px', position: 'relative', zIndex: 10,
      }}>
        <div key={step} style={{
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', textAlign: 'center', maxWidth: 320,
        }}>
          <div style={{
            width: 96, height: 96,
            borderRadius: 28,
            backgroundColor: s.accent,
            border: '1px solid rgba(255,255,255,0.06)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 40,
            boxShadow: `0 12px 40px ${s.glow}`,
            transition: 'background-color 0.4s',
          }}>
            {s.icon}
          </div>

          <h1 style={{
            fontSize: 28, fontWeight: 800,
            color: '#f9fafb', letterSpacing: '-0.4px',
            marginBottom: 16, lineHeight: 1.2,
          }}>
            {s.title}
          </h1>

          <p style={{
            fontSize: 15, color: '#6b7280',
            lineHeight: 1.7, padding: '0 8px',
          }}>
            {s.desc}
          </p>
        </div>
      </div>

      {/* Bottom nav area */}
      <div style={{
        backgroundColor: '#161616',
        borderTop: '1px solid #1f1f1f',
        padding: '28px 28px 48px',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', gap: 24,
      }}>
        {/* Dots */}
        <div style={{ display: 'flex', gap: 8 }}>
          {slides.map((_, i) => (
            <div key={i} style={{
              height: 6, borderRadius: 99,
              width: i === step ? 28 : 6,
              background: i === step
                ? 'linear-gradient(135deg, #6d5bfa, #9b5de5)'
                : '#2a2a2a',
              transition: 'all 0.3s',
            }} />
          ))}
        </div>

        <button
          onClick={() => step < slides.length - 1 ? setStep(s => s + 1) : onComplete()}
          style={{
            width: '100%',
            height: 54,
            borderRadius: 18,
            border: 'none',
            cursor: 'pointer',
            background: 'linear-gradient(135deg, #6d5bfa 0%, #9b5de5 100%)',
            color: '#fff',
            fontSize: 14,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            boxShadow: '0 8px 24px rgba(109,91,250,0.4)',
            letterSpacing: '0.02em',
          }}
        >
          {step === slides.length - 1 ? 'Get Started' : 'Continue'}
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}