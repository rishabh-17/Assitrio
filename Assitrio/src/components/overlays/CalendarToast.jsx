import React, { useState, useEffect } from 'react';
import { Calendar, Check, X } from 'lucide-react';

export default function CalendarToast({ events = [], onDismiss }) {
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (events.length > 0) {
      const t = setTimeout(() => setVisible(true), 100);
      return () => clearTimeout(t);
    }
  }, [events]);

  useEffect(() => {
    if (visible) {
      const auto = setTimeout(() => handleDismiss(), 5000);
      return () => clearTimeout(auto);
    }
  }, [visible]);

  const handleDismiss = () => {
    setExiting(true);
    setTimeout(() => { setVisible(false); setExiting(false); onDismiss?.(); }, 300);
  };

  if (!visible || events.length === 0) return null;

  return (
    <div style={{
      position: 'fixed', bottom: 96,
      left: '50%', transform: `translateX(-50%) translateY(${exiting ? 8 : 0}px)`,
      zIndex: 200, width: 'calc(100% - 32px)', maxWidth: 380,
      opacity: exiting ? 0 : 1, transition: 'all 0.3s ease',
      fontFamily: 'system-ui,-apple-system,sans-serif',
    }}>
      <div style={{
        backgroundColor: '#1a1a1a', borderRadius: 20,
        border: '1px solid #2a2a2a', padding: '14px 16px',
        boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
      }}>
        {events.map((event, idx) => (
          <div key={idx} style={{
            display: 'flex', alignItems: 'flex-start', gap: 12,
            ...(idx > 0 ? { marginTop: 12, paddingTop: 12, borderTop: '1px solid #222' } : {})
          }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(52,211,153,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Calendar size={18} style={{ color: '#34d399' }} />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                <Check size={13} style={{ color: '#34d399', flexShrink: 0 }} />
                <span style={{ fontSize: 10, fontWeight: 800, color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Meeting Scheduled</span>
              </div>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#f3f4f6', margin: '0 0 3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{event.title}</p>
              <p style={{ fontSize: 11, color: '#4b5563', margin: 0 }}>{event.displayDate}{event.displayTime && ` at ${event.displayTime}`}</p>
              {event.providers?.length > 0 && (
                <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                  {event.providers.includes('google') && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 6, backgroundColor: 'rgba(66,133,244,0.1)', border: '1px solid rgba(66,133,244,0.2)', fontSize: 9, fontWeight: 800, color: '#60a5fa' }}>
                      <svg width="9" height="9" viewBox="0 0 48 48"><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" /><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" /></svg>
                      Google
                    </span>
                  )}
                  {event.providers.includes('microsoft') && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 6, backgroundColor: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.2)', fontSize: 9, fontWeight: 800, color: '#818cf8' }}>
                      <svg width="9" height="9" viewBox="0 0 21 21"><rect x="1" y="1" width="9" height="9" fill="#f25022" /><rect x="11" y="1" width="9" height="9" fill="#7fba00" /><rect x="1" y="11" width="9" height="9" fill="#00a4ef" /><rect x="11" y="11" width="9" height="9" fill="#ffb900" /></svg>
                      Outlook
                    </span>
                  )}
                </div>
              )}
            </div>

            <button onClick={handleDismiss} style={{ color: '#374151', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0, padding: 4 }} aria-label="Dismiss">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}