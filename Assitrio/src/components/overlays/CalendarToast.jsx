import React, { useState, useEffect } from 'react';
import { Calendar, Check, X } from 'lucide-react';

/**
 * CalendarToast — Slide-up toast notification when meetings are auto-scheduled.
 *
 * Props:
 * - events: Array of { title, displayDate, displayTime, providers }
 * - onDismiss: callback when toast is dismissed
 */
export default function CalendarToast({ events = [], onDismiss }) {
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (events.length > 0) {
      // Slight delay for entrance animation
      const t = setTimeout(() => setVisible(true), 100);
      return () => clearTimeout(t);
    }
  }, [events]);

  useEffect(() => {
    if (visible) {
      const autoDismiss = setTimeout(() => handleDismiss(), 5000);
      return () => clearTimeout(autoDismiss);
    }
  }, [visible]);

  const handleDismiss = () => {
    setExiting(true);
    setTimeout(() => {
      setVisible(false);
      setExiting(false);
      onDismiss?.();
    }, 300);
  };

  if (!visible || events.length === 0) return null;

  return (
    <div
      className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-[200] w-[calc(100%-2rem)] max-w-sm transition-all duration-300 ${
        exiting ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'
      }`}
    >
      <div className="bg-white rounded-2xl p-4 shadow-2xl border border-slate-100 backdrop-blur-xl">
        {events.map((event, idx) => (
          <div
            key={idx}
            className={`flex items-start gap-3 ${idx > 0 ? 'mt-3 pt-3 border-t border-slate-100' : ''}`}
          >
            {/* Calendar Icon */}
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
              <Calendar size={20} className="text-emerald-600" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <Check size={14} className="text-emerald-500 shrink-0" />
                <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">
                  Meeting Scheduled
                </span>
              </div>
              <p className="text-[13px] font-bold text-slate-800 truncate">
                {event.title}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {event.displayDate} {event.displayTime && `at ${event.displayTime}`}
              </p>
              {/* Provider badges */}
              {event.providers && event.providers.length > 0 && (
                <div className="flex items-center gap-1.5 mt-1.5">
                  {event.providers.includes('google') && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-blue-50 text-[9px] font-bold text-blue-600 border border-blue-100">
                      <svg width="10" height="10" viewBox="0 0 48 48">
                        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                      </svg>
                      Google
                    </span>
                  )}
                  {event.providers.includes('microsoft') && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-blue-50 text-[9px] font-bold text-indigo-600 border border-indigo-100">
                      <svg width="10" height="10" viewBox="0 0 21 21">
                        <rect x="1" y="1" width="9" height="9" fill="#f25022" />
                        <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
                        <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
                        <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
                      </svg>
                      Outlook
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Close */}
            <button
              onClick={handleDismiss}
              className="p-1 text-slate-300 hover:text-slate-500 transition-colors shrink-0"
              aria-label="Dismiss"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
