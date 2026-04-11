import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function LiveTimer({ targetDate, isDone }) {
  const [display, setDisplay] = useState({ text: '', status: 'upcoming' });

  useEffect(() => {
    if (!targetDate || isDone) return;

    const calculate = () => {
      const now = new Date().getTime();
      const difference = targetDate.getTime() - now;

      if (difference <= 0) {
        const elapsed = Math.abs(difference);
        const days = Math.floor(elapsed / (1000 * 60 * 60 * 24));
        const hours = Math.floor((elapsed % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((elapsed % (1000 * 60 * 60)) / (1000 * 60));
        let delayText = days > 0 ? `${days}D ${hours}H` : hours > 0 ? `${hours}H ${minutes}M` : minutes > 0 ? `${minutes}M` : 'JUST NOW';
        setDisplay({ text: delayText, status: 'delayed' });
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      if (days > 0) setDisplay({ text: `IN ${days}D ${hours}H`, status: 'upcoming' });
      else if (hours > 0) setDisplay({ text: `IN ${hours}H ${minutes}M`, status: 'upcoming' });
      else {
        const m = minutes.toString().padStart(2, '0');
        const s = seconds.toString().padStart(2, '0');
        setDisplay({ text: `${m}:${s}`, status: 'soon' });
      }
    };

    calculate();
    const timerId = setInterval(calculate, 1000);
    return () => clearInterval(timerId);
  }, [targetDate, isDone]);

  if (!targetDate) return null;

  const base = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '3px 8px',
    borderRadius: 99,
    fontSize: 9,
    fontWeight: 800,
    letterSpacing: '0.08em',
    whiteSpace: 'nowrap',
  };

  if (isDone) {
    return (
      <div style={{ ...base, backgroundColor: 'rgba(52,211,153,0.12)', color: '#34d399', border: '1px solid rgba(52,211,153,0.2)' }}>
        <CheckCircle2 size={9} />
        DONE
      </div>
    );
  }

  if (display.status === 'delayed') {
    return (
      <div style={{ ...base, backgroundColor: 'rgba(239,68,68,0.12)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}>
        <AlertTriangle size={9} />
        DELAYED {display.text !== 'JUST NOW' ? display.text : ''}
      </div>
    );
  }

  return (
    <div style={{
      ...base,
      backgroundColor: display.status === 'soon' ? 'rgba(251,191,36,0.12)' : 'rgba(109,91,250,0.12)',
      color: display.status === 'soon' ? '#fbbf24' : '#a78bfa',
      border: `1px solid ${display.status === 'soon' ? 'rgba(251,191,36,0.2)' : 'rgba(109,91,250,0.2)'}`,
    }}>
      {display.text}
    </div>
  );
}