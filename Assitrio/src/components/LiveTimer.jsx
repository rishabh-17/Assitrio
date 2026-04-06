import React, { useState, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';

export default function LiveTimer({ targetDate }) {
  const [display, setDisplay] = useState({ text: '', status: 'upcoming' });

  useEffect(() => {
    if (!targetDate) return;

    const calculate = () => {
      const now = new Date().getTime();
      const difference = targetDate.getTime() - now;

      if (difference <= 0) {
        // Event time has passed — show DELAYED with elapsed duration
        const elapsed = Math.abs(difference);
        const days = Math.floor(elapsed / (1000 * 60 * 60 * 24));
        const hours = Math.floor((elapsed % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((elapsed % (1000 * 60 * 60)) / (1000 * 60));

        let delayText;
        if (days > 0) {
          delayText = `${days}D ${hours}H`;
        } else if (hours > 0) {
          delayText = `${hours}H ${minutes}M`;
        } else if (minutes > 0) {
          delayText = `${minutes}M`;
        } else {
          delayText = 'JUST NOW';
        }

        setDisplay({ text: delayText, status: 'delayed' });
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      if (days > 0) {
        setDisplay({ text: `IN ${days}D ${hours}H`, status: 'upcoming' });
      } else if (hours > 0) {
        setDisplay({ text: `IN ${hours}H ${minutes}M`, status: 'upcoming' });
      } else {
        const m = minutes.toString().padStart(2, '0');
        const s = seconds.toString().padStart(2, '0');
        setDisplay({ text: `${m}:${s}`, status: 'soon' });
      }
    };

    calculate();
    const timerId = setInterval(calculate, 1000);
    return () => clearInterval(timerId);
  }, [targetDate]);

  if (!targetDate) return null;

  if (display.status === 'delayed') {
    return (
      <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-red-50 text-red-600 text-[9px] font-extrabold tracking-wider animate-pulse border border-red-200">
        <AlertTriangle size={9} />
        DELAYED {display.text !== 'JUST NOW' ? display.text : ''}
      </div>
    );
  }

  return (
    <div className={`px-2 py-1 rounded-full text-[9px] font-extrabold tracking-wider ${
      display.status === 'soon' ? 'bg-amber-50 text-amber-600' : 'bg-brand-50 text-brand-600'
    }`}>
      {display.text}
    </div>
  );
}
